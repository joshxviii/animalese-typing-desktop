/**
 * author: joshxviii 
 */

//TODO: whole code base needs major overhaul at some point.
// It is slowly becoming hard to manage

document.addEventListener('DOMContentLoaded', () => {
    initControls();
    updatedFocusedWindows();
    
    // close settings when clicking outside
    const focusOut = document.getElementById('focus_out');
    const settingsOverlay = document.getElementById('settings_overlay');
    focusOut.addEventListener('mousedown', function(event) {
        if (focusOut.getAttribute('show') === 'true' && !settingsOverlay.contains(event.target)) {
            focusOut.setAttribute('show', 'false');
        }
    });
});

document.getElementById('version').innerHTML = `v${window.api.getAppInfo().version}`;

document.getElementById('reset_settings').addEventListener('animationend', (e) => {
    resetSettings();
});

//#region Initialize controls and listeners
const controls = [
    'master',
    
    'voice_type',
    'voice_pitch',
    'voice_variation',
    'voice_intonation',

    'note_instrument',
    'note_transpose'
];

let voiceProfile = null;
//let voiceProfileSlots = null;
//const profileName = document.getElementById('voice_profile_name');
const checkStartupRun = document.getElementById('check_startup_run');

// profileName.addEventListener('input', (e) => {
//     e.target.value = e.target.value.replace(/[^\p{Letter}0-9\s]/gu, '').substring(0, 12);
//     document.documentElement.style.setProperty('--label-length', e.target.value.length);
// });

window.api.onSettingUpdate('updated-startup_run', (value) => checkStartupRun.checked = value );


function initControls() {
    console.log("Initializing controls...");
    
    voiceProfile = preferences.get('voice_profile');
    noteProfile = preferences.get('note_profile');
    //voiceProfileSlots = preferences.get('saved_voice_profiles');
    //profileName.value = voiceProfileSlots[parseInt(document.getElementById('voice_profile_slot').value)]?.name || ``;
    //profileName.dispatchEvent(new Event('input', { bubbles: true }));
    //for (let i = 0; i < 5; i++) document.getElementById('voice_profile_slot').options[i].innerHTML = `${i+1}. ${(voiceProfileSlots[i+1]?.name || '')}`;

    document.getElementById('lang_select').value = preferences.get('lang');
    checkStartupRun.checked = preferences.get('startup_run');
    document.getElementById('voice_language').value = preferences.get('voice_language') || 'english';
    document.getElementById('note_instrument').value = preferences.get('note_profile').instrument;
    document.getElementById('check_always_active').checked = preferences.get('always_active');
    document.getElementById('check_anchor_window').checked = preferences.get('anchor_window');
    document.getElementById('check_hold_repeat').checked = preferences.get('hold_repeat');
    document.querySelectorAll('#apps_table, #apps_toggle').forEach(el => el.setAttribute('disabled', preferences.get('always_active')));
    document.querySelectorAll('#title-bar .window_controls').forEach(el => el.setAttribute('hidden', preferences.get('anchor_window')));
    document.getElementById('check_selected_active').checked = preferences.get('selected_active')
    document.querySelectorAll(`[translation='settings.apps.active'], [translation='settings.apps.inactive']`).forEach(el => el.setAttribute('translation', preferences.get('selected_active')?'settings.apps.active':'settings.apps.inactive'));
    document.getElementById('apps_tbody').setAttribute('inactive', !preferences.get('selected_active'));
    document.querySelectorAll('input[name="audio_mode"]').forEach(radio => {// audio mode initilize 
        radio.checked = parseInt(radio.value) === preferences.get('audio_mode');
        radio.addEventListener('change', () => {
            if (radio.checked) preferences.set('audio_mode', parseInt(radio.value));
        });
    });
    document.getElementById('theme_select').value = preferences.get('theme');

    // voice profile slider controls
    controls.forEach(control => {
        let el = document.getElementById(control);
        if (!el) return;

        let outputEl = document.getElementById(control + '_out');
        const isSlider = el.type === 'range';
        const displayMode = (outputEl)?outputEl.getAttribute('display') || 'float':undefined;

        const updateValue = (value, updateSound) => {
            if (isSlider) {
                value = parseFloat(value) || 0.0;
                value = Math.min(Math.max(value, parseFloat(el.min)), parseFloat(el.max));
                el.value = value;
                if (outputEl) {
                    outputEl.value = (() => {
                        switch (displayMode) {
                        case 'percent': return (parseFloat(el.value)).toFixed(0) + "%";
                        case 'int': return ((parseInt(el.value) > 0) ? "+" : "") + parseInt(el.value);
                        default: return ((parseFloat(el.value) > 0) ? "+" : "") + parseFloat(el.value).toFixed(1);
                    }})();
                }
            } else el.value = value;

            if (control==='master') preferences.set('volume', value*.01);
            else if (control.startsWith('voice')) {
                voiceProfile[control.split('_')[1]] = value;

                preferences.set('voice_profile', voiceProfile);
            }
            else if (control.startsWith('note')) {
                noteProfile[control.split('_')[1]] = value;

                preferences.set('note_profile', noteProfile);
            }
            if (updateSound && el.getAttribute('playing') !== 'true') {
                el.setAttribute('playing', 'true');
                setTimeout(() => {// give time for the voice settings to update before playing sound 
                    window.audio.play(updateSound, { noRandom: true, channel: 2 });
                    el.setAttribute('playing', 'false')
                }, 50);
            }
        };

        // clear event listeners and reset element
        el.replaceWith(el.cloneNode(true));
        el = document.getElementById(control);
        if (outputEl) {
            outputEl.replaceWith(outputEl.cloneNode(true));
            outputEl = document.getElementById(control + '_out');
        }
        if (isSlider) {
            if (control === 'master') updateValue(preferences.get('volume') * 100)
            else if (control.startsWith('voice')) updateValue(voiceProfile[control.split('_')[1]]);
            else if (control.startsWith('note')) updateValue(noteProfile[control.split('_')[1]]);
            
            const step = parseFloat((el.max - el.min) * 0.05);
            el.setAttribute('tabindex', '-1');
            
            el.addEventListener('input', (e) => updateValue(e.target.value, control === 'master'?'sfx.default':undefined));
            el.addEventListener('wheel', (e) => {
                updateValue(parseFloat(el.value) + (e.deltaY < 0 ? step : -step), control === 'master'?'sfx.default':undefined);
            }, {passive: true});
            el.addEventListener('dblclick', () => updateValue(el.getAttribute('defaultValue')));
            el.addEventListener('mouseup', () => updateValue(el.value, control.startsWith('voice')?'&.ok':undefined));
            if (outputEl) {
                outputEl.addEventListener('click', () => outputEl.select());
                outputEl.addEventListener('focusout', () => updateValue(outputEl.value));
                outputEl.addEventListener('keydown', (e) => {
                    if (e.key === "Enter") updateValue(outputEl.value);
                    else if (["ArrowUp", "ArrowRight"].includes(e.key)) updateValue(parseFloat(outputEl.value) + step);
                    else if (["ArrowDown", "ArrowLeft"].includes(e.key)) updateValue(parseFloat(outputEl.value) - step);
                });
                outputEl.addEventListener('dblclick', () => updateValue(el.getAttribute('defaultValue')));
            }
        } else {
            if (control.startsWith('voice')) {
                el.value = voiceProfile[control.split('_')[1]];
                el.addEventListener('input', (e) => updateValue(e.target.value, '&.ok'));
            }
            else if (control.startsWith('note')) {
                el.value = noteProfile[control.split('_')[1]];
                el.addEventListener('input', (e) => updateValue(e.target.value));
            }
        }
    });

    if (voiceProfile.type) {
        const type = voiceProfile.type.startsWith('m') ? 'male' : 'female';
        const oppositeType = type === 'male' ? 'female' : 'male';

        document.getElementById('voice_type').className = type;

        document.getElementById(type).setAttribute('pressed', 'true');
        document.getElementById(oppositeType).setAttribute('pressed', 'false');

        document.querySelectorAll(`#voice_type option.${type}`).forEach(el => el.removeAttribute('disabled'));
        document.querySelectorAll(`#voice_type option.${oppositeType}`).forEach(el => el.toggleAttribute('disabled'));
    }

    document.querySelectorAll('#apps_tbody tr input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
}

function selectVoiceType(type) {
    const oppositeType = type === 'male' ? 'female' : 'male';

    if (document.getElementById(type).getAttribute('pressed') === 'true') {
        window.audio.play('&.ok', { channel: 2, volume: 0.55 });
        return;
    }

    const voiceTypeElement = document.getElementById('voice_type');
    voiceTypeElement.value = type === 'male' ? 'm1' : 'f1';
    voiceTypeElement.dispatchEvent(new Event('input', { bubbles: true }));

    document.getElementById(type).setAttribute('pressed', 'true');
    document.getElementById(oppositeType).setAttribute('pressed', 'false');

    document.querySelectorAll(`#voice_type option.${type}`).forEach(el => el.removeAttribute('disabled'));
    document.querySelectorAll(`#voice_type option.${oppositeType}`).forEach(el => el.toggleAttribute('disabled'));

    voiceTypeElement.className = type;
}
//#endregion

//#region Focused Windows
function updatedFocusedWindows(activeWindows = []) {
    const enabledApps = preferences.get('selected_apps');
    const tableBody = document.getElementById('apps_tbody');
    tableBody.innerHTML = '';
    [...new Set([...enabledApps, ...activeWindows])].forEach(appName => {
        if (appName !== undefined) {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = enabledApps.includes(appName);

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(appName));
            label.addEventListener('change', (e) => updateEnabledApps(appName, e.target.checked));
            
            nameCell.appendChild(label);
            row.appendChild(nameCell);
            tableBody.appendChild(row);
        }
    });
}

function updateEnabledApps(appName, isChecked) {
    let enabledApps = preferences.get('selected_apps')

    if (isChecked && !enabledApps.includes(appName)) enabledApps.push(appName);
    else enabledApps = enabledApps.filter(name => name !== appName);

    preferences.set('selected_apps', enabledApps)
}

window.api.onFocusedWindowChanged((activeWindows) => updatedFocusedWindows(activeWindows));
//#endregion

//#region Savable voice profiles
//TODO make a custom notification popup for alerts
// function deleteVoiceProfile() {
//     const selectedSlot = document.getElementById('voice_profile_slot').value;

//     let savedVoiceProfiles = preferences.get('saved_voice_profiles');
//     savedVoiceProfiles = new Map(Object.entries(savedVoiceProfiles));
//     savedVoiceProfiles.delete(selectedSlot);
//     const savedProfilesObject = Object.fromEntries(savedVoiceProfiles);
//     document.getElementById('voice_profile_slot').options[parseInt(selectedSlot)-1].innerHTML = `${selectedSlot}. `;

//     profileName.value = '';
//     profileName.dispatchEvent(new Event('input', { bubbles: true }));

//     preferences.set('saved_voice_profiles', savedProfilesObject);
// }

// function saveVoiceProfile() {
//     const currentVoiceProfile = preferences.get('voice_profile');
//     const selectedSlot = parseInt(document.getElementById('voice_profile_slot').value);
    
//     if (!profileName.value) return;

//     let savedVoiceProfiles = new Map(Object.entries(preferences.get('saved_voice_profiles')));
//     savedVoiceProfiles.set(selectedSlot, { name: profileName.value, profile: currentVoiceProfile });
//     const savedProfilesObject = Object.fromEntries(savedVoiceProfiles);
//     document.getElementById('voice_profile_slot').options[parseInt(selectedSlot)-1].innerHTML = `${selectedSlot}. ${profileName.value}`;

//     preferences.set('saved_voice_profiles', savedProfilesObject);
// }

// function loadVoiceProfile() {
//     const selectedSlot = document.getElementById('voice_profile_slot').value;
//     const savedVoiceProfiles = preferences.get('saved_voice_profiles');
//     const selectedProfile = savedVoiceProfiles[selectedSlot];

//     if (selectedProfile) {
//         profileName.value = selectedProfile.name;
//         preferences.set('voice_profile', selectedProfile.profile);
//         voiceProfile = preferences.get('voice_profile')
//         initControls();
//     } else profileName.value = '';

//     profileName.dispatchEvent(new Event('input', { bubbles: true }));
// }
//#endregion

function openSettings() {
    const show = document.getElementById('focus_out').getAttribute('show')==="true"?false:true;
    document.getElementById('focus_out').setAttribute('show', show);
}

function resetSettings() {
    preferences.reset();
    setTimeout( () => {
        initControls();
    }, 10)
}

//#region Key Remapper
window.api.onKeyDown( (keyInfo) => {
    currentKey = keyInfo;
    if ( remapIn === document.activeElement || isRemapping ) remapStart();
});

let tabIndex = 1;
let isRemapping = false;

const remapAcceptBtn = document.getElementById('remap_accept');
const remapResetBtn = document.getElementById('remap_reset');
const remapMonitor = document.getElementById('remap_monitor');
const remapIn = document.getElementById('remap_in');

function remapStop() {
    setTimeout(()=>{
        isRemapping = false;
        remapAcceptBtn.setAttribute('disabled', true);
        remapResetBtn.setAttribute('disabled', true);
        remapMonitor.setAttribute('monitoring', false)
        remapMonitor.classList.remove('remapping');
        remapMonitor.innerHTML = remapIn.getAttribute('placeholder');
        document.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
    },1)
}

function remapReset() {
    const { defaultSound } = currentKey;
    window.api.sendRemapSound(defaultSound);
}

window.api.onRemapSound((remapSound) => {
    if (!(remapIn === document.activeElement || isRemapping)) return;
    const { key, keycode, isCtrlDown, isAltDown, isShiftDown, finalSound, defaultSound } = currentKey;
    const reset = remapSound === defaultSound;// if the key is being mapped to it's default sound, reset and clear the mapping in settings

    const keyAsHotkey = getKeyAsHotkey(currentKey);
    const currentHotkey = preferences.get('disable_hotkey');
    const isHotkey = currentHotkey === keyAsHotkey;

    document.querySelector('.highlighted')?.classList.remove('highlighted');
    document.querySelector(`[sound="${remapSound===''?'#no_sound':remapSound}"]`)?.classList.add('highlighted');

    changeTab(!remapSound||remapSound.startsWith('#')?0:remapSound.startsWith('&')?1:remapSound.startsWith('%')?2:remapSound.startsWith('sfx')?3:0);
    
    if (remapSound === '#disable_toggle') {
        preferences.set('disable_hotkey', keyAsHotkey);
        return;// Do not save hotkey in remapped_keys. Instead, save it as disable_hotkey.
    }
    else if (remapSound === '#no_sound' && isHotkey) {
        preferences.reset('disable_hotkey');
        return;// Completely remove hotkey
    }
    
    const remappedKeys = new Map(Object.entries(preferences.get('remapped_keys')));
    const mapping = { ...remappedKeys.get(`${keycode}`) || {} };

    if (reset) {
        delete mapping[isCtrlDown?'ctrlSound':isAltDown?'altSound':isShiftDown?'shiftSound':'sound'];
        if (isHotkey) preferences.reset('disable_hotkey');
    }
    else mapping[isCtrlDown?'ctrlSound':isAltDown?'altSound':isShiftDown?'shiftSound':'sound'] = remapSound;

    if (Object.keys(mapping).length === 0) remappedKeys.delete(`${keycode}`);
    else remappedKeys.set(`${keycode}`, mapping);

    preferences.set('remapped_keys', Object.fromEntries(remappedKeys));
});

remapIn.addEventListener('focusin', e => remapMonitor.setAttribute('monitoring', true));
remapIn.addEventListener('focusout', e => isRemapping?undefined:remapMonitor.setAttribute('monitoring', false));
remapIn.addEventListener('selectstart', e => e.preventDefault());
remapIn.addEventListener('mousedown', e => e.preventDefault());
document.addEventListener('keydown', e => { if(isRemapping) e.preventDefault(); });
function remapStart() {
    const { key, isShiftDown, isCtrlDown, isAltDown, finalSound } = currentKey;
    
    document.querySelector('.highlighted')?.classList.remove('highlighted');
    
    const keyAsHotkey = getKeyAsHotkey(currentKey);
    const currentHotkey = preferences.get('disable_hotkey');
    const isHotkey = currentHotkey === keyAsHotkey;

    changeTab(!finalSound||finalSound.startsWith('#')||isHotkey?0:finalSound.startsWith('&')?1:finalSound.startsWith('%')?2:finalSound.startsWith('sfx')?3:0);

    const highlightedBtn = document.querySelector(`[sound="${isHotkey?'#disable_toggle':finalSound===''?'#no_sound':finalSound}"]`);
    highlightedBtn?.classList.add('highlighted');
    highlightedBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    isRemapping = true;
    remapAcceptBtn.setAttribute('disabled', false);
    remapResetBtn.setAttribute('disabled', false);
    remapMonitor.classList.add('remapping');
    

    let keyLabel = key;
    if (["Ctrl", "Alt", "Shift"].includes(key)) keyLabel = key;
    else if (isCtrlDown)keyLabel = `Ctrl + ${key}`;
    else if (isAltDown)keyLabel = `Alt + ${key}`;
    else if (isShiftDown) keyLabel = `Shift + ${key}`;
    remapMonitor.innerHTML = keyLabel.toUpperCase();
}

function changeTab(newTabIndex = 1) {
    const allTabs = document.querySelectorAll('#remap_tabs .remap_tab');
    allTabs.forEach(el => {
        el.setAttribute('pressed',false)
        el.classList.remove('highlighted');
    });
    allTabs[newTabIndex].setAttribute('pressed',true);
    if(isRemapping) allTabs[newTabIndex].classList.add('highlighted');

    if (newTabIndex === tabIndex) return;
    updateBoardLayout(allTabs[newTabIndex].id);

    const allEditors = document.querySelectorAll('#bottom_row .audio_editor');
    allEditors.forEach(el => el.setAttribute('show',false));
    allEditors[newTabIndex].setAttribute('show',true);

    tabIndex = newTabIndex;

    if (newTabIndex === 2) centerPianoKeys();
}

function centerPianoKeys() {
    const piano_keys = document.getElementById('piano_keys');
    if (!piano_keys) return;
    // Only center if visible
    if (piano_keys.offsetParent !== null && piano_keys.offsetWidth > 0) {
        piano_keys.scrollLeft = (piano_keys.scrollWidth - piano_keys.clientWidth) / 2;
    }
}
//#endregion