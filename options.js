const statusElement = document.getElementById('storage-status');
const templateListElement = document.getElementById('template-list');
const templateFormElement = document.getElementById('template-form');
const templateIdElement = document.getElementById('template-id');
const templateNameElement = document.getElementById('template-name');
const templateFieldsElement = document.getElementById('template-fields');
const templateContentElement = document.getElementById('template-content');
const templateResetElement = document.getElementById('template-reset');
const templateApi = globalThis.BetterSirycTemplates || {
    DEFAULT_TEMPLATES: [],
    normalizeFieldLabel: (value) => value || ''
};
let currentTemplates = [];

function renderStatus(message) {
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function createTemplateId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    return `template-${Date.now()}`;
}

function getFormValues() {
    const name = templateNameElement ? templateNameElement.value.trim() : '';
    const fieldValue = templateFieldsElement ? templateFieldsElement.value.trim() : '';
    const content = templateContentElement ? templateContentElement.value : '';

    return {
        id: templateIdElement ? templateIdElement.value.trim() : '',
        name,
        fields: fieldValue ? fieldValue.split(',').map((field) => field.trim()).filter(Boolean) : [],
        content: content.trim()
    };
}

function fillForm(template) {
    if (templateIdElement) {
        templateIdElement.value = template.id || '';
    }
    if (templateNameElement) {
        templateNameElement.value = template.name || '';
    }
    if (templateFieldsElement) {
        templateFieldsElement.value = Array.isArray(template.fields) ? template.fields.join(', ') : '';
    }
    if (templateContentElement) {
        templateContentElement.value = template.content || '';
    }
}

function resetForm() {
    if (templateFormElement) {
        templateFormElement.reset();
    }
    if (templateIdElement) {
        templateIdElement.value = '';
    }
}

function saveTemplates(templates) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ templates }, () => {
            currentTemplates = templates;
            resolve(templates);
        });
    });
}

function renderTemplates(templates) {
    if (!templateListElement) {
        return;
    }

    templateListElement.innerHTML = '';

    if (templates.length === 0) {
        const emptyState = document.createElement('article');
        emptyState.className = 'template-item';
        emptyState.innerHTML = '<p>Aún no tienes plantillas guardadas.</p>';
        templateListElement.appendChild(emptyState);
        return;
    }

    templates.forEach((template) => {
        const card = document.createElement('article');
        card.className = 'template-item';
        const title = document.createElement('h2');
        title.textContent = template.name;

        const fields = document.createElement('p');
        fields.textContent = `Campos: ${(template.fields || []).join(', ') || 'Todos los campos compatibles'}`;

        const preview = document.createElement('div');
        preview.className = 'template-preview';
        preview.textContent = template.content || '';

        const actions = document.createElement('div');
        actions.className = 'template-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'template-edit';
        editButton.dataset.templateAction = 'edit';
        editButton.dataset.templateId = template.id;
        editButton.textContent = 'Editar';

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'template-delete';
        deleteButton.dataset.templateAction = 'delete';
        deleteButton.dataset.templateId = template.id;
        deleteButton.textContent = 'Eliminar';

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        card.appendChild(title);
        card.appendChild(fields);
        card.appendChild(preview);
        card.appendChild(actions);
        templateListElement.appendChild(card);
    });
}

function saveDefaultTemplates() {
    return saveTemplates(templateApi.DEFAULT_TEMPLATES);
}

async function loadTemplates() {
    if (!chrome.storage || !chrome.storage.local) {
        renderStatus('No fue posible acceder al almacenamiento de la extensión.');
        return;
    }

    chrome.storage.local.get(['templates'], async (result) => {
        const hasTemplates = Array.isArray(result.templates) && result.templates.length > 0;
        const templates = hasTemplates ? result.templates : await saveDefaultTemplates();
        currentTemplates = templates;
        renderStatus(`Almacenamiento listo. Plantillas guardadas: ${templates.length}`);
        renderTemplates(templates);
    });
}

async function handleTemplateSave(event) {
    event.preventDefault();

    const nextTemplate = getFormValues();
    if (!nextTemplate.name || !nextTemplate.content) {
        renderStatus('La plantilla necesita al menos un nombre y contenido.');
        return;
    }

    const templateId = nextTemplate.id || createTemplateId();
    const templateToSave = {
        id: templateId,
        name: nextTemplate.name,
        fields: nextTemplate.fields.map((field) => templateApi.normalizeFieldLabel(field)),
        content: nextTemplate.content
    };

    const hasExistingTemplate = currentTemplates.some((template) => template.id === templateId);
    const nextTemplates = hasExistingTemplate
        ? currentTemplates.map((template) => template.id === templateId ? templateToSave : template)
        : [templateToSave, ...currentTemplates];

    await saveTemplates(nextTemplates);
    renderTemplates(nextTemplates);
    renderStatus(hasExistingTemplate ? 'Plantilla actualizada.' : 'Plantilla guardada.');
    resetForm();
}

async function handleTemplateListClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
        return;
    }

    const action = target.dataset.templateAction;
    const templateId = target.dataset.templateId;
    if (!action || !templateId) {
        return;
    }

    const template = currentTemplates.find((item) => item.id === templateId);
    if (!template) {
        return;
    }

    if (action === 'edit') {
        fillForm(template);
        renderStatus(`Editando plantilla: ${template.name}`);
        templateNameElement.focus();
        return;
    }

    if (action === 'delete') {
        const confirmed = window.confirm(`Eliminar la plantilla "${template.name}"?`);
        if (!confirmed) {
            return;
        }

        const nextTemplates = currentTemplates.filter((item) => item.id !== templateId);
        await saveTemplates(nextTemplates);
        renderTemplates(nextTemplates);
        renderStatus('Plantilla eliminada.');
        if (templateIdElement && templateIdElement.value === templateId) {
            resetForm();
        }
    }
}

if (templateFormElement) {
    templateFormElement.addEventListener('submit', handleTemplateSave);
}

if (templateResetElement) {
    templateResetElement.addEventListener('click', () => {
        resetForm();
        renderStatus(`Almacenamiento listo. Plantillas guardadas: ${currentTemplates.length}`);
    });
}

if (templateListElement) {
    templateListElement.addEventListener('click', (event) => {
        handleTemplateListClick(event);
    });
}

loadTemplates();
