/*Supabase Postgres for data, Supabase Storage for photos.
service-role key lives in .env (Do NOT publish to Git). */


const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const BUCKET = "photos";
const PAGE = 1000; //100 rows per request
const SIGNED_URL_SECONDS = 3600;

function check(error, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

//read every row of query
async function selectAll(buildQuery) {
  const rows = [];
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await buildQuery().range(start, start + PAGE - 1);
    check(error, "Database read failed");
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

module.exports = {
  async listBins() {
    return selectAll(() => supabase.from("bins").select("*").eq("active", true).order("bin_id"));
  },

  async getBin(binId) {
    const { data, error } = await supabase.from("bins").select("*").eq("bin_id", binId).eq("active", true).maybeSingle();
    check(error, "Bin lookup failed");
    return data;
  },

  async upsertBins(bins) {
    for (let i = 0; i < bins.length; i += 500) {
      const { error } = await supabase.from("bins").upsert(bins.slice(i, i + 500), { onConflict: "bin_id" });
      check(error, "Couldn't save bins");
    }
  },

  //return new record's id
  async insertCollection(row) {
    const { data, error } = await supabase.from("collections").insert(row).select("id").single();
    check(error, "Couldn't save the collection record");
    return data.id;
  },

  async insertCollections(rows) {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from("collections").insert(rows.slice(i, i + 500));
      check(error, "Couldn't import collection records");
    }
  },

  async listCollections({ from, to } = {}) {
    return selectAll(() => {
      let q = supabase.from("collections").select("*");
      if (from) q = q.gte("collected_date", from);
      if (to) q = q.lte("collected_date", to);
      return q.order("id");
    });
  },

  async savePhoto(photoPath, buffer, contentType) {
    const { error } = await supabase.storage.from(BUCKET).upload(photoPath, buffer, { contentType, upsert: false });
    check(error, "Photo upload failed");
    return photoPath;
  },

  //private bucket: return short-lived signed links for dashboard
  async photoUrls(paths) {
    const urls = {};
    for (let i = 0; i < paths.length; i += 500) {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 500), SIGNED_URL_SECONDS);
      check(error, "Couldn't create photo links");
      data.forEach(item => { if (item.signedUrl) urls[item.path] = item.signedUrl; });
    }
    return urls;
  },

  async readPhoto() {
    return null; //photos are served directly from Supabase via signed links
  }
};