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

async function isServerReachable(url) {
  if (!url) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
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

async function loadGameIntoWindow(win, forceLocal = false) {
  const liveUrl = forceLocal ? '' : getSavedLiveServerUrl();
  if (liveUrl && (await isServerReachable(liveUrl))) {
    await win.webContents.session.clearCache().catch(() => {});
    await win.loadURL(liveUrl);
    return { mode: 'remote', url: liveUrl };
  }

  // If a live local server (e.g. from ./publish.sh / npm start) is already running on :3001,
  // connect to it directly instead of booting a frozen copy from app.asar!
  if (!forceLocal && (await isServerReachable('http://127.0.0.1:3001'))) {
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
