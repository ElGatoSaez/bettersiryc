// ==UserScript==
// @name         Better SIRYC
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Mejora la experiencia en SIRYC
// @author       Sebastián Sáez Moscoso
// @match        *://hospitalregional.cl/siryc/*
// @match        *://10.6.9.245/siryc/*
// @match        *://sinetsur.ssconcepcion.cl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const IS_IFRAME = window.self !== window.top;

    // --- LÓGICA DEL PADRE (SIRYC PRINCIPAL) ---
    // Esta parte escucha los mensajes del iframe y maneja las vistas nativas (Sala/Ficha)
    if (!IS_IFRAME) {

        // 1. Escuchar mensajes del hijo (Iframe ASP)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SIRYC_UPDATE_TITLE') {
                const nuevoTitulo = event.data.payload;
                if (document.title !== nuevoTitulo) {
                    document.title = nuevoTitulo;
                }
            }
        });

        // 2. Lógica Standard (Sala y Ficha)
        const updateMainTitle = () => {
            const headerSmall = document.querySelector('section.content-header small');
            const headerText = headerSmall ? (headerSmall.textContent || "") : "";
            const headerH1 = document.querySelector('section.content-header h1');
            const fullHeaderText = (headerH1 ? headerH1.textContent : "") + headerText;

            // -- CASO SALA --
            if (fullHeaderText.includes("Crear Registro Clínico") || fullHeaderText.includes("Ver Registro Clínico")) {
                const spanServicio = document.getElementById('select2-iNunidad_atencion-container');
                let nombreServicio = (spanServicio && spanServicio.title !== "Seleccione la Unidad de Atención") ? spanServicio.title : "";

                const selectSala = document.getElementById('iNsala');
                let nombreSala = (selectSala && selectSala.selectedIndex > 0) ? selectSala.options[selectSala.selectedIndex].text : "";

                if (selectSala && !selectSala.dataset.listenerAttached) {
                    selectSala.addEventListener('change', updateMainTitle);
                    selectSala.dataset.listenerAttached = "true";
                }

                if (nombreServicio && nombreSala) {
                    document.title = `${nombreSala} ${nombreServicio}`;
                }
            }

            // -- CASO FICHA/EVOLUCION --
            // (La lógica de buscar sala/cama y nombre en los box)
            const boxTitles = document.querySelectorAll('.box-header.with-border .box-title');
            if (boxTitles.length > 0) {
                let salaCamaTexto = "";
                let nombrePaciente = "";

                boxTitles.forEach(title => {
                    const text = title.textContent || "";
                    if (text.includes("SALA") && text.includes("CAMA")) {
                        const match = text.match(/SALA\s+(.+)\s+CAMA\s+(.+)/i);
                        if (match) salaCamaTexto = `${match[1].trim()}-${match[2].trim()}`;
                    }
                });

                const strongs = document.querySelectorAll('strong');
                for (let s of strongs) {
                    if (s.textContent.includes("Nombre y Apellidos")) {
                        const parentDiv = s.closest('div');
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
        };

        // Observer para el Padre
        const observer = new MutationObserver(updateMainTitle);
        observer.observe(document.body, { childList: true, subtree: true });
        updateMainTitle();
    }

    // --- LÓGICA DEL HIJO (IFRAME ASP.NET - SINETSUR) ---
    // Esta parte solo busca el nombre en el ASP y manda el mensaje
    if (IS_IFRAME) {
        const checkASPContent = () => {
            const lblNombre = document.getElementById('ctl00_ContentPlaceHolder1_lblNomPac');
            if (lblNombre) {
                const nombrePaciente = lblNombre.innerText.trim();
                if (nombrePaciente) {
                    const tituloFinal = `ANT - ${nombrePaciente}`;
                    // Enviamos el mensaje al Padre
                    window.parent.postMessage({
                        type: 'SIRYC_UPDATE_TITLE',
                        payload: tituloFinal
                    }, '*');
                }
            }
        };

        // Observer para el Iframe (el contenido ASP puede tardar en cargar)
        const observerFrame = new MutationObserver(checkASPContent);
        observerFrame.observe(document.body, { childList: true, subtree: true });
        checkASPContent();
    }

})();
