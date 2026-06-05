const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { spawn }  = require('child_process');
const path       = require('path');
const net        = require('net');
const fs         = require('fs');

const API_PORT   = 5001;
const IS_DEV     = process.env.NODE_ENV === 'development';

let mainWindow;
let apiProcess;

// ── Resolve the server entry point inside packaged app or dev tree ─────────
function resolveServerPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'app', 'api-server', 'dist', 'index.mjs'),
    path.join(__dirname, '..', 'api-server', 'dist', 'index.mjs'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Could not locate api-server/dist/index.mjs — run the build step first.');
}

// ── Poll until the API port accepts connections ────────────────────────────
function waitForPort(port, maxWaitMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const try_ = () => {
      const sock = net.createConnection(port, '127.0.0.1');
      sock.on('connect', () => { sock.destroy(); resolve(); });
      sock.on('error', () => {
        if (Date.now() - start > maxWaitMs) {
          reject(new Error(`API server did not start within ${maxWaitMs / 1000}s`));
          return;
        }
        setTimeout(try_, 400);
      });
    };
    try_();
  });
}

// ── Load .env from the project root so API keys work in packaged app ───────
function loadEnv() {
  const envPaths = [
    path.join(process.resourcesPath || '', 'app', 'api-server', '.env'),
    path.join(__dirname, '..', 'api-server', '.env'),
    path.join(app.getPath('userData'), '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf-8').split('\n');
      for (const line of lines) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
      }
      console.log('[electron] Loaded env from', p);
      return;
    }
  }
  console.warn('[electron] No .env found — make sure api-server/.env exists');
}

// ── Start the Express API server ──────────────────────────────────────────
function startApiServer() {
  loadEnv();
  const serverPath = resolveServerPath();
  console.log('[electron] Starting API server:', serverPath);

  const isPackaged = app.isPackaged;
  const uiDist = isPackaged
    ? path.join(process.resourcesPath, 'app', 'jarvis-ui', 'dist')
    : path.join(__dirname, '..', 'jarvis-ui', 'dist');

  apiProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      PORT: String(API_PORT),
      NODE_ENV: 'production',
      DESKTOP_APP: '1',
      JARVIS_UI_DIST: uiDist,
      WORKSPACE_ROOT: path.join(app.getPath('documents'), 'JARVIS'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  apiProcess.stdout.on('data', d => process.stdout.write('[api] ' + d));
  apiProcess.stderr.on('data', d => process.stderr.write('[api] ' + d));
  apiProcess.on('exit', code => console.log('[electron] API server exited with code', code));
}

// ── Create the main BrowserWindow ─────────────────────────────────────────
async function createWindow() {
  startApiServer();

  const loading = new BrowserWindow({
    width: 480, height: 260,
    frame: false,
    resizable: false,
    backgroundColor: '#000810',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  loading.loadURL(`data:text/html,
    <html><body style="margin:0;background:#000810;display:flex;align-items:center;justify-content:center;height:100vh;font-family:monospace;color:#00d4ff">
      <div style="text-align:center">
        <div style="font-size:24px;letter-spacing:.4em;font-weight:bold;text-shadow:0 0 20px #00d4ff">J.A.R.V.I.S.</div>
        <div style="margin-top:14px;font-size:11px;letter-spacing:.2em;opacity:.6">INITIALIZING SYSTEMS...</div>
      </div>
    </body></html>`);

  try {
    await waitForPort(API_PORT);
  } catch (e) {
    console.error(e.message);
  }

  mainWindow = new BrowserWindow({
    width:  1440,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    backgroundColor: '#000810',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${API_PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('ready-to-show', () => {
    loading.close();
    mainWindow.show();
    if (IS_DEV) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ─────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (apiProcess) apiProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => { if (!mainWindow) createWindow(); });
app.on('before-quit', () => { if (apiProcess) { apiProcess.kill(); apiProcess = null; } });
