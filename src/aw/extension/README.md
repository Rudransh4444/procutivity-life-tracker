Local AI Productivity Extension (POC)

- Load as an unpacked extension in Chrome/Edge: open chrome://extensions, enable Developer mode, "Load unpacked" and select this folder.
- The extension uses native messaging to communicate with the desktop app. Register the native host using the manifest at src/aw/native-messaging-host.json (on Windows register in the registry as per Chrome native messaging docs).
- Content script will show a gentle overlay when the current site matches a blocked domain list stored in chrome.storage.sync.blockedDomains.
- Background service worker forwards block commands to the native host.

This is a proof-of-concept and intentionally implements soft-blocking only (overlay + gentle unblock button). Do not use for strict enforcement without user consent.
