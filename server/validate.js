//check each submission to turn -> database row

const FULLNESS = [0, 25, 50, 75, 100];
const SERVICE = ["Yes", "Partial", "No"];
const YES_NO = ["Yes", "No"];
const MAX_TEXT = 1000;

//dropdown lists for the survey form (the form loads these from GET /api/options)
const OPTIONS = {
  wasteStreams: ["Trash", "Recycling", "Organics"],
  fullness: FULLNESS,
  serviceCompleted: SERVICE,
  serviceIssueReasons: ["Access blocked", "Bin locked or inaccessible", "Ran out of time", "Vehicle or equipment issue", "Other"],
  contaminationTypes: ["Food waste in recycling", "Liquids in container", "Mixed trash in recycling", "Mixed trash in organics", "Non-compostable item in organics", "Recyclables in trash", "Other"],
  maintenanceIssues: ["Broken or missing lid", "Cracked or leaking body", "Wheel damaged", "Graffiti or needs cleaning", "Other"]
};

class ValidationError extends Error {}

function text(value, max = MAX_TEXT) {
  return String(value ?? "").trim().slice(0, max);
}

function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new ValidationError(`"${field}" must be one of: ${allowed.join(", ")}`);
  return value;
}

//real calendar date only (rejects 2026-02-31 and 2026-13-45)
function checkDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) throw new ValidationError("Date must be YYYY-MM-DD.");
  const [, y, m, d] = match.map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== m - 1 || day.getUTCDate() !== d) {
    throw new ValidationError("Date is not a real calendar date.");
  }
  return value;
}

//00:00 to 23:59, always returned as HH:MM
function checkTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new ValidationError("Time must be HH:MM (00:00 to 23:59).");
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

//the form sends an array, the CSV import sends "a; b"
function list(value) {
  const items = Array.isArray(value) ? value : String(value ?? "").split(";");
  return [...new Set(items.map(s => text(s, 100)).filter(Boolean))];
}

function buildCollectionRow(input, bin) {
  const r = input || {};

  const driverName = text(r.driverName, 100);
  if (!driverName) throw new ValidationError("Driver name is required.");

  const date = checkDate(r.date);
  const time = checkTime(r.time);

  //check date is valid (not from the past/future)
  const ageDays = (Date.now() - new Date(`${r.date}T12:00:00`).getTime()) / 86400000;
  if (ageDays < -1.5 || ageDays > 30) throw new ValidationError("Date is outside the allowed range.");

  const service = oneOf(r.serviceCompleted, SERVICE, "serviceCompleted");
  const fullness = r.fullness === "" || r.fullness == null ? null : Number(r.fullness);
  if (fullness !== null) oneOf(fullness, FULLNESS, "fullness");
  if (fullness === null && service !== "No") throw new ValidationError("Fullness is required when the bin was serviced.");

  const serviceIssue = service === "Yes" ? "" : text(r.serviceIssueReason, 200);
  if (service !== "Yes" && !serviceIssue) throw new ValidationError("Give a reason when service was partial or not completed.");

  const contamination = oneOf(r.contamination, YES_NO, "contamination") === "Yes";
  const contaminationTypes = contamination ? list(r.contaminationTypes ?? r.contaminationType).slice(0, 10) : [];
  if (contamination && !contaminationTypes.length) throw new ValidationError("Pick at least one contamination type.");

  const damaged = oneOf(r.damaged, YES_NO, "damaged") === "Yes";
  const maintenanceIssue = damaged ? text(r.maintenanceIssue ?? r.maintenanceNotes, 200) : "";
  if (damaged && !maintenanceIssue) throw new ValidationError("Pick the maintenance issue for the damaged bin.");

  return {
    driver_name: driverName,
    collected_date: date,
    collected_time: time,
    bin_id: bin.bin_id,
    account_number: bin.account_number,
    location: bin.location,
    waste_stream: bin.waste_stream,
    container_size: bin.container_size,
    fullness: fullness,
    service_completed: service,
    service_issue: serviceIssue || null,
    overflow: oneOf(r.overflow, YES_NO, "overflow") === "Yes",
    contamination: contamination,
    contamination_types: contaminationTypes,
    damaged: damaged,
    maintenance_issue: maintenanceIssue || null,
    comments: text(r.comments ?? r.notes) || null,
    photo_paths: []
  };
}

module.exports = { buildCollectionRow, ValidationError, OPTIONS };