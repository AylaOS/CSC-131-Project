//check each submission to turn -> database row

const FULLNESS = [0, 25, 50, 75, 100];
const SERVICE = ["Yes", "Partial", "No"];
const YES_NO = ["Yes", "No"];
const MAX_TEXT = 1000;

class ValidationError extends Error {}

function text(value, max = MAX_TEXT) {
  return String(value ?? "").trim().slice(0, max);
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new ValidationError(`"${field}" must be one of: ${allowed.join(", ")}`);
  return value;
}

function buildCollectionRow(input, bin) {
  const r = input || {};

  const driverName = text(r.driverName, 100);
  if (!driverName) throw new ValidationError("Driver name is required.");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || "")) throw new ValidationError("Date must be YYYY-MM-DD.");
  if (!/^\d{1,2}:\d{2}$/.test(r.time || "")) throw new ValidationError("Time must be HH:MM.");

  //check date is valid (not from the past/future)
  const ageDays = (Date.now() - new Date(`${r.date}T12:00:00`).getTime()) / 86400000;
  if (ageDays < -1.5 || ageDays > 30) throw new ValidationError("Date is outside the allowed range.");

  const service = oneOf(r.serviceCompleted, SERVICE, "serviceCompleted");
  const fullness = r.fullness === "" || r.fullness == null ? null : Number(r.fullness);
  if (fullness !== null) oneOf(fullness, FULLNESS, "fullness");
  if (fullness === null && service !== "No") throw new ValidationError("Fullness is required when the bin was serviced.");

  const contamination = oneOf(r.contamination, YES_NO, "contamination") === "Yes";
  const damaged = oneOf(r.damaged, YES_NO, "damaged") === "Yes";

  return {
    driver_name: driverName,
    collected_date: r.date,
    collected_time: r.time.padStart(5, "0"),
    bin_id: bin.bin_id,
    account_number: bin.account_number,
    location: bin.location,
    waste_stream: bin.waste_stream,
    container_size: bin.container_size,
    fullness: fullness,
    service_completed: service,
    service_issue: service === "Yes" ? null : text(r.serviceIssueReason, 200) || null,
    overflow: oneOf(r.overflow, YES_NO, "overflow") === "Yes",
    contamination: contamination,
    contamination_types: contamination
      ? String(r.contaminationType || "").split(";").map(s => text(s, 100)).filter(Boolean).slice(0, 10)
      : [],
    damaged: damaged,
    maintenance_issue: damaged ? text(r.maintenanceNotes, 200) || null : null,
    comments: text(r.notes) || null,
    photo_paths: []
  };
}

module.exports = { buildCollectionRow, ValidationError };
