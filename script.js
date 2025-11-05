async function loadSlots() {
  const response = await fetch('/api/slots');
  const data = await response.json();

  document.getElementById('totalSlots').textContent = data.totalSlots;
  document.getElementById('occupiedSlots').textContent = data.occupiedSlots;
  document.getElementById('availableSlots').textContent = data.availableSlots;
}

setInterval(loadSlots, 2000); // refresh every 2 seconds
loadSlots();
