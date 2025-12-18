/**
 * author: joshxviii 
 */

//#region General setup
const preferences = window.settings;

document.addEventListener('DOMContentLoaded', () => {
    updateLanguage(preferences.get('lang'));
    updateTheme(preferences.get('theme'));
});

const observer = new MutationObserver(mutations => {
    mutations.forEach( mutation => updateIcon(mutation.target) );
});

function updateIcon(el) {
    const icon = el.getAttribute('icon');
    fetch(`assets/svg/${icon}.svg`)
    .then(res => res.text())
    .then(svg => {
        el.innerHTML = svg;
        const svgEl = el.querySelector('svg');
        svgEl.classList.add('svg-button');
    });
}
// custom svg button element
customElements.define('svg-button', class extends HTMLElement {
    connectedCallback() {
        updateIcon(this);
        // update svg on icon attribute change
        observer.observe(this, {
            subtree: false,
            attributeFilter: ['icon']
        });
    }
});

function updateLanguage(lang) {// language selection update
    preferences.set('lang', lang);
    window.translator.load(lang);
    window.translator.update();
}

function updateTheme(theme) {
    preferences.set('theme', theme);
    const themeStyle = document.getElementById('theme-style');
    if (themeStyle) {
        themeStyle.setAttribute('href', `assets/styles/themes/${theme}.css`);
    }
}

window.updateVoiceLanguage = (language) => {
    preferences.set('voice_language', language);
    window.audio.play('&.ok', { noRandom: true});
}

window.api.onMutedChanged((muted) => {
    const disableButton = document.getElementById('disable_app_button');
    if (disableButton) {
        // update button icon from stop to start.
        disableButton.setAttribute('icon', muted ? 'start' : 'stop');
        disableButton.setAttribute('title', muted ? 'Enable app' : 'Disable app');
    }
    const warning = document.getElementById('disabled_warning');
    warning.setAttribute('translation', muted ? 'warning.disabled' : 'warning.enabled');
    setTimeout(() => {
        const hotkeySpan = document.getElementById('hotkey');
        if (hotkeySpan) hotkeySpan.innerHTML = `${preferences.get('disable_hotkey')}`.toUpperCase();
    }, 0);
});

window.api.onSettingUpdate('updated-disable_hotkey', () => {
    const hotkeySpan = document.getElementById('hotkey');
    if (hotkeySpan) hotkeySpan.innerHTML = `${preferences.get('disable_hotkey')}`.toUpperCase();
});

//#endregion

function handleSpeicalCommand(command) {
    switch (command) {
        case '#no_sound':// do nothing
        break;
        case '#disable_toggle': // handled in remapper
        break;
        case '#show_window':
            window.api.showWindow();
        break;
    }
}

//#region Key press detect
window.api.onKeyDown( (keyInfo) => {
    const { keycode, isCapsLock, isShiftDown, finalSound } = keyInfo;
    
    if (finalSound === undefined || finalSound === '') return;
    const isSpecial = finalSound.startsWith('#');
    const isVoice = finalSound.startsWith('&');
    const isInstrument = finalSound.startsWith('%');
    const isSfx = finalSound.startsWith('sfx')
    const options = {}
    if (!preferences.get('hold_repeat')) Object.assign(options, { hold: keycode });
    switch (true) {
        case ( isSpecial ):// handle special commands
           handleSpeicalCommand(finalSound);
        return;
            
        case ( isVoice ): // uppercase typing has higher pitch and variation
            Object.assign(options, {
                yelling: isCapsLock !== isShiftDown
            });
        break;
        
        case ( isInstrument ):// notes should always hold until released with keyup 
            Object.assign(options, {
                hold: keycode,
                pitchShift: isCapsLock? -12 : 0
            });
        break;
    }
    window.audio.play(finalSound, options);
});
window.api.onKeyUp( (keyInfo) => {
    const { keycode, finalSound } = keyInfo;

    if (finalSound === undefined) return;
    switch (true) {
        case ( finalSound.startsWith('%') ):
            window.audio.release(keycode, true /* cutOff */)
        break;
        default:
            window.audio.release(keycode, false)
        break;
    }
});
//#endregion