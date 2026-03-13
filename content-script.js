(function() {
    'use strict';

    const IS_IFRAME = window.self !== window.top;
    const OBSERVER_CONFIG = { childList: true, subtree: true };
    const TEMPLATE_STYLE_ID = 'bettersiryc-template-style';
    const TEMPLATE_POPOVER_ID = 'bettersiryc-template-popover';
    const templateApi = globalThis.BetterSirycTemplates || {
        DEFAULT_TEMPLATES: [],
        cloneDefaultTemplates: () => [],
        getFormDefinitionByLabel: () => null,
        getFormLabel: (formId) => formId,
        migrateTemplates: (templates) => ({ templates, changed: false }),
        normalizeFieldLabel: (value) => value || ''
    };

    let enhancementScheduled = false;
    let activePopover = null;
    let activeAnchor = null;

    function ensureTemplateStyles() {
        if (document.getElementById(TEMPLATE_STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = TEMPLATE_STYLE_ID;
        style.textContent = `
            .bettersiryc-template-button {
                background: #7b2cbf !important;
                border-color: #7b2cbf !important;
                color: #fff !important;
            }

            .bettersiryc-template-button:hover,
            .bettersiryc-template-button:focus {
                background: #6923a5 !important;
                border-color: #6923a5 !important;
                color: #fff !important;
            }

            #${TEMPLATE_POPOVER_ID} {
                position: fixed;
                z-index: 999999;
                width: min(320px, calc(100vw - 24px));
                padding: 12px;
                border-radius: 12px;
                background: #ffffff;
                border: 1px solid rgba(123, 44, 191, 0.28);
                box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
                font-family: Arial, sans-serif;
            }

            #${TEMPLATE_POPOVER_ID} h3 {
                margin: 0 0 4px;
                font-size: 14px;
                color: #32154f;
            }

            #${TEMPLATE_POPOVER_ID} p {
                margin: 0 0 10px;
                font-size: 12px;
                color: #5b4d68;
            }

            .bettersiryc-template-option {
                width: 100%;
                display: block;
                margin: 0;
                padding: 10px 12px;
                border: 1px solid rgba(123, 44, 191, 0.16);
                border-radius: 10px;
                background: #f8f2fd;
                color: #32154f;
                text-align: left;
                cursor: pointer;
            }

            .bettersiryc-template-option + .bettersiryc-template-option {
                margin-top: 8px;
            }

            .bettersiryc-template-option:hover,
            .bettersiryc-template-option:focus {
                background: #efe3fb;
                outline: none;
            }

            .bettersiryc-template-empty {
                padding: 8px 10px;
                border-radius: 10px;
                background: #f7f2fb;
                color: #5b4d68;
                font-size: 12px;
            }
        `;

        document.head.appendChild(style);
    }

    function observeDocument(callback) {
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', () => observeDocument(callback), { once: true });
            return;
        }

        const observer = new MutationObserver(callback);
        observer.observe(document.body, OBSERVER_CONFIG);
        callback();
    }

    function scheduleMainEnhancements() {
        if (enhancementScheduled) {
            return;
        }

        enhancementScheduled = true;
        window.requestAnimationFrame(() => {
            enhancementScheduled = false;
            updateMainTitle();
            enhanceTemplateButtons();
        });
    }

    function closeTemplatePopover() {
        if (activePopover) {
            activePopover.remove();
            activePopover = null;
            activeAnchor = null;
        }
    }

    function positionPopover(popover, anchor) {
        const rect = anchor.getBoundingClientRect();
        const top = Math.min(rect.bottom + 8, window.innerHeight - popover.offsetHeight - 12);
        const left = Math.min(rect.left, window.innerWidth - popover.offsetWidth - 12);

        popover.style.top = `${Math.max(12, top)}px`;
        popover.style.left = `${Math.max(12, left)}px`;
    }

    function getFieldLabel(textarea) {
        const explicitLabel = textarea.id ? document.querySelector(`label[for="${textarea.id}"]`) : null;
        if (explicitLabel && explicitLabel.textContent) {
            return explicitLabel.textContent.trim();
        }

        const parentLabel = textarea.parentElement ? textarea.parentElement.querySelector('label') : null;
        return parentLabel ? parentLabel.textContent.trim() : '';
    }

    function getActiveFormId() {
        const formSelect = document.getElementById('iNtiporce');
        if (!(formSelect instanceof HTMLSelectElement) || formSelect.selectedIndex < 0) {
            return '';
        }

        const selectedOption = formSelect.options[formSelect.selectedIndex];
        const selectedLabel = selectedOption ? selectedOption.textContent.trim() : '';
        const formDefinition = templateApi.getFormDefinitionByLabel(selectedLabel);
        return formDefinition ? formDefinition.id : '';
    }

    function insertTemplateIntoTextarea(textarea, templateContent) {
        const value = textarea.value || '';
        const start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : value.length;
        const end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : value.length;
        const nextValue = `${value.slice(0, start)}${templateContent}${value.slice(end)}`;

        textarea.focus();
        textarea.value = nextValue;

        const caretPosition = start + templateContent.length;
        if (typeof textarea.setSelectionRange === 'function') {
            textarea.setSelectionRange(caretPosition, caretPosition);
        }

        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function saveDefaultTemplates() {
        return new Promise((resolve) => {
            const defaultTemplates = templateApi.cloneDefaultTemplates();
            chrome.storage.local.set({ templates: defaultTemplates }, () => {
                resolve(defaultTemplates);
            });
        });
    }

    function loadTemplates() {
        return new Promise((resolve) => {
            if (!chrome.storage || !chrome.storage.local) {
                resolve(templateApi.DEFAULT_TEMPLATES);
                return;
            }

            chrome.storage.local.get(['templates'], async (result) => {
                const hasTemplates = Array.isArray(result.templates) && result.templates.length > 0;
                const sourceTemplates = hasTemplates ? result.templates : templateApi.cloneDefaultTemplates();
                const migration = templateApi.migrateTemplates(sourceTemplates);

                if (!hasTemplates || migration.changed) {
                    chrome.storage.local.set({ templates: migration.templates }, () => {
                        resolve(migration.templates);
                    });
                    return;
                }

                resolve(migration.templates);
            });
        });
    }

    function getApplicableTemplates(templates, textarea) {
        const currentLabel = templateApi.normalizeFieldLabel(getFieldLabel(textarea));
        const currentFormId = getActiveFormId();

        return templates.filter((template) => {
            if (!Array.isArray(template.fields) || template.fields.length === 0) {
                return true;
            }

            const matchesField = template.fields.some((field) => templateApi.normalizeFieldLabel(field) === currentLabel);
            if (!matchesField) {
                return false;
            }

            if (!template.formId) {
                return true;
            }

            return template.formId === currentFormId;
        });
    }

    async function openTemplatePopover(button, textarea) {
        const isSameButton = activeAnchor === button && activePopover;
        closeTemplatePopover();

        if (isSameButton) {
            return;
        }

        const templates = await loadTemplates();
        const applicableTemplates = getApplicableTemplates(templates, textarea);
        const popover = document.createElement('div');
        const fieldLabel = getFieldLabel(textarea);
        const formLabel = templateApi.getFormLabel(getActiveFormId());

        popover.id = TEMPLATE_POPOVER_ID;
        popover.innerHTML = `
            <h3>Plantillas</h3>
            <p>${formLabel ? `${formLabel} · ` : ''}${fieldLabel || 'Campo compatible'}</p>
        `;

        if (applicableTemplates.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'bettersiryc-template-empty';
            emptyState.textContent = 'No hay plantillas guardadas para este campo aun.';
            popover.appendChild(emptyState);
        } else {
            applicableTemplates.forEach((template) => {
                const option = document.createElement('button');
                option.type = 'button';
                option.className = 'bettersiryc-template-option';
                option.textContent = template.name;
                option.addEventListener('click', () => {
                    insertTemplateIntoTextarea(textarea, template.content || '');
                    closeTemplatePopover();
                });
                popover.appendChild(option);
            });
        }

        document.body.appendChild(popover);
        positionPopover(popover, button);
        activePopover = popover;
        activeAnchor = button;
    }

    function createTemplateButton(historyButton) {
        const templateButton = historyButton.cloneNode(true);
        templateButton.id = `tpl-${historyButton.id}`;
        templateButton.classList.remove('modalHistorial');
        templateButton.classList.remove('btn-info');
        templateButton.classList.add('bettersiryc-template-button');
        templateButton.dataset.bettersirycTemplateButton = 'true';
        templateButton.title = 'Plantillas';
        templateButton.setAttribute('aria-label', 'Plantillas');
        templateButton.innerHTML = '<i class="fa fa-file-text-o"></i>';
        return templateButton;
    }

    function enhanceTemplateButtons() {
        if (!document.body) {
            return;
        }

        ensureTemplateStyles();

        const historyButtons = document.querySelectorAll('button.modalHistorial[id^="btn-param-"]');
        historyButtons.forEach((historyButton) => {
            if (historyButton.nextElementSibling && historyButton.nextElementSibling.dataset.bettersirycTemplateButton === 'true') {
                return;
            }

            const targetTextareaId = historyButton.id.replace(/^btn-/, '');
            const textarea = document.getElementById(targetTextareaId);
            if (!(textarea instanceof HTMLTextAreaElement)) {
                return;
            }

            const templateButton = createTemplateButton(historyButton);
            templateButton.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                await openTemplatePopover(templateButton, textarea);
            });

            historyButton.insertAdjacentElement('afterend', templateButton);
        });
    }

    function updateMainTitle() {
        const headerSmall = document.querySelector('section.content-header small');
        const headerText = headerSmall ? (headerSmall.textContent || '') : '';
        const headerH1 = document.querySelector('section.content-header h1');
        const fullHeaderText = (headerH1 ? headerH1.textContent : '') + headerText;

        if (fullHeaderText.includes('Crear Registro Clinico') || fullHeaderText.includes('Ver Registro Clinico') ||
            fullHeaderText.includes('Crear Registro Clínico') || fullHeaderText.includes('Ver Registro Clínico')) {
            const spanServicio = document.getElementById('select2-iNunidad_atencion-container');
            const nombreServicio =
                spanServicio && spanServicio.title !== 'Seleccione la Unidad de Atencion' &&
                spanServicio.title !== 'Seleccione la Unidad de Atención'
                    ? spanServicio.title
                    : '';

            const selectSala = document.getElementById('iNsala');
            const nombreSala =
                selectSala && selectSala.selectedIndex > 0
                    ? selectSala.options[selectSala.selectedIndex].text
                    : '';

            if (selectSala && !selectSala.dataset.listenerAttached) {
                selectSala.addEventListener('change', updateMainTitle);
                selectSala.dataset.listenerAttached = 'true';
            }

            if (nombreServicio && nombreSala) {
                document.title = `${nombreSala} ${nombreServicio}`;
                return;
            }
        }

        const boxTitles = document.querySelectorAll('.box-header.with-border .box-title');
        if (boxTitles.length === 0) {
            return;
        }

        let salaCamaTexto = '';
        let nombrePaciente = '';

        boxTitles.forEach((title) => {
            const text = title.textContent || '';
            if (text.includes('SALA') && text.includes('CAMA')) {
                const match = text.match(/SALA\s+(.+)\s+CAMA\s+(.+)/i);
                if (match) {
                    salaCamaTexto = `${match[1].trim()}-${match[2].trim()}`;
                }
            }
        });

        const strongs = document.querySelectorAll('strong');
        for (const strong of strongs) {
            if (strong.textContent && strong.textContent.includes('Nombre y Apellidos')) {
                const parentDiv = strong.closest('div');
                if (parentDiv && parentDiv.nextElementSibling) {
                    nombrePaciente = parentDiv.nextElementSibling.textContent.trim();
                }
                break;
            }
        }

        if (salaCamaTexto && nombrePaciente) {
            document.title = `${salaCamaTexto} ${nombrePaciente}`;
        }
    }

    function checkAspContent() {
        const lblNombre = document.getElementById('ctl00_ContentPlaceHolder1_lblNomPac');
        if (!lblNombre) {
            return;
        }

        const nombrePaciente = lblNombre.innerText.trim();
        if (!nombrePaciente) {
            return;
        }

        window.parent.postMessage(
            {
                type: 'SIRYC_UPDATE_TITLE',
                payload: `ANT - ${nombrePaciente}`
            },
            '*'
        );
    }

    if (!IS_IFRAME) {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SIRYC_UPDATE_TITLE' && typeof event.data.payload === 'string') {
                if (document.title !== event.data.payload) {
                    document.title = event.data.payload;
                }
            }
        });

        document.addEventListener('click', (event) => {
            if (!activePopover) {
                return;
            }

            const target = event.target;
            if (target instanceof Node && !activePopover.contains(target) && target !== activeAnchor) {
                closeTemplatePopover();
            }
        });

        window.addEventListener('resize', () => {
            if (activePopover && activeAnchor) {
                positionPopover(activePopover, activeAnchor);
            }
        });

        window.addEventListener('scroll', () => {
            if (activePopover && activeAnchor) {
                positionPopover(activePopover, activeAnchor);
            }
        }, true);

        observeDocument(scheduleMainEnhancements);
        return;
    }

    observeDocument(checkAspContent);
})();
