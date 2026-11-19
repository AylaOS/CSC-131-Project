// Reads collection records and bin registry (supervisor and admin-side)

// Loads pickups from our server (GET /api/collections), which reads Supabase with the Service-role key, so the browser doesn't need direct table access; Charts use chart.js
(function () {
  "use strict";

  // ------ CONFIG ------
  const REFRESH_SECONDS = 30; // auto-refresh interval (0 = off)
  const MIN_PICKUPS = 3;      // a bin needs at least this many pickups to show in the bin tables
  const LOW_SHARE = 0.5;      // "under half full" bins: this share of pickups below 50% full
  const FULL_COUNT = 3;       // "frequently full" bins: full (100%) or overflowing this many times
  const TOP_LOCATIONS = 10;   // bars shown in the location charts
  const PAGE_SIZE = 25;       // rows in "Most recent pickups" before "Show more"
  const STREAM_COLORS = { Trash: "#6b6f7a", Recycling: "#3a6fd8", Organics: "#4c9a52" };
  // -------------------

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const avg = list => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
  const pct = (n, d) => (d ? (n / d) * 100 : 0);
  const hasFullness = r => typeof r.fullness === "number";
  const isIssue = r => r.serviceCompleted !== "Yes" || r.overflow || r.contamination || r.damaged;

  let rows = [], view = [], charts = {}, shown = PAGE_SIZE, range = { min: "", max: "" };

  $("underRule").textContent = `At least ${MIN_PICKUPS} pickups, and ${Math.round(LOW_SHARE * 100)}% or more of them below 50% full.`;
  $("fullRule").textContent = `Full (100%) or material outside the bin ${FULL_COUNT}+ times.`;


//Loads data from collections
  async function load() {
    try {
      const res = await fetch("/api/collections");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Server returned ${res.status}`);
      rows = body.records || [];
      $("notice").innerHTML = rows.length ? "" :
        '<div class="msg">No pickups yet. Submit a collection survey, or load the demo data with <code>npm run seed -- --sample</code>.</div>';
      $("sub").textContent = `${rows.length.toLocaleString()} records · updated ${new Date().toLocaleTimeString()}`;
    } catch (e) {
      $("notice").innerHTML = '<div class="msg err">Could not load data: ' + esc(e.message || e) + "</div>";
      $("sub").textContent = "Load failed";
    }
    fillFilters();
    render();
  }


//Filters
  function fillFilters() {
    const options = (id, key) => {
      const sel = $(id), keep = sel.value;
      const values = [...new Set(rows.map(r => r[key]).filter(Boolean))].sort();
      sel.innerHTML = '<option value="">All</option>' + values.map(v => `<option>${esc(v)}</option>`).join("");
      sel.value = values.includes(keep) ? keep : "";
    };
    options("fLocation", "location");
    options("fStream", "wasteStream");
    options("fDriver", "driverName");

    const { min, max } = dateRange();
    if (!$("fFrom").value || $("fFrom").value === range.min) $("fFrom").value = min;
    if (!$("fTo").value || $("fTo").value === range.max) $("fTo").value = max;
    range = { min, max };
  }

  function dateRange() {
    const dates = rows.map(r => r.date).filter(Boolean).sort();
    return { min: dates[0] || "", max: dates[dates.length - 1] || "" };
  }

  function resetDates() {
    range = dateRange();
    $("fFrom").value = range.min;
    $("fTo").value = range.max;
  }

  function applyFilters() {
    const from = $("fFrom").value, to = $("fTo").value;
    const loc = $("fLocation").value, stream = $("fStream").value, driver = $("fDriver").value;
    return rows.filter(r =>
      (!from || r.date >= from) && (!to || r.date <= to) &&
      (!loc || r.location === loc) && (!stream || r.wasteStream === stream) &&
      (!driver || r.driverName === driver));
  }


//Render 
  function render() {
    view = applyFilters();
    renderKpis();
    renderCharts();
    renderBinTables();
    renderServiceTable();
    renderPhotos();
    renderRecent();
  }

  function renderKpis() {
    const n = view.length;
    const completed = view.filter(r => r.serviceCompleted === "Yes").length;
    const readings = view.filter(hasFullness).map(r => r.fullness);
    const avgFull = avg(readings);
    const low = readings.filter(v => v < 50).length;
    const issues = view.filter(isIssue).length;
    const contam = view.filter(r => r.contamination).length;

    $("kTotal").textContent = n.toLocaleString();
    $("kTotalSub").textContent = `Pickups · ${completed.toLocaleString()} completed`;
    $("kFull").textContent = avgFull == null ? "–" : avgFull.toFixed(1) + "%";
    $("gFull").style.width = (avgFull == null ? 0 : Math.max(0, Math.min(100, avgFull))) + "%";
    $("kLow").textContent = readings.length ? pct(low, readings.length).toFixed(1) + "%" : "–";
    $("kLowSub").textContent = `Collected under half full · ${low.toLocaleString()} pickups`;
    $("kIssues").textContent = issues.toLocaleString();
    $("kIssuesSub").textContent = n ? `Pickups with issues · ${pct(issues, n).toFixed(1)}% of all` : "Pickups with issues";
    $("kContam").textContent = n ? pct(contam, n).toFixed(1) + "%" : "–";
    $("kContamSub").textContent = `Contamination rate · ${contam.toLocaleString()} pickups`;
  }

  function renderCharts() {
    const css = getComputedStyle(document.documentElement);
    const color = name => css.getPropertyValue(name).trim();
    const c = { accent: color("--accent"), gold: color("--gold"), warn: color("--warn"), mute: color("--mute"), line: color("--line") };

    const byDate = groupBy(view, r => r.date);
    const days = Object.keys(byDate).sort();
    const dayLabels = days.map(d => d.slice(5)); // MM-DD keeps the axis readable

    bar("chartDate", dayLabels, days.map(d => byDate[d].length), c, { label: "Pickups" });
    bar("chartIssues", dayLabels, days.map(d => byDate[d].filter(isIssue).length), c,
      { label: "Pickups with issues", color: c.gold, hover: c.warn });

    const fullnessByDay = days.map(d => {
      const v = avg(byDate[d].filter(hasFullness).map(r => r.fullness));
      return v == null ? null : Math.round(v * 10) / 10;
    });
    draw("chartFullness", {
      type: "line",
      data: { labels: dayLabels, datasets: [{ label: "Average fullness", data: fullnessByDay, borderColor: c.accent,
        backgroundColor: c.accent, pointHoverBackgroundColor: c.gold, tension: 0.25, spanGaps: true }] },
      options: baseOptions(c, { yMax: 100, suffix: "%" })
    });

    const locations = topCounts(view, r => r.location);
    bar("chartLocation", locations.top.map(x => x.label), locations.top.map(x => x.value), c,
      { label: "Pickups", horizontal: true });
    $("locationNote").textContent = locations.rest ? `Top ${TOP_LOCATIONS} shown · ${locations.rest} more locations (use the Location filter to see one).` : "";

    const service = topCounts(view.filter(r => r.serviceCompleted !== "Yes"), r => r.location);
    bar("chartService", service.top.map(x => x.label), service.top.map(x => x.value), c,
      { label: "Missed or partial services", horizontal: true, color: c.gold, hover: c.warn });
    $("serviceNote").textContent = !service.top.length ? "No missed or partial services for these filters."
      : service.rest ? `Top ${TOP_LOCATIONS} shown · ${service.rest} more locations.` : "";

    const streams = groupBy(view, r => r.wasteStream);
    const streamNames = Object.keys(streams).sort();
    bar("chartStream", streamNames, streamNames.map(s => streams[s].length), c,
      { label: "Pickups", colors: streamNames.map(s => STREAM_COLORS[s] || c.accent) });

    const levels = [0, 25, 50, 75, 100];
    bar("chartLevels", levels.map(l => l + "%"), levels.map(l => view.filter(r => r.fullness === l).length), c,
      { label: "Pickups" });

    bar("chartContamRate", streamNames,
      streamNames.map(s => Math.round(pct(streams[s].filter(r => r.contamination).length, streams[s].length) * 10) / 10), c,
      { label: "Contamination rate", colors: streamNames.map(s => STREAM_COLORS[s] || c.accent), suffix: "%" });

    const types = topCounts(view.flatMap(r => (r.contaminationTypes || []).map(t => ({ t }))), x => x.t);
    bar("chartContamTypes", types.top.map(x => x.label), types.top.map(x => x.value), c,
      { label: "Pickups", horizontal: true, color: c.gold, hover: c.warn });
  }

  function bar(id, labels, data, c, opts) {
    const horizontal = Boolean(opts.horizontal);
    draw(id, {
      type: "bar",
      data: { labels, datasets: [{ label: opts.label, data,
        backgroundColor: opts.colors || opts.color || c.accent,
        hoverBackgroundColor: opts.colors ? undefined : (opts.hover || c.gold),
        borderRadius: 3, maxBarThickness: 48 }] },
      options: baseOptions(c, { horizontal, suffix: opts.suffix })
    });
  }

  function baseOptions(c, { horizontal = false, yMax, suffix = "" } = {}) {
    const valueAxis = { beginAtZero: true, max: yMax, ticks: { color: c.mute, precision: 0, callback: v => v + suffix }, grid: { color: c.line } };
    const labelAxis = { ticks: { color: c.mute, autoSkip: !horizontal }, grid: { display: false } };
    return {
      responsive: true, maintainAspectRatio: false, indexAxis: horizontal ? "y" : "x",
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue}${suffix}` } } },
      scales: horizontal ? { x: valueAxis, y: labelAxis } : { x: labelAxis, y: valueAxis }
    };
  }

  function draw(id, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), config);
  }

//Tables
  function renderBinTables() {
    const bins = Object.entries(groupBy(view, r => r.binId)).map(([binId, list]) => {
      const readings = list.filter(hasFullness).map(r => r.fullness);
      return {
        binId, location: list[0].location, stream: list[0].wasteStream, container: list[0].container,
        pickups: list.length, avgFull: avg(readings),
        lowShare: readings.length ? readings.filter(v => v < 50).length / readings.length : 0,
        fullTimes: list.filter(r => r.fullness === 100 || r.overflow).length
      };
    });

    const under = bins.filter(b => b.pickups >= MIN_PICKUPS && b.lowShare >= LOW_SHARE)
      .sort((a, b) => b.lowShare - a.lowShare || a.avgFull - b.avgFull);
    table("tableUnder", ["Bin", "Location", "Pickups", "Avg full", "Under 50%"], under, b => [
      binCell(b), esc(b.location), b.pickups,
      b.avgFull == null ? "–" : Math.round(b.avgFull) + "%",
      `<span class="tag good">${Math.round(b.lowShare * 100)}%</span>`
    ], "No underused bins for these filters.");

    const full = bins.filter(b => b.fullTimes >= FULL_COUNT).sort((a, b) => b.fullTimes - a.fullTimes);
    table("tableFull", ["Bin", "Location", "Pickups", "Full / overflow"], full, b => [
      binCell(b), esc(b.location), b.pickups,
      `<span class="tag${b.fullTimes / b.pickups >= 0.5 ? " bad" : ""}">${b.fullTimes}×</span>`
    ], "No frequently full bins for these filters.");
  }

  function binCell(b) {
    return `${esc(b.binId)}<br><span class="sub">${esc(b.stream)} · ${esc(b.container)}</span>`;
  }

  function renderServiceTable() {
    const list = view.filter(r => r.serviceCompleted !== "Yes").sort(newestFirst);
    table("tableService", ["Date", "Time", "Bin", "Location", "Status", "Reason", "Driver"], list, r => [
      esc(r.date), esc(r.time), esc(r.binId), esc(r.location),
      `<span class="tag${r.serviceCompleted === "No" ? " bad" : ""}">${esc(r.serviceCompleted)}</span>`,
      esc(r.serviceIssue || "–"), esc(r.driverName)
    ], "No missed, delayed or incomplete services for these filters.", true);
  }

  function renderRecent() {
    const list = view.slice().sort(newestFirst);
    table("tableRecent", ["Record", "Date", "Time", "Driver", "Bin", "Location", "Fullness", "Service", "Issues"],
      list.slice(0, shown), r => {
        const flags = [r.overflow && "Overflow", r.contamination && "Contamination", r.damaged && "Damaged"].filter(Boolean);
        return [
          esc(r.recordId), esc(r.date), esc(r.time), esc(r.driverName), esc(r.binId), esc(r.location),
          hasFullness(r) ? r.fullness + "%" : "–",
          `<span class="tag${r.serviceCompleted === "Yes" ? " good" : r.serviceCompleted === "No" ? " bad" : ""}">${esc(r.serviceCompleted)}</span>`,
          flags.length ? `<span class="tag">${flags.join(", ")}</span>` : "–"
        ];
      }, "No pickups for these filters.", true);

    if (list.length > shown) {
      const more = document.createElement("button");
      more.className = "more";
      more.textContent = `Show more (${(list.length - shown).toLocaleString()} left)`;
      more.addEventListener("click", () => { shown += PAGE_SIZE * 4; renderRecent(); });
      $("tableRecent").appendChild(more);
    }
  }


  function table(id, headers, list, cells, emptyText, clickable) {
    const box = $(id);
    if (!list.length) {
      box.innerHTML = `<p class="empty">${emptyText}</p>`;
      return;
    }
    box.innerHTML = "<table><thead><tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr></thead><tbody>" +
      list.map(r => `<tr${clickable ? ` class="clickable" tabindex="0" data-id="${esc(r.recordId)}"` : ""}>` +
        cells(r).map(v => `<td>${v}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
    if (clickable) {
      box.querySelectorAll("tr.clickable").forEach(tr => {
        tr.addEventListener("click", () => openDetails(tr.dataset.id));
        tr.addEventListener("keydown", e => { if (e.key === "Enter") openDetails(tr.dataset.id); });
      });
    }
  }


//Photos and Details

  function renderPhotos() {
    const list = view.filter(r => r.photos && r.photos.length).sort(newestFirst);
    const box = $("photos");
    if (!list.length) {
      box.innerHTML = '<p class="empty">No photos for these filters.</p>';
      return;
    }
    box.innerHTML = list.map(r => `
      <button class="photo" data-id="${esc(r.recordId)}">
        <img src="${esc(r.photos[0])}" alt="Photo of bin ${esc(r.binId)}" loading="lazy">
        <span><strong>${esc(r.binId)}</strong><br><span class="sub">${esc(r.date)} · ${esc(r.location)}</span></span>
      </button>`).join("");
    box.querySelectorAll(".photo").forEach(b => b.addEventListener("click", () => openDetails(b.dataset.id)));
  }

  function openDetails(id) {
    const r = rows.find(x => x.recordId === id);
    if (!r) return;
    const yesNo = v => (v ? "Yes" : "No");
    const fields = [
      ["Record", r.recordId], ["Driver", r.driverName], ["Date", `${r.date} ${r.time}`],
      ["Location", r.location], ["Account #", r.accountNumber], ["Bin", r.binId],
      ["Waste stream", r.wasteStream], ["Container", r.container],
      ["Fullness", hasFullness(r) ? r.fullness + "%" : "Not recorded"],
      ["Service completed", r.serviceCompleted], ["Service issue", r.serviceIssue],
      ["Overflow", yesNo(r.overflow)],
      ["Contamination", r.contamination ? "Yes" + (r.contaminationTypes.length ? ` (${r.contaminationTypes.join(", ")})` : "") : "No"],
      ["Damaged / maintenance", r.damaged ? "Yes" + (r.maintenanceIssue ? ` — ${r.maintenanceIssue}` : "") : "No"],
      ["Comments", r.comments]
    ].filter(([, v]) => v !== "" && v != null);

    const dialog = $("details");
    dialog.innerHTML = `<div class="dialog-body">
      <button class="dialog-close" aria-label="Close">✕</button>
      <h2>${esc(r.recordId)} · ${esc(r.binId)}</h2>
      ${r.photos.length ? `<div class="dialog-photos">${r.photos.map(p => `<img src="${esc(p)}" alt="Pickup photo">`).join("")}</div>` : ""}
      <table class="details">${fields.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join("")}</table>
    </div>`;
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
    dialog.showModal();
  }
  $("details").addEventListener("click", e => { if (e.target.id === "details") e.target.close(); });

//Helper Functions

  function groupBy(list, keyFn) {
    const out = {};
    list.forEach(item => { const k = keyFn(item); if (k) (out[k] = out[k] || []).push(item); });
    return out;
  }

  function topCounts(list, keyFn) {
    const all = Object.entries(groupBy(list, keyFn))
      .map(([label, items]) => ({ label, value: items.length }))
      .sort((a, b) => b.value - a.value);
    return { top: all.slice(0, TOP_LOCATIONS), rest: Math.max(0, all.length - TOP_LOCATIONS) };
  }

  function newestFirst(a, b) {
    return (b.date + b.time).localeCompare(a.date + a.time);
  }

//Events
  ["fFrom", "fTo", "fLocation", "fStream", "fDriver"].forEach(id =>
    $(id).addEventListener("change", () => { shown = PAGE_SIZE; render(); }));
  $("fReset").addEventListener("click", () => {
    ["fLocation", "fStream", "fDriver"].forEach(id => ($(id).value = ""));
    resetDates();
    shown = PAGE_SIZE;
    render();
  });
  $("refresh").addEventListener("click", load);
  if (REFRESH_SECONDS > 0) setInterval(load, REFRESH_SECONDS * 1000);
  load();
})();