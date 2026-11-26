// Reports use the same backend as the Pickup Dashboard.
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const MIN_PICKUPS = 3;
  const LOW_FILL = 50;
  const RESOLVED_KEY = "wasteCollectionResolvedRequests";
  let records = [], bins = [], view = [], binSummary = [], loaded = false;
  const QR_PAGE_SIZE = 12;
  let qrPage = 0;
  let qrOpen = false;
  let qrReady = false;
  let qrLoading = false;
  let binsLoaded = false;
  let qrLibraryPromise;
  let resolved = new Set();
  try { resolved = new Set(JSON.parse(localStorage.getItem(RESOLVED_KEY) || "[]")); } catch {}

  const filterFields = [
    ["from", "From", "date"], ["to", "To", "date"],
    ["location", "Location", "select"], ["wasteStream", "Waste stream", "select"],
    ["driverName", "Driver", "select"]
  ];
  const reading = r => typeof r.fullness === "number" && Number.isFinite(r.fullness);
  const completed = r => r.serviceCompleted === "Yes";
  const low = r => reading(r) && r.fullness < LOW_FILL && completed(r);
  const issue = r => !completed(r) || r.overflow || r.contamination || r.damaged;
  const avg = values => values.length ? values.reduce((a,b) => a+b, 0)/values.length : null;
  const percent = (n,d) => d ? (100*n/d).toFixed(1)+"%" : "—";
  const fullness = n => n == null ? "—" : n.toFixed(1)+"%";
  const money = n => n.toLocaleString("en-US", {style:"currency",currency:"USD"});
  const unique = a => [...new Set(a.filter(Boolean))].sort();
  const text = (tag, value, cls) => {
    const node = document.createElement(tag); node.textContent = value ?? "";
    if (cls) node.className = cls; return node;
  };
  function table(id, headers, rows, empty) {
    const target = $(id); target.replaceChildren();
    if (!rows.length) { target.append(text("p", empty, "muted")); return; }
    const t = document.createElement("table"); t.className = "data-table";
    const head = t.createTHead().insertRow();
    headers.forEach(h => { const th = text("th",h); th.scope = "col"; head.append(th); });
    const body = t.createTBody();
    rows.forEach(row => { const tr = body.insertRow(); row.forEach(v => {
      const td = tr.insertCell(); if (v instanceof Node) td.append(v); else td.textContent = v ?? "";
    }); }); target.append(t);
  }
  function kpis(id, items) {
    $(id).replaceChildren(...items.map(([label,value,sub]) => {
      const box = document.createElement("div"); box.className = "kpi";
      box.append(text("span",label,"kpi-label"),text("strong",value,"kpi-value"),text("span",sub,"kpi-sub")); return box;
    }));
  }
  function buildFilters() {
    for (const [key,label,type] of filterFields) {
      const wrap = document.createElement("div"); wrap.className = "filter-field";
      const l = text("label",label); l.htmlFor = "r-"+key;
      const input = document.createElement(type === "select" ? "select" : "input");
      if(type !== "select") input.type = type;
      input.id = l.htmlFor; input.addEventListener("change",render);
      wrap.append(l,input); $("filters").append(wrap);
    }
    const reset = text("button","Reset","secondary-button"); reset.type = "button";
    reset.addEventListener("click",() => { filterFields.forEach(([key]) => $("r-"+key).value = ""); render(); });
    $("filters").append(reset);
  }
  function setOptions(el, values, all="All") {
    const previous = el.value;
    el.replaceChildren(new Option(all,""),...values.map(v => new Option(v,v)));
    el.value = values.includes(previous) ? previous : "";
  }
  async function get(url,key) {
    const response = await fetch(url,{cache:"no-store"});
    const body = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    if (!Array.isArray(body[key])) throw new Error(`Invalid ${key} response`);
    return body[key];
  }
  async function load() {
    $("refresh-reports").disabled = true; loaded = false; toggleExports();
    $("report-status").textContent = "Loading collection records…";
    const [r] = await Promise.allSettled([get("/api/collections","records")]);
    records = r.status === "fulfilled" ? r.value : [];
    loaded = r.status === "fulfilled";
    $("report-status").textContent = loaded ? `${records.length} records loaded · ${new Date().toLocaleTimeString()}` : `Could not load collection records: ${r.reason.message}. Check the server/database, then refresh.`;
    $("connection-status").textContent = loaded ? "Connected" : "Data unavailable";
    $("connection-status").className = "connection-status "+(loaded?"online":"offline");
    filterFields.filter(f=>f[2]==="select").forEach(([key])=>setOptions($("r-"+key),unique(records.map(r=>r[key]))));
    render();
    $("refresh-reports").disabled = false;
    // Refresh the bin list separately, only if QR labels are open.
    if (qrOpen && !qrLoading) {
      binsLoaded = false;
      void loadQr();
    } else if (!qrOpen) {
      binsLoaded = false;
    }
  }
  function getBinSummary(rows) {
    const groups = new Map();
    rows.forEach(r=> { if(!groups.has(r.binId)) groups.set(r.binId,[]); groups.get(r.binId).push(r); });
    return [...groups].map(([binId,rs]) => {
      const values = rs.filter(reading).map(r=>r.fullness);
      const serviced = rs.filter(completed), measured = serviced.filter(reading);
      const lowCount = rs.filter(low).length, fullCount = rs.filter(r=>r.fullness===100||r.overflow).length;
      let recommendation = "Maintain schedule; continue monitoring";
      if (fullCount >= MIN_PICKUPS) recommendation = "Review for more frequent pickup or larger bin";
      else if (measured.length >= MIN_PICKUPS && lowCount/measured.length >= 0.5) recommendation = "Review for fewer pickups";
      else if (values.length < MIN_PICKUPS) recommendation = "Collect more readings before changing schedule";
      return {binId,location:rs[0].location,stream:rs[0].wasteStream,total:rs.length,completed:serviced.length,measured:measured.length,average:avg(values),lowCount,fullCount,recommendation};
    }).sort((a,b)=>b.fullCount-a.fullCount||b.lowCount-a.lowCount||String(a.binId).localeCompare(String(b.binId)));
  }
  function toggleExports() {
    ["export-records","export-bins","print-report","copy-summary"].forEach(id=>$(id).disabled = !loaded);
    $("email-summary").hidden = !loaded;
  }
  function render() {
    const f = Object.fromEntries(filterFields.map(([key])=>[key,$("r-"+key).value]));
    const invalid = f.from && f.to && f.from > f.to;
    view = invalid ? [] : records.filter(r=>(!f.from||r.date>=f.from)&&(!f.to||r.date<=f.to)&&["location","wasteStream","driverName"].every(k=>!f[k]||r[k]===f[k]));
    binSummary = getBinSummary(view);
    const n=view.length, done=view.filter(completed).length, values=view.filter(reading).map(r=>r.fullness), lows=view.filter(low).length;
    const issues=view.filter(issue).length, contam=view.filter(r=>r.contamination).length, over=view.filter(r=>r.overflow).length;
    const unavailable = !loaded || invalid;
    const count = v => unavailable ? "—" : String(v);
    $("export-count").textContent = !loaded ? "Data unavailable." : invalid ? "Start date must be before or equal to end date." : `${n} matching records.`;
    kpis("report-kpis",[["Completed pickups",count(done),`${count(n)} total records`],["Average fullness",unavailable?"—":fullness(avg(values)),"Recorded readings"],["Potentially unnecessary",count(lows),"Completed, below 50%"],["Service issues",count(issues),"Records with one or more issues"]]);
    const dates = unique(view.map(r=>r.date));
    const lines = ["SACRAMENTO STATE — WASTE COLLECTION REPORT",`Date filter: ${f.from||"Any"} to ${f.to||"Any"}`,`Observed dates: ${dates[0]||"—"} to ${dates.at(-1)||"—"}`,`Location: ${f.location||"All"} | Waste stream: ${f.wasteStream||"All"} | Driver: ${f.driverName||"All"}`,"",`Collection records: ${n}`,`Completed pickups: ${done}`,`Incomplete/partial services: ${n-done}`,`Average fullness: ${fullness(avg(values))}`,`Completed pickups below 50%: ${lows}`,`Overflow reports: ${over}`,`Contamination reports: ${contam} (${percent(contam,n)})`,`Damaged bin reports: ${view.filter(r=>r.damaged).length}`,`Records with issues: ${issues}`,"", "Recommendations are screening indicators, not confirmed schedule changes."];
    const summary = unavailable ? (invalid?"Invalid date range.":"Collection data unavailable. Refresh after checking the database.") : lines.join("\n");
    $("summary-text").textContent=summary;
    $("email-summary").href="mailto:?subject="+encodeURIComponent("Waste collection report")+"&body="+encodeURIComponent(summary);
    toggleExports(); if(invalid) ["export-records","export-bins","print-report","copy-summary"].forEach(id=>$(id).disabled=true);
    $("email-summary").hidden=unavailable;
    renderSavings(unavailable);
    table("recommendations",["Bin ID","Location","Waste stream","Records","Avg. fullness","Low-fill pickups","Full / overflow","Recommendation"],binSummary.map(b=>[b.binId,b.location,b.stream,b.total,fullness(b.average),b.lowCount,b.fullCount,b.recommendation]),"No matching bin records.");
    renderRequests();
  }
  function renderSavings(unavailable) {
    const n = view.filter(low).length;
    const val=id=>Math.max(0,Number($(id).value)||0);
    kpis("savings",[["Potential avoided pickups",unavailable?"—":n,"Review before changing routes"],["Estimated cost savings",unavailable?"—":money(n*val("a-cost")),"Illustrative, not actual savings"],["Estimated labor saved",unavailable?"—":(n*val("a-minutes")/60).toFixed(1)+" hr","If all flagged pickups are avoided"],["Estimated diesel saved",unavailable?"—":(n*val("a-fuel")).toFixed(2)+" gal","Illustrative estimate"]]);
  }
  function renderRequests() {
    const requests=view.flatMap(r=>[
      ...(r.damaged?[{r,type:"Maintenance",detail:r.maintenanceIssue||"Damaged bin"}]:[]),
      ...(!completed(r)?[{r,type:"Service follow-up",detail:r.serviceIssue||r.serviceCompleted}]:[])
    ]).sort((a,b)=>`${b.r.date} ${b.r.time}`.localeCompare(`${a.r.date} ${a.r.time}`));
    const rows=[];
    for(const {r,type,detail} of requests) {
      const id=r.recordId+":"+type, done=resolved.has(id);
      if(done&&!$("show-resolved").checked) continue;
      const button=text("button",done?"Reopen":"Resolve","secondary-button"); button.type="button";button.classList.add("no-print");
      button.addEventListener("click",()=>{ const next=new Set(resolved); if(done) next.delete(id); else next.add(id); try { localStorage.setItem(RESOLVED_KEY,JSON.stringify([...next])); resolved=next; renderRequests(); } catch { alert("Could not save resolution in this browser."); } });
      rows.push([r.recordId,r.date,r.binId,r.location,type,detail,done?"Resolved (local)":"Open",button]);
    }
    table("work-requests",["Record","Date","Bin","Location","Type","Details","Status","Action"],rows,"No matching work requests.");
  }
  // CSV escaping also prevents formula injection in spreadsheet applications.
  function csvCell(v) {
    if(Array.isArray(v)) v=v.join("; ");
    if(typeof v==="boolean") v=v?"Yes":"No";
    let s=String(v??"");
    if(/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(s)) s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }
  function download(name,headers,rows) {
    if(!loaded) return;
    const csv=[headers,...rows].map(row=>row.map(csvCell).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a"); a.href=url; a.download=name; document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function print(mode) {
    document.body.classList.remove("print-report","print-qr");document.body.classList.add(mode);window.print();
  }
  // Load the QR library only when labels are requested.
  function loadQrLibrary() {
    if (typeof window.QRCode === "function") return Promise.resolve();
    if (!qrLibraryPromise) {
      qrLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        const timer = setTimeout(() => fail(), 10000);
        function fail() {
          clearTimeout(timer);
          script.remove();
          reject(new Error("QR library unavailable"));
        }
        script.onload = () => {
          clearTimeout(timer);
          if (typeof window.QRCode === "function") resolve();
          else fail();
        };
        script.onerror = fail;
        document.head.append(script);
      }).catch(error => {
        qrLibraryPromise = undefined;
        throw error;
      });
    }
    return qrLibraryPromise;
  }

  // Do not fetch the bin list or generate any QR codes on initial page load.
  async function loadQr() {
    if (qrLoading || !qrOpen) return;
    qrLoading = true;
    qrReady = false;
    for (const id of ["qr-location", "qr-search", "qr-prev", "qr-next", "print-qr"]) $(id).disabled = true;
    $("qr-status").textContent = "Loading bin labels…";
    $("qr-grid").replaceChildren();
    $("qr-page").textContent = "";
    try {
      if (!binsLoaded) {
        bins = await get("/api/bins", "bins");
        binsLoaded = true;
      }
      // A library failure should not prevent the survey links from working.
      await loadQrLibrary().catch(() => {});
      qrReady = true;
      setOptions($("qr-location"), unique(bins.map(b => b.location)), "All locations");
      $("qr-location").disabled = false;
      $("qr-search").disabled = false;
      if (qrOpen) renderQr();
    } catch (error) {
      $("qr-status").textContent = `Could not load bins: ${error.message}. Hide and reopen QR codes to retry.`;
    } finally {
      qrLoading = false;
    }
  }

  function renderQr() {
    if (!qrOpen || !qrReady) return;
    const location = $("qr-location").value;
    const query = $("qr-search").value.trim().toLowerCase();
    const selected = bins.filter(b =>
      (!location || b.location === location) &&
      (!query || `${b.binId} ${b.location}`.toLowerCase().includes(query))
    );
    const pageCount = Math.max(1, Math.ceil(selected.length / QR_PAGE_SIZE));
    qrPage = Math.max(0, Math.min(qrPage, pageCount - 1));
    const start = qrPage * QR_PAGE_SIZE;
    const pageBins = selected.slice(start, start + QR_PAGE_SIZE);
    const grid = $("qr-grid");
    grid.replaceChildren();
    $("qr-prev").disabled = qrPage === 0;
    $("qr-next").disabled = qrPage >= pageCount - 1;
    $("qr-page").textContent = selected.length ? `Page ${qrPage + 1} of ${pageCount}` : "";
    const hasLibrary = typeof window.QRCode === "function";
    $("qr-status").textContent = selected.length
      ? `Showing ${start + 1}–${start + pageBins.length} of ${selected.length} bins.`
      : "No matching registered bins.";
    if (!hasLibrary) $("qr-status").textContent += " QR library unavailable; survey links still work. Reopen the section to retry.";
    let generated = 0;
    // Generate only the current 12 labels; discard the previous page.
    for (const b of pageBins) {
      const url = new URL("survey.html", window.location.href);
      url.searchParams.set("binId", b.binId);
      const card = document.createElement("div");
      card.className = "qr-card";
      const code = document.createElement("div");
      code.className = "qr-code";
      if (hasLibrary) {
        try {
          new window.QRCode(code, {text: url.href, width: 144, height: 144, colorDark: "#000000", colorLight: "#ffffff"});
          generated++;
        } catch {
          code.textContent = "QR unavailable";
        }
      } else {
        code.hidden = true;
      }
      const link = text("a", b.binId);
      link.href = url.href;
      card.append(code, link, text("div", b.location), text("div", `${b.wasteStream} · ${b.container}`, "muted"));
      grid.append(card);
    }
    if (hasLibrary && generated !== pageBins.length) $("qr-status").textContent += " Some labels could not be generated.";
    $("print-qr").disabled = !generated || generated !== pageBins.length;
  }

  $("toggle-qr").addEventListener("click", () => {
    qrOpen = !qrOpen;
    $("qr-content").hidden = !qrOpen;
    $("toggle-qr").textContent = qrOpen ? "Hide QR codes" : "Show QR codes";
    $("toggle-qr").setAttribute("aria-expanded", String(qrOpen));
    if (qrOpen) {
      void loadQr();
    } else {
      $("qr-grid").replaceChildren();
    }
  });
  $("qr-prev").addEventListener("click", () => { qrPage--; renderQr(); });
  $("qr-next").addEventListener("click", () => { qrPage++; renderQr(); });
  $("qr-search").addEventListener("input", () => { qrPage = 0; renderQr(); });
  buildFilters();
  $("refresh-reports").addEventListener("click",load);
  $("export-records").addEventListener("click",()=>{
    const columns=[["Record ID","recordId"],["Driver","driverName"],["Date","date"],["Time","time"],["Location","location"],["Account","accountNumber"],["Bin ID","binId"],["Waste stream","wasteStream"],["Container","container"],["Fullness (%)","fullness"],["Service completed","serviceCompleted"],["Service issue","serviceIssue"],["Overflow","overflow"],["Contamination","contamination"],["Contamination types","contaminationTypes"],["Damaged","damaged"],["Maintenance issue","maintenanceIssue"],["Comments","comments"],["Photo URLs (may expire)","photos"]];
    download("waste-collection-records.csv",columns.map(c=>c[0]),view.map(r=>columns.map(c=>r[c[1]])));
  });
  $("export-bins").addEventListener("click",()=>download("waste-bin-summary.csv",["Bin ID","Location","Waste stream","Records","Completed","Average fullness (%)","Low-fill pickups","Full or overflow","Recommendation"],binSummary.map(b=>[b.binId,b.location,b.stream,b.total,b.completed,b.average==null?"":b.average.toFixed(1),b.lowCount,b.fullCount,b.recommendation])));
  $("print-report").addEventListener("click",()=>print("print-report"));
  $("print-qr").addEventListener("click",()=>print("print-qr"));
  window.addEventListener("afterprint",()=>document.body.classList.remove("print-report","print-qr"));
  $("copy-summary").addEventListener("click",async()=>{try {await navigator.clipboard.writeText($("summary-text").textContent);$("copy-summary").textContent="Copied!";setTimeout(()=>$("copy-summary").textContent="Copy summary",1500);} catch {alert("Copy failed. Select the summary text and copy it manually.");}});
  ["a-cost","a-minutes","a-fuel"].forEach(id=>$(id).addEventListener("input",render));
  $("show-resolved").addEventListener("change",renderRequests);
  $("qr-location").addEventListener("change", () => { qrPage = 0; renderQr(); });
  load();
})();
