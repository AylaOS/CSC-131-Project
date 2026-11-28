// History page: view, remove, restore and recover collection records.
// Nothing here can erase data. The server only hides rows, and the
// database keeps a copy of anything an admin deletes for good.
(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));

  const VIEWS = {
    records: "active",
    removed: "removed",
    archive: "archive",
    log: "log"
  };

  const HELP = {
    records: "Current records. Remove hides a record from the " +
      "app but keeps it in the database.",
    removed: "Hidden records. Restore puts them back in the " +
      "dashboard, reports and map.",
    archive: "Records a database admin deleted for good. Recover " +
      "puts them back, with their original record number.",
    log: "Every remove, restore and recover, newest first."
  };

  const EMPTY = {
    records: "No records match these filters.",
    removed: "Nothing has been removed.",
    archive: "Nothing has been permanently deleted.",
    log: "No activity yet."
  };

  let tab = "records";
  let rows = [];
  const selected = new Set();

  // archived rows are picked by archiveId, all others by recordId
  const keyOf = r => String(r.archiveId ?? r.recordId);

  function setStatus(message, critical) {
    const box = $("status");
    box.hidden = !message;
    box.textContent = message || "";
    box.classList.toggle("critical", Boolean(critical));
  }

  function when(value) {
    if (!value) return "";
    const d = new Date(value);
    return isNaN(d) ? String(value) : d.toLocaleString();
  }

  function issues(r) {
    const list = [];
    if (r.serviceCompleted && r.serviceCompleted !== "Yes") {
      list.push("Service " + r.serviceCompleted.toLowerCase());
    }
    if (r.overflow) list.push("Overflow");
    if (r.contamination) list.push("Contamination");
    if (r.damaged) list.push("Damaged");
    if (!list.length) return '<span class="badge good">None</span>';
    return list
      .map(t => `<span class="badge warning">${esc(t)}</span>`)
      .join("");
  }

  async function load() {
    setStatus("");
    selected.clear();
    $("table").innerHTML = '<p class="muted">Loading…</p>';
    try {
      const url = `/api/history?view=${VIEWS[tab]}`;
      const res = await window.api(url, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Server returned ${res.status}`);
      }
      rows = body.records || body.log || [];
    } catch (e) {
      rows = [];
      setStatus("Could not load history: " + (e.message || e), true);
    }
    render();
  }

  function filtered() {
    if (tab === "log") return rows;
    const q = $("f-search").value.trim().toLowerCase();
    const from = $("f-from").value;
    const to = $("f-to").value;
    return rows.filter(r => {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (!q) return true;
      const text = [r.binId, r.location, r.driverName]
        .join(" ").toLowerCase();
      return text.includes(q);
    });
  }

  function recordTable(list) {
    let extraHead = "";
    if (tab === "removed") {
      extraHead = "<th>Removed on</th><th>Removed by</th>";
    } else if (tab === "archive") {
      extraHead = "<th>Deleted on</th>";
    }
    const head = `
      <tr>
        <th class="check-col">
          <input type="checkbox" id="select-all"
            aria-label="Select all rows">
        </th>
        <th>Record</th><th>Date</th><th>Time</th><th>Driver</th>
        <th>Location</th><th>Bin</th><th>Stream</th>
        <th>Fullness</th><th>Issues</th>${extraHead}
      </tr>`;
    const body = list.map(r => {
      const key = esc(keyOf(r));
      const full = typeof r.fullness === "number"
        ? r.fullness + "%" : "—";
      let extra = "";
      if (tab === "removed") {
        extra = `<td>${esc(when(r.deletedAt))}</td>
          <td>${esc(r.deletedBy)}</td>`;
      } else if (tab === "archive") {
        extra = `<td>${esc(when(r.deletedAt))}</td>`;
      }
      return `
      <tr>
        <td><input type="checkbox" data-id="${key}"
          aria-label="Select record ${esc(r.recordId)}"
          ${selected.has(keyOf(r)) ? "checked" : ""}></td>
        <td>${esc(r.recordId)}</td>
        <td>${esc(r.date)}</td>
        <td>${esc(r.time)}</td>
        <td>${esc(r.driverName)}</td>
        <td>${esc(r.location)}</td>
        <td>${esc(r.binId)}</td>
        <td>${esc(r.wasteStream)}</td>
        <td>${full}</td>
        <td>${issues(r)}</td>${extra}
      </tr>`;
    }).join("");
    return `<table class="data-table"><thead>${head}</thead>
      <tbody>${body}</tbody></table>`;
  }

  function logTable(list) {
    const body = list.map(r => `
      <tr>
        <td>${esc(when(r.createdAt))}</td>
        <td>${esc(r.action)}</td>
        <td>${esc(r.recordId)}</td>
        <td>${esc(r.username)}</td>
      </tr>`).join("");
    return `<table class="data-table">
      <thead><tr><th>When</th><th>Action</th>
      <th>Record</th><th>By</th></tr></thead>
      <tbody>${body}</tbody></table>`;
  }

  function render() {
    const list = filtered();
    const noun = tab === "log" ? "entries" : "records";
    $("count").textContent = `${list.length} of ${rows.length} ${noun}`;
    $("tab-help").textContent = HELP[tab];
    $("filters").hidden = tab === "log";

    if (!list.length) {
      $("table").innerHTML = `<p class="muted">${EMPTY[tab]}</p>`;
    } else {
      $("table").innerHTML =
        tab === "log" ? logTable(list) : recordTable(list);
    }
    updateActions();
  }

  function updateActions() {
    const none = selected.size === 0;
    $("act-remove").hidden = tab !== "records";
    $("act-restore").hidden = tab !== "removed";
    $("act-recover").hidden = tab !== "archive";
    $("act-remove").disabled = none;
    $("act-restore").disabled = none;
    $("act-recover").disabled = none;
    const all = $("select-all");
    if (all) {
      const boxes = document.querySelectorAll("[data-id]");
      all.checked = boxes.length > 0 && selected.size === boxes.length;
    }
  }

  const ACTIONS = {
    remove: {
      done: "removed",
      ask: n => `Remove ${n} record(s)? They are hidden from the ` +
        "app but stay in the database. You can restore them from " +
        "the Removed tab."
    },
    restore: {
      done: "restored",
      ask: n => `Restore ${n} record(s)?`
    },
    recover: {
      done: "recovered",
      ask: n => `Recover ${n} permanently deleted record(s)? ` +
        "They come back with their original record numbers."
    }
  };

  async function act(kind) {
    const ids = [...selected];
    if (!ids.length) return;
    const action = ACTIONS[kind];
    if (!window.confirm(action.ask(ids.length))) return;

    $("act-remove").disabled = true;
    $("act-restore").disabled = true;
    $("act-recover").disabled = true;
    try {
      const res = await window.api(`/api/history/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Server returned ${res.status}`);
      }
      await load();
      setStatus(`${body.changed} record(s) ${action.done}.`);
    } catch (e) {
      setStatus("Could not finish: " + (e.message || e), true);
      updateActions();
    }
  }

  function switchTab(name) {
    tab = name;
    document.querySelectorAll(".tab").forEach(btn => {
      const on = btn.dataset.tab === name;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", String(on));
    });
    load();
  }

  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  $("table").addEventListener("change", e => {
    const box = e.target;
    if (box.id === "select-all") {
      document.querySelectorAll("[data-id]").forEach(b => {
        b.checked = box.checked;
        const id = b.dataset.id;
        if (box.checked) selected.add(id); else selected.delete(id);
      });
    } else if (box.dataset.id) {
      if (box.checked) selected.add(box.dataset.id);
      else selected.delete(box.dataset.id);
    }
    updateActions();
  });

  ["f-search", "f-from", "f-to"].forEach(id => {
    $(id).addEventListener("input", () => {
      selected.clear();
      render();
    });
  });

  $("act-remove").addEventListener("click", () => act("remove"));
  $("act-restore").addEventListener("click", () => act("restore"));
  $("act-recover").addEventListener("click", () => act("recover"));
  $("refresh").addEventListener("click", load);

  // wait for the login check from app.js before loading data
  window.authReady.then(load).catch(() => {});
})();