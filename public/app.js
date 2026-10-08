(function setupCurrentRole() {
  const storage = "wasteCollectionRole";
  const roleSelect = document.querySelector("#role-select");
  const roles = [//we can add more if we need it
    { value: "driver", label: "Driver" },
    { value: "admin", label: "Admin/Supervisor" }
  ];
  const driverPages = ["index", "survey"];
  let currentRole = "driver";

  function normalizeRole(value) {
    return value === "admin" || value === "supervisor" ? "admin" : "driver"; //The supervisor role is the same as admin right now.
  }

  function readRole() {
    try {
      return normalizeRole(localStorage.getItem(storage));
    } catch {
      return currentRole;
    }
  }
  function applyRole(value) {
    currentRole = normalizeRole(value);
    if (roleSelect) roleSelect.value = currentRole;
    const canView = page => currentRole === "admin" || driverPages.includes(page);

    document.querySelectorAll("[data-page-link]").forEach(link => {
      link.hidden = !canView(link.dataset.pageLink);
    });
    document.querySelectorAll("[data-role-label]").forEach(label => {
      label.textContent = currentRole === "admin" ? "Admin/Supervisor" : "Driver";
    });

    const page = document.body.dataset.page;
    if (page && !canView(page)) {
      const main = document.querySelector("main");
      if (main) main.hidden = true;
      window.location.replace("index.html");
    }
  }

  if (roleSelect) {
    roleSelect.replaceChildren();
    roles.forEach(role => {
      const option = document.createElement("option");
      option.value = role.value;
      option.textContent = role.label;
      roleSelect.appendChild(option);
    });
    roleSelect.addEventListener("change", () => {
      currentRole = normalizeRole(roleSelect.value);
      try {
        localStorage.setItem(storage, currentRole);
      } catch {
      }
      applyRole(currentRole);
    });
  }
  
  applyRole(readRole());

  window.addEventListener("pageshow", () => applyRole(readRole()));

  window.addEventListener("storage", event => {
    if (event.key === storage || event.key === null) applyRole(readRole());
  });
})();


const inventoryRecords = [
  {
    accountNumber: "201003",
    location: "ALPINE",
    containers: [
      {
        quantity: "2",
        size: "4YD",
        frequency: "3",
        serviceDay: "MON/WED/FRI"
      },
      {
        quantity: "1",
        size: "64GAL",
        frequency: "1",
        serviceDay: "TUE"
      }
    ]
  },
  {
    accountNumber: "201005",
    location: "AMADOR",
    containers: [
      {
        quantity: "1",
        size: "4YD",
        frequency: "2",
        serviceDay: "THU/FRI"
      },
      {
        quantity: "1",
        size: "4YD",
        frequency: "1",
        serviceDay: "WED"
      },
      {
        quantity: "1",
        size: "64GAL",
        frequency: "1",
        serviceDay: "TUE"
      }
    ]
  }
];

const form = document.querySelector("#collection-form");
const accountSelect = document.querySelector("#account-number");
const locationInput = document.querySelector("#location");
const inventorySummary = document.querySelector("#inventory-summary");

if (form && accountSelect) {
  inventoryRecords.forEach(function (record) {
    const option = document.createElement("option");

    option.value = record.accountNumber;
    option.textContent = `${record.accountNumber} - ${record.location}`;

    accountSelect.appendChild(option);
  });

  accountSelect.addEventListener("change", function () {
    const selectedRecord = inventoryRecords.find(function (record) {
      return record.accountNumber === accountSelect.value;
    });

    if (!selectedRecord) {
      locationInput.value = "";
      inventorySummary.value = "";
      return;
    }

    locationInput.value = selectedRecord.location;

    inventorySummary.value = selectedRecord.containers
      .map(function (container) {
        return `${container.quantity} x ${container.size}, ${container.frequency} pickups, ${container.serviceDay}`;
      })
      .join(" | ");
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);
    const record = Object.fromEntries(formData.entries());
    const photo = formData.get("photo");

    record.id = Date.now();
    record.submittedAt = new Date().toISOString();
    record.photoName = photo.name;

    delete record.photo;

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
    locationInput.value = "";
    inventorySummary.value = "";
  });
}