// Waste Collection Survey — Node.js backend

require("dotenv").config({ quiet: true });

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");

const store = require("./store");
const { buildCollectionRow, ValidationError } = require("./validate");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; //after the browser's compression, photos are 200 KB

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "img-src": ["'self'", "data:", "blob:", "https://*.supabase.co"],
      //so the site still works over http://localhost.
      "upgrade-insecure-requests": process.env.NODE_ENV === "production" ? [] : null
    }
  }
}));
app.use(express.json({ limit: "8mb" })); //room for 3 photos

/* BINS */

app.get("/api/bins", wrap(async (req, res) => {
  const bins = await store.listBins();
  res.json({ bins: bins.map(binForClient) });
}));

/* COLLECTIONS */

app.post("/api/collections", wrap(async (req, res) => {
  const { record, photos } = req.body || {};

  const bin = record && (await store.getBin(String(record.binId || "")));
  if (!bin) throw new ValidationError("Unknown bin ID.");

  const row = buildCollectionRow(record, bin);

  //check photos before saving
  const images = (Array.isArray(photos) ? photos : []).slice(0, MAX_PHOTOS).map((p, i) => {
    const buffer = Buffer.from(String(p.data || ""), "base64");
    if (!buffer.length || buffer.length > MAX_PHOTO_BYTES) throw new ValidationError(`Photo ${i + 1} is empty or too large.`);
    if (!(buffer[0] === 0xff && buffer[1] === 0xd8)) throw new ValidationError(`Photo ${i + 1} isn't a JPEG image.`);
    return buffer;
  });

  //Photos go under <date>/<bin>/<random>.jpg in storage.
  for (const buffer of images) {
    const photoPath = `${row.collected_date}/${bin.bin_id}/${crypto.randomUUID()}.jpg`;
    row.photo_paths.push(await store.savePhoto(photoPath, buffer, "image/jpeg"));
  }

  const id = await store.insertCollection(row);
  res.status(201).json({ ok: true, recordId: recordId(id) });
}));

app.get("/api/collections", wrap(async (req, res) => {
  const rows = await store.listCollections();
  const urls = await store.photoUrls(rows.flatMap(r => r.photo_paths || []));
  res.json({ records: rows.map(r => collectionForClient(r, urls)) });
}));

app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

/* WEBSITE  */

app.use(express.static(path.join(__dirname, "..", "public")));

/* ERROR HANDLING */

app.use((err, req, res, next) => {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Upload is too large." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Try again." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (storage: ${store.kind})`);
});

/* HELPERS */

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function recordId(id) {
  return `WC-${String(id).padStart(5, "0")}`;
}

function binForClient(b) {
  return {
    binId: b.bin_id,
    accountNumber: b.account_number,
    location: b.location,
    wasteStream: b.waste_stream,
    container: b.container_size,
    pickupsPerWeek: b.pickups_per_week == null ? "" : String(b.pickups_per_week),
    serviceDays: b.service_days || ""
  };
}

function collectionForClient(r, urls) {
  return {
    recordId: recordId(r.id),
    driverName: r.driver_name,
    date: String(r.collected_date).slice(0, 10),
    time: r.collected_time,
    location: r.location || "",
    accountNumber: r.account_number || "",
    binId: r.bin_id,
    wasteStream: r.waste_stream || "",
    container: r.container_size || "",
    fullness: r.fullness,               //number, or NULL if not recorded
    serviceCompleted: r.service_completed,
    serviceIssue: r.service_issue || "",
    overflow: Boolean(r.overflow),
    contamination: Boolean(r.contamination),
    contaminationTypes: r.contamination_types || [],
    damaged: Boolean(r.damaged),
    maintenanceIssue: r.maintenance_issue || "",
    comments: r.comments || "",
    photos: (r.photo_paths || []).map(p => urls[p]).filter(Boolean)
  };
}