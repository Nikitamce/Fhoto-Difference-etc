import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const DEFAULT_PORT = 4173;
const PORT_FIXED = Boolean(process.env.PORT);
let activePort = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.wasm', 'application/wasm'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8']
]);

function sendText(res, status, message) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(message);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', `http://${HOST}`).pathname);
  } catch {
    sendText(res, 400, 'Bad request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(ROOT, `.${pathname}`);
  const relative = path.relative(ROOT, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  try {
    let info = await stat(filePath);
    let resolvedPath = filePath;
    if (info.isDirectory()) {
      resolvedPath = path.join(filePath, 'index.html');
      info = await stat(resolvedPath);
    }
    if (!info.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': MIME.get(path.extname(resolvedPath).toLowerCase()) || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = createReadStream(resolvedPath);
    stream.on('error', () => {
      if (!res.headersSent) sendText(res, 500, 'Could not read file');
      else res.destroy();
    });
    stream.pipe(res);
  } catch (error) {
    sendText(res, error?.code === 'ENOENT' || error?.code === 'ENOTDIR' ? 404 : 500,
      error?.code === 'ENOENT' || error?.code === 'ENOTDIR' ? 'Not found' : 'Server error');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && !PORT_FIXED && activePort < DEFAULT_PORT + 10) {
    activePort += 1;
    server.listen(activePort, HOST);
    return;
  }
  if (error.code === 'EADDRINUSE') {
    console.error(`Порт ${activePort} уже занят. Закройте другое окно PhotoCheck или задайте другой PORT.`);
  } else {
    console.error('Ошибка локального сервера:', error);
  }
  process.exitCode = 1;
});

server.on('listening', () => {
  const address = server.address();
  activePort = typeof address === 'object' && address ? address.port : activePort;
  const appUrl = `http://${HOST}:${activePort}/`;
  console.log('PhotoCheck Studio запущен:');
  console.log(`  ${appUrl}`);
  console.log('Оставьте это окно открытым, пока работает приложение. Для остановки нажмите Ctrl+C.');
  if (process.env.OPEN_BROWSER === '1' && process.platform === 'win32') {
    exec(`start "" "${appUrl}"`, { cwd: ROOT }, (error) => {
      if (error) console.warn('Не удалось автоматически открыть браузер. Перейдите по адресу выше.');
    });
  }
});

server.listen(activePort, HOST);
