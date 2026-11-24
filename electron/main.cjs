const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow = null;
let serverHandle = null;

function getUserConfigPath() {
  return path.join(app.getPath('userData'), 'live-server.json');
}

function readBundledDefaultUrl() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'live-config.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return String(parsed.defaultLiveServerUrl || '').trim().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function getSavedLiveServerUrl() {
  try {
    const cfgPath = getUserConfigPath();
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (typeof parsed.liveServerUrl === 'string') {
        return parsed.liveServerUrl.trim().replace(/\/+$/, '');
      }
    }
  } catch {
    // ignore corrupt config
  }
  return readBundledDefaultUrl();
}

function saveLiveServerUrl(url) {
  const cleaned = String(url || '').trim().replace(/\/+$/, '');
  try {
    fs.writeFileSync(
      getUserConfigPath(),
      JSON.stringify({ liveServerUrl: cleaned }, null, 2),
      'utf8'
    );
  } catch {
    // ignore write error
  }
  return cleaned;
}

async function isServerReachable(url, timeoutMs = 3500) {
  if (!url) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureEmbeddedServer() {
  if (!serverHandle) {
    const serverEntry = path.join(__dirname, '..', 'dist-server', 'server', 'index.js');
    const mod = await import(pathToFileURL(serverEntry).href);
    if (typeof mod.startServer !== 'function') {
      throw new Error('Server entry does not export startServer()');
    }
    serverHandle = await mod.startServer(3001);
  }
  return serverHandle;
}

function buildWakeSplashDataUrl(targetUrl) {
  const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><style>
  body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%,#1e1b4b,#0b0914 75%);color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center}
  .box{padding:36px 44px;border-radius:24px;background:rgba(15,23,42,.72);border:1px solid rgba(251,191,36,.35);box-shadow:0 24px 60px rgba(0,0,0,.55);max-width:440px}
  h1{margin:0 0 10px;font-size:26px;letter-spacing:.08em;color:#fbbf24}
  p{margin:8px 0;font-size:14px;color:#cbd5e1;line-height:1.5}
  .url{font-size:12px;color:#94a3b8;font-family:monospace;margin-top:12px}
  .spin{width:38px;height:38px;margin:0 auto 18px;border-radius:50%;border:4px solid rgba(251,191,36,.2);border-top-color:#fbbf24;animation:s 1s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
</style></head><body><div class="box"><div class="spin"></div><h1>KRONIKI CHAOSU</h1><p>Łączenie z serwerem online…</p><p style="font-size:12px;color:#94a3b8">Jeśli serwer był uśpiony, wybudzanie może potrwać do 50 sekund.</p><div class="url">${targetUrl}</div></div></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

async function loadGameIntoWindow(win, forceLocal = false) {
  const liveUrl = forceLocal ? '' : getSavedLiveServerUrl();
  if (liveUrl) {
    // Quick 2s check first; if server is sleeping (e.g. Render free tier), show splash and wait up to 65s
    let reachable = await isServerReachable(liveUrl, 2500);
    if (!reachable) {
      await win.loadURL(buildWakeSplashDataUrl(liveUrl)).catch(() => {});
      reachable = await isServerReachable(liveUrl, 65000);
    }
    if (reachable) {
      await win.webContents.session.clearCache().catch(() => {});
      await win.loadURL(liveUrl);
      return { mode: 'remote', url: liveUrl };
    }
  }

  // If a live local server (e.g. from ./publish.sh / npm start) is already running on :3001,
  // connect to it directly instead of booting a frozen copy from app.asar!
  if (!forceLocal && (await isServerReachable('http://127.0.0.1:3001', 1200))) {
    await win.webContents.session.clearCache().catch(() => {});
    await win.loadURL('http://127.0.0.1:3001');
    return { mode: 'live-local', url: 'http://127.0.0.1:3001' };
  }

  const localSrv = await ensureEmbeddedServer();
  const localUrl = `http://127.0.0.1:${localSrv.port}`;
  await win.loadURL(localUrl);
  return { mode: 'local', url: localUrl };
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: 'Kroniki Chaosu',
            submenu: [
              { label: 'O grze Kroniki Chaosu', role: 'about' },
              { type: 'separator' },
              { label: 'Ukryj', role: 'hide' },
              { label: 'Ukryj pozostałe', role: 'hideOthers' },
              { type: 'separator' },
              { label: 'Zakończ', role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Aktualizacje',
      submenu: [
        {
          label: 'Sprawdź aktualizacje na żywo (Odśwież)',
          accelerator: isMac ? 'Command+Shift+R' : 'Ctrl+Shift+R',
          click: async () => {
            if (!mainWindow) return;
            await mainWindow.webContents.session.clearCache().catch(() => {});
            await loadGameIntoWindow(mainWindow, false);
          },
        },
        {
          label: 'Przełącz na wbudowany serwer (Tryb Offline)',
          click: async () => {
            if (!mainWindow) return;
            saveLiveServerUrl('');
            await loadGameIntoWindow(mainWindow, true);
          },
        },
      ],
    },
    {
      label: 'Widok',
      submenu: [
        { label: 'Pełny ekran', role: 'togglefullscreen', accelerator: isMac ? 'Ctrl+Command+F' : 'F11' },
        { label: 'Odśwież', role: 'reload' },
        { type: 'separator' },
        { label: 'Powiększ', role: 'zoomIn' },
        { label: 'Pomniejsz', role: 'zoomOut' },
        { label: 'Rozmiar domyślny', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Narzędzia deweloperskie', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Edycja',
      submenu: [
        { label: 'Kopiuj', role: 'copy' },
        { label: 'Wklej', role: 'paste' },
        { label: 'Wytnij', role: 'cut' },
        { label: 'Zaznacz wszystko', role: 'selectAll' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'Kroniki Chaosu — Co-op Action RPG',
    backgroundColor: '#111320',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await loadGameIntoWindow(mainWindow, false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('live:get-url', () => getSavedLiveServerUrl());

ipcMain.handle('live:set-url', async (_event, url) => {
  const cleaned = saveLiveServerUrl(url);
  if (mainWindow) {
    return loadGameIntoWindow(mainWindow, !cleaned);
  }
  return { mode: cleaned ? 'remote' : 'local', url: cleaned };
});

ipcMain.handle('live:reload-fresh', async () => {
  if (!mainWindow) return false;
  await mainWindow.webContents.session.clearCache().catch(() => {});
  mainWindow.webContents.reloadIgnoringCache();
  return true;
});

app.whenReady().then(async () => {
  buildMenu();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(console.error);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  if (serverHandle) {
    try {
      await serverHandle.close();
    } catch {
      // ignore shutdown error
    }
    serverHandle = null;
  }
});
