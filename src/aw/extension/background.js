// Background service worker for extension POC
function sendNativeMessage(message, cb) {
  if (!chrome || !chrome.runtime || !chrome.runtime.sendNativeMessage) {
    console.warn('Native messaging not available');
    if (cb) cb({ error: 'native-messaging-not-available' });
    return;
  }
  chrome.runtime.sendNativeMessage('com.localai.productivity.native', message, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Native messaging error', chrome.runtime.lastError.message);
      if (cb) cb({ error: chrome.runtime.lastError.message });
      return;
    }
    if (cb) cb(response);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.command) return;
  if (request.command === 'block') {
    sendNativeMessage({ command: 'block', domain: request.domain }, (resp) => sendResponse(resp));
    return true; // indicate async response
  }
});
