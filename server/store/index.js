//storage backend: requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (see .env.example).");
}

module.exports = require("./supabase");
module.exports.kind = "supabase";