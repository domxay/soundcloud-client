const { app, BrowserWindow, ipcMain, shell, dialog, session, net, protocol, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const netSocket = require('net');
const { pathToFileURL } = require('url');

// Global process error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled Rejection:', reason);
});

// Register custom privileged scheme for streaming local MP4/WebM videos and images
try {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'local-media',
      privileges: {
        standard: true,
        secure: true,
        bypassCSP: true,
        allowServiceWorkers: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
} catch {}

let mainWindow = null;
let overlayWindow = null;
let cachedOverlayState = null;
let currentProxyRule = null;
let cachedClientId = 'z7SdppGR2n32vjiLbTeRJnOdA3dFn6Nn';

// Single instance lock to prevent multi-process database and cache collisions
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// Disable persistent shader disk cache to prevent Windows GPUCache lock errors
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Origin': 'https://soundcloud.com',
  'Referer': 'https://soundcloud.com/',
  'Accept': '*/*',
};

function getProxySettingsPath() {
  return path.join(app.getPath('userData'), 'proxy-settings.json');
}

function loadSavedProxy() {
  try {
    const file = getProxySettingsPath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (data && typeof data.proxy === 'string') {
        return data.proxy;
      }
    }
  } catch {}
  return null;
}

function saveProxySettings(proxy) {
  try {
    const file = getProxySettingsPath();
    fs.writeFileSync(file, JSON.stringify({ proxy }), 'utf-8');
  } catch {}
}

function getDownloadsPath() {
  const dir = path.join(app.getPath('downloads'), 'SoundCloud');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getNetworkSettingsPath() {
  return path.join(app.getPath('userData'), 'network-settings.json');
}

function loadNetworkSettings() {
  try {
    const file = getNetworkSettingsPath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (data && typeof data === 'object') return data;
    }
  } catch {}
  return { dohEnabled: true, builtinProxyEnabled: false, builtinProxyPort: 8899 };
}

function saveNetworkSettings(settings) {
  try {
    fs.writeFileSync(getNetworkSettingsPath(), JSON.stringify(settings || {}), 'utf-8');
  } catch {}
}

const __netSettings = loadNetworkSettings();
if (__netSettings.dohEnabled !== false) {
  try {
    app.commandLine.appendSwitch('enable-features', 'DnsOverHttps');
    app.commandLine.appendSwitch(
      'dns-over-https-templates',
      'https://dns.adguard-dns.com/dns-query{?dns}'
    );
  } catch {}
}

// Automatic SoundCloud client_id scraping and caching
async function fetchSoundCloudClientId(force = false) {
  if (cachedClientId && !force) {
    return cachedClientId;
  }
  try {
    const homeHtml = await fetchText('https://soundcloud.com');
    const scriptMatches = homeHtml.match(/https:\/\/a-v2\.sndcdn\.com\/assets\/[a-zA-Z0-9\-_.]+\.js/g) || [];
    for (const sUrl of scriptMatches.slice(0, 12)) {
      try {
        const jsText = await fetchText(sUrl);
        const match = jsText.match(/client_id[:=]["']([a-zA-Z0-9]{32})["']/);
        if (match && match[1]) {
          cachedClientId = match[1];
          try {
            fs.writeFileSync(
              path.join(app.getPath('userData'), 'client-id.json'),
              JSON.stringify({ clientId: cachedClientId, ts: Date.now() }),
              'utf-8'
            );
          } catch {}
          return cachedClientId;
        }
      } catch {}
    }
  } catch {}
  return cachedClientId || 'z7SdppGR2n32vjiLbTeRJnOdA3dFn6Nn';
}

async function fetchBuffer(url) {
  if (net && typeof net.fetch === 'function') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const res = await net.fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const ab = await res.arrayBuffer();
      return Buffer.from(ab);
    } finally {
      clearTimeout(timer);
    }
  }
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: DEFAULT_HEADERS }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode && res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.setTimeout(18000, () => {
      req.destroy(new Error('Network request timed out'));
    });
    req.on('error', reject);
  });
}

async function fetchText(url) {
  const buf = await fetchBuffer(url);
  return buf.toString('utf-8');
}

function checkTcpPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = netSocket.connect({ host, port, timeout: 300 });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function detectLocalProxy() {
  const foundCandidates = [];

  // 1. Check Clash Verge Rev configuration (verge.yaml and clash-verge.yaml)
  const appData = process.env.APPDATA || '';
  const vergeDirs = [
    path.join(appData, 'io.github.clash-verge-rev.clash-verge-rev'),
    path.join(appData, 'clash-verge-rev'),
    path.join(appData, 'clash_verge'),
    path.join(appData, 'Clash Verge'),
  ];

  for (const vDir of vergeDirs) {
    const vergeYaml = path.join(vDir, 'verge.yaml');
    if (fs.existsSync(vergeYaml)) {
      try {
        const content = fs.readFileSync(vergeYaml, 'utf-8');
        const mixedMatch = content.match(/verge_mixed_port:\s*(\d+)/);
        if (mixedMatch) {
          const port = parseInt(mixedMatch[1], 10);
          if (await checkTcpPort(port)) {
            foundCandidates.push({
              proxy: `http://127.0.0.1:${port}`,
              name: `Clash Verge Mixed (${port})`,
              port,
              protocol: 'http',
            });
          }
        }
        const httpMatch = content.match(/verge_port:\s*(\d+)/);
        if (httpMatch) {
          const port = parseInt(httpMatch[1], 10);
          if (await checkTcpPort(port)) {
            foundCandidates.push({
              proxy: `http://127.0.0.1:${port}`,
              name: `Clash Verge HTTP (${port})`,
              port,
              protocol: 'http',
            });
          }
        }
      } catch {}
    }

    const clashYaml = path.join(vDir, 'clash-verge.yaml');
    if (fs.existsSync(clashYaml)) {
      try {
        const content = fs.readFileSync(clashYaml, 'utf-8');
        const mMatch = content.match(/mixed-port:\s*(\d+)/);
        if (mMatch) {
          const port = parseInt(mMatch[1], 10);
          if (await checkTcpPort(port)) {
            foundCandidates.push({
              proxy: `http://127.0.0.1:${port}`,
              name: `Clash Verge (${port})`,
              port,
              protocol: 'http',
            });
          }
        }
      } catch {}
    }
  }

  // 2. Comprehensive port list for Clash, v2rayN, Sing-box, Mihomo, Flclash, ByeDPI, Zapret, Tor
  const commonPorts = [
    { port: 56234, type: 'http', name: 'Clash Verge (Active Profile)' },
    { port: 7892, type: 'http', name: 'Clash Verge / Mihomo Core' },
    { port: 7890, type: 'http', name: 'Clash / Flclash Mixed' },
    { port: 7897, type: 'http', name: 'Clash Verge Rev Default' },
    { port: 7893, type: 'http', name: 'Mihomo Party Mixed' },
    { port: 10809, type: 'http', name: 'v2rayN HTTP Proxy' },
    { port: 10808, type: 'socks5', name: 'v2rayN SOCKS5 Proxy' },
    { port: 2080, type: 'socks5', name: 'Sing-box SOCKS5' },
    { port: 2081, type: 'http', name: 'Sing-box HTTP' },
    { port: 1080, type: 'socks5', name: 'Zapret / ByeDPI SOCKS5' },
    { port: 1081, type: 'socks5', name: 'ByeDPI Alternate' },
    { port: 9050, type: 'socks5', name: 'Tor SOCKS5' },
    { port: 9150, type: 'socks5', name: 'Tor Browser SOCKS5' },
    { port: 39706, type: 'http', name: 'Clash Verge Legacy PAC' },
  ];

  for (const item of commonPorts) {
    if (foundCandidates.some((c) => c.port === item.port)) continue;
    const isOpen = await checkTcpPort(item.port);
    if (isOpen) {
      const proto = item.type === 'socks5' ? 'socks5' : 'http';
      foundCandidates.push({
        proxy: `${proto}://127.0.0.1:${item.port}`,
        name: `${item.name} (${item.port})`,
        port: item.port,
        protocol: proto,
      });
    }
  }

  if (foundCandidates.length > 0) {
    return {
      success: true,
      proxy: foundCandidates[0].proxy,
      name: foundCandidates[0].name,
      candidates: foundCandidates,
    };
  }

  return { success: false, candidates: [] };
}

function parseProxyHostPort(rule) {
  if (!rule || typeof rule !== 'string') return null;
  const cleaned = rule.trim();
  const match = cleaned.match(/^(?:https?|socks5?|socks5h?):\/\/([^:/]+):(\d+)$/i) || cleaned.match(/^([^:/]+):(\d+)$/);
  if (match) {
    return { host: match[1], port: parseInt(match[2], 10) };
  }
  return null;
}

async function testProxyRule(rule) {
  const start = Date.now();
  const previousProxy = currentProxyRule;
  try {
    const config = rule && rule.trim() ? { proxyRules: rule.trim() } : { mode: 'system' };
    
    // Quick port check if local proxy address was given
    const parsed = parseProxyHostPort(rule);
    if (parsed && (parsed.host === '127.0.0.1' || parsed.host === 'localhost')) {
      const isPortOpen = await checkTcpPort(parsed.port, parsed.host, 2000);
      if (!isPortOpen) {
        return {
          success: false,
          error: `Локальный порт ${parsed.host}:${parsed.port} закрыт. Убедитесь, что Clash Verge или другой прокси-клиент запущен.`,
        };
      }
    }

    // Apply proxy to defaultSession to test through Chromium's network engine
    if (session.defaultSession) {
      await session.defaultSession.setProxy(config);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const testUrl = 'https://api-v2.soundcloud.com/charts?kind=trending&limit=1&client_id=' + cachedClientId;
    
    // Electron's net module exports top-level fetch
    const res = await net.fetch(testUrl, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;
    if (res.ok) {
      return { success: true, latency, status: res.status };
    }
    return { success: false, status: res.status, error: `HTTP ${res.status}` };
  } catch (err) {
    // If test failed and there was a previous working proxy rule, restore it
    if (previousProxy && session.defaultSession) {
      try {
        await session.defaultSession.setProxy({ proxyRules: previousProxy });
      } catch {}
    }
    return { success: false, error: err.message };
  }
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const overlayWidth = 560;
  const overlayHeight = 50;
  const posX = Math.round((screenWidth - overlayWidth) / 2);
  const posY = 14;

  overlayWindow = new BrowserWindow({
    title: 'SoundCloud Desktop Island',
    width: overlayWidth,
    height: overlayHeight,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const distPath = path.join(__dirname, '../dist/index.html');
  if (process.env.VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/overlay`);
  } else if (fs.existsSync(distPath)) {
    overlayWindow.loadFile(distPath, { hash: '/overlay' });
  } else {
    overlayWindow.loadURL('http://localhost:5173/#/overlay').catch(() => {
      overlayWindow.loadFile(distPath, { hash: '/overlay' });
    });
  }

  overlayWindow.webContents.on('did-finish-load', () => {
    if (cachedOverlayState && overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('sc:overlay-state', cachedOverlayState);
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'SoundCloud Desktop',
    width: 1300,
    height: 870,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    show: false,
    center: true,
    backgroundColor: '#121212',
    icon: path.join(__dirname, '../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const showWindowSafely = () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  };

  mainWindow.once('ready-to-show', showWindowSafely);
  setTimeout(showWindowSafely, 1500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('minimize', () => {
    try {
      const win = createOverlayWindow();
      win.showInactive();
      win.setAlwaysOnTop(true, 'screen-saver');
      if (cachedOverlayState && !win.isDestroyed()) {
        win.webContents.send('sc:overlay-state', cachedOverlayState);
      }
    } catch {}
  });

  mainWindow.on('restore', () => {
    try {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
      }
    } catch {}
  });

  mainWindow.on('focus', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && !mainWindow.isMinimized() && overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.hide();
      }
    } catch {}
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  const proxyConfig = currentProxyRule ? { proxyRules: currentProxyRule } : { mode: 'system' };
  if (mainWindow.webContents.session) {
    mainWindow.webContents.session.setProxy(proxyConfig).catch(() => {});
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.warn('[Main] Failed to load URL:', validatedURL, errorCode, errorDescription);
    if (fs.existsSync(distPath) && validatedURL !== distPath) {
      mainWindow.loadFile(distPath).catch(() => {});
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(distPath);
    });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.on('sc:overlay-sync-state', (event, state) => {
  cachedOverlayState = state;
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
    overlayWindow.webContents.send('sc:overlay-state', state);
  }
});

ipcMain.on('sc:overlay-action', (event, data) => {
  const { action, payload } = data || {};
  if (action === 'expand-app' || action === 'restore') {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    } catch {}
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide();
    }
    return;
  }
  if (action === 'close') {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.hide();
    }
    return;
  }
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send('sc:overlay-command', { action, payload });
  }
});

ipcMain.on('sc:overlay-move', (event, { deltaX, deltaY }) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      const [currentX, currentY] = overlayWindow.getPosition();
      overlayWindow.setPosition(Math.round(currentX + deltaX), Math.round(currentY + deltaY));
    } catch {}
  }
});

ipcMain.handle('sc:get-overlay-bounds', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      return overlayWindow.getBounds();
    } catch {}
  }
  return { x: 0, y: 14, width: 604, height: 74 };
});

ipcMain.handle('sc:resize-overlay', (event, payload, legacyHeight, legacyNewX) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      const bounds = overlayWindow.getBounds();
      let width = bounds.width;
      let height = bounds.height;
      let targetX = bounds.x;
      let targetY = bounds.y;

      if (typeof payload === 'number') {
        width = payload;
        if (typeof legacyHeight === 'number') height = legacyHeight;
        if (typeof legacyNewX === 'number') {
          targetX = legacyNewX;
        } else {
          targetX = Math.round(bounds.x - (width - bounds.width) / 2);
        }
      } else if (payload && typeof payload === 'object') {
        if (typeof payload.width === 'number') width = payload.width;
        if (typeof payload.height === 'number') height = payload.height;
        if (typeof payload.x === 'number') {
          targetX = payload.x;
        } else if (typeof payload.newX === 'number') {
          targetX = payload.newX;
        } else if (typeof payload.width === 'number') {
          targetX = Math.round(bounds.x - (width - bounds.width) / 2);
        }
        if (typeof payload.y === 'number') targetY = payload.y;
      }

      overlayWindow.setBounds({
        x: Math.round(targetX),
        y: Math.round(targetY),
        width: Math.round(width),
        height: Math.round(height),
      });
    } catch {}
  }
});

ipcMain.handle('sc:restore-main-window', () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  } catch {}
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
});

ipcMain.handle('sc:toggle-overlay', (event, explicitShow) => {
  const win = createOverlayWindow();
  const shouldShow = explicitShow !== undefined ? explicitShow : !win.isVisible();
  if (shouldShow) {
    win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver');
    if (cachedOverlayState) {
      win.webContents.send('sc:overlay-state', cachedOverlayState);
    }
    return true;
  } else {
    win.hide();
    return false;
  }
});

// Pinterest Wallpaper Search & URL Resolver
ipcMain.handle('sc:search-pinterest', async (event, query, animated) => {
  try {
    const cleanQuery = (query || 'dark aesthetic').trim();
    const fullQuery = animated
      ? `site:pinterest.com ${cleanQuery} gif loop`
      : `site:pinterest.com ${cleanQuery} wallpaper 4k`;

    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(fullQuery)}&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await tokenRes.text();
    const match = html.match(/vqd=["']?([0-9-]+)["']?/i) || html.match(/vqd=([0-9-]+)/i);
    if (!match) return [];

    const vqd = match[1];
    const filterParam = animated ? '&f=type:gif' : '';
    const apiReq = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(fullQuery)}&vqd=${vqd}${filterParam}`;

    const res = await fetch(apiReq, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    const data = await res.json();
    const items = data.results || [];

    return items
      .filter((item) => item.image && item.image.startsWith('http') && !item.image.includes('d53b014d86a6b6761bf649a0ed813c2b'))
      .map((item, index) => {
        let fullUrl = item.image;
        if (fullUrl.includes('pinimg.com')) {
          fullUrl = fullUrl.replace(/\/(?:236x|474x|564x|736x|1200x)\//, '/originals/');
        }

        // Lightweight thumbnail to prevent renderer lag and memory bloat
        let thumbUrl = item.thumbnail || item.image;
        if (thumbUrl.includes('pinimg.com/originals/')) {
          thumbUrl = thumbUrl.replace('/originals/', '/474x/');
        }

        const isVideo = /\.(mp4|webm)$/i.test(fullUrl);
        const isGif = /\.(gif)$/i.test(fullUrl) || !!animated;

        return {
          id: `pin-${Date.now()}-${index}`,
          title: (item.title || 'Pinterest Aesthetic').replace(/\|.*|Etsy.*|-.*|Pinterest/gi, '').trim(),
          url: fullUrl,
          thumbnail: thumbUrl,
          width: item.width,
          height: item.height,
          source: item.url,
          type: isVideo ? 'video' : 'image',
          isAnimated: isVideo || isGif,
        };
      });
  } catch (err) {
    console.error('Electron Pinterest search error:', err);
    return [];
  }
});

ipcMain.handle('sc:resolve-pinterest-url', async (event, pinUrl) => {
  try {
    const trimmed = (pinUrl || '').trim();
    if (!trimmed) return { success: false, error: 'Empty URL' };

    // Direct image / video asset link
    if (/\.(jpg|jpeg|png|webp|gif|mp4|webm)(\?.*)?$/i.test(trimmed)) {
      const origUrl = trimmed.replace(/\/(?:236x|474x|564x|736x|1200x)\//, '/originals/');
      const isVideo = /\.(mp4|webm)(\?.*)?$/i.test(origUrl);
      return { success: true, url: origUrl, type: isVideo ? 'video' : 'image' };
    }

    const res = await fetch(trimmed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    const html = await res.text();

    // Priority 1: Video (MP4) from v1.pinimg.com or og:video
    const mp4Matches = [...html.matchAll(/https:\/\/(?:v1\.pinimg\.com|v\.pinimg\.com)[^"'<>\s]+\.mp4/g)].map((m) => m[0]);
    if (mp4Matches.length > 0) {
      const bestVideo = mp4Matches.find((v) => v.includes('720p') || v.includes('1080p')) || mp4Matches[0];
      return { success: true, url: bestVideo, type: 'video' };
    }

    const ogVideo = html.match(/<meta property="og:video" content="([^"]+)"/);
    if (ogVideo) {
      return { success: true, url: ogVideo[1], type: 'video' };
    }

    // Priority 2: Full Original Image from i.pinimg.com/originals/ (exclude Pinterest site logo d53b014d86a6b6761bf649a0ed813c2b)
    const allOriginals = [...html.matchAll(/https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9\/._-]+\.(?:jpg|png|webp|gif)/g)]
      .map((m) => m[0])
      .filter((u) => !u.includes('d53b014d86a6b6761bf649a0ed813c2b'));

    if (allOriginals.length > 0) {
      return { success: true, url: allOriginals[0], type: 'image' };
    }

    // Priority 3: Pin image with resolution (736x, 1200x, 564x, 474x) upgraded to originals
    const resMatches = [...html.matchAll(/https:\/\/i\.pinimg\.com\/(?:736x|1200x|564x|474x)\/[a-zA-Z0-9\/._-]+\.(?:jpg|png|webp|gif)/g)]
      .map((m) => m[0])
      .filter((u) => !u.includes('d53b014d86a6b6761bf649a0ed813c2b'));

    if (resMatches.length > 0) {
      const upgraded = resMatches[0].replace(/\/(?:736x|1200x|564x|474x)\//, '/originals/');
      return { success: true, url: upgraded, type: 'image' };
    }

    // Priority 4: og:image upgraded
    const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImg && !ogImg[1].includes('d53b014d86a6b6761bf649a0ed813c2b')) {
      const upgraded = ogImg[1].replace(/\/(?:736x|1200x|564x|474x)\//, '/originals/');
      return { success: true, url: upgraded, type: 'image' };
    }

    return { success: false, error: 'Не удалось извлечь оригинальный медиафайл из ссылки Pinterest' };
  } catch (err) {
    return { success: false, error: err.message || 'Resolve failed' };
  }
});

ipcMain.handle('sc:window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.handle('sc:window-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('sc:window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.handle('sc:select-save-file', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Audio Track',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [{ name: 'Audio Files (*.m4a, *.mp3)', extensions: ['m4a', 'mp3'] }],
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
});

ipcMain.handle('sc:select-download-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Destination Folder for Downloads',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('sc:select-background-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Background (GIF, Video, Image)',
    properties: ['openFile'],
    filters: [
      {
        name: 'Media Files (*.gif, *.mp4, *.webm, *.m4v, *.mov, *.png, *.jpg, *.jpeg, *.webp)',
        extensions: ['gif', 'mp4', 'webm', 'm4v', 'mov', 'png', 'jpg', 'jpeg', 'webp'],
      },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  const filePath = result.filePaths[0];
  const normalized = filePath.replace(/\\/g, '/');
  const isVideo = /\.(mp4|webm|m4v|mov|mkv)$/i.test(normalized);
  return {
    url: `local-media://asset/${normalized}`,
    type: isVideo ? 'video' : 'image',
    fileName: path.basename(filePath),
  };
});

ipcMain.handle('sc:get-client-id', async (event, forceRefresh) => {
  return fetchSoundCloudClientId(Boolean(forceRefresh));
});

// Auto-sync active session from SoundCloud cookies
ipcMain.handle('sc:sync-session', async () => {
  try {
    const targetSession = session.defaultSession;
    if (!targetSession) return { success: false, error: 'Session unavailable' };

    const cookies = await targetSession.cookies.get({ domain: '.soundcloud.com' });
    const oauthCookie = cookies.find((c) => c.name === 'oauth_token');
    const clientId = await fetchSoundCloudClientId();

    if (oauthCookie && oauthCookie.value) {
      return { success: true, token: oauthCookie.value, clientId };
    }

    const allCookies = await targetSession.cookies.get({});
    const fallbackOauth = allCookies.find((c) => c.name.toLowerCase().includes('oauth'));
    if (fallbackOauth && fallbackOauth.value) {
      return { success: true, token: fallbackOauth.value, clientId };
    }

    return { success: false, error: 'No active SoundCloud session cookie found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sc:set-proxy', async (event, proxyRule) => {
  const rule = proxyRule && proxyRule.trim();
  currentProxyRule = rule || null;
  saveProxySettings(currentProxyRule);
  const config = currentProxyRule ? { proxyRules: currentProxyRule } : { mode: 'system' };
  try {
    if (session.defaultSession) {
      await session.defaultSession.setProxy(config);
    }
    if (mainWindow && mainWindow.webContents.session) {
      await mainWindow.webContents.session.setProxy(config);
    }
    return { success: true, proxy: currentProxyRule };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sc:test-proxy', async (event, rule) => {
  return testProxyRule(rule);
});

ipcMain.handle('sc:detect-local-proxy', () => detectLocalProxy());

ipcMain.handle('sc:open-login', async () => {
  if (!currentProxyRule) {
    const detected = await detectLocalProxy();
    if (detected.success && detected.proxy) {
      currentProxyRule = detected.proxy;
      saveProxySettings(currentProxyRule);
      const config = { proxyRules: currentProxyRule };
      if (session.defaultSession) {
        try {
          await session.defaultSession.setProxy(config);
        } catch {}
      }
    }
  }

  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 520,
      height: 720,
      parent: mainWindow,
      modal: true,
      title: 'Sign in to SoundCloud',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const config = currentProxyRule ? { proxyRules: currentProxyRule } : { mode: 'system' };
    if (loginWin.webContents.session) {
      loginWin.webContents.session.setProxy(config).catch(() => {});
    }

    let resolved = false;

    // 1. Capture via API request headers
    const filter = { urls: ['*://api-v2.soundcloud.com/*'] };
    loginWin.webContents.session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      const authHeader = details.requestHeaders['Authorization'] || details.requestHeaders['authorization'];
      if (authHeader && authHeader.startsWith('OAuth ') && !resolved) {
        resolved = true;
        const token = authHeader.replace('OAuth ', '').trim();
        const urlObj = new URL(details.url);
        const clientId = urlObj.searchParams.get('client_id') || cachedClientId;

        setTimeout(() => {
          if (!loginWin.isDestroyed()) {
            loginWin.close();
          }
        }, 800);

        resolve({ success: true, token, clientId });
      }
      callback({ requestHeaders: details.requestHeaders });
    });

    // 2. Capture via cookie arrival
    const cookieHandler = (event, cookie) => {
      if (!resolved && cookie.name === 'oauth_token' && cookie.value) {
        resolved = true;
        loginWin.webContents.session.cookies.removeListener('changed', cookieHandler);
        setTimeout(() => {
          if (!loginWin.isDestroyed()) loginWin.close();
        }, 800);
        resolve({ success: true, token: cookie.value, clientId: cachedClientId });
      }
    };
    loginWin.webContents.session.cookies.on('changed', cookieHandler);

    loginWin.webContents.on('did-fail-load', (event, errorCode) => {
      if (resolved || errorCode === -3) return;
      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { background: #121212; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 24px; text-align: center; box-sizing: border-box; }
h2 { font-size: 19px; font-weight: 700; margin-bottom: 8px; color: #ff5500; }
p { font-size: 13px; color: #aaa; line-height: 1.6; max-width: 420px; margin: 8px 0; }
.card { background: #1c1c1c; border: 1px solid #333; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #ccc; margin: 16px 0; text-align: left; max-width: 420px; }
.card code { background: #2a2a2a; color: #ff8533; padding: 2px 6px; border-radius: 4px; }
.btn { background: #ff5500; color: #fff; border: none; border-radius: 6px; padding: 10px 22px; font-weight: 700; font-size: 13px; cursor: pointer; margin-top: 10px; }
.btn:hover { background: #ff4400; }
</style>
</head>
<body>
<h2>SoundCloud Недоступен (Offline)</h2>
<p>В России доступ к SoundCloud блокируется ТСПУ/провайдерами, либо ваш VPN/прокси находится в прямом режиме.</p>
<div class="card">
<strong>Если у вас запущен Clash Verge / v2rayN:</strong><br>
Переключите режим в Clash с <code>Direct</code> на <code>Rule</code> или <code>Global</code>, либо включите системный VPN.
</div>
<button class="btn" onclick="location.href='https://soundcloud.com/signin'">Повторить загрузку</button>
</body>
</html>`;
      loginWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    });

    loginWin.on('closed', () => {
      loginWin.webContents.session.cookies.removeListener('changed', cookieHandler);
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: 'User closed the window' });
      }
    });

    loginWin.loadURL('https://soundcloud.com/signin');
  });
});

ipcMain.handle('sc:download-track', async (event, trackData) => {
  try {
    const { title, artist, streamUrl, destinationPath, destinationFolder } = trackData;
    const cleanArtist = String(artist || 'Artist').replace(/[\\/:*?"<>|\r\n\t]/g, '_').slice(0, 80).trim();
    const cleanTitle = String(title || 'Track').replace(/[\\/:*?"<>|\r\n\t]/g, '_').slice(0, 100).trim();
    const sanitizedTitle = `${cleanArtist} - ${cleanTitle}`;
    const isHls = Boolean(streamUrl && streamUrl.includes('.m3u8'));
    const ext = isHls ? 'm4a' : 'mp3';

    let targetFile = destinationPath ? path.resolve(destinationPath) : null;
    if (!targetFile && destinationFolder) {
      targetFile = path.resolve(destinationFolder, `${sanitizedTitle}.${ext}`);
    }
    if (!targetFile) {
      targetFile = path.resolve(getDownloadsPath(), `${sanitizedTitle}.${ext}`);
    }

    if (!targetFile.endsWith(`.${ext}`)) {
      targetFile = `${targetFile}.${ext}`;
    }

    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (isHls) {
      const m3u8Content = await fetchText(streamUrl);
      const lines = m3u8Content.split('\n').map((l) => l.trim());
      const segmentUrls = [];

      for (const line of lines) {
        if (line.startsWith('#EXT-X-MAP:URI="')) {
          segmentUrls.push(line.slice(16, -1));
        } else if (line && !line.startsWith('#')) {
          segmentUrls.push(line);
        }
      }

      if (segmentUrls.length === 0) {
        throw new Error('No audio segments found in HLS stream');
      }

      const chunks = [];
      for (const segUrl of segmentUrls) {
        const chunk = await fetchBuffer(segUrl);
        chunks.push(chunk);
      }

      const audioBuffer = Buffer.concat(chunks);
      fs.writeFileSync(targetFile, audioBuffer);
      return { success: true, filePath: targetFile };
    } else {
      const audioBuffer = await fetchBuffer(streamUrl);
      fs.writeFileSync(targetFile, audioBuffer);
      return { success: true, filePath: targetFile };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sc:open-downloads-folder', () => {
  shell.openPath(getDownloadsPath());
  return true;
});

ipcMain.handle('sc:get-network-settings', () => loadNetworkSettings());
ipcMain.handle('sc:set-doh', (event, enabled) => {
  const settings = loadNetworkSettings();
  settings.dohEnabled = !!enabled;
  saveNetworkSettings(settings);
  return { success: true, requiresRestart: true };
});

ipcMain.handle('sc:builtin-proxy-start', async (event, port) => {
  const settings = loadNetworkSettings();
  settings.builtinProxyEnabled = true;
  saveNetworkSettings(settings);
  return { success: true };
});

ipcMain.handle('sc:builtin-proxy-stop', async () => {
  const settings = loadNetworkSettings();
  settings.builtinProxyEnabled = false;
  saveNetworkSettings(settings);
  return { success: true };
});

ipcMain.handle('sc:builtin-proxy-status', () => ({ running: false, port: 8899 }));
ipcMain.handle('sc:relaunch-app', () => {
  app.relaunch();
  app.quit();
  return { success: true };
});

app.whenReady().then(async () => {
  try {
    // Handle local-media:// protocol with range-request streaming for HTML5 <video> and <img>
    try {
      protocol.handle('local-media', (request) => {
        try {
          const u = new URL(request.url);
          let decoded = decodeURIComponent(u.pathname);
          if (u.host && /^[a-zA-Z]$/.test(u.host)) {
            decoded = u.host + ':' + decoded;
          } else if (u.host && u.host !== 'asset' && u.host !== 'local' && u.host !== 'localhost') {
            decoded = u.host + decoded;
          }
          if (/^\/[a-zA-Z]:/.test(decoded)) {
            decoded = decoded.slice(1);
          }
          const targetPath = path.resolve(decoded);
          if (!fs.existsSync(targetPath)) {
            console.error('[local-media] File not found:', targetPath);
            return new Response('File not found: ' + targetPath, { status: 404 });
          }
          const fileUrl = pathToFileURL(targetPath).toString();
          return net.fetch(fileUrl);
        } catch (err) {
          return new Response('Media streaming error: ' + err.message, { status: 500 });
        }
      });
    } catch (e) {
      console.error('Failed to register local-media handler:', e);
    }

    createWindow();

    // Try loading saved client ID
    try {
      const savedIdPath = path.join(app.getPath('userData'), 'client-id.json');
      if (fs.existsSync(savedIdPath)) {
        const idData = JSON.parse(fs.readFileSync(savedIdPath, 'utf-8'));
        if (idData && idData.clientId) {
          cachedClientId = idData.clientId;
        }
      }
    } catch {}

    // Auto-detect and configure proxy
    const saved = loadSavedProxy();
    if (saved) {
      currentProxyRule = saved;
    } else {
      const detected = await detectLocalProxy();
      if (detected.success && detected.proxy) {
        currentProxyRule = detected.proxy;
        saveProxySettings(currentProxyRule);
      }
    }

    const cfg = currentProxyRule ? { proxyRules: currentProxyRule } : { mode: 'system' };
    try {
      if (session.defaultSession) await session.defaultSession.setProxy(cfg);
    } catch {}
    try {
      if (mainWindow && mainWindow.webContents.session) await mainWindow.webContents.session.setProxy(cfg);
    } catch {}

    // Refresh client ID in background
    fetchSoundCloudClientId().catch(() => {});
  } catch (err) {
    console.error('[Main] Startup error in whenReady:', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
