
/**
    The current layout to be displayed.
 */
let layout = []; // current selected layout

/**
 * Builds and returns the HTML for the specified board layout.
 * @param {string} layoutName 
 * @returns {string} HTML string representing the board layout.
 */
function updateBoardLayout(layoutName = 'voice') {
    layout = window.api.fetchLayout(layoutName)
    console.log('Fetched layout:', layoutName, layout);
    const layoutContainer = document.getElementById('layout_container');
    if (layoutName === 'piano') layoutContainer.innerHTML = `<piano-board></piano-board>`;
    else layoutContainer.innerHTML = `<sound-board></sound-board>`;
}

document.addEventListener('DOMContentLoaded', () => updateBoardLayout());
window.api.onSettingUpdate('updated-voice_language', () => changeTab(1));

customElements.define('sound-button', class extends HTMLElement {
    connectedCallback() {
        const btnType = this.getAttribute('btn-type') ?? 's';
        const label = this.getAttribute('label');
        const svgIcon = this.getAttribute('icon');
        this.id = `button-${label.replace(/\s+/g, '_')}`
        this.data = {
            label: label ?? '',
            sound: this.getAttribute('sound') ?? 'sfx.default'
        }

        fetch(`assets/svg/button_${btnType}.svg`)
        .then(res => res.text())
        .then(svg => {
            this.innerHTML = `
                <span class='button-label-wrapper button_${btnType}'>
                    ${svg}
                    ${ svgIcon
                    ? `<span class="button-icon-wrapper"></span>`
                    : label
                        ? `<span class='button-label'>${label}</span>`
                        : ''
                    }
                </span>
            `;
            this.querySelector('svg').classList.add(`button_${btnType}`);
            // if an icon is specified, fetch and use that for the label
            if (svgIcon) {
                fetch(`assets/svg/${svgIcon}.svg`)
                .then(iconRes => iconRes.text())
                .then(iconSvg => {
                    const iconWrapper = this.querySelector('.button-icon-wrapper');
                    iconWrapper.innerHTML = iconSvg;
                    iconWrapper.querySelector('svg').classList.add('button-icon');
                });
            }
            this.addEventListener('mouseenter', (e) => {if (e.buttons >0) press(this);});
            this.addEventListener('mousedown', (e) => {press(this);});
        });
    }
});

customElements.define('sound-board', class extends HTMLElement {
    connectedCallback() {
        for (let row of layout){
        const _row = $( `<div class='button-row'></div>`);
            for (let button of row) {
                const label = button.label?`label="${button.label}"`:'';
                const sound = button.sound?`sound="${button.sound}"`:'';
                const btnType = button.btnType?`btn-type="${button.btnType}"`:'';
                const icon = button.icon?`icon="${button.icon}"`:'';
                const _button = $(
                    button.label
                    ? `<sound-button ${label} ${sound} ${btnType} ${icon} style="--label-length: ${button.label?.length};"></sound-button>`
                    : `<div class='button_blank'></div>`
                );
                _button.appendTo(_row);
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
                    ${label
                        ?`<span class='button-label'>${label}</span>`
                        :''
                    }
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
        for (let key of layout) {
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

function press(btn, holdKey=false) {
    if (!btn.classList.contains('pressed')) {
        const sound = btn.getAttribute('sound');
        if (!sound) return;
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