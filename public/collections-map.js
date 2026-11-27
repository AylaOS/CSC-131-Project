/* map code for "collections map.html". pickups come from the server's /api/collections route
through window.api (app.js), using the logged-in supervisor's session like the dashboard. */
(function () {
"use strict";

// ====== CONFIG ======
const GOOGLE_KEY   = "AIzaSyAgapzOcxmx6j38kFUKxTxy0p17s6i8DBE";
const REFRESH_SECONDS = 30;

// [location name as in the bins table, account numbers]. Pickups are matched by account number / bin_id.
const LOCATIONS = [
  ["NIMBUS FLATS",["157410"]],
  ["AQUATIC CENTER",["173577"]],
  ["DOWNTOWN CAMPUS",["190408"]],
  ["ALPINE",["201003"]],
  ["AMADOR",["201005"]],
  ["ARBORETUM",["201006"]],
  ["ART SCULPTURE LAB",["201007"]],
  ["ATHLETIC CENTER (FORM. STUDENT HEALTH)",["201008"]],
  ["BRIGHTON",["201009"]],
  ["CAPISTRANO",["201010"]],
  ["FACILITIES MANAGEMENT",["201011"]],
  ["BROAD FIELD HOUSE (ATHLETICS)",["201012"]],
  ["KADEMA/LASSEN",["201013"]],
  ["MARIPOSA",["201018"]],
  ["MENDOCINO",["201019"]],
  ["PUBLIC SAFETY (INSIDE FENCE)",["201020"]],
  ["RECEIVING/MAIL/REPROGRAPHICS",["201021"]],
  ["RIVERSIDE ENGINEERING",["201022"]],
  ["SACRAMENTO",["201023"]],
  ["SHASTA HALL",["201024"]],
  ["SEQUOIA",["201025"]],
  ["TAHOE HALL",["201026"]],
  ["TSCHANNEN SCIENCE COMPLEX",["201027"]],
  ["SIERRA HALL",["201028"]],
  ["KLAMATH HALL",["201029"]],
  ["DRAPER HALL",["201030"]],
  ["DESMOND HALL",["201032"]],
  ["AMC NORTH",["201033"]],
  ["AMC SOUTH",["201034"]],
  ["HOUSINGRIVERVIEW E",["201035"]],
  ["RIVERVIEW N",["201036"]],
  ["PERM RO",["201037"]],
  ["FM TRAILERS",["201046"]],
  ["LIBRARY - BOOK REC",["201744"]],
  ["UNIVERSITY UNION",["202251", "202252"]],
  ["THE WELL FL",["202253"]],
  ["THE WELL RO",["202254"]],
  ["HARPER ALUMNI CTR",["202334"]],
  ["RIVERFRONT CR FL",["202426"]],
  ["RIVERFRONT CR RO",["202427"]],
  ["DINING COMMONS RO",["202431"]],
  ["UNIV UNION E.DOCK",["202432", "202440"]],
  ["DINING COMMONS",["202433"]],
  ["FOLSOM HALL",["202442"]],
  ["BOOKSTORE",["202469"]],
  ["BOOKSTORE RO",["202471"]],
  ["NAPA HALL RO",["202472"]],
  ["NAPA HALL",["202473"]],
  ["MODOC HALL",["202475"]],
  ["23RD AVE WAREHOUSE",["202476"]],
  ["ARBORETUM TEMP",["203596"]],
  ["BAC YARD",["204226"]],
  ["HORNET NEST FEST",["204542"]],
  ["LIBRARY CP",["204622"]],
  ["TAILGATING LOT 8",["204885"]],
  ["BSE ENG CENTRAL",["205898"]],
  ["HOUSING-RIVERVIEW",["206097"]],
  ["ALUMNI CENTER TEMP",["206802"]],
  ["HORNET STADIUM TM",["206804"]],
  ["ASSOC STUDENT/CHIL",["206805"]],
  ["FM TRAILERS/FTBALL",["206878"]],
  ["FACILITY MGT TEMP",["211404"]],
  ["BASKETBALL FACILIT",["212579"]],
  ["MT WHITNEY",["212635"]]
];
// Pin positions you supplied. Anything not listed here is looked up by name, or placed by hand with "Adjust pins".
const PINS = {
  "ALPINE": { lat: 38.5616357, lng: -121.4242673 },  // your Google Maps link
  "AMADOR": { lat: 38.5590313, lng: -121.424791 },  // your Google Maps link
  "AMC NORTH": { lat: 38.566051, lng: -121.4258325 },  // your Google Maps link, American River Courtyard
  "AMC SOUTH": { lat: 38.566161, lng: -121.4257225 },  // your Google Maps link, American River Courtyard (nudged so pins don't overlap)
  "AQUATIC CENTER": { lat: 38.6345348, lng: -121.2183666 },  // your Google Maps link
  "ARBORETUM": { lat: 38.5643409, lng: -121.4291916 },  // your Google Maps link
  "ART SCULPTURE LAB": { lat: 38.5578779, lng: -121.4190552 },  // your Google Maps link
  "BAC YARD": { lat: 38.552775, lng: -121.420687 },  // your Google Maps link
  "BOOKSTORE": { lat: 38.5598848, lng: -121.4206652 },  // your Google Maps link
  "BOOKSTORE RO": { lat: 38.5599948, lng: -121.4205552 },  // your Google Maps link (nudged so pins don't overlap)
  "BRIGHTON": { lat: 38.5613987, lng: -121.4236614 },  // your Google Maps link
  "BROAD FIELD HOUSE (ATHLETICS)": { lat: 38.5545402, lng: -121.4225207 },  // your Google Maps link
  "CAPISTRANO": { lat: 38.5600658, lng: -121.4256357 },  // your Google Maps link
  "DESMOND HALL": { lat: 38.5664181, lng: -121.424421 },  // your Google Maps link
  "DINING COMMONS": { lat: 38.5673702, lng: -121.4258862 },  // your Google Maps link
  "DINING COMMONS RO": { lat: 38.5674802, lng: -121.4257762 },  // your Google Maps link (nudged so pins don't overlap)
  "DOWNTOWN CAMPUS": { lat: 38.5725753, lng: -121.5065047 },  // your Google Maps link
  "DRAPER HALL": { lat: 38.5672791, lng: -121.4248711 },  // your Google Maps link
  "FACILITIES MANAGEMENT": { lat: 38.5629261, lng: -121.4293403 },  // your Google Maps link
  "FOLSOM HALL": { lat: 38.5513407, lng: -121.4141637 },  // your Google Maps link
  "HARPER ALUMNI CTR": { lat: 38.5547923, lng: -121.4210476 },  // your Google Maps link
  "ALUMNI CENTER TEMP": { lat: 38.5549023, lng: -121.4209376 },  // your Google Maps link (nudged so pins don't overlap)
  "HORNET STADIUM TM": { lat: 38.5557157, lng: -121.4229836 },  // your Google Maps link
  "HOUSINGRIVERVIEW E": { lat: 38.5658043, lng: -121.4243829 },  // your Google Maps link, Riverview Hall
  "HOUSING-RIVERVIEW": { lat: 38.5659143, lng: -121.4242729 },  // your Google Maps link, Riverview Hall (nudged so pins don't overlap)
  "KADEMA/LASSEN": { lat: 38.5622439, lng: -121.4256567 },  // your Google Maps link
  "KLAMATH HALL": { lat: 38.5665123, lng: -121.4273478 },  // your Google Maps link
  "LIBRARY CP": { lat: 38.5595419, lng: -121.4236427 },  // your Google Maps link (Library - Book Rec: same building, you didn't send a separate link)
  "LIBRARY - BOOK REC": { lat: 38.5596519, lng: -121.4235327 },  // your Google Maps link (Library - Book Rec: same building, you didn't send a separate link) (nudged so pins don't overlap)
  "MARIPOSA": { lat: 38.5617112, lng: -121.4254877 },  // your Google Maps link
  "MENDOCINO": { lat: 38.5614, lng: -121.4237 },  // from the CSV, to be replaced with your newer link
  "NAPA HALL": { lat: 38.5549, lng: -121.4208 },  // from the CSV, to be replaced with your newer link
  "NAPA HALL RO": { lat: 38.55501, lng: -121.42069 },  // from the CSV, to be replaced with your newer link
  "SACRAMENTO": { lat: 38.5635, lng: -121.4263 },  // from the CSV, to be replaced with your newer link
  "SEQUOIA": { lat: 38.5623, lng: -121.4234 },  // from the CSV, to be replaced with your newer link
  "SHASTA HALL": { lat: 38.5635, lng: -121.4232 },  // from the CSV, to be replaced with your newer link
  "SIERRA HALL": { lat: 38.5641, lng: -121.4252 },  // from the CSV, to be replaced with your newer link
  "TAHOE HALL": { lat: 38.562, lng: -121.424 },  // from the CSV, to be replaced with your newer link
  "TSCHANNEN SCIENCE COMPLEX": { lat: 38.5613, lng: -121.4254 },  // from the CSV, to be replaced with your newer link
  "UNIVERSITY UNION": { lat: 38.5618, lng: -121.424 },  // from the CSV, to be replaced with your newer link
  "UNIV UNION E.DOCK": { lat: 38.56191, lng: -121.42389 },  // from the CSV, to be replaced with your newer link
  "THE WELL FL": { lat: 38.555, lng: -121.422 },  // from the CSV, to be replaced with your newer link
  "THE WELL RO": { lat: 38.55511, lng: -121.42189 },  // from the CSV, to be replaced with your newer link
};
const QUERY = {
  "AQUATIC CENTER": "Sacramento State Aquatic Center, 1901 Hazel Ave, Gold River, CA 95670",
  "KADEMA/LASSEN": "Kadema Hall, Sacramento State, Sacramento, CA",
  "DOWNTOWN CAMPUS": "Sacramento State Downtown Campus, Sacramento, CA",
  "ALPINE": "Alpine Hall, Sacramento State, Sacramento, CA",
  "AMADOR": "Amador Hall, Sacramento State, Sacramento, CA",
  "CAPISTRANO": "Capistrano Hall, Sacramento State, Sacramento, CA",
  "MENDOCINO": "Mendocino Hall, Sacramento State, Sacramento, CA",
  "SACRAMENTO": "Sacramento Hall, Sacramento State, Sacramento, CA",
  "SEQUOIA": "Sequoia Hall, Sacramento State, Sacramento, CA",
  "RIVERSIDE ENGINEERING": "Riverside Hall, Sacramento State, Sacramento, CA",
  "TSCHANNEN SCIENCE COMPLEX": "Tschannen Science Complex, Sacramento State, Sacramento, CA",
  "AMC NORTH": "American River Courtyard, Sacramento State, Sacramento, CA",
  "AMC SOUTH": "American River Courtyard, Sacramento State, Sacramento, CA",
  "HOUSINGRIVERVIEW E": "Riverview Hall, Sacramento State, Sacramento, CA",
  "RIVERVIEW N": "Riverview Hall, Sacramento State, Sacramento, CA",
  "HOUSING-RIVERVIEW": "Riverview Hall, Sacramento State, Sacramento, CA",
  "ART SCULPTURE LAB": "Art Sculpture Lab, Sacramento State, Sacramento, CA",
  "ATHLETIC CENTER (FORM. STUDENT HEALTH)": "Athletic Center, Sacramento State, Sacramento, CA",
  "BROAD FIELD HOUSE (ATHLETICS)": "Broad Athletic Facility, Sacramento State, Sacramento, CA",
  "PUBLIC SAFETY (INSIDE FENCE)": "Sacramento State Police Department, Sacramento State, Sacramento, CA",
  "RECEIVING/MAIL/REPROGRAPHICS": "University Print & Mail, Sacramento State, Sacramento, CA",
  "FACILITIES MANAGEMENT": "Facilities Management, Sacramento State, Sacramento, CA",
  "FM TRAILERS": "Facilities Management, Sacramento State, Sacramento, CA",
  "FACILITY MGT TEMP": "Facilities Management, Sacramento State, Sacramento, CA",
  "LIBRARY - BOOK REC": "Library, Sacramento State, Sacramento, CA",
  "LIBRARY CP": "Library, Sacramento State, Sacramento, CA",
  "THE WELL FL": "The WELL, Sacramento State, Sacramento, CA",
  "THE WELL RO": "The WELL, Sacramento State, Sacramento, CA",
  "HARPER ALUMNI CTR": "Harper Alumni Center, Sacramento State, Sacramento, CA",
  "ALUMNI CENTER TEMP": "Harper Alumni Center, Sacramento State, Sacramento, CA",
  "RIVERFRONT CR FL": "River Front Center, Sacramento State, Sacramento, CA",
  "RIVERFRONT CR RO": "River Front Center, Sacramento State, Sacramento, CA",
  "DINING COMMONS RO": "Dining Commons, Sacramento State, Sacramento, CA",
  "UNIV UNION E.DOCK": "University Union, Sacramento State, Sacramento, CA",
  "NAPA HALL RO": "Napa Hall, Sacramento State, Sacramento, CA",
  "BOOKSTORE": "Hornet Bookstore, Sacramento State, Sacramento, CA",
  "BOOKSTORE RO": "Hornet Bookstore, Sacramento State, Sacramento, CA",
  "HORNET STADIUM TM": "Hornet Stadium, Sacramento State, Sacramento, CA",
  "FOLSOM HALL": "Folsom Hall, 7667 Folsom Blvd, Sacramento, CA"
};
const WIDE  = new Set(["AQUATIC CENTER", "DOWNTOWN CAMPUS", "23RD AVE WAREHOUSE"]); // may be off the main campus
// Locations whose pin comes from searching these names (replaces the rough starting pins; the starting pin is used only if the search fails)
const BY_NAME = new Set([]);
const NAMES = { "HOUSINGRIVERVIEW E": "Housing Riverview E" };
// ====================

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const KEEP = new Set(["AMC","BSE","FM","RO","FL","CR","TM","BAC","CP"]);
const pretty = n => NAMES[n] || n.toLowerCase().replace(/\b[a-z][a-z.']*/g, w => KEEP.has(w.toUpperCase().replace(/\./g, "")) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1));
const ACCT = {}; LOCATIONS.forEach(([n, a]) => a.forEach(x => ACCT[x] = n));
const IDX = {}; LOCATIONS.forEach(([n], i) => IDX[n] = i);

let map, info, geocoder, editing = false, selected = null, placing = null, geoBusy = false, geoDenied = false;
let results = LOCATIONS.map(([name]) => ({ name, latest: null, count: 0, issues: 0 }));
const markers = [], pos = {};
const load = k => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
let geoCache = load("campusGeo3");
Object.assign(pos, PINS);
Object.entries(geoCache).forEach(([n, p]) => { if (p && (!(n in PINS) || BY_NAME.has(n))) pos[n] = p; });
Object.assign(pos, load("campusPins"));

// ---------- data ----------
// A pickup has an issue if service was Partial/No, or the driver reported overflow, contamination or a damaged bin.
const isIssue = r => (r.serviceCompleted && r.serviceCompleted !== "Yes") || r.overflow || r.contamination || r.damaged;
const stamp = r => String(r.date) + " " + String(r.time || "").padStart(5, "0");

async function compute() {
  const res = await window.api("/api/collections");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `error ${res.status}`);
  const groups = {};
  (body.records || []).forEach(r => {
    const cands = [r.accountNumber, String(r.binId || "").split("-")[0]];
    const name = cands.map(c => c == null ? null : ACCT[String(c).trim()]).find(Boolean);
    if (name && r.date) (groups[name] ||= []).push(r);
  });
  return LOCATIONS.map(([name]) => {
    const g = (groups[name] || []).sort((a, b) => stamp(b).localeCompare(stamp(a)));
    return { name, latest: g[0] || null, count: g.length, issues: g.filter(isIssue).length };
  });
}
$("basis").textContent = "Issues: pickups that were partial or not completed, or had overflow, contamination or a damaged bin.";

// ---------- formatting ----------
function toDate(r) {
  const m = /^(\d{1,2}):(\d{2})/.exec(r.time || "");
  const t = m ? m[1].padStart(2, "0") + ":" + m[2] : "00:00";
  return new Date(String(r.date).slice(0, 10) + "T" + t + ":00");
}
function ago(d) {
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 0) return "scheduled";
  if (mins < 60) return mins + " min ago";
  if (mins < 1440) return Math.round(mins / 60) + " hr ago";
  const days = Math.floor(mins / 1440);
  return days + (days === 1 ? " day ago" : " days ago");
}
function fmt(r) {
  const d = toDate(r), hasT = /^\d{1,2}:\d{2}/.test(r.time || "");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    (hasT ? " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "") + " · " + ago(d);
}
const issueText = r => r.latest ? `${r.issues} of ${r.count} pickup${r.count === 1 ? "" : "s"} had issues` : "";

function popup(r) {
  const head = `<strong style="color:#043927">${esc(pretty(r.name))}</strong>`;
  if (!r.latest) return `<div style="font-family:system-ui,sans-serif">${head}<br>No pickups found yet.</div>`;
  return `<div style="font-family:system-ui,sans-serif">${head}<br>Last pickup:<br><strong>${esc(fmt(r.latest))}</strong>` +
    (r.latest.driverName ? `<br><span style="color:#5f6e66">${esc(r.latest.driverName)}</span>` : "") +
    `<br><span style="color:${r.issues ? "#8f6a00" : "#14231b"};font-weight:600">Pickups with issues: ${r.issues}</span> <span style="color:#5f6e66">(of ${r.count})</span></div>`;
}

// ---------- list ----------
function renderList() {
  const q = $("q").value.trim().toLowerCase(), mode = $("sort").value;
  let order = results.map((_, i) => i).filter(i => pretty(results[i].name).toLowerCase().includes(q));
  const t = i => results[i].latest ? toDate(results[i].latest).getTime() : 0;
  if (mode === "name") order.sort((a, b) => pretty(results[a].name).localeCompare(pretty(results[b].name)));
  if (mode === "issues") order.sort((a, b) => results[b].issues - results[a].issues || t(b) - t(a));
  if (mode === "recent") order.sort((a, b) => t(b) - t(a));
  $("list").innerHTML = order.map(i => {
    const r = results[i];
    return `<button class="loc ${r.latest ? "" : "none"} ${selected === i ? "on" : ""}" data-i="${i}"><b>${esc(pretty(r.name))}</b>` +
      (r.latest ? `<span>${esc(fmt(r.latest))}</span><span class="iss ${r.issues ? "has" : ""}">Pickups with issues: ${r.issues} <small>(of ${r.count})</small></span>` : `<span>No pickups found</span>`) +
      (markers[i] ? "" : `<span>Not on map yet · click to place</span>`) + `</button>`;
  }).join("") || "No matching locations.";
  document.querySelectorAll(".loc").forEach(b => b.onclick = () => select(+b.dataset.i));
  $("placed").textContent = `· ${markers.filter(Boolean).length} of ${LOCATIONS.length} on map`;
}

const icon = r => ({ path: google.maps.SymbolPath.CIRCLE, scale: 10, fillOpacity: 1, strokeWeight: 3.5,
  fillColor: !r.latest ? "#8a9a90" : r.issues ? "#c9a227" : "#043927", strokeColor: r.issues ? "#043927" : "#c4b581" });

function select(i) {
  selected = i;
  if (!markers[i]) { placing = i; $("hint").textContent = "Click the map to place " + pretty(results[i].name) + "."; renderList(); return; }
  placing = null;
  info.setContent(popup(results[i]));
  info.open({ anchor: markers[i], map });
  map.panTo(markers[i].getPosition());
  renderList();
}

function addMarker(i) {
  const name = LOCATIONS[i][0];
  if (markers[i] || !pos[name]) return;
  const m = new google.maps.Marker({ position: pos[name], map, title: pretty(name), icon: icon(results[i]), draggable: editing });
  m.addListener("click", () => select(i));
  m.addListener("dragend", e => {
    pos[name] = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    const p = load("campusPins"); p[name] = pos[name]; save("campusPins", p);
  });
  markers[i] = m;
}

function fit() {
  const b = new google.maps.LatLngBounds(); let n = 0;
  LOCATIONS.forEach(([name], i) => { if (markers[i] && !WIDE.has(name)) { b.extend(pos[name]); n++; } });
  if (n) map.fitBounds(b, 60);
}

// ---------- name lookup ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BOX = { campus: [38.545, -121.445, 38.580, -121.405], wide: [38.50, -121.56, 38.70, -121.15] };
const dist = (a, b) => { const R = 6371000, k = Math.PI / 180, dLa = (b.lat - a.lat) * k, dLo = (b.lng - a.lng) * k;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * k) * Math.cos(b.lat * k) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

const GENERIC = new Set(["sacramento","state","california","university","the","and","hall","center","complex","building"]);
let placesDenied = false;
const inBox = (l, b) => l.lat > b[0] && l.lat < b[2] && l.lng > b[1] && l.lng < b[3];
function nudge(name, p) { // keep pins that share a building from sitting exactly on top of each other
  let n = 0;
  LOCATIONS.forEach(([o]) => { if (o !== name && pos[o] && dist(pos[o], p) < 10) n++; });
  return n ? { lat: p.lat + 0.00011 * n, lng: p.lng + 0.00011 * (n % 2 ? n : -n) } : p;
}
async function placesFind(q, bx, wide, centre) {
  if (placesDenied) return null;
  try {
    const { Place } = await google.maps.importLibrary("places");
    const { places } = await Place.searchText({ textQuery: q, fields: ["displayName", "location"], maxResultCount: 3,
      locationBias: { center: { lat: 38.5605, lng: -121.4238 }, radius: wide ? 20000 : 1800 } });
    const toks = q.split(",")[0].toLowerCase().split(/\W+/).filter(t => t.length > 2), sig = toks.filter(t => !GENERIC.has(t));
    for (const p of places || []) {
      const l = { lat: p.location.lat(), lng: p.location.lng() }, dn = String(p.displayName || "").toLowerCase();
      const named = sig.length ? sig.some(t => dn.includes(t)) : toks.every(t => dn.includes(t));
      if (named && inBox(l, bx) && !(centre && dist(l, centre) < 40)) return l;
    }
  } catch (e) { if (/denied|enabled|permission|403|disabled/i.test(String(e.code || e.message || e))) placesDenied = true; }
  return null;
}
async function geocodeFind(req, bx, centre) {
  for (let tries = 0; tries < 2; tries++) {
    try {
      const g = (await geocoder.geocode(req)).results.find(g => {
        const l = { lat: g.geometry.location.lat(), lng: g.geometry.location.lng() };
        return !g.partial_match && g.geometry.location_type !== "APPROXIMATE" && inBox(l, bx) && !(centre && dist(l, centre) < 40);
      });
      return g ? { lat: g.geometry.location.lat(), lng: g.geometry.location.lng() } : null;
    } catch (e) {
      const code = String(e.code || e);
      if (code.includes("REQUEST_DENIED")) { geoDenied = true; return null; }
      if (code.includes("OVER_QUERY_LIMIT")) { await sleep(1500); continue; }
      return null;
    }
  }
  return null;
}

async function lookup() {
  if (geoBusy) return;
  const manual = load("campusPins");
  const todo = LOCATIONS.map(([n], i) => i).filter(i => { const n = LOCATIONS[i][0];
    return !(n in geoCache) && !manual[n] && (!pos[n] || BY_NAME.has(n)); });
  if (!todo.length) return;
  geoBusy = true;
  let centre = null;
  try { const c = (await geocoder.geocode({ address: "California State University, Sacramento" })).results[0].geometry.location; centre = { lat: c.lat(), lng: c.lng() }; }
  catch (e) { if (String(e.code || e).includes("REQUEST_DENIED")) geoDenied = true; }
  let done = 0;
  for (const i of todo) {
    if (geoDenied && placesDenied) break;
    const name = LOCATIONS[i][0], wide = WIDE.has(name), bx = BOX[wide ? "wide" : "campus"];
    $("geo").textContent = `Looking up locations… ${++done} of ${todo.length}`;
    const q = QUERY[name] || pretty(name) + ", Sacramento State, Sacramento, CA";
    let found = await placesFind(q, bx, wide, centre);
    if (!found && !geoDenied) found = await geocodeFind({ address: q, region: "us" }, bx, centre);
    if (found) { found = nudge(name, found); geoCache[name] = found; pos[name] = found; if (markers[i]) markers[i].setPosition(found); else addMarker(i); }
    else if (!(geoDenied && placesDenied)) geoCache[name] = null;
    save("campusGeo3", geoCache); renderList(); await sleep(150);
  }
  geoBusy = false;
  const missing = LOCATIONS.filter(([n]) => !pos[n]).length;
  $("geo").textContent = (geoDenied && placesDenied) ? "Name lookup needs the Places API (New) or Geocoding API enabled on your Google key. Until then, click a location in the list, then click the map to place it."
    : missing ? `${missing} locations couldn't be found by name. Click one in the list, then click the map to place it.` : "";
  fit();
}

// ---------- refresh / init ----------
async function refresh() {
  try {
    results = await compute();
    $("err").style.display = "none";
    markers.forEach((m, i) => m && m.setIcon(icon(results[i])));
    if (selected !== null && markers[selected]) info.setContent(popup(results[selected]));
    renderList();
  } catch (e) {
    $("err").style.display = "block";
    $("err").textContent = "Couldn't load pickups: " + (e.message || e);
  }
}

window.initMap = function initMap() {
  map = new google.maps.Map($("map"), { center: { lat: 38.5605, lng: -121.4238 }, zoom: 16, mapTypeControl: true, streetViewControl: true, fullscreenControl: true });
  info = new google.maps.InfoWindow();
  geocoder = new google.maps.Geocoder();
  LOCATIONS.forEach((_, i) => addMarker(i));
  fit();
  map.addListener("click", e => {
    if (placing === null) return;
    const i = placing, name = LOCATIONS[i][0];
    pos[name] = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    const p = load("campusPins"); p[name] = pos[name]; save("campusPins", p);
    addMarker(i); placing = null; $("hint").textContent = ""; select(i);
  });
  renderList();
  refresh().then(lookup);
  if (REFRESH_SECONDS > 0) setInterval(refresh, REFRESH_SECONDS * 1000);
};

$("refresh").onclick = refresh;
$("q").oninput = renderList; $("sort").onchange = renderList;
$("edit").onclick = () => {
  editing = !editing;
  markers.forEach(m => m && m.setDraggable(editing));
  $("edit").textContent = editing ? "Done adjusting" : "Adjust pins";
  $("copy").hidden = !editing;
  $("hint").textContent = editing ? "Drag pins onto their buildings. Positions are saved in this browser; Copy positions gives you code to paste into PINS." : "";
};
$("copy").onclick = async () => {
  const txt = LOCATIONS.filter(([n]) => pos[n]).map(([n]) => `  ${JSON.stringify(n)}: { lat: ${(+pos[n].lat).toFixed(6)}, lng: ${(+pos[n].lng).toFixed(6)} },`).join("\n");
  try { await navigator.clipboard.writeText(txt); $("hint").textContent = "Positions copied."; } catch { prompt("Copy these positions:", txt); }
};
$("relookup").onclick = () => { geoCache = {}; save("campusGeo3", {}); geoDenied = false; placesDenied = false; lookup(); };

window.gm_authFailure = () => {
  $("err").style.display = "block";
  $("err").textContent = "Google Maps rejected the API key. Check that the Maps JavaScript API is enabled, billing is on, and the key allows this website's address.";
};
// Load Google Maps once app.js has confirmed the login.
window.authReady.then(() => {
  const s = document.createElement("script");
  s.src = "https://maps.googleapis.com/maps/api/js?key=" + GOOGLE_KEY + "&callback=initMap&v=weekly&loading=async";
  s.async = true;
  s.onerror = () => { $("err").style.display = "block"; $("err").textContent = "The Google Maps script could not load."; };
  document.head.appendChild(s);
}).catch(() => {});
})();