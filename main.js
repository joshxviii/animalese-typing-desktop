import { app, powerMonitor, Tray, globalShortcut, BrowserWindow, Menu, ipcMain, screen, dialog } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { updateElectronApp } from 'update-electron-app';

// fix Wayland color management issues on Linux
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('disable-features', 'WaylandColorManagement');
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
    
    // disable hardware acceleration to fix VA-API errors (virtual GPU) - this for virtual machines
    // app.commandLine.appendSwitch('disable-gpu');
    // app.commandLine.appendSwitch('disable-software-rasterizer');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Conditionally import get-windows (not supported on Linux)
let getFocusedWindow = null;
if (process.platform !== 'linux') {
    try {
        const getWindowsPkg = await import('@deepfocus/get-windows');
        getFocusedWindow = getWindowsPkg.activeWindow;
    } catch (error) {
        console.warn('Window monitoring not available:', error.message);
    }
}

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
const isDev = app.isPackaged === false;
const SYSTRAY_ICON = (process.platform === 'darwin') ? path.join(__dirname, '/assets/images/icon_18x18.png') : path.join(__dirname, '/assets/images/icon.png');
const SYSTRAY_ICON_OFF = (process.platform === 'darwin') ? path.join(__dirname, '/assets/images/icon_off_18x18.png') : path.join(__dirname, '/assets/images/icon_off.png');
const SYSTRAY_ICON_MUTE = (process.platform === 'darwin') ? path.join(__dirname, '/assets/images/icon_mute_18x18.png') : path.join(__dirname, '/assets/images/icon_mute.png');
const ICON = path.join(__dirname, '/assets/images/icon.png');
const gotTheLock = app.requestSingleInstanceLock();

function toggleVisibility(setVisible = null) { // focus the existing window if it exists
    if (bgwin) {
        if (setVisible === null) setVisible = !bgwin.isVisible();
        if (!setVisible) bgwin.hide();
        else {
            bgwin.show();
            bgwin.focus();
        }
    }
}

function setDisable(value = true) {
    value = muted ? true : preferences.get('always_active') ? false : value;
    if (tray) {
        tray.setImage(muted?SYSTRAY_ICON_MUTE:value?SYSTRAY_ICON_OFF:SYSTRAY_ICON);
        tray.setToolTip(muted?'Animalese Typing: Disabled':'Animalese Typing');
    }
    if (disabled === value) return;
    disabled = value;
    if (disabled) stopKeyListener(); else startKeyListener();
}

if (!gotTheLock) app.quit(); // if another instance is already running then quit
else app.on('second-instance', () => toggleVisibility(true)); // show instance that is running

app.setAppUserModelId('com.joshxviii.animalese-typing');

const defaults = {
    lang: 'en',
    volume: 0.5,
    audio_mode: 0,
    theme: 'default',
    disable_hotkey: 'F5',
    anchor_window: true,
    startup_run: false,
    hold_repeat: true,
    always_active: true,
    selected_apps: [],
    selected_active: true,
    voice_language: 'english',
    voice_profile: {
        type: 'f1',
        pitch: 0.0,
        variation: 0.2,
        intonation: 0.0
    },
    note_profile: {
        instrument: 'girl',
        transpose: 0,
    },
    saved_voice_profiles: new Map(),
    remapped_keys: new Map()
}

const preferences = new Store({
    defaults: defaults
});

ipcMain.on('get-store-data-sync', (e) => {
    e.returnValue = preferences.store;
});
ipcMain.handle('store-set', async (e, key, value) => {
    preferences.set(key, value);
    bgwin.webContents.send(`updated-${key}`, value);
    if (key==='startup_run') updateTrayMenu();
    else if(key==='anchor_window') updateWindow();
    else if (key==='disable_hotkey') updateDisableHotkey(value);
});
const nonResettable = [
    'lang',
    'theme',
    'startup_run',
];
ipcMain.handle('store-reset', async (e, key) => {// reset a certain key or all settigns
    if (key) {
        preferences.delete(key);
        preferences.set(key, defaults[key]);
        bgwin.webContents.send(`updated-${key}`, defaults[key]);
        if (key==='disable_hotkey') updateDisableHotkey(defaults[key]);
    }
    else {// reset all
        Object.keys(preferences.store).forEach(key => { if (!nonResettable.includes(key)) preferences.delete(key); });
        
        Object.keys(defaults).forEach(key => {
            if (!nonResettable.includes(key)) {
                preferences.set(key, defaults[key]);
                bgwin.webContents.send(`updated-${key}`, defaults[key]);
                if (key==='disable_hotkey') updateDisableHotkey(defaults[key]);
            }
        });
    }
});
ipcMain.on('toggle-visibility', (e) => {
    toggleVisibility();
});
ipcMain.on('close-window', (e) => {
    if (bgwin) bgwin.close();
});
ipcMain.on('minimize-window', (e) => {
    if (bgwin) bgwin.minimize();
});
ipcMain.on('toggle-muted', (e) => {
    toggleMuted();
});
ipcMain.on('remap-send', (e, sound) => { if (bgwin) bgwin.webContents.send(`remap-sound`, sound)});
ipcMain.on('open-remap-settings', (e) => {
    createRemapWin();
});
ipcMain.on('get-app-info', (e) => {
    e.returnValue = {
        version: app.getVersion(),
        name: app.getName(),
        platform: process.platform
    }
});
ipcMain.on('set-run-on-startup', (e, value) => setRunOnStartup(value));

var bgwin = null;
var anchored = true;
var remapwin = null;
var tray = null;
let muted = false;
var disabled = muted || !preferences.get('always_active');
let lastFocusedWindow = null;
let focusedWindows = [];

// check for active window changes and update `lastFocusedWindow` when the window changes
async function monitorFocusedWindow() {
    // Skip window monitoring on Linux or if getFocusedWindow is not available
    if (!getFocusedWindow) return;
    
    try {
        const focusedWindow = await getFocusedWindow();

        if (!focusedWindow?.owner?.name) return;// return early if invalid window

        const winName = focusedWindow.owner.name
        if (winName === lastFocusedWindow?.owner?.name) return;// return early if the active window hasn't changed.
        
        const selectedApps = preferences.get('selected_apps');

        // change disable value when focusing in or out of selected-apps.
        setDisable( (preferences.get('selected_active')?!selectedApps.includes(winName):selectedApps.includes(winName)) && 
        (focusedWindow?.owner?.processId !== process.pid || winName === 'Animalese Typing') );

        lastFocusedWindow = focusedWindow;
        if (!focusedWindows.includes(winName)) {
            focusedWindows.push(winName);
            if (focusedWindows.length > 8) focusedWindows.shift();
            bgwin.webContents.send('focused-window-changed', focusedWindows);
        }
    } catch (error) {
        console.debug('Window monitoring error:', error.message);
    }
}

function startWindowMonitoring() {
    setInterval(monitorFocusedWindow, 500); // check window every .5 seconds
}

function updateWindow() {
    if(bgwin !== null) {
        anchored = preferences.get('anchor_window');
        if(anchored) {
            bgwin.setMovable(false);
            bgwin.setSkipTaskbar(true);
            bgwin.setPosition(
                Math.round(screen.getPrimaryDisplay().workAreaSize.width - bgwin.getBounds().width - 10),
                Math.round(screen.getPrimaryDisplay().workAreaSize.height - bgwin.getBounds().height - 10)
            );
        }
        else {
            bgwin.setMovable(true);
            bgwin.setSkipTaskbar(false);
        }
    }
}

function setupMainWin() {
    if(bgwin !== null) return;

    bgwin = new BrowserWindow({
        width: 720,
        height: 340,
        icon: ICON,
        resizable: false,
        frame: false,
        skipTaskbar: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    })
    
    bgwin.removeMenu();
    bgwin.loadFile('editor.html');
    bgwin.webContents.send('muted-changed', muted);
    bgwin.setAspectRatio(2);
    
    bgwin.on('close', function (e) {
        if (!(app.isQuiting)) {
            if (process.platform === 'darwin') app.dock.hide();
            e.preventDefault();
            bgwin.hide();
        }
        return false;
    });

    bgwin.on('closed', function () {
        bgwin = null;
    });

    bgwin.on('blur', function () {
        if(anchored) bgwin.hide();
    });

    bgwin.on('will-move', function () {
        bgwin.setOpacity(0.6);
    })
    bgwin.on('moved', function () {
        if(!anchored) bgwin.setOpacity(1.0);
    });

    bgwin.webContents.on('before-input-event', (e, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            const wc = bgwin.webContents;
            if (wc.isDevToolsOpened()) wc.closeDevTools();
            else  wc.openDevTools({ mode: 'detach' });
            e.preventDefault();
        }
    });

    updateWindow();
}
function createRemapWin() {
    if(remapwin !== null) {
        remapwin.close();
        return;
    }
    remapwin = new BrowserWindow({
        width: 526,
        height: 628,
        icon: ICON,
        resizable: true,
        frame: true,
        skipTaskbar: false,
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });
    remapwin.removeMenu();
    remapwin.loadFile('remap.html');

    remapwin.on('closed', function () {
        remapwin = null;
    });

    remapwin.webContents.on('before-input-event', (e, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            const wc = remapwin.webContents;
            if (wc.isDevToolsOpened()) wc.closeDevTools();
            else  wc.openDevTools({ mode: 'detach' });
            e.preventDefault();
        }
    });
}

function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
        {
            label:'Disable Animalese Typing',
            type: 'checkbox',
            accelerator: preferences.get('disable_hotkey'),
            checked: muted,
            click: (menuItem) => { 
                muted = menuItem.checked;
                setDisable();
                if (bgwin) bgwin.webContents.send('muted-changed', muted);
            }
        },
        {
            label: 'Show Editor',
            click: () => { toggleVisibility(true); }
        },
        {
            id: 'startup',
            label: 'Run on startup',
            type: 'checkbox',
            checked: preferences.get('startup_run'),
            click: (menuItem) => {
                const value = menuItem.checked;    
                const settings = {
                    openAtLogin: value,
                    openAsHidden: true,
                };
                if (process.platform === 'win32') settings.path = app.isPackaged ? app.getPath('exe') : process.execPath;
                preferences.set('startup_run', value);
                bgwin.webContents.send(`updated-startup_run`, value);
                app.setLoginItemSettings(settings);
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                stopKeyListener();
                app.quit();
            }
        }
    ]);
    if(tray) tray.setContextMenu(contextMenu);
}

function createTrayIcon() {
    if(tray !== null) return; // prevent dupe tray icons

    tray = new Tray(SYSTRAY_ICON);
    tray.setToolTip('Animalese Typing');

    updateTrayMenu();

    // On Windows, clicking shows the window, while on macOS it shows the context menu
    if (process.platform != 'darwin') tray.on('double-click', (e) => { console.log(e); if(!bgwin.isVisible() || !anchored) toggleVisibility(); });
    tray.displayBalloon({
        title: "Animalese Typing",
        content: "Animalese Typing is Running!"
    });
}

function updateDisableHotkey(hotkey) {
    globalShortcut.unregisterAll();
    globalShortcut.register(hotkey, () => {// TODO: give warning to renderer when hotkey registration fails
        toggleMuted();
    });
}

function toggleMuted() {
    muted = !muted;
    setDisable();
    updateTrayMenu();
    if (bgwin) bgwin.webContents.send('muted-changed', muted);
}

//#region KeyListener
let keyListener;

async function startKeyListener() {
    const platform = process.platform;
    let listenerPath;

    if (platform === 'win32') {
        listenerPath = isDev
            ? path.join(__dirname, 'libs', 'key-listeners', 'animalese-listener.exe')
            : path.join(process.resourcesPath, 'animalese-listener.exe');
    } else if (platform === 'darwin') {
        listenerPath = isDev
            ? path.join(__dirname, 'libs', 'key-listeners', 'animalese-listener')
            : path.join(process.resourcesPath, 'animalese-listener');
    } else if (platform === 'linux') {
        listenerPath = isDev
            ? path.join(__dirname, 'libs', 'key-listeners', 'animalese-listener')
            : `${process.resourcesPath}/animalese-listener`;// TODO: fix path for linux packaged app
    } else {
        console.error('Unsupported platform'); return;
    }
    try {
        if (fs.existsSync(listenerPath) && fs.statSync(listenerPath).isFile()) console.log('Starting animalese-listener');
    } catch (err) {
        console.error('ERROR: animalese-listener not found at:', listenerPath);
        return;
    }

    //if (!keyListener) return;
    keyListener = spawn(listenerPath);
    keyListener.stdout.on('data', data => {
        const lines = data.toString().split('\n').filter(Boolean);

        for (const line of lines) {
            if (line.toLowerCase().includes('accessibility') || line.toLowerCase().includes('permission')) {
                bgwin.webContents.send('permission-error', line);
                continue;
            }
            try {
                const event = JSON.parse(line);
                if (event.type === 'keydown' || event.type === 'keyup') {
                    bgwin.webContents.send(event.type, {
                        keycode: event.keycode,
                        shiftKey: event.shift,
                        ctrlKey: event.ctrl,
                        altKey: event.alt,
                    });
                }
            } catch (err) {
                console.error(`Invalid JSON from ${platform}:`, line);
            }
        }
    });
    keyListener.stderr.on('data', data => {
        const message = data.toString();
        console.log(`${platform}-listener:`, message);
        
        // detect backend initialization errors on Linux
        if (platform === 'linux' && message.toLowerCase().includes('error')) {
            dialog.showMessageBox({
                type: 'error',
                title: 'Animalese Listener Error',
                message: 'Key listener backend failed to initialize',
                detail: message.trim(),
                buttons: ['OK']
            }).then(() => {
                app.quit();
            });
        }
    });
    keyListener.on('error', (err) => {
        const errorMsg = err && err.message ? err.message : String(err);
        console.error('animalese-listener spawn error:', errorMsg);
        dialog.showMessageBox({
            type: 'error',
            title: 'Animalese Listener Error',
            message: 'Failed to start key listener',
            detail: errorMsg,
            buttons: ['OK']
        }).then(() => {
            app.quit();
        });
    });
    keyListener.on('exit', (code, signal) => {
        console.error('animalese-listener exited:', code, signal);
        // only show alert if exited with error (non-zero code) and not killed by signal
        // if (code !== 0 && code !== null && !signal) {
        //     dialog.showMessageBox({
        //         type: 'warning',
        //         title: 'Animalese Listener',
        //         message: 'Key listener stopped unexpectedly',
        //         detail: `Exit code: ${code}`,
        //         buttons: ['OK']
        //     }).then(() => {
        //         app.quit();
        //     });
        // }
    });
}
//#endregion

function stopKeyListener() {
    if (keyListener) {
        keyListener.kill();
        keyListener = null;
    }
}

app.on('ready', () => {
    startWindowMonitoring();
    setupMainWin();
    createTrayIcon();
    if (!disabled) startKeyListener();
    if (process.platform === 'darwin') app.dock.hide();
    bgwin.hide();

    // stop keylisteners on sleep
    powerMonitor.on('suspend', () => {
        stopKeyListener();
    });
    powerMonitor.on('resume', () => {
        if (!disabled) startKeyListener();
    });

    updateDisableHotkey(preferences.get('disable_hotkey'));
    if(!isDev) updateElectronApp();
});

app.on('activate', function () {
    if (bgwin === null) setupMainWin();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    stopKeyListener();
    if (keyListener) {
        keyListener.kill('SIGKILL');
        keyListener = null;
    }
    if (bgwin) {
        bgwin.removeAllListeners();
        bgwin.close();
    }
    if (tray) tray.destroy();

    ipcMain.removeAllListeners();
    globalShortcut.unregisterAll();
});

app.on('quit', () => {
    if (keyListener) {
        keyListener.kill('SIGKILL');
    }
    app.exit(0);
});

export default app;