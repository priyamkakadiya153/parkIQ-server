// --- DOM Elements ---
const preloaderEl = document.getElementById("preloader");
const totalEl = document.getElementById("total");
const availableEl = document.getElementById("available");
const occupiedEl = document.getElementById("occupied");
const logListEl = document.getElementById("status-log-list");
const gateStatusEl = document.getElementById("gate-status-indicator"); // <--- NEW
const gateStatusTextEl = document.getElementById("gate-status-text");   // <--- NEW

// --- Preloader Logic ---
let isDataLoaded = false;
let isMinTimePassed = false;

function tryHidePreloader() {
  if (isDataLoaded && isMinTimePassed) {
    if (preloaderEl) {
      preloaderEl.classList.add("hidden");
    }
  }
}

// --- WebSocket Connection ---
const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
const ws = new WebSocket(`${wsProtocol}${window.location.host}`);

ws.onopen = () => { console.log("Connected to ParkIQ WebSocket server"); };
ws.onclose = () => { console.log("Disconnected from WebSocket server."); };
ws.onerror = (error) => { console.error("WebSocket Error:", error); };

// --- Main Data Handler ---
ws.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    
    // 1. Update the 3 cards
    totalEl.innerText = data.total;
    availableEl.innerText = data.available;
    occupiedEl.innerText = data.occupied;
    
    // 2. Update Gate Status <--- NEW
    const gateStatus = data.gate.charAt(0).toUpperCase() + data.gate.slice(1);
    gateStatusTextEl.innerText = `Gate: ${gateStatus}`;
    if (data.gate === "open") {
      gateStatusEl.classList.remove("closed");
      gateStatusEl.classList.add("open");
    } else {
      gateStatusEl.classList.remove("open");
      gateStatusEl.classList.add("closed");
    }
    
    // 3. Add a new entry to the log
    addLogEntry(data);

    // 4. Mark data as loaded and try to hide preloader
    isDataLoaded = true;
    tryHidePreloader();

  } catch (error) {
    console.error("Failed to parse server data:", error);
  }
};

// --- Add Log Entry Function ---
let lastOccupiedCount = -1;
function addLogEntry(data) {
  if (data.occupied === lastOccupiedCount) {
    return; // Don't log if only gate status changed
  }
  const newLog = document.createElement("li");
  const time = new Date().toLocaleTimeString();
  let message = "";
  if (lastOccupiedCount === -1) {
    message = `[${time}] System online. Status: ${data.occupied} occupied, ${data.available} available.`;
  } else if (data.occupied > lastOccupiedCount) {
    message = `[${time}] 🚗 Car Entered. Occupied slots: ${data.occupied}`;
    newLog.style.color = "#fecaca";
  } else {
    message = `[${time}] 🚙 Car Exited. Occupied slots: ${data.occupied}`;
    newLog.style.color = "#a7f3d0";
  }
  newLog.innerText = message;
  logListEl.prepend(newLog);
  while (logListEl.children.length > 10) {
    logListEl.removeChild(logListEl.lastChild);
  }
  lastOccupiedCount = data.occupied;
}

// --- Start 5-Second Minimum Timer ---
setTimeout(() => {
  isMinTimePassed = true;
  tryHidePreloader();
}, 5000); // 5000ms = 5 seconds