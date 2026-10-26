export const QUALITY_STORAGE_KEY = 'restaurante-calidad';
export const QUALITY_ORDER = ['high', 'medium', 'low'];

export const QUALITY_CONFIG = {
    high: {
        label: 'Alta',
        dpr: [1, 2],
        shadowMapSize: 1024,
        bloom: true,
        lightsCastShadow: true,
        maxCats: 3,
        maxWaiters: 3,
        steam: true,
        plantMotion: true,
        tableEffects: true,
        terraceDecor: true,
    },
    medium: {
        label: 'Media',
        dpr: [1, 1.5],
        shadowMapSize: 512,
        bloom: false,
        lightsCastShadow: true,
        maxCats: 3,
        maxWaiters: 3,
        steam: true,
        plantMotion: true,
        tableEffects: true,
        terraceDecor: true,
    },
    low: {
        label: 'Baja',
        dpr: 1,
        shadowMapSize: 0,
        bloom: false,
        lightsCastShadow: false,
        maxCats: 2,
        maxWaiters: 2,
        steam: false,
        plantMotion: false,
        tableEffects: false,
        terraceDecor: false,
    },
};

export const QUALITY_OPTIONS = QUALITY_ORDER.map((value) => ({
    value,
    label: QUALITY_CONFIG[value].label,
}));

export function normalizeQuality(value) {
    return QUALITY_ORDER.includes(value) ? value : null;
}

export function detectQuality({
    width = typeof window === 'undefined' ? 1024 : window.innerWidth,
    dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio,
    cores =
        typeof navigator === 'undefined'
            ? 4
            : (navigator.hardwareConcurrency ?? 4),
} = {}) {
    if (width < 360 || dpr > 3 || cores <= 2) {
        return 'low';
    }

    if (width < 1024 || dpr > 2 || cores <= 4) {
        return 'medium';
    }

    return 'high';
}

export function getInitialQuality() {
    if (typeof window === 'undefined') {
        return 'high';
    }

    try {
        const stored = normalizeQuality(window.localStorage.getItem(QUALITY_STORAGE_KEY));

        if (stored) {
            return stored;
        }
    } catch {
        return detectQuality();
    }

    return detectQuality();
}

export function saveQuality(quality) {
    const normalized = normalizeQuality(quality);

    if (!normalized || typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(QUALITY_STORAGE_KEY, normalized);
    } catch {
        return;
    }
}

export function getQualityConfig(quality) {
    return QUALITY_CONFIG[normalizeQuality(quality) ?? 'high'];
}

export function getLowerQuality(quality) {
    const index = QUALITY_ORDER.indexOf(normalizeQuality(quality) ?? 'high');

    return index >= 0 ? (QUALITY_ORDER[index + 1] ?? null) : null;
}
