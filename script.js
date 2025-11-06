// --- DOM Elements ---
const preloaderEl = document.getElementById("preloader");
const totalEl = document.getElementById("total");
const availableEl = document.getElementById("available");
const occupiedEl = document.getElementById("occupied");
const logListEl = document.getElementById("status-log-list");

// --- Preloader Logic ---
let isDataLoaded = false;
let isMinTimePassed = false;

function tryHidePreloader() {
  // This will only run when BOTH the timer is done AND the data is loaded
  if (isDataLoaded && isMinTimePassed) {
    if (preloaderEl) {
      preloaderEl.classList.add("hidden");
    }
  }
}

// --- WebSocket Connection ---
const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
const ws = new WebSocket(`${wsProtocol}${window.location.host}`);

ws.onopen = () => {
  console.log("Connected to ParkIQ WebSocket server");
};

ws.onclose = () => {
  console.log("Disconnected from WebSocket server.");
};

ws.onerror = (error) => {
  console.error("WebSocket Error:", error);
};

// --- Main Data Handler ---
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    
    // 1. Update the 3 cards
    totalEl.innerText = data.total;
    availableEl.innerText = data.available;
    occupiedEl.innerText = data.occupied;
    
    // 2. Add a new entry to the log
    addLogEntry(data);

    // 3. Mark data as loaded and try to hide preloader
    isDataLoaded = true;
    tryHidePreloader();

  } catch (error) {
    console.error("Failed to parse server data:", error);
  }
};

// --- Add Log Entry Function (No Changes) ---
let lastOccupiedCount = -1; // Track changes
function addLogEntry(data) {
  if (data.occupied === lastOccupiedCount) {
    return;
  }
  const newLog = document.createElement("li");
  const time = new Date().toLocaleTimeString();
  let message = "";
  if (lastOccupiedCount === -1) {
    message = `[${time}] System online. Status: ${data.occupied} occupied, ${data.available} available.`;
  } else if (data.occupied > lastOccupiedCount) {
    message = `[${time}] 🚗 Car Entered. Occupied slots: ${data.occupied}`;
    newLog.style.color = "#fecaca"; // Red-ish
  } else {
    message = `[${time}] 🚙 Car Exited. Occupied slots: ${data.occupied}`;
    newLog.style.color = "#a7f3d0"; // Green-ish
  }
  newLog.innerText = message;
  logListEl.prepend(newLog);
  while (logListEl.children.length > 10) {
    logListEl.removeChild(logListEl.lastChild);
  }
  lastOccupiedCount = data.occupied;
}

// --- Start 5-Second Minimum Timer ---
// This runs at the bottom of the script
setTimeout(() => {
  isMinTimePassed = true;
  tryHidePreloader();
}, 5000); // 5000ms = 5 seconds