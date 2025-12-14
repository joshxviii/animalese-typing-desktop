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
let voiceProfileSlots = null;
const profileName = document.getElementById('voice_profile_name');
const checkStartupRun = document.getElementById('check_startup_run');

profileName.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^\p{Letter}0-9\s]/gu, '').substring(0, 12);
    document.documentElement.style.setProperty('--label-length', e.target.value.length);
});

window.api.onSettingUpdate('updated-startup_run', (value) => checkStartupRun.checked = value );

function initControls() {
    console.log("Initializing controls...");
    
    voiceProfile = preferences.get('voice_profile');
    noteProfile = preferences.get('note_profile');
    voiceProfileSlots = preferences.get('saved_voice_profiles');
    profileName.value = voiceProfileSlots[parseInt(document.getElementById('voice_profile_slot').value)]?.name || ``;
    profileName.dispatchEvent(new Event('input', { bubbles: true }));
    for (let i = 0; i < 5; i++) document.getElementById('voice_profile_slot').options[i].innerHTML = `${i+1}. ${(voiceProfileSlots[i+1]?.name || '')}`;

    document.getElementById('lang_select').value = preferences.get('lang');
    checkStartupRun.checked = preferences.get('startup_run');
    document.getElementById('note_instrument').value = preferences.get('note_profile').instrument;
    document.getElementById('check_always_active').checked = preferences.get('always_active');
    document.getElementById('check_hold_repeat').checked = preferences.get('hold_repeat');
    document.querySelectorAll('#apps_table, #apps_toggle').forEach(el => el.setAttribute('disabled', preferences.get('always_active')));
    document.getElementById('check_selected_active').checked = preferences.get('selected_active')
    document.querySelectorAll(`[translation='settings.apps.active'], [translation='settings.apps.inactive']`).forEach(el => el.setAttribute('translation', preferences.get('selected_active')?'settings.apps.active':'settings.apps.inactive'));
    document.getElementById('apps_tbody').setAttribute('inactive', !preferences.get('selected_active'));
    document.querySelectorAll('input[name="audio_mode"]').forEach(radio => {// audio mode initilize 
        radio.checked = parseInt(radio.value) === preferences.get('audio_mode');
        radio.addEventListener('change', () => {
            console.log('Audio mode changed to:', radio.value);
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
                    outputEl.value = displayMode === 'percent' 
                    ? (parseFloat(el.value)).toFixed(0) + "%" 
                    : ((parseFloat(el.value) > 0) ? "+" : "") + parseFloat(el.value).toFixed(1);
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
            updateValue(control === 'master'?(preferences.get('volume') * 100):voiceProfile[control])
            
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
        if(voiceProfile.type.startsWith('m')) {
            document.getElementById('voice_type').className = 'male'
            document.getElementById('male').setAttribute('pressed', 'true');
            document.getElementById('female').setAttribute('pressed', 'false');
        }
        else if(voiceProfile.type.startsWith('f')) {
            document.getElementById('voice_type').className = 'female'
            document.getElementById('female').setAttribute('pressed', 'true');
            document.getElementById('male').setAttribute('pressed', 'false');
        }
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
    voiceTypeElement.className = type;
}
//#endregion

// keep consistant aspect ratio and scales all elements on the window
function scaleWindow() {
    const wrapper = document.getElementById('main-win');
    const scaleX = window.innerWidth / 720;
    const scaleY = window.innerHeight / 360;
    const scale = Math.min(scaleX, scaleY);
    wrapper.style.transform = `scale(${scale*1})`;
}
window.addEventListener('resize', scaleWindow);
window.addEventListener('load', scaleWindow);
scaleWindow();

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
    console.log("change", appName, isChecked);
    let enabledApps = preferences.get('selected_apps')

    if (isChecked && !enabledApps.includes(appName)) enabledApps.push(appName);
    else enabledApps = enabledApps.filter(name => name !== appName);

    preferences.set('selected_apps', enabledApps)
}

window.api.onFocusedWindowChanged((activeWindows) => updatedFocusedWindows(activeWindows));
//#endregion

//#region Savable voice profiles
//TODO make a custom notification popup for alerts
function deleteVoiceProfile() {
    const selectedSlot = document.getElementById('voice_profile_slot').value;

    let savedVoiceProfiles = preferences.get('saved_voice_profiles');
    savedVoiceProfiles = new Map(Object.entries(savedVoiceProfiles));
    savedVoiceProfiles.delete(selectedSlot);
    const savedProfilesObject = Object.fromEntries(savedVoiceProfiles);
    document.getElementById('voice_profile_slot').options[parseInt(selectedSlot)-1].innerHTML = `${selectedSlot}. `;

    profileName.value = '';
    profileName.dispatchEvent(new Event('input', { bubbles: true }));

    preferences.set('saved_voice_profiles', savedProfilesObject);
}

function saveVoiceProfile() {
    const currentVoiceProfile = preferences.get('voice_profile');
    const selectedSlot = parseInt(document.getElementById('voice_profile_slot').value);
    
    if (!profileName.value) return;

    let savedVoiceProfiles = new Map(Object.entries(preferences.get('saved_voice_profiles')));
    savedVoiceProfiles.set(selectedSlot, { name: profileName.value, profile: currentVoiceProfile });
    const savedProfilesObject = Object.fromEntries(savedVoiceProfiles);
    document.getElementById('voice_profile_slot').options[parseInt(selectedSlot)-1].innerHTML = `${selectedSlot}. ${profileName.value}`;

    preferences.set('saved_voice_profiles', savedProfilesObject);
}

function loadVoiceProfile() {
    const selectedSlot = document.getElementById('voice_profile_slot').value;
    const savedVoiceProfiles = preferences.get('saved_voice_profiles');
    const selectedProfile = savedVoiceProfiles[selectedSlot];

    if (selectedProfile) {
        profileName.value = selectedProfile.name;
        preferences.set('voice_profile', selectedProfile.profile);
        voiceProfile = preferences.get('voice_profile')
        initControls();
    } else profileName.value = '';

    profileName.dispatchEvent(new Event('input', { bubbles: true }));
}
//#endregion

function openSettings() {
    const show = document.getElementById('focus_out').getAttribute('show')==="true"?false:true;
    document.getElementById('focus_out').setAttribute('show', show);
}

function resetSettings() {
    window.settings.reset();
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
    const { keycode, isCtrlDown, isAltDown, isShiftDown, finalSound, defaultSound } = currentKey;
    const reset = remapSound === defaultSound;// if the key is being mapped to it's default sound, reset and clear the mapping in settings

    document.querySelector('.highlighted')?.classList.remove('highlighted');
    document.querySelector(`[sound="${remapSound===''?'#no_sound':remapSound}"]`)?.classList.add('highlighted');

    const remappedKeys = new Map(Object.entries(preferences.get('remapped_keys')));
    const mapping = { ...remappedKeys.get(`${keycode}`) || {} };

    if (reset) delete mapping[isCtrlDown?'ctrlSound':isAltDown?'altSound':isShiftDown?'shiftSound':'sound'];
    else mapping[isCtrlDown?'ctrlSound':isAltDown?'altSound':isShiftDown?'shiftSound':'sound'] = remapSound;

    if (Object.keys(mapping).length === 0) remappedKeys.delete(`${keycode}`);
    else remappedKeys.set(`${keycode}`, mapping);

    preferences.set('remapped_keys', Object.fromEntries(remappedKeys));

    changeTab(!remapSound||remapSound.startsWith('#')?0:remapSound.startsWith('&')?1:remapSound.startsWith('%')?2:remapSound.startsWith('sfx')?3:0);
});

remapIn.addEventListener('focusin', e => remapMonitor.setAttribute('monitoring', true));
remapIn.addEventListener('focusout', e => isRemapping?undefined:remapMonitor.setAttribute('monitoring', false));
remapIn.addEventListener('selectstart', e => e.preventDefault());
remapIn.addEventListener('mousedown', e => e.preventDefault());
document.addEventListener('keydown', e => { if(isRemapping) e.preventDefault(); });
function remapStart() {
    const { key, isShiftDown, isCtrlDown, isAltDown, finalSound } = currentKey;
    
    document.querySelector('.highlighted')?.classList.remove('highlighted');
    changeTab(!finalSound||finalSound.startsWith('#')?0:finalSound.startsWith('&')?1:finalSound.startsWith('%')?2:finalSound.startsWith('sfx')?3:0);

    const highlightedBtn = document.querySelector(`[sound="${finalSound===''?'#no_sound':finalSound}"]`);
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

    console.log("Final sound:", finalSound);
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
    const allControllers = document.querySelectorAll('#remap_controllers .remap_controller');
    const allEditors = document.querySelectorAll('#bottom_row .audio_editor');

    allControllers.forEach(el => el.setAttribute('show',false));
    allEditors.forEach(el => el.setAttribute('show',false));

    allControllers[newTabIndex].setAttribute('show',true);
    allEditors[newTabIndex].setAttribute('show',true);

    tabIndex = newTabIndex;

    if (newTabIndex === 2) centerPianoKeys();
}
//#endregion


//#region Remap controllers
const specialLayout = [
    [
        {label:'Nothing', btnType:'l', sound:`#no_sound`},
        {label:'Audio Toggle', btnType:'l', sound:`#1`},
        {label:'Show Editor ', btnType:'l', sound:`#2`},
        {label:'N/A', btnType:'l', sound:`#3`}
    ],
]

const voiceLayout = [
    [
        {label:'A', btnType:'s', sound:`&.a`},
        {label:'B', btnType:'s', sound:`&.b`},
        {label:'C', btnType:'s', sound:`&.c`},
        {label:'D', btnType:'s', sound:`&.d`},
        {label:'E', btnType:'s', sound:`&.e`},
        {label:'F', btnType:'s', sound:`&.f`},
        {label:'G', btnType:'s', sound:`&.g`},
        {label:'H', btnType:'s', sound:`&.h`},
        {label:'I', btnType:'s', sound:`&.i`},
        {label:'J', btnType:'s', sound:`&.j`},
        {label:'K', btnType:'s', sound:`&.k`},
        {label:'L', btnType:'s', sound:`&.l`},
        {label:'M', btnType:'s', sound:`&.m`}
    ],
    [
        {label:'N', btnType:'s', sound:`&.n`},
        {label:'O', btnType:'s', sound:`&.o`},
        {label:'P', btnType:'s', sound:`&.p`},
        {label:'Q', btnType:'s', sound:`&.q`},
        {label:'R', btnType:'s', sound:`&.r`},
        {label:'S', btnType:'s', sound:`&.s`},
        {label:'T', btnType:'s', sound:`&.t`},
        {label:'U', btnType:'s', sound:`&.u`},
        {label:'V', btnType:'s', sound:`&.v`},
        {label:'W', btnType:'s', sound:`&.w`},
        {label:'X', btnType:'s', sound:`&.x`},
        {label:'Y', btnType:'s', sound:`&.y`},
        {label:'Z', btnType:'s', sound:`&.z`}
    ],
    [
        {label:'OK', btnType:'s', sound:`&.ok`},
        {label:'GWAH', btnType:'m', sound:`&.gwah`},
        {label:'DESKA', btnType:'m', sound:`&.deska`},
    ]
];

const pianoLayout = [
    {label:'C2', btnType:'l', sound:'%.36'},
    { btnType:'b',sound:'%.37'},
    {btnType:'m', sound:'%.38'},
    { btnType:'b',sound:'%.39'},
    {btnType:'r', sound:'%.40'},
    {btnType:'l', sound:'%.41'},
    { btnType:'b',sound:'%.42'},
    {btnType:'m', sound:'%.43'},
    { btnType:'b',sound:'%.44'},
    {btnType:'m', sound:'%.45'},
    { btnType:'b',sound:'%.46'},
    {btnType:'r', sound:'%.47'},

    {label:'C3', btnType:'l', sound:'%.48'},
    { btnType:'b',sound:'%.49'},
    {btnType:'m', sound:'%.50'},
    { btnType:'b',sound:'%.51'},
    {btnType:'r', sound:'%.52'},
    {btnType:'l', sound:'%.53'},
    { btnType:'b',sound:'%.54'},
    {btnType:'m', sound:'%.55'},
    { btnType:'b',sound:'%.56'},
    {btnType:'m', sound:'%.57'},
    { btnType:'b',sound:'%.58'},
    {btnType:'r', sound:'%.59'},

    {label:'C4', btnType:'l', sound:'%.60'},
    { btnType:'b',sound:'%.61'},
    {btnType:'m', sound:'%.62'},
    { btnType:'b',sound:'%.63'},
    {btnType:'r', sound:'%.64'},
    {btnType:'l', sound:'%.65'},
    { btnType:'b',sound:'%.66'},
    {btnType:'m', sound:'%.67'},
    { btnType:'b',sound:'%.68'},
    {btnType:'m', sound:'%.69'},
    { btnType:'b',sound:'%.70'},
    {btnType:'r', sound:'%.71'},

    {label:'C5', btnType:'l', sound:'%.72'},
    { btnType:'b',sound:'%.73'},
    {btnType:'m', sound:'%.74'},
    { btnType:'b',sound:'%.75'},
    {btnType:'r', sound:'%.76'},
    {btnType:'l', sound:'%.77'},
    { btnType:'b',sound:'%.78'},
    {btnType:'m', sound:'%.79'},
    { btnType:'b',sound:'%.80'},
    {btnType:'m', sound:'%.81'},
    { btnType:'b',sound:'%.82'},
    {btnType:'r', sound:'%.83'},

    {label:'C6', btnType:'l', sound:'%.84'},
    { btnType:'b',sound:'%.85'},
    {btnType:'m', sound:'%.86'},
    { btnType:'b',sound:'%.87'},
    {btnType:'r', sound:'%.88'},
    {btnType:'l', sound:'%.89'},
    { btnType:'b',sound:'%.90'},
    {btnType:'m', sound:'%.91'},
    { btnType:'b',sound:'%.92'},
    {btnType:'m', sound:'%.93'},
    { btnType:'b',sound:'%.94'},
    {btnType:'r', sound:'%.95'},
]

const sfxLayout = [
    [
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.backspace'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.enter'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.tab'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.question'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.exclamation'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.at'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.pound'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.dollar'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.caret'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.ampersand'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.asterisk'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.parenthesis_open'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.parenthesis_closed'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.bracket_open'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.bracket_closed'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.brace_open'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.brace_closed'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.tilde'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.default'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.arrow_left'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.arrow_up'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.arrow_right'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.arrow_down'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.slash_forward'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.slash_back'},
        {label:'sfx', icon:'question', btnType:'s', sound:'sfx.percent'}
    ]
]

customElements.define('key-button', class extends HTMLElement {
    connectedCallback() {
        const btnType =this.getAttribute('btn-type') ?? 's';
        const label = this.getAttribute('label');
        const svgIcon = this.getAttribute('icon');
        this.id = `key-${label.replace(/\s+/g, '_')}`
        this.data = {
            label: label ?? '',
            sound: this.getAttribute('sound') ?? 'sfx.default'
        }

        fetch(`assets/svg/key_${btnType}.svg`)
        .then(res => res.text())
        .then(svg => {
            this.innerHTML = `
                <span class='key-label-wrapper key_${btnType}'>
                    ${svg}
                    ${
                        svgIcon?`<span class="key-icon-wrapper"></span>`:
                        label?`<span class='key-label'>${label}</span>`:''
                    }
                </span>
            `;
            this.querySelector('svg').classList.add(`key_${btnType}`);

            // if an icon is specified, fetch and use that for the label
            if (svgIcon) {
                fetch(`assets/svg/${svgIcon}.svg`)
                .then(iconRes => iconRes.text())
                .then(iconSvg => {
                    const iconWrapper = this.querySelector('.key-icon-wrapper');
                    iconWrapper.innerHTML = iconSvg;
                    iconWrapper.querySelector('svg').classList.add('key-icon');
                });
            }
            this.addEventListener('mouseenter', (e) => {if (e.buttons >0) press(this);});
            this.addEventListener('mousedown', (e) => {press(this);});
        });
    }
});
customElements.define('key-board', class extends HTMLElement {
    connectedCallback() {
        const layoutType = this.getAttribute('layout-type');
        const layout = layoutType==="voice"?voiceLayout:layoutType==="sfx"?sfxLayout:specialLayout

        for (let row of layout){
        const _row = $( `<div class='key-row'></div>`);
            for (let key of row) {
                const label = key.label?`label="${key.label}"`:'';
                const sound = key.sound?`sound="${key.sound}"`:'';
                const btnType = key.btnType?`btn-type="${key.btnType}"`:'';
                const icon = key.icon?`icon="${key.icon}"`:'';
                const _key = $(
                    key.label?`<key-button ${label} ${sound} ${btnType} ${icon} style="--label-length: ${key.label?.length};"></key-button>`:
                    `<div class='key_blank'></div>`
                );
                _key.appendTo(_row);
            }
        _row.appendTo(this);
        }
    }
});

customElements.define('piano-key', class extends HTMLElement {
    connectedCallback() {
        const btnType = this.getAttribute('btn-type');
        const label = this.getAttribute('label');
        this.data = {
            label: label ?? '',
            sound: this.getAttribute('sound') ?? 'sfx.default'
        }

        fetch(`assets/svg/piano_${btnType}.svg`)
        .then(res => res.text())
        .then(svg => {
            this.innerHTML = `
                <span class='piano_${btnType}'>
                    ${svg}
                    ${label?`<span class='key-label'>${label}</span>`:''}
                </span>
            `;
            this.querySelector('svg').classList.add(`piano_${btnType}`);

            this.addEventListener('mouseenter', (e) => {if (e.buttons > 0) press(this, true);});
            this.addEventListener('mousedown', (e) => {press(this, true);});
            this.addEventListener('mouseleave', (e) => {release(this);});
            this.addEventListener('mouseup', (e) => {release(this);});
        });
    }
});

customElements.define('piano-board', class extends HTMLElement {
    connectedCallback() {
        const back = $(`<div id="piano_back"></div>`);
        const keys = $(`<div id="piano_keys"></div>`);
        keys.appendTo(this);
        for (let key of pianoLayout) {
            const label = key.label?`label=${key.label}`:'';
            const sound = key.sound?`sound=${key.sound}`:'';
            const btnType = key.btnType?`btn-type=${key.btnType}`:'';
            const _key = $(
                `<piano-key ${label} ${sound} ${btnType} style="--label-length: ${key.label?.length};"></piano-key>`
            );
            _key.appendTo(keys);
        }
        back.appendTo(this);
        keys.appendTo(this);

        // auto scroll keys when near the edges
        const piano_keys = document.getElementById('piano_keys');
        let scrollDirection = 0;
        let animationFrameId = null;
        let wheelTimeoutId = null;

        function scrollPianoKeys() {
            if (scrollDirection !== 0) {
                piano_keys.scrollLeft += scrollDirection;
                animationFrameId = requestAnimationFrame(scrollPianoKeys);
            } else if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }

        function startScroll() {
            if (!animationFrameId) animationFrameId = requestAnimationFrame(scrollPianoKeys);
        }
        function stopScroll() {
            scrollDirection = 0;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }

        piano_keys.addEventListener('wheel', (e) => {
            e.preventDefault();
            scrollDirection = (e.deltaY || e.detail || e.wheelDelta) > 0 ? 10 : -10;
            startScroll();
            if (wheelTimeoutId) clearTimeout(wheelTimeoutId);
            wheelTimeoutId = setTimeout(stopScroll, 80);
        });
    }
});

function centerPianoKeys() {
    const piano_keys = document.getElementById('piano_keys');
    if (!piano_keys) return;
    // Only center if visible
    if (piano_keys.offsetParent !== null && piano_keys.offsetWidth > 0) {
        piano_keys.scrollLeft = (piano_keys.scrollWidth - piano_keys.clientWidth) / 2;
    }
}

function press(btn, holdKey=false) {
    if (!btn.classList.contains('pressed')) {
        const sound = btn.getAttribute('sound') ?? 'sfx.default';
        const label = btn.getAttribute('label') ?? '';
        btn.classList.add('pressed');
        if (holdKey) {
            window.audio.play(sound, {noRandom: true, hold: 0});
        }
        else {
            window.audio.play(sound, {noRandom: true});
            setTimeout(() => btn.classList.remove('pressed'), 100);
        }
        window.api.sendRemapSound(sound);
    }
}

function release(btn) {
    btn.classList.remove('pressed');
    window.audio.release(0);
}