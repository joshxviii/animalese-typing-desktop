const { app, shell, contextBridge, ipcRenderer } = require('electron');
const keycodeToSound = require('./keycode-to-sound.cjs');
const translator = require('./translator.cjs');
const { createAudioManager } = require('./audio-manager.cjs');
const { initCapsLockState, isCapsLockActive } = require('./caps-lock-state.cjs');
initCapsLockState();

let settingsData = ipcRenderer.sendSync('get-store-data-sync');
const appInfo = ipcRenderer.sendSync('get-app-info');
const defaultKeyMap = keycodeToSound[appInfo.platform];

function getKeyInfo(e) {// parse keyInfo from keyup/down event
    const remappedKey = settingsData.remapped_keys[e.keycode]
    const defaultKey = defaultKeyMap[e.keycode]
    if (defaultKey === undefined) return;

    const { sound = defaultKey.sound, shiftSound = defaultKey.shiftSound, ctrlSound = defaultKey.ctrlSound, altSound = defaultKey.altSound} = remappedKey || {};
    const { shiftKey, ctrlKey, altKey } = e;
    
    const finalSound = ctrlKey ? ctrlSound : altKey ? altSound : shiftKey ? shiftSound : sound;
    const defaultSound = ctrlKey ? defaultKey.ctrlSound : altKey ? defaultKey.altSound : shiftKey ? defaultKey.shiftSound : defaultKey.sound;

    return {
        keycode: e.keycode,
        key: defaultKey.key,
        sound,
        isShiftDown: shiftKey,
        shiftSound,
        isCtrlDown: ctrlKey,
        ctrlSound,
        isAltDown: altKey,
        altSound,
        finalSound,
        defaultSound,
        isCapsLock: isCapsLockActive()
    };
}

// general app messages 
contextBridge.exposeInMainWorld('api', {
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    showWindow: () => ipcRenderer.send('show-window'),
    getDefaultMapping: () => defaultKeyMap,
    sendRemapSound: (remapSound) => ipcRenderer.send('remap-send', remapSound),
    onRemapSound: (callback) => ipcRenderer.on('remap-sound', (_, remapSound) => callback(remapSound)),
    openRemapSettings: () => ipcRenderer.send('open-remap-settings'),
    onKeyDown: (callback) => ipcRenderer.on('keydown', (_, e) =>  callback( getKeyInfo(e) )),
    onKeyUp: (callback) => ipcRenderer.on('keyup', (_, e) =>  callback( getKeyInfo(e) )),
    onSettingUpdate: (key, callback) => {
        const channel = `${key}`;
        const handler = (_, value) => {
            if (document.readyState === 'loading') window.addEventListener('load', () => callback(value));
            else callback(value);
        };
        ipcRenderer.on(channel, handler);
        
        return () => ipcRenderer.removeListener(channel, handler);
    },
    onFocusedWindowChanged: (callback) => ipcRenderer.on('focused-window-changed', (_event, e) => callback(e)),
    onMutedChanged: (callback) => ipcRenderer.on('muted-changed', (_, value) => callback(value)),
    getAppInfo: () => appInfo,
    goToUrl: (url) => shell.openExternal(url),
    onPermissionError: (callback) => {
        ipcRenderer.on('permission-error', (_event, message) => callback(message));
    }
});

// translation functions
contextBridge.exposeInMainWorld('translator', {
    load: (lang) => translator.loadLanguage(lang),
    update: () => translator.updateHtmlDocumentTranslations()
});

// user settings get/set
contextBridge.exposeInMainWorld('settings', {
    get: (key) => settingsData[key],
    set: (key, value) => {
        settingsData[key] = value;
        return ipcRenderer.invoke('store-set', key, value)
    },
    reset: (key) => {
        ipcRenderer.invoke('store-reset', key)
        settingsData = ipcRenderer.sendSync('get-store-data-sync');
    }
});

// audio manager
contextBridge.exposeInMainWorld('audio', createAudioManager());