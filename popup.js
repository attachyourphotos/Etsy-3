document.getElementById("triggerButton").addEventListener("click", () => {
  const status = document.getElementById("status");
  status.textContent = "Initiating sale setup... (please wait)";
  document.getElementById("triggerButton").disabled = true; // Disable button during run

  chrome.runtime.sendMessage({ action: "triggerSale" }, (response) => {
    document.getElementById("triggerButton").disabled = false; // Re-enable button
    if (response && response.status) {
      status.textContent = response.status;
    } else {
      status.textContent = "Error: Could not initiate sale";
    }
  });
});

// Listen for status updates from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateStatus") {
    document.getElementById("status").textContent = message.status;
    if (message.status.includes("successfully")) {
      document.getElementById("triggerButton").disabled = false; // Re-enable on success
    }
  }
});
