// Minimal native messaging host (Node) for POC
const readline = require('readline');

function sendMessage(msg) {
  const data = Buffer.from(JSON.stringify(msg));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(data.length, 0);
  process.stdout.write(header);
  process.stdout.write(data);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);
    // handle messages from extension (e.g., block domain)
    if (msg.command === 'block') {
      // write blocked domain to data file
      try {
        const fs = require('fs');
        const path = require('path');
        const dataPath = path.join(__dirname, '..', '..', 'data', 'blocked.json');
        let list = [];
        if (fs.existsSync(dataPath)) {
          list = JSON.parse(fs.readFileSync(dataPath, 'utf8') || '[]');
        };
        if (!list.includes(msg.domain)) list.push(msg.domain);
        fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        fs.writeFileSync(dataPath, JSON.stringify(list, null, 2), 'utf8');
        sendMessage({ status: 'blocked', domain: msg.domain });
      } catch (e) {
        sendMessage({ error: e.message });
      }
    } else {
      sendMessage({ status: 'unknown', received: msg });
    }
  } catch (e) {
    sendMessage({ error: e.message });
  }
});

// Keep process alive
setInterval(() => {}, 1000);
