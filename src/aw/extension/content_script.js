// Content script: checks current domain against blocked list and injects a soft-block overlay
(async function() {
  try {
    const url = new URL(window.location.href);
    const hostname = url.hostname;

    function injectOverlay(reason) {
      if (document.getElementById('localai-block-overlay')) return;
      const overlay = document.createElement('div');
      overlay.id = 'localai-block-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(4,6,11,0.85)';
      overlay.style.color = '#dbeafe';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = 999999999;
      overlay.innerHTML = `
        <div style="max-width:720px;padding:24px;border-radius:12px;background:rgba(6,32,56,0.9);box-shadow:0 6px 30px rgba(0,0,0,0.6);text-align:center;">
          <h1 style="margin:0 0 12px;color:#9ff">Gentle reminder</h1>
          <p style="margin:0 0 16px;color:#cde">You asked to limit access to <strong>${hostname}</strong>.</p>
          <button id="localai-unblock" style="padding:8px 14px;border-radius:8px;background:#0ea5a1;color:#002;text-decoration:none;border:none;cursor:pointer">Continue anyway</button>
        </div>
      `;
      document.documentElement.appendChild(overlay);
      document.getElementById('localai-unblock').addEventListener('click', () => {
        overlay.remove();
        // notify background if needed
        try { chrome.runtime.sendMessage({command: 'unblock_confirm', domain: hostname}); } catch (e) {}
      });
    }

    // fetch blocked domains from storage
    chrome.storage.sync.get(['blockedDomains'], (items) => {
      const blocked = items && items.blockedDomains ? items.blockedDomains : [];
      if (blocked.includes(hostname)) injectOverlay('blocked');
    });

  } catch (err) {
    console.warn('content_script error', err);
  }
})();
