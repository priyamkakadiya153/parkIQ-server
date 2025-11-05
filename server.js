const express = require("express");
const app = express();
const port = 3000;

let parkingData = {
  totalSlots: 10,
  occupiedSlots: 3,
  availableSlots: 7
};

// Allow JSON parsing
app.use(express.json());

// Route to show dashboard
app.get("/", (req, res) => {
  res.send(`
    <h1>🚗 ParkIQ Dashboard</h1>
    <p><b>Total Slots:</b> ${parkingData.totalSlots}</p>
    <p><b>Occupied Slots:</b> ${parkingData.occupiedSlots}</p>
    <p><b>Available Slots:</b> ${parkingData.availableSlots}</p>
  `);
});

// Endpoint to update data (for ESP8266)
app.post("/update", (req, res) => {
  const { totalSlots, occupiedSlots, availableSlots } = req.body;
  if (totalSlots !== undefined) parkingData.totalSlots = totalSlots;
  if (occupiedSlots !== undefined) parkingData.occupiedSlots = occupiedSlots;
  if (availableSlots !== undefined) parkingData.availableSlots = availableSlots;
  res.send({ message: "Data updated successfully" });
});

// Start server
app.listen(port, () => {
  console.log(`✅ ParkIQ server running at http://localhost:${port}`);
});
