const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const port = Number.parseInt(process.env.PORT ?? '8080', 10);
const host = '0.0.0.0';
const buildDirectory = path.join(__dirname, 'dist', 'rain-metrics-dashboard', 'browser');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let requestPath;
  try {
    requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  const requestedFile = path.resolve(buildDirectory, `.${requestPath}`);
  if (requestedFile !== buildDirectory && !requestedFile.startsWith(`${buildDirectory}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  const filePath = path.extname(requestedFile)
    ? requestedFile
    : path.join(buildDirectory, 'index.html');

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!response.headersSent) response.writeHead(500);
      response.end('Unable to read requested file');
    });
    stream.pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`RainMetrics dashboard listening on http://${host}:${port}`);
});
