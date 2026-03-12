const statusElement = document.getElementById('storage-status');

function renderStatus(message) {
    if (statusElement) {
        statusElement.textContent = message;
    }
}

if (!chrome.storage || !chrome.storage.local) {
    renderStatus('Extension storage is unavailable in this context.');
} else {
    chrome.storage.local.get(['templates'], (result) => {
        const templateCount = Array.isArray(result.templates) ? result.templates.length : 0;
        renderStatus(`Extension storage ready. Saved templates: ${templateCount}`);
    });
}
