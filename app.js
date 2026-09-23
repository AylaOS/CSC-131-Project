const form = document.querySelector("#collection-form");

if (form) {
  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);
    const record = Object.fromEntries(formData.entries());

    record.id = Date.now();
    record.submittedAt = new Date().toISOString();

    const savedRecords = JSON.parse(
      localStorage.getItem("collectionRecords") || "[]"
    );

    savedRecords.push(record);

    localStorage.setItem(
      "collectionRecords",
      JSON.stringify(savedRecords)
    );

    alert("Collection record saved successfully.");

    form.reset();
  });
}