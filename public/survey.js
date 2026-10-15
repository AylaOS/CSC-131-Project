/*Collection Survey backend (links to survey.html): loads bins from the server, fills in bin details, and sends records to POST (supabase)

(the server checks them with server/validate.js and saves them to Supabase).*/
(function () {
  "use strict";

  const form = document.querySelector("#collection-form");
  if (!form) return;

  const MAX_PHOTOS = 3;
  const PHOTO_MAX_SIDE = 1280; //pixels to keep each JPEG around 200 KB
  const PHOTO_QUALITY = 0.7;
  const DRIVERS_KEY = "wasteCollectionDrivers";

  const $ = selector => document.querySelector(selector);
  const el = {
    driver: $("#driver-name"),
    driverList: $("#driver-list"),
    date: $("#date"),
    time: $("#time"),
    location: $("#location"),
    bin: $("#bin-id"),
    summary: $("#inventory-summary"),
    streamGroup: $("#stream-group"),
    container: $("#container"),
    fullnessGroup: $("#fullness-group"),
    serviceGroup: $("#service-group"),
    serviceReasonWrap: $("#service-reason-wrap"),
    serviceReason: $("#service-reason"),
    contaminationWrap: $("#contamination-types-wrap"),
    contaminationTypes: $("#contamination-types"),
    damageWrap: $("#damage-wrap"),
    damageType: $("#damage-type"),
    photo: $("#photo"),
    previews: $("#photo-previews"),
    notes: $("#notes"),
    error: $("#form-error"),
    submit: form.querySelector('button[type="submit"]'),
    success: $("#success-panel"),
    successDetail: $("#success-detail"),
    newRecord: $("#new-record"),
    status: $("#connection-status")
  };

  let bins = [];
  let photos = [];

  start();

  async function start() {
    showConnection();
    window.addEventListener("online", showConnection);
    window.addEventListener("offline", showConnection);

    setDateTimeToNow();
    loadDriverNames();
    form.querySelectorAll("button, input, select, textarea").forEach(c => { c.disabled = true; });

    try {
      const [options, binData] = await Promise.all([getJson("/api/options"), getJson("/api/bins")]);
      bins = binData.bins || [];
      buildForm(options);
      form.querySelectorAll("button, input, select, textarea").forEach(c => { c.disabled = false; });
      el.bin.disabled = true; //until the location is picked
      lockBinFields();
    } catch (err) {
      showError(`Couldn't load the bin list from the server. Refresh the page to try again. (${err.message})`);
    }

    form.addEventListener("submit", onSubmit);
    el.newRecord.addEventListener("click", resetForNextRecord);
  }

  /* BUILD THE FORM */

  function buildForm(options) {
    //locations from the bin registry
    const locations = [...new Set(bins.map(b => b.location))].sort();
    fillSelect(el.location, locations, "Select a location");
    el.location.addEventListener("change", () => {
      showBinsFor(el.location.value);
      showBinDetails(null);
    });
    el.bin.addEventListener("change", () => showBinDetails(findBin(el.bin.value)));

    //waste stream and container are filled in from the chosen bin
    radios(el.streamGroup, "wasteStream", options.wasteStreams);
    fillSelect(el.container, [...new Set(bins.map(b => b.container))].sort(sizeOrder), "Filled in from the bin");

    radios(el.fullnessGroup, "fullness", options.fullness.map(String), v => `${v}%`);
    radios(el.serviceGroup, "serviceCompleted", options.serviceCompleted);
    fillSelect(el.serviceReason, options.serviceIssueReasons, "Select a reason");

    form.querySelectorAll(".choice-group.yes-no").forEach(group => radios(group, group.dataset.name, ["Yes", "No"]));

    options.contaminationTypes.forEach((type, i) => {
      const label = document.createElement("label");
      label.className = "check";
      const box = document.createElement("input");
      box.type = "checkbox";
      box.name = "contaminationTypes";
      box.value = type;
      box.id = `contamination-type-${i}`;
      label.htmlFor = box.id;
      label.append(box, document.createTextNode(type));
      el.contaminationTypes.appendChild(label);
    });

    fillSelect(el.damageType, options.maintenanceIssues, "Select the issue");

    //follow-up questions
    form.addEventListener("change", event => {
      const name = event.target.name;
      if (name === "serviceCompleted") el.serviceReasonWrap.hidden = radioValue("serviceCompleted") === "Yes";
      if (name === "contamination") el.contaminationWrap.hidden = radioValue("contamination") !== "Yes";
      if (name === "damaged") el.damageWrap.hidden = radioValue("damaged") !== "Yes";
    });

    el.photo.addEventListener("change", onPhotosPicked);
  }

  function radios(group, name, values, labelFor = v => v) {
    group.replaceChildren();
    values.forEach((value, i) => {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = value;
      input.id = `${name}-${i}`;
      const label = document.createElement("label");
      label.htmlFor = input.id;
      label.textContent = labelFor(value);
      group.append(input, label);
    });
  }

  function fillSelect(select, values, placeholder) {
    select.replaceChildren(new Option(placeholder, ""));
    values.forEach(v => select.appendChild(new Option(v, v)));
  }

  function sizeOrder(a, b) {
    const rank = s => (/GAL/.test(s) ? 0 : 1000) + (parseFloat(s) || 0);
    return rank(a) - rank(b) || a.localeCompare(b);
  }

  // BIN SELECTION

  function findBin(binId) {
    return bins.find(b => b.binId === binId) || null;
  }

  function showBinsFor(location) {
    const here = bins.filter(b => b.location === location);
    el.bin.replaceChildren(new Option(here.length ? "Select a bin" : "Select a location first", ""));
    here.forEach(b => el.bin.appendChild(new Option(`${b.binId} (${b.wasteStream}, ${b.container})`, b.binId)));
    el.bin.disabled = here.length === 0;
  }

  function showBinDetails(bin) {
    form.querySelectorAll('input[name="wasteStream"]').forEach(r => { r.checked = Boolean(bin) && r.value === bin.wasteStream; });
    el.container.value = bin ? bin.container : "";
    if (bin && el.container.value !== bin.container) {
      el.container.appendChild(new Option(bin.container, bin.container));
      el.container.value = bin.container;
    }

    el.summary.hidden = !bin;
    if (!bin) return;
    const pickups = bin.pickupsPerWeek ? `${bin.pickupsPerWeek}x per week` : "No regular schedule";
    el.summary.replaceChildren(
      line(`Account #${bin.accountNumber}`),
      line(`${bin.wasteStream}, ${bin.container}`),
      line(bin.serviceDays ? `${pickups} (${bin.serviceDays})` : pickups)
    );
  }

  function line(textContent) {
    const span = document.createElement("span");
    span.textContent = textContent;
    return span;
  }

  function lockBinFields() {
    form.querySelectorAll('input[name="wasteStream"]').forEach(r => { r.disabled = true; });
    el.container.disabled = true;
  }

  // PHOTOS

  async function onPhotosPicked() {
    const files = [...el.photo.files];
    if (files.length > MAX_PHOTOS) showError(`Only the first ${MAX_PHOTOS} photos will be used.`);
    else hideError();

    clearPhotos();
    for (const file of files.slice(0, MAX_PHOTOS)) {
      try {
        const blob = await compressPhoto(file);
        const url = URL.createObjectURL(blob);
        photos.push({ blob, url });
        const img = document.createElement("img");
        img.src = url;
        img.alt = `Photo ${photos.length}`;
        el.previews.appendChild(img);
      } catch {
        showError(`Couldn't read "${file.name}". Try taking the photo again.`);
      }
    }
  }

  //resize and re-encode as JPEG (the server only accepts JPEG, max 2 MB)
  function compressPhoto(file) {
    return new Promise((resolve, reject) => {
      const source = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(source);
        const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", PHOTO_QUALITY);
      };
      img.onerror = () => {
        URL.revokeObjectURL(source);
        reject(new Error("not an image"));
      };
      img.src = source;
    });
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function clearPhotos() {
    photos.forEach(p => URL.revokeObjectURL(p.url));
    photos = [];
    el.previews.replaceChildren();
  }

  // SUBMIT RECORD

  function collectRecord() {
    return {
      driverName: el.driver.value.trim(),
      date: el.date.value,
      time: el.time.value,
      binId: el.bin.value,
      fullness: radioValue("fullness"),
      serviceCompleted: radioValue("serviceCompleted"),
      serviceIssueReason: el.serviceReason.value,
      overflow: radioValue("overflow"),
      contamination: radioValue("contamination"),
      contaminationTypes: [...form.querySelectorAll('input[name="contaminationTypes"]:checked')].map(b => b.value),
      damaged: radioValue("damaged"),
      maintenanceIssue: el.damageType.value,
      comments: el.notes.value.trim()
    };
  }

  //same rules as server/validate.js, checked here first so drivers get instant feedback
  function checkRecord(r) {
    if (!r.driverName) return ["Enter the driver or employee name.", el.driver];
    if (!r.date) return ["Enter the pickup date.", el.date];
    if (!r.time) return ["Enter the pickup time.", el.time];
    if (!el.location.value) return ["Select the building or location.", el.location];
    if (!r.binId) return ["Select the bin.", el.bin];
    if (!r.serviceCompleted) return ["Answer \"Service completed?\".", el.serviceGroup];
    if (!r.fullness && r.serviceCompleted !== "No") return ["Select the fullness level.", el.fullnessGroup];
    if (r.serviceCompleted !== "Yes" && !r.serviceIssueReason) return ["Select why service wasn't completed.", el.serviceReason];
    if (!r.overflow) return ["Answer the overflow question.", form.querySelector('[data-name="overflow"]')];
    if (!r.contamination) return ["Answer the contamination question.", form.querySelector('[data-name="contamination"]')];
    if (r.contamination === "Yes" && r.contaminationTypes.length === 0) return ["Check at least one contamination type.", el.contaminationTypes];
    if (!r.damaged) return ["Answer the damaged bin question.", form.querySelector('[data-name="damaged"]')];
    if (r.damaged === "Yes" && !r.maintenanceIssue) return ["Select the maintenance issue.", el.damageType];
    if (el.photo.required && photos.length === 0) return ["Add at least one photo of the container.", el.photo];
    return null;
  }

  async function onSubmit(event) {
    event.preventDefault();
    hideError();

    const record = collectRecord();
    if (record.serviceCompleted === "Yes") record.serviceIssueReason = "";
    if (record.contamination !== "Yes") record.contaminationTypes = [];
    if (record.damaged !== "Yes") record.maintenanceIssue = "";

    const problem = checkRecord(record);
    if (problem) {
      showError(problem[0]);
      focusField(problem[1]);
      return;
    }

    el.submit.disabled = true;
    el.submit.textContent = "Submitting…";
    try {
      const photoData = await Promise.all(photos.map(async p => ({ data: await blobToBase64(p.blob) })));
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record, photos: photoData })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Server error (${res.status}).`);

      rememberDriver(record.driverName);
      showSuccess(body.recordId, record);
    } catch (err) {
      const offline = err instanceof TypeError || !navigator.onLine;
      showError(offline
        ? "Couldn't reach the server. Check your connection and submit again. Your answers are still filled in."
        : err.message);
    } finally {
      el.submit.disabled = false;
      el.submit.textContent = "Submit Collection Record";
    }
  }

  function showSuccess(recordId, record) {
    const bin = findBin(record.binId);
    el.successDetail.textContent = `Record ${recordId} saved for bin ${record.binId}${bin ? ` at ${bin.location}` : ""}.`;
    form.hidden = true;
    el.success.hidden = false;
    el.success.focus();
  }

  function resetForNextRecord() {
    const driver = el.driver.value;
    form.reset();
    el.driver.value = driver;
    clearPhotos();
    setDateTimeToNow();
    el.bin.replaceChildren(new Option("Select a location first", ""));
    el.bin.disabled = true;
    showBinDetails(null);
    el.serviceReasonWrap.hidden = true;
    el.contaminationWrap.hidden = true;
    el.damageWrap.hidden = true;
    hideError();
    el.success.hidden = true;
    form.hidden = false;
    el.location.focus();
  }

  // HELPER FUNCTIONS

  async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    return res.json();
  }

  function radioValue(name) {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "";
  }

  function setDateTimeToNow() {
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    el.date.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    el.time.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  function loadDriverNames() {
    let names = [];
    try { names = JSON.parse(localStorage.getItem(DRIVERS_KEY) || "[]"); } catch { names = []; }
    el.driverList.replaceChildren(...names.map(n => new Option(n)));
    if (names[0] && !el.driver.value) el.driver.value = names[0];
  }

  function rememberDriver(name) {
    try {
      const names = JSON.parse(localStorage.getItem(DRIVERS_KEY) || "[]").filter(n => n !== name);
      localStorage.setItem(DRIVERS_KEY, JSON.stringify([name, ...names].slice(0, 10)));
    } catch {
      //private browsing etc. - not important
    }
    loadDriverNames();
  }

  function showConnection() {
    if (!el.status) return;
    el.status.textContent = navigator.onLine ? "Online" : "Offline";
    el.status.className = `connection-status ${navigator.onLine ? "online" : "offline"}`;
  }

  function showError(message) {
    el.error.textContent = message;
    el.error.hidden = false;
  }

  function hideError() {
    el.error.hidden = true;
    el.error.textContent = "";
  }

  function focusField(target) {
    if (!target) return;
    const focusable = target.matches("input, select, textarea") ? target : target.querySelector("input, select, textarea");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (focusable) focusable.focus({ preventScroll: true });
  }
})();