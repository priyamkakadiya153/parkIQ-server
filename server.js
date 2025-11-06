const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const cors = require("cors");
const path = require("path");
const fs = require("fs"); // <--- NEW

const app = express();
app.use(cors());
app.use(express.json());

// --- Database (In-Memory with Persistence) ---
const TOTAL_SLOTS = 5;
const DATA_FILE = path.join(__dirname, 'parkingData.json'); // <--- NEW

// <--- NEW: Function to read the current count from the file
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
    // If file is corrupt, reset it
    fs.writeFileSync(DATA_FILE, JSON.stringify({ occupiedSlots: 0 }), 'utf8');
    return 0;
  }
}

// <--- NEW: Function to save the current count to the file
function saveCount(count) {
  try {
    const data = JSON.stringify({ occupiedSlots: count });
    fs.writeFileSync(DATA_FILE, data, 'utf8');
    console.log(`Saved count to file: ${count}`);
  } catch (err) {
    console.error('CRITICAL: Failed to save count to file:', err);
  }
}

let occupiedSlots = loadCount(); // <--- UPDATED

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

// --- API for Your IoT Device ---
app.post("/api/increment", (req, res) => {
  if (occupiedSlots < TOTAL_SLOTS) {
    occupiedSlots++;
    saveCount(occupiedSlots); // <--- NEW
    const data = broadcastData();
    res.json({ success: true, ...data });
  } else {
    res.status(400).json({ success: false, message: "Parking is full" });
  }
});

app.post("/api/decrement", (req, res) => {
  if (occupiedSlots > 0) {
    occupiedSlots--;
    saveCount(occupiedSlots); // <--- NEW
    const data = broadcastData();
    res.json({ success: true, ...data });
  } else {
    res.status(400).json({ success: false, message: "Parking is empty" });
  }
});

// <--- NEW: TEMPORARY TEST ROUTES ---
// You can remove these when your project is live
app.get("/test/increment", (req, res) => {
  if (occupiedSlots < TOTAL_SLOTS) {
    occupiedSlots++;
    saveCount(occupiedSlots);
    broadcastData();
    res.send(`Incremented. Count is now ${occupiedSlots}. <a href="/">Back to Dashboard</a>`);
  } else {
    res.send(`Parking is full. <a href="/">Back to Dashboard</a>`);
  }
});

app.get("/test/decrement", (req, res) => {
    if (occupiedSlots > 0) {
    occupiedSlots--;
    saveCount(occupiedSlots);
    broadcastData();
    res.send(`Decremented. Count is now ${occupiedSlots}. <a href="/">Back to Dashboard</a>`);
  } else {
    res.send(`Parking is empty. <a href="/">Back to Dashboard</a>`);
  }
});
// <--- END OF TEST ROUTES ---

// --- WebSocket Connection Handling ---
wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");
  broadcastData();
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));