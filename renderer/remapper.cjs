const currentMapping = preferences.get('remapped_keys');
const defatulMapping = window.api.getDefaultMapping();

function getMergedMapping(defaultMap, currentMap) {
    const merged = {};
    Object.entries(defaultMap).forEach(([key, defVal]) => {
        if (currentMap && currentMap[key]) {
            merged[key] = { ...defVal, ...currentMap[key] };
        } else {
            merged[key] = { ...defVal };
        }
    });
    if (currentMap) {
        Object.entries(currentMap).forEach(([key, curVal]) => {
            if (!merged[key]) merged[key] = { ...curVal };
        });
    }
    return merged;
}

function renderSoundToKeysTable(mapping) {
    const tbody = document.querySelector('#remap-table tbody');
    tbody.innerHTML = '';

    const combos = [
        { label: '', prop: 'sound' },
        { label: 'Shift + ', prop: 'shiftSound' },
        { label: 'Ctrl + ', prop: 'ctrlSound' },
        { label: 'Alt + ', prop: 'altSound' }
    ];

    const soundMap = {};
    const noneCombos = [];

    Object.entries(mapping).forEach(([keycode, map]) => {
        combos.forEach(({ label, prop }) => {
            if (Object.prototype.hasOwnProperty.call(map, prop)) {
                let sound = map[prop];
                if (
                    currentMapping &&
                    currentMapping[keycode] &&
                    Object.prototype.hasOwnProperty.call(currentMapping[keycode], prop) &&
                    currentMapping[keycode][prop] === ""
                ) {
                    const comboLabel = `${label}${map.key}`;
                    noneCombos.push(`<span style="color:var(--input-highlight-color-2);font-weight:bold;">${comboLabel.toUpperCase()}</span>`);
                    return;
                }
                if (sound && sound.trim() !== '') {
                    let isCustom = false;
                    if (
                        currentMapping &&
                        currentMapping[keycode] &&
                        Object.prototype.hasOwnProperty.call(currentMapping[keycode], prop)
                    ) {
                        isCustom = true;
                    }
                    const comboLabel = `${label}${map.key}`;
                    if (!soundMap[sound]) soundMap[sound] = [];
                    soundMap[sound].push({ combo: comboLabel, isCustom });
                }
            }
        });
    });

    Object.entries(soundMap).forEach(([sound, combos]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${combos
                    .map(c =>
                        c.isCustom
                            ? `<span style="color:var(--input-highlight-color-2);font-weight:bold;">${c.combo.toUpperCase()}</span>`
                            : c.combo.toUpperCase()
                    ).join('<br>')}
            </td>
            <td>${sound.replace('%', 'note').replace('&', 'voice')}</td>
        `;
        tbody.appendChild(tr);
    });

    if (noneCombos.length > 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>NONE</td>
            <td>${noneCombos.join('<br>')}</td>
        `;
        tbody.appendChild(tr);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const mergedMapping = getMergedMapping(defatulMapping, currentMapping);
    renderSoundToKeysTable(mergedMapping);
});