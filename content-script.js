(function() {
    'use strict';

    const IS_IFRAME = window.self !== window.top;
    const OBSERVER_CONFIG = { childList: true, subtree: true };

    function observeDocument(callback) {
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', () => observeDocument(callback), { once: true });
            return;
        }

        const observer = new MutationObserver(callback);
        observer.observe(document.body, OBSERVER_CONFIG);
        callback();
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

        observeDocument(updateMainTitle);
        return;
    }

    observeDocument(checkAspContent);
})();
