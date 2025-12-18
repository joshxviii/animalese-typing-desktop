const fs = require('fs');
const path = require('path');

let translations = {}; // current selected language
// default translations
const defaultTranslations = 
    JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/lang', `en.json`), 'utf8'));


// load a language
function loadLanguage(lang = 'en') {
    const langFilePath = path.join(__dirname, '../assets/lang', `${lang}.json`);

    if (fs.existsSync(langFilePath)) {
        translations = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    } else {
        console.error(`Language file for "${lang}" not found.`);
        translations = {};
    }
}
loadLanguage();

// get translation
function translate(key) { return translations[key] || (defaultTranslations[key] || `${key}`); }

function updateElementTranslation(el) {
    const key = el.getAttribute('translation');
    if (!key) return;

    if (el.type === 'text') {
        el.setAttribute('placeholder', translate(key));
        return;
    }
    if (el.type === 'button') {
        el.setAttribute('value', translate(key));
        return;
    }

    Array.from(el.childNodes).forEach(node => {
        if (
            (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('translation-html')) ||
            node.nodeType === Node.TEXT_NODE
        ) {
            el.removeChild(node);
        }
    });

    const temp = document.createElement('span');
    temp.className = 'translation-html';
    temp.innerHTML = translate(key);
    // recursively update translations for child elements
    Array.from(temp.childNodes).forEach(node => {if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('translation')) updateElementTranslation(node)});
    el.appendChild(temp);
}

const observer = new MutationObserver(mutations => {
    mutations.forEach( mutation => updateElementTranslation(mutation.target) );
});

// update translations for all elements on the document
function updateHtmlDocumentTranslations() {
    observer.disconnect();

    document.querySelectorAll('[translation]').forEach(el => updateElementTranslation(el));

    observer.observe(document, {
        subtree: true,
        attributeFilter: ['translation']
    });
}


module.exports = {
    loadLanguage,
    updateHtmlDocumentTranslations
};