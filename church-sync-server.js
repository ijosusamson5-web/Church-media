const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'sync-data.json');

let store = {};
try { store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { store = {}; }

let saveTimer = null;
function saveToDiskSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(store), (err) => {
      if (err) console.error('Could not save sync-data.json:', err.message);
    });
  }, 200);
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, `http://${req.headers.host}`); } catch (e) { res.writeHead(400); return res.end('Bad request'); }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (url.pathname.startsWith('/storage/')) {
    const key = decodeURIComponent(url.pathname.slice('/storage/'.length));
    if (!key) return sendJson(res, 400, { error: 'missing key' });

    if (req.method === 'GET') return sendJson(res, 200, store[key] || null);

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 10 * 1024 * 1024) req.destroy();
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const record = { key: key, value: parsed.value, shared: true };
          store[key] = record;
          saveToDiskSoon();
          return sendJson(res, 200, record);
        } catch (e) {
          return sendJson(res, 400, { error: 'bad request body' });
        }
      });
      return;
    }
    return sendJson(res, 405, { error: 'method not allowed' });
  }

  let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
  reqPath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found. Make sure index.html is in this same folder.');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`\nPort ${PORT} is already in use.\n`);
  else console.error('\nServer error:', err.message, '\n');
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('\nChurch Sync Server is running!\n');
  console.log(`On THIS computer, open:\n   http://localhost:${PORT}\n`);
  console.log('On every OTHER device (same hotspot/WiFi, no internet needed), open:');
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) console.log(`   http://${net.address}:${PORT}`);
    }
  }
  console.log('\nKeep this window open during the service. Press Ctrl+C to stop.\n');
});
