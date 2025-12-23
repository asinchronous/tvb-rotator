const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path  = require('path');
const fs    = require('fs');
const AutoLaunch = require('auto-launch');

// Allow autoplay with sound (Chromium ≥66)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow;
let sites = [];
let currentIndex = 0;

// ========= helpers =========
const isPackaged = app.isPackaged;
const dataDir    = isPackaged ? process.resourcesPath : __dirname;
const sitesPath  = path.join(dataDir, 'sites.json');

function readSites() {
  try {
    sites = JSON.parse(fs.readFileSync(sitesPath, 'utf8'));
  } catch (e) {
    console.error('Unable to read sites.json:', e);
    sites = [];
  }
}

function loadCurrentSite() {
  if (!sites.length) return console.error('No sites to load!');
  const site = sites[currentIndex] ?? {};
  console.log(`Loading [${currentIndex}]:`, site.url);

  // ---------- Embedded web page ---------------------------
  if (site.type === 'webpage') {
    mainWindow.webContents.removeAllListeners('dom-ready');
    mainWindow.loadURL(site.url);

    mainWindow.webContents.once('dom-ready', async () => {
      try {
        await mainWindow.webContents.executeJavaScript(`
          (function () {
            let tries = 0;
            const MAX_TRIES = 12; // ~12 s

            const clickPlayBtn = () => {
              const selectors = [
                'button[aria-label="Play"]',
                '.vjs-big-play-button',
                'button.playButton',
                'button[data-testid="videoplayer-play"]',
                'button[title="Play"]'
              ];
              for (const sel of selectors) {
                const btn = document.querySelector(sel);
                if (btn) { btn.click(); break; }
              }
            };

            const handleVideo = (v) => {
              try {
                v.muted  = false;
                v.volume = 1;
                v.play().catch(()=>{});
                if (v.requestFullscreen) v.requestFullscreen().catch(()=>{});
              } catch {}
            };

            const unmuteAndFullscreen = () => {
              // normal DOM
              document.querySelectorAll('video').forEach(handleVideo);
              // one‑level shadow DOM (covers Plex)
              document.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) el.shadowRoot.querySelectorAll('video').forEach(handleVideo);
              });
            };

            const tick = () => {
              tries++;
              clickPlayBtn();
              unmuteAndFullscreen();
              if (tries >= MAX_TRIES) clearInterval(timer);
            };

            const timer = setInterval(tick, 1000);
            tick();
          })();
        `);
      } catch (err) {
        console.error('JS injection failed:', err);
      }
    });

  // ---------- Raw m3u8 stream -----------------------------
  } else if (site.type === 'm3u8') {
    mainWindow.webContents.removeAllListeners('did-finish-load');
    mainWindow.loadFile('player.html');
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('load-stream', site.url);
    });

  } else {
    console.error('Unknown site type:', site.type);
  }
}

function nextSite() {
  if (!sites.length) return;
  currentIndex = (currentIndex + 1) % sites.length;
  mainWindow.webContents.stop();
  loadCurrentSite();
}

function previousSite() {
  if (!sites.length) return;
  currentIndex = (currentIndex - 1 + sites.length) % sites.length;
  mainWindow.webContents.stop();
  loadCurrentSite();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  loadCurrentSite();

  globalShortcut.register('Right', nextSite);
  globalShortcut.register('Left',  previousSite);

  mainWindow.webContents.on('did-fail-load', (_e, _ec, description, url, isMainFrame) => {
    if (isMainFrame) {
      console.warn(`Failed to load ${url} (${description}) — skipping`);
      setTimeout(nextSite, 3000);
    }
  });
}

app.whenReady().then(() => {
  readSites();
  createWindow();

  new AutoLaunch({ name: 'TVB Rotator', isHidden: true })
    .enable()
    .catch(err => console.error('Auto‑launch failed:', err));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.on('request-next-channel', nextSite);
app.on('window-all-closed', () => (process.platform !== 'darwin') && app.quit());
app.on('will-quit',            () => globalShortcut.unregisterAll());