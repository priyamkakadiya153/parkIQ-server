// --- DOM Elements ---
const preloaderEl = document.getElementById("preloader");
const totalEl = document.getElementById("total");
const availableEl = document.getElementById("available");
const availableCardEl = document.getElementById("available-card"); // For 'FULL' status
const occupiedEl = document.getElementById("occupied");
const logListEl = document.getElementById("status-log-list");
const gateStatusEl = document.getElementById("gate-status-indicator");
const gateStatusTextEl = document.getElementById("gate-status-text");

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

    // 2. 'FULL' Indicator Logic
    if (data.available === 0) {
      availableCardEl.classList.add("full");
      availableEl.innerText = "FULL"; // Change text from '0' to 'FULL'
    } else {
      availableCardEl.classList.remove("full");
    }

    // 3. Update Gate Status
    const gateStatus = data.gate.charAt(0).toUpperCase() + data.gate.slice(1);
    gateStatusTextEl.innerText = `Gate: ${gateStatus}`;
    if (data.gate === "open") {
      gateStatusEl.classList.remove("closed");
      gateStatusEl.classList.add("open");
    } else {
      gateStatusEl.classList.remove("open");
      gateStatusEl.classList.add("closed");
    }
    
    // 4. Add a new entry to the log
    addLogEntry(data);

    // 5. Mark data as loaded and try to hide preloader
    isDataLoaded = true;
    tryHidePreloader();

  } catch (error) {
    console.error("Failed to parse server data:", error);
  }
};

// --- Add Log Entry Function ---
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
  } else if (data.occupied > lastOccupdCount) {
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

// --- Start Minimum Timer ---
// UPDATED: This timer now matches the animation time
setTimeout(() => {
  isMinTimePassed = true;
  tryHidePreloader();
}, 2000); // 2000ms = 2 seconds
// ... (all your existing script.js code) ...
// ... (your setTimeout for the preloader) ...


// --- NEW: Display Current Date ---
// This code runs once when the page loads
function showDate() {
  const dateEl = document.getElementById("current-date");
  if (!dateEl) return; // Stop if the element isn't found

  const today = new Date();
  
  // Create formatting options (e.g., "Thursday, November 6, 2025")
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  // Set the text, using the user's local language and format
  dateEl.innerText = today.toLocaleDateString(undefined, options);
}

// Run the function to show the date
showDate();