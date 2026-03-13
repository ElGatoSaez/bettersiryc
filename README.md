# Better SIRYC

Better SIRYC is a Chromium extension that adds focused quality-of-life improvements to SIRYC without touching the backend.

It started as a userscript and evolved into an extension once the project needed persistent template storage, a configuration UI, and a cleaner path for distribution.

## What It Does

Better SIRYC currently improves two key parts of the workflow:

- Smarter browser tab titles so patient context is easier to identify at a glance.
- Clinical templates for supported dynamic text fields inside SIRYC.

Today, the extension can:

- update the tab title in record creation and patient record views
- detect ASP.NET iframe content and sync the patient name to the parent tab
- inject a purple templates button next to supported history buttons
- insert templates into compatible fields
- manage templates from the extension UI
- scope templates by both form and field to avoid collisions between similar field names

## Why

SIRYC works, but everyday clinical use benefits from small improvements that reduce friction:

- less tab confusion
- less repeated typing
- faster note-writing
- better consistency between records

Better SIRYC is built around the idea that improvements should feel native to the existing workflow, not heavy or distracting.

## Current Template Scope

The templates system currently targets dynamic textareas that already have an associated history button in SIRYC.

This is intentional:

- those fields are the safest and most consistent to detect
- the UI stays close to an existing SIRYC pattern
- the workflow remains fast and familiar

## Installation

### Load Unpacked In Chromium

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this repository folder
5. Open SIRYC and start using the extension

## Using Templates

1. Click the Better SIRYC extension icon
2. Open `Gestionar plantillas`
3. Create or edit a template
4. Choose the correct form and field from the grouped selector
5. Save the template
6. In SIRYC, click the purple button next to a supported field
7. Pick the template to insert

## Supported Form Groups

### Evolucion Medica

- EVOLUCION O COMENTARIO *
- EXAMEN FISICO
- RESULTADOS DE EXAMENES Y PROCEDIMIENTOS
- PROBLEMAS Y PLANES
- INDICACIONES ADICIONALES

### Epicrisis Medica

- PATOLOGIAS CRONICAS *
- EVOLUCION O COMENTARIO *
- MEDICAMENTOS Y DOSIS SUMINISTRADAS EN HOSPITALIZACION *
- RESULTADOS DE EXAMENES RELEVANTES Y PROCEDIMIENTOS *
- REPOSO
- REGIMEN ALIMENTARIO
- CONTROLES
- INDICACIONES ADICIONALES

## Project Structure

- [manifest.json](./manifest.json): extension manifest
- [content-script.js](./content-script.js): runtime logic injected into SIRYC
- [templates.js](./templates.js): template defaults, metadata and migration helpers
- [options.html](./options.html): settings UI for template management
- [popup.html](./popup.html): quick access entrypoint from the extension icon

## Status

Better SIRYC is actively evolving.

Current focus:

- keep the extension lightweight
- expand templates carefully from MVP
- preserve compatibility with real SIRYC workflows
- avoid over-designing the UI

## Roadmap

- richer template organization
- better multi-template workflow per field
- scoped presets for repeated clinical patterns
- cleaner distribution for end users

## Notes

Better SIRYC is designed as a workflow enhancement layer on top of an existing clinical system.

It does not replace SIRYC and should be used with the same clinical caution and responsibility required by the base system itself.
