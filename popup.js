const popupSummaryElement = document.getElementById('popup-summary');
const openOptionsButton = document.getElementById('open-options');
const popupTemplateApi = globalThis.BetterSirycTemplates || { DEFAULT_TEMPLATES: [] };

function setPopupSummary(message) {
    if (popupSummaryElement) {
        popupSummaryElement.textContent = message;
    }
}

function loadPopupSummary() {
    if (!chrome.storage || !chrome.storage.local) {
        setPopupSummary('No fue posible leer el almacenamiento de la extensión.');
        return;
    }

    chrome.storage.local.get(['templates'], (result) => {
        const templates = Array.isArray(result.templates) && result.templates.length > 0
            ? result.templates
            : popupTemplateApi.DEFAULT_TEMPLATES;
        const templateLabel = templates.length === 1 ? 'plantilla disponible' : 'plantillas disponibles';
        setPopupSummary(`${templates.length} ${templateLabel}. Abre la configuración para gestionarlas.`);
    });
}

if (openOptionsButton) {
    openOptionsButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
        window.close();
    });
}

loadPopupSummary();
