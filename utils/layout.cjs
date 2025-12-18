const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

let voice_language = ipcRenderer.sendSync('get-store-data-sync').voice_language || 'english';
ipcRenderer.on('updated-voice_language', (_, value) => {voice_language = value;});

function fetchLayout(layout = '') {
    const f = layout === 'voice' ? `voice/${voice_language}`: layout;
    const layoutFilePath = path.join(__dirname, '../assets/layouts', `${f}.json`);
    console.log('Fetching layout from:', layoutFilePath);

    if (fs.existsSync(layoutFilePath)) {
        const layoutData = JSON.parse(fs.readFileSync(layoutFilePath, 'utf8'));
        console.log('Loaded layout:', layoutData);
        return layoutData
    } else {
        return {};
    }
}

module.exports = {
    fetchLayout
};