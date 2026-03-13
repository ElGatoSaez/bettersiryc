(function() {
    'use strict';

    const DEFAULT_TEMPLATES = [
        {
            id: 'vaginal-indicaciones-adicionales',
            name: 'Vaginal',
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

    function normalizeFieldLabel(value) {
        return (value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    }

    globalThis.BetterSirycTemplates = {
        DEFAULT_TEMPLATES,
        normalizeFieldLabel
    };
})();
