(function() {
    'use strict';

    const FORM_DEFINITIONS = [
        {
            id: 'EVOLUCION_MEDICA',
            label: 'Evolución Médica',
            fields: [
                'EVOLUCION O COMENTARIO *',
                'EXAMEN FISICO',
                'RESULTADOS DE EXAMENES Y PROCEDIMIENTOS',
                'PROBLEMAS Y PLANES',
                'INDICACIONES ADICIONALES'
            ]
        },
        {
            id: 'EPICRISIS_MEDICA',
            label: 'Epicrisis Médica',
            fields: [
                'PATOLOGIAS CRONICAS *',
                'EVOLUCION O COMENTARIO *',
                'MEDICAMENTOS Y DOSIS SUMINISTRADAS EN HOSPITALIZACION *',
                'RESULTADOS DE EXAMENES RELEVANTES Y PROCEDIMIENTOS *',
                'REPOSO',
                'REGIMEN ALIMENTARIO',
                'CONTROLES',
                'INDICACIONES ADICIONALES'
            ]
        }
    ];

    const LEGACY_VAGINAL_CONTENT = [
        'Indicacion de prueba',
        'por Equipo de Informatica',
        'HGGB'
    ].join('\n');

    const DEFAULT_TEMPLATES = [
        {
            id: 'vaginal-indicaciones-adicionales',
            name: 'Vaginal',
            formId: 'EVOLUCION_MEDICA',
            fields: ['INDICACIONES ADICIONALES'],
            content: [
                'Control de signos vitales cada 8 horas',
                'Paracetamol 1g cada 8 horas vía oral',
                'Fomentar lactancia materna a libre demanda',
                'Fomentar deambulación',
                'Masaje uterino',
                'Vigilar pérdidas transvaginales',
                'Residente SOS',
                '',
                'Int. Sebastián Sáez Moscoso'
            ].join('\n')
        }
    ];

    function normalizeText(value) {
        return (value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    }

    function normalizeFieldLabel(value) {
        return normalizeText(value);
    }

    function getFormDefinitionById(formId) {
        return FORM_DEFINITIONS.find((form) => form.id === formId) || null;
    }

    function getFormDefinitionByLabel(label) {
        const normalizedLabel = normalizeText(label);
        return FORM_DEFINITIONS.find((form) => normalizeText(form.label) === normalizedLabel) || null;
    }

    function getFormLabel(formId) {
        const formDefinition = getFormDefinitionById(formId);
        return formDefinition ? formDefinition.label : '';
    }

    function getFieldLabel(formId, fieldValue) {
        const normalizedFieldValue = normalizeFieldLabel(fieldValue);
        const formDefinition = getFormDefinitionById(formId);

        if (formDefinition) {
            const matchingField = formDefinition.fields.find((field) => normalizeFieldLabel(field) === normalizedFieldValue);
            if (matchingField) {
                return matchingField;
            }
        }

        for (const form of FORM_DEFINITIONS) {
            const matchingField = form.fields.find((field) => normalizeFieldLabel(field) === normalizedFieldValue);
            if (matchingField) {
                return matchingField;
            }
        }

        return fieldValue;
    }

    function buildFieldSelectionValue(formId, fieldLabel) {
        return `${formId}::${normalizeFieldLabel(fieldLabel)}`;
    }

    function parseFieldSelectionValue(value) {
        if (!value || !value.includes('::')) {
            return { formId: '', field: '' };
        }

        const [formId, field] = value.split('::');
        return { formId, field };
    }

    function cloneDefaultTemplates() {
        return DEFAULT_TEMPLATES.map((template) => ({
            ...template,
            fields: Array.isArray(template.fields) ? [...template.fields] : []
        }));
    }

    function inferLegacyFormId(template) {
        if (template.id === 'vaginal-indicaciones-adicionales') {
            return 'EVOLUCION_MEDICA';
        }

        const normalizedFields = Array.isArray(template.fields)
            ? template.fields.map((field) => normalizeFieldLabel(field))
            : [];

        if (normalizedFields.length !== 1) {
            return '';
        }

        const matchingForms = FORM_DEFINITIONS.filter((form) =>
            form.fields.some((field) => normalizeFieldLabel(field) === normalizedFields[0])
        );

        return matchingForms.length === 1 ? matchingForms[0].id : '';
    }

    function migrateTemplates(templates) {
        if (!Array.isArray(templates) || templates.length === 0) {
            return {
                templates: cloneDefaultTemplates(),
                changed: true
            };
        }

        let changed = false;
        const migratedTemplates = templates.map((template) => {
            const normalizedFields = Array.isArray(template.fields)
                ? template.fields.map((field) => normalizeFieldLabel(field)).filter(Boolean)
                : [];

            let formId = typeof template.formId === 'string' ? template.formId : '';
            if (!formId) {
                const inferredFormId = inferLegacyFormId({ ...template, fields: normalizedFields });
                if (inferredFormId) {
                    formId = inferredFormId;
                    changed = true;
                }
            }

            let content = typeof template.content === 'string' ? template.content : '';
            if (template.id === 'vaginal-indicaciones-adicionales' && content === LEGACY_VAGINAL_CONTENT) {
                content = DEFAULT_TEMPLATES[0].content;
                changed = true;
            }

            if (formId !== template.formId) {
                changed = true;
            }

            if (JSON.stringify(normalizedFields) !== JSON.stringify(template.fields || [])) {
                changed = true;
            }

            if (content !== template.content) {
                changed = true;
            }

            return {
                id: template.id || `template-${Date.now()}`,
                name: template.name || 'Plantilla sin nombre',
                formId,
                fields: normalizedFields,
                content
            };
        });

        return {
            templates: migratedTemplates,
            changed
        };
    }

    globalThis.BetterSirycTemplates = {
        DEFAULT_TEMPLATES,
        FORM_DEFINITIONS,
        buildFieldSelectionValue,
        cloneDefaultTemplates,
        getFieldLabel,
        getFormDefinitionByLabel,
        getFormLabel,
        migrateTemplates,
        normalizeFieldLabel
    };
})();
