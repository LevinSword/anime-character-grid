import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_DIR = path.join(__dirname, 'html');
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const ALLOWED_HOSTS = new Set(['s4.anilist.co', 'lain.bgm.tv']);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. 代理图片: /api/img
  if (pathname === '/api/img') {
    const host = parsedUrl.searchParams.get('host');
    const imgPath = parsedUrl.searchParams.get('path');

    if (!host || !imgPath || !imgPath.startsWith('/')) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing host or path');
      return;
    }

    if (!ALLOWED_HOSTS.has(host)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden host');
      return;
    }

    try {
      const target = `https://${host}${imgPath}`;
      const upstream = await fetch(target, {
        headers: {
          'User-Agent': req.headers['user-agent'] || 'anime-character-grid/1.0',
          Accept: req.headers['accept'] || 'image/*,*/*',
        },
      });

      res.writeHead(upstream.status, {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      });

      const arrayBuffer = await upstream.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy image error: ' + err.message);
    }
    return;
  }

  // 2. 代理 Bangumi 搜索: /api/bangumi
  if (pathname === '/api/bangumi') {
    let keyword = parsedUrl.searchParams.get('keyword');

    if (!keyword && req.method === 'POST') {
      try {
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        const body = JSON.parse(Buffer.concat(buffers).toString());
        keyword = body.keyword;
      } catch (e) {}
    }

    if (!keyword) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [] }));
      return;
    }

    try {
      const upstream = await fetch('https://api.bgm.tv/v0/search/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'anime-character-grid/1.0 (https://github.com/ssshooter/anime-character-grid)',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      });

      const data = await upstream.text();
      res.writeHead(upstream.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, data: [] }));
    }
    return;
  }

  // 3. 静态文件
  let filePath = path.join(HTML_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(HTML_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    PORT++;
    console.log(`端口被占用，正在尝试端口 ${PORT}...`);
    server.listen(PORT);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`本地开发服务器已启动: http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
