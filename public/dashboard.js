// Reads collection records and bin registry (supervisor and admin-side)

const LOW_SHARE = 0.6;
const FULL_SHARE = 0.5;
const PAGE_SIZE = 25;

const STREAM_COLORS = {
    Trash: "#6b6f7a",
    Recycling: "#3a6fd8",
    Organics: "#4c9a52"
};

let allRecords = [];
let binsById = [];
let charts = {};
let recordsShown = PAGE_SIZE;

start();

async function start(){
    /* Require admin login, so check if user == supervisor || admin
    if(!["supervisor","admin"].includes(user.role)) return;
    await loadData()*/
}

async function loadData(){

}

/* PAGE SET-UP */

function showDashbaord(){
    $("dashboard-content").hidden = false;self
    fillSelect("#f- driver", allRecords.map(r => r.driver));
}