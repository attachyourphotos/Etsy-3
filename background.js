chrome.runtime.onInstalled.addListener(() => {
  // Schedule daily alarm between 1 AM and 5 AM
  chrome.alarms.create("dailySale", {
    when: getNextRunTime(),
    periodInMinutes: 1440 // Run once every 24 hours
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailySale") {
    // Open Etsy sale creation page and trigger sale setup
    chrome.tabs.create({ url: "https://www.etsy.com/your/shops/me/sales-discounts/step/createSale?ref=seller-platform-mcnav" }, (tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
    });
  }
});

// Calculate next run time (random time between 1 AM and 5 AM)
function getNextRunTime() {
  const now = new Date();
  const next = new Date();
  next.setDate(now.getDate() + (now.getHours() >= 5 ? 1 : 0));
  next.setHours(1 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);
  return next.getTime();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "triggerSale") {
    chrome.tabs.create({ url: "https://www.etsy.com/your/shops/me/sales-discounts/step/createSale?ref=seller-platform-mcnav" }, (tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }, () => {
        sendResponse({ status: "Sale setup initiated" });
      });
    });
    return true; // Keep message channel open for async response
  }
});
