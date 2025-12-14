/**
 * author: joshxviii 
 */

//#region General setup
const preferences = window.settings;

document.addEventListener('DOMContentLoaded', () => {
    updateLanguage(preferences.get('lang'));
    updateTheme(preferences.get('theme'));
});

// custom svg button element
customElements.define('svg-button', class extends HTMLElement {
    connectedCallback() {
        const icon = this.getAttribute('icon');
        
        fetch(`assets/svg/${icon}.svg`)
        .then(res => res.text())
        .then(svg => {
            this.innerHTML = svg;
            const svgEl = this.querySelector('svg');
            svgEl.classList.add('svg-button');
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
//#endregion

function handleSpecialCommand(command) {
    switch (command) {
        case '#toggle_active':
            // const value = preferences.get('mute_app');
            // preferences.set('mute_app', !value);
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
            handleSpecialCommand(finalSound);
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