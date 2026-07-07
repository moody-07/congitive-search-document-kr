const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = process.env.PORT || 8080

// Initialize the Next.js application
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let isReady = false;

const server = createServer(async (req, res) => {
  if (!isReady) {
    res.statusCode = 503;
    res.end('Server is starting...');
    return;
  }
  try {
    const parsedUrl = parse(req.url, true)
    await handle(req, res, parsedUrl)
  } catch (err) {
    console.error('Error occurred handling', req.url, err)
    res.statusCode = 500
    res.end('internal server error')
  }
});

server.listen(port, hostname, () => {
  console.log(`> Server listening on http://${hostname}:${port} (App is preparing...)`)
});

app.prepare().then(() => {
  isReady = true;
  console.log(`> Next.js App is ready on http://${hostname}:${port}`)
}).catch((err) => {
  console.error('Error starting Next.js app:', err);
  process.exit(1);
});
