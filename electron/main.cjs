const { app, BrowserWindow, ipcMain, shell, dialog, session, net } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const netSocket = require('net');

let mainWindow = null;
let currentProxyRule = null;

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

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin': 'https://soundcloud.com',
  'Referer': 'https://soundcloud.com/',
  'Accept': '*/*',
};

function getDownloadsPath() {
  const dir = path.join(app.getPath('downloads'), 'SoundCloud');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function fetchBuffer(url) {
  if (net && typeof net.fetch === 'function') {
    const res = await net.fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
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
    req.on('error', reject);
  });
}

async function fetchText(url) {
  const buf = await fetchBuffer(url);
  return buf.toString('utf-8');
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
  app.commandLine.appendSwitch('enable-features', 'DnsOverHttps');
  app.commandLine.appendSwitch('dns-over-https-templates', 'https://freedns.controld.com/p0 https://dns.adguard-dns.com/dns-query https://1.1.1.1/dns-query{?dns} https://8.8.8.8/dns-query{?dns}');
}


let builtinProxyServer = null;
let builtinProxyPort = 8899;

function startBuiltinProxy(port) {
  return new Promise((resolve) => {
    if (builtinProxyServer) {
      resolve({ success: true, port: builtinProxyPort });
      return;
    }
    builtinProxyPort = port || 8899;
    const server = http.createServer((req, res) => {
      let targetUrl = req.url;
      if (!targetUrl.startsWith('http')) {
        targetUrl = 'http://' + (req.headers.host || 'localhost') + req.url;
      }
      let target;
      try { target = new URL(targetUrl); } catch {
        res.statusCode = 400; res.end('Bad Request'); return;
      }
      const client = target.protocol === 'https:' ? https : http;
      const options = {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + target.search,
        method: req.method,
        headers: Object.assign({}, req.headers, { host: target.host }),
      };
      delete options.headers['proxy-connection'];
      const proxyReq = client.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (e) => { if (!res.headersSent) res.statusCode = 502; res.end(e.message); });
      req.pipe(proxyReq);
    });

    server.on('connect', (req, clientSocket, head) => {
      const parts = (req.url || '').split(':');
      const host = parts[0];
      const port = parseInt(parts[1], 10) || 443;
      const serverSocket = netSocket.connect(port, host, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head && head.length) serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });
      serverSocket.on('error', () => { try { clientSocket.end(); } catch {} });
      clientSocket.on('error', () => { try { serverSocket.end(); } catch {} });
    });

    server.on('error', (e) => {
      builtinProxyServer = null;
      resolve({ success: false, error: e.message });
    });
    server.listen(builtinProxyPort, '127.0.0.1', () => {
      builtinProxyServer = server;
      resolve({ success: true, port: builtinProxyPort });
    });
  });
}

function stopBuiltinProxy() {
  if (builtinProxyServer) {
    try { builtinProxyServer.close(); } catch {}
    builtinProxyServer = null;
  }
  return { success: true };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'SoundCloud Desktop',
    width: 1300,
    height: 870,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    show: true,
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  if (currentProxyRule && mainWindow.webContents.session) {
    mainWindow.webContents.session.setProxy({ proxyRules: currentProxyRule }).catch(() => {});
  }
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

ipcMain.handle('sc:window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('sc:window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('sc:window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('sc:select-save-file', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Audio Track',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [
      { name: 'Audio Files (*.m4a, *.mp3)', extensions: ['m4a', 'mp3'] },
    ],
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
      { name: 'Media Files (*.gif, *.mp4, *.webm, *.png, *.jpg, *.jpeg, *.webp)', extensions: ['gif', 'mp4', 'webm', 'png', 'jpg', 'jpeg', 'webp'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  const filePath = result.filePaths[0];
  const normalized = filePath.replace(/\\/g, '/');
  const isVideo = normalized.endsWith('.mp4') || normalized.endsWith('.webm');
  return {
    url: `file:///${normalized}`,
    type: isVideo ? 'video' : 'image',
  };
});

ipcMain.handle('sc:set-proxy', async (event, proxyRule) => {
  const rule = proxyRule && proxyRule.trim();
  currentProxyRule = rule || null;
  saveProxySettings(currentProxyRule);
  const config = rule ? { proxyRules: rule } : { mode: 'direct' };
  try {
    if (session.defaultSession) {
      await session.defaultSession.setProxy(config);
    }
    if (mainWindow && mainWindow.webContents.session) {
      await mainWindow.webContents.session.setProxy(config);
    }
    return { success: true, proxy: rule || null };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

function checkTcpPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = netSocket.connect({ host, port, timeout: 350 });
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
  const clashConfigPath = path.join(
    process.env.APPDATA || '',
    'io.github.clash-verge-rev.clash-verge-rev',
    'clash-verge.yaml'
  );
  if (fs.existsSync(clashConfigPath)) {
    try {
      const content = fs.readFileSync(clashConfigPath, 'utf-8');
      const mixedMatch = content.match(/mixed-port:\s*(\d+)/);
      if (mixedMatch) {
        const port = parseInt(mixedMatch[1], 10);
        const isOpen = await checkTcpPort(port);
        if (isOpen) {
          return { success: true, proxy: `http://127.0.0.1:${port}`, name: `Clash Verge (Port ${port})` };
        }
      }
      const socksMatch = content.match(/socks-port:\s*(\d+)/);
      if (socksMatch) {
        const port = parseInt(socksMatch[1], 10);
        const isOpen = await checkTcpPort(port);
        if (isOpen) {
          return { success: true, proxy: `socks5://127.0.0.1:${port}`, name: `Clash Verge SOCKS5 (Port ${port})` };
        }
      }
    } catch {}
  }

  const commonPorts = [
    { port: 39706, type: 'http', name: 'Clash Verge' },
    { port: 7890, type: 'http', name: 'Clash / Flclash' },
    { port: 7897, type: 'http', name: 'Clash Verge Rev' },
    { port: 10808, type: 'socks5', name: 'v2rayN / Xray' },
    { port: 1080, type: 'socks5', name: 'Zapret / ByeDPI' },
    { port: 2080, type: 'socks5', name: 'Sing-box' },
    { port: 9050, type: 'socks5', name: 'Tor Browser' },
  ];

  for (const item of commonPorts) {
    const isOpen = await checkTcpPort(item.port);
    if (isOpen) {
      const proto = item.type === 'socks5' ? 'socks5' : 'http';
      return { success: true, proxy: `${proto}://127.0.0.1:${item.port}`, name: `${item.name} (${item.port})` };
    }
  }

  return { success: false };
}

ipcMain.handle('sc:detect-local-proxy', () => detectLocalProxy());

ipcMain.handle('sc:open-login', async () => {
  if (!currentProxyRule) {
    const detected = await detectLocalProxy();
    if (detected.success && detected.proxy) {
      currentProxyRule = detected.proxy;
      saveProxySettings(currentProxyRule);
      if (session.defaultSession) {
        try {
          await session.defaultSession.setProxy({ proxyRules: currentProxyRule });
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

    if (currentProxyRule && loginWin.webContents.session) {
      loginWin.webContents.session.setProxy({ proxyRules: currentProxyRule }).catch(() => {});
    }

    let resolved = false;
    const filter = { urls: ['*://api-v2.soundcloud.com/*'] };

    loginWin.webContents.session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      const authHeader = details.requestHeaders['Authorization'] || details.requestHeaders['authorization'];
      if (authHeader && authHeader.startsWith('OAuth ') && !resolved) {
        resolved = true;
        const token = authHeader.replace('OAuth ', '').trim();
        const urlObj = new URL(details.url);
        const clientId = urlObj.searchParams.get('client_id') || 'QhVEWrrJKvW4uSU5u5EoI0FTXYUGzy5k';

        setTimeout(() => {
          if (!loginWin.isDestroyed()) {
            loginWin.close();
          }
        }, 800);

        resolve({ success: true, token, clientId });
      }
      callback({ requestHeaders: details.requestHeaders });
    });

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
<strong>Если у вас запущен Clash Verge:</strong><br>
Переключите режим в Clash с <code>Direct</code> (Прямой) на <code>Rule</code> (По правилам) или <code>Global</code> (Глобальный), затем нажмите кнопку ниже.
</div>
<button class="btn" onclick="location.href='https://soundcloud.com/signin'">Повторить загрузку</button>
</body>
</html>`;
      loginWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    });

    loginWin.on('closed', () => {
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
    const sanitizedTitle = `${artist} - ${title}`.replace(/[\\/:*?"<>|]/g, '_').trim();
    const isHls = streamUrl.includes('.m3u8');
    const ext = isHls ? 'm4a' : 'mp3';

    let targetFile = destinationPath;
    if (!targetFile && destinationFolder) {
      targetFile = path.join(destinationFolder, `${sanitizedTitle}.${ext}`);
    }
    if (!targetFile) {
      targetFile = path.join(getDownloadsPath(), `${sanitizedTitle}.${ext}`);
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
        throw new Error('No audio segments found');
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
  const res = await startBuiltinProxy(port || 8899);
  if (res.success) {
    const settings = loadNetworkSettings();
    settings.builtinProxyEnabled = true;
    settings.builtinProxyPort = res.port;
    saveNetworkSettings(settings);
    currentProxyRule = 'http://127.0.0.1:' + res.port;
    saveProxySettings(currentProxyRule);
    const config = { proxyRules: currentProxyRule };
    try { if (session.defaultSession) await session.defaultSession.setProxy(config); } catch {}
    try { if (mainWindow && mainWindow.webContents.session) await mainWindow.webContents.session.setProxy(config); } catch {}
  }
  return res;
});
ipcMain.handle('sc:builtin-proxy-stop', async () => {
  stopBuiltinProxy();
  const settings = loadNetworkSettings();
  settings.builtinProxyEnabled = false;
  saveNetworkSettings(settings);
  currentProxyRule = null;
  saveProxySettings(null);
  const config = { mode: 'direct' };
  try { if (session.defaultSession) await session.defaultSession.setProxy(config); } catch {}
  try { if (mainWindow && mainWindow.webContents.session) await mainWindow.webContents.session.setProxy(config); } catch {}
  return { success: true };
});
ipcMain.handle('sc:builtin-proxy-status', () => ({ running: !!builtinProxyServer, port: builtinProxyPort }));
ipcMain.handle('sc:relaunch-app', () => { app.relaunch(); app.quit(); return { success: true }; });

app.whenReady().then(async () => {
  createWindow();
  const ns = loadNetworkSettings();
  if (ns.builtinProxyEnabled) {
    const res = await startBuiltinProxy(ns.builtinProxyPort || 8899);
    if (res.success) {
      currentProxyRule = 'http://127.0.0.1:' + res.port;
      saveProxySettings(currentProxyRule);
    }
  } else {
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
  }
  if (currentProxyRule) {
    const cfg = { proxyRules: currentProxyRule };
    try { if (session.defaultSession) await session.defaultSession.setProxy(cfg); } catch {}
    try { if (mainWindow && mainWindow.webContents.session) await mainWindow.webContents.session.setProxy(cfg); } catch {}
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
