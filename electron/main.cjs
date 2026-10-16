const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

let mainWindow = null;

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

function fetchBuffer(url) {
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

function fetchText(url) {
  return fetchBuffer(url).then((b) => b.toString('utf-8'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 870,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: '#121212',
    icon: path.join(__dirname, '../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const distPath = path.join(__dirname, '../dist/index.html');
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

ipcMain.handle('sc:open-login', () => {
  return new Promise((resolve) => {
    const loginWin = new BrowserWindow({
      width: 520,
      height: 720,
      parent: mainWindow,
      modal: true,
      title: 'SoundCloud Login - by domxay',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

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

app.whenReady().then(createWindow);

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
