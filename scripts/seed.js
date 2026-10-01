//npm run seed                    bin registry from data/bins.csv
//npm run seed -- --sample        imports data/sample_collections.csv (demo pickups)

require("dotenv").config({ quiet: true });
const path = require("path");
const store = require("../server/store");
const readCsv = require("./csv");

const args = process.argv.slice(2);
const DATA = path.join(__dirname, "..", "data");

async function main() {
  console.log(`Storage: ${store.kind}`);

  const bins = readCsv(path.join(DATA, "bins.csv")).map(r => ({
    bin_id: r["Bin ID"],
    account_number: r["Account #"],
    location: r["Location"],
    waste_stream: r["Waste Stream"],
    container_size: r["Container Size"],
    pickups_per_week: r["Pickups Per Week"] ? Number(r["Pickups Per Week"]) : null,
    service_days: r["Service Days"] || null,
    notes: r["Notes"] || null,
    active: true
  }));
  await store.upsertBins(bins);
  console.log(`Bins: ${bins.length} loaded`);

  if (args.includes("--sample")) {
    const rows = readCsv(path.join(DATA, "sample_collections.csv")).map(r => ({
      driver_name: r["Driver/Employee Name"],
      collected_date: r["Date"],
      collected_time: r["Time"].padStart(5, "0"),
      bin_id: r["Bin ID"],
      account_number: r["Account #"],
      location: r["Building/Location"],
      waste_stream: r["Waste Stream"],
      container_size: r["Container Type/Size"],
      fullness: r["Fullness Level (%)"] === "" ? null : Number(r["Fullness Level (%)"]),
      service_completed: r["Service Completed"],
      service_issue: r["Service Issue Reason"] || null,
      overflow: r["Overflow/Material Outside Bin"] === "Yes",
      contamination: r["Contamination Observed"] === "Yes",
      contamination_types: r["Contamination Type"] ? r["Contamination Type"].split(";").map(s => s.trim()) : [],
      damaged: r["Damaged Bin/Maintenance Issue"] === "Yes",
      maintenance_issue: r["Maintenance Notes"] || null,
      comments: r["Additional Comments"] || null,
      photo_paths: []
    }));
    await store.insertCollections(rows);
    console.log(`Sample collections: ${rows.length} imported`);
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});