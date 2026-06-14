// Electron entry point — wraps the web game in a native desktop window,
// with automatic updates from GitHub Releases (electron-updater).
const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 800,
    minHeight: 480,
    backgroundColor: "#05030a",
    title: "Overlord RPG — Nazarick Rising",
    autoHideMenuBar: true,            // hide the menu bar (press Alt to reveal)
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "web", "index.html"));

  // Open any external links in the system browser, not inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ---- Auto-update (only in the packaged app) --------------------------------
function setupAutoUpdate() {
  if (!app.isPackaged) return;        // skip during `npm start` dev runs
  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (e) {
    return;                            // updater not available; fail quietly
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-downloaded", (info) => {
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        buttons: ["Restart now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update ready",
        message: "Overlord RPG " + (info && info.version ? info.version : "") + " is ready.",
        detail: "A new version has been downloaded. Restart to apply it now, or it will be applied next time you close the app.",
      })
      .then((r) => {
        if (r.response === 0) autoUpdater.quitAndInstall();
      })
      .catch(() => {});
  });

  // Don't let update errors (offline, no release yet, etc.) bother the player.
  autoUpdater.on("error", () => {});

  autoUpdater.checkForUpdates().catch(() => {});
}

app.whenReady().then(() => {
  const template = [
    {
      label: "Game",
      submenu: [
        { role: "togglefullscreen" },
        { role: "reload" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  createWindow();
  setupAutoUpdate();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
