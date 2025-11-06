const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// --- Database (Persistence) ---
const TOTAL_SLOTS = 5;
const DATA_FILE = path.join(__dirname, 'parkingData.json');

function loadCount() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const count = JSON.parse(data).occupiedSlots;
      console.log(`Successfully loaded count from file: ${count}`);
      return count;
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ occupiedSlots: 0 }), 'utf8');
      console.log('parkingData.json not found. Created it with count 0.');
      return 0;
    }
  } catch (err) {
    console.error('Error reading data file, resetting to 0:', err);
    fs.writeFileSync(DATA_FILE, JSON.stringify({ occupiedSlots: 0 }), 'utf8');
    return 0;
  }
}

function saveCount(count) {
  try {
    const data = JSON.stringify({ occupiedSlots: count });
    fs.writeFileSync(DATA_FILE, data, 'utf8');
    console.log(`Saved count to file: ${count}`);
  } catch (err) {
    console.error('CRITICAL: Failed to save count to file:', err);
  }
}

let occupiedSlots = loadCount();
let gateStatus = "closed"; // <--- NEW: In-memory variable for gate status

// --- HTTP Server & WebSocket Server Setup ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Helper Function ---
function broadcastData() {
  const availableSlots = TOTAL_SLOTS - occupiedSlots;
  const data = {
    total: TOTAL_SLOTS,
    occupied: occupiedSlots,
    available: availableSlots,
    gate: gateStatus // <--- NEW: Add gate status to broadcast
  };
  
  const jsonData = JSON.stringify(data);
  console.log("Broadcasting:", jsonData);
  
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(jsonData);
    }
  });
  return data;
}

// --- Static File Serving ---
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- API for Parking Count ---
app.post("/api/increment", (req, res) => {
  if (occupiedSlots < TOTAL_SLOTS) {
    occupiedSlots++;
    saveCount(occupiedSlots);
    const data = broadcastData();
    res.json({ success: true, ...data });
  } else {
    res.status(400).json({ success: false, message: "Parking is full" });
  }
});

app.post("/api/decrement", (req, res) => {
  if (occupiedSlots > 0) {
    occupiedSlots--;
    saveCount(occupiedSlots);
    const data = broadcastData();
    res.json({ success: true, ...data });
  } else {
    res.status(400).json({ success: false, message: "Parking is empty" });
  }
});

// <--- NEW: API for Gate Status ---
app.post("/api/gate/open", (req, res) => {
  gateStatus = "open";
  const data = broadcastData();
  console.log("Gate status changed to OPEN");
  res.json({ success: true, ...data });
});

app.post("/api/gate/close", (req, res) => {
  gateStatus = "closed";
  const data = broadcastData();
  console.log("Gate status changed to CLOSED");
  res.json({ success: true, ...data });
});


// --- TEST ROUTES (Count) ---
app.get("/test/increment", (req, res) => {
  if (occupiedSlots < TOTAL_SLOTS) { occupiedSlots++; saveCount(occupiedSlots); }
  broadcastData();
  res.send(`Incremented. Count is ${occupiedSlots}. <a href="/">Back</a>`);
});

app.get("/test/decrement", (req, res) => {
  if (occupiedSlots > 0) { occupiedSlots--; saveCount(occupiedSlots); }
  broadcastData();
  res.send(`Decremented. Count is ${occupiedSlots}. <a href="/">Back</a>`);
});

// <--- NEW: TEST ROUTES (Gate) ---
app.get("/test/gate/open", (req, res) => {
  gateStatus = "open";
  broadcastData();
  res.send(`Gate is OPEN. <a href="/">Back</a>`);
});
app.get("/test/gate/close", (req, res) => {
  gateStatus = "closed";
  broadcastData();
  res.send(`Gate is CLOSED. <a href="/">Back</a>`);
});

// --- WebSocket Connection Handling ---
wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");
  broadcastData(); // Send current status immediately
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));