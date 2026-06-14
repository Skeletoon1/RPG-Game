// Electron entry point — wraps the web game in a native desktop window.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
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

  win.loadFile(path.join(__dirname, "..", "web", "index.html"));

  // Open any external links (if ever added) in the system browser, not the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  // A minimal menu: fullscreen toggle, reload, and quit. (Hidden via autoHideMenuBar.)
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
