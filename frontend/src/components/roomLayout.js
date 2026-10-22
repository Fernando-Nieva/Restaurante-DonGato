export const ROOM_LAYOUT = {
    minX: -8,
    maxX: 8,
    minZ: -6,
    maxZ: 6,
    wallHeight: 3,
    shortWallHeight: 1.2,
    wallThickness: 0.25,
    deckWidth: 1.5,
    deckY: -0.14,
    baseY: -0.62,
    baseMargin: 0.8,
};

export const WINDOW_BAND = {
    tall: { bottom: 0.95, top: 2.45 },
    short: { bottom: 0.55, top: 1.15 },
    spacing: 1.8,
};

export const ZOOM_BASE = 42;
export const TARGET_LIMIT = 20;
export const ZOOM_FIT_WIDTH = 23;
export const ZOOM_FIT_HEIGHT = 15;
export const MIN_ZOOM_BASE = 20;
export const MAX_ZOOM_BASE = 140;

export function getZoomProfile(width, height) {
    const safeWidth = Math.max(Number(width) || 0, 1);
    const safeHeight = Math.max(Number(height) || 0, 1);
    const fitZoom = Math.min(safeWidth / ZOOM_FIT_WIDTH, safeHeight / ZOOM_FIT_HEIGHT);
    const initial = Math.max(1, Math.min(ZOOM_BASE, fitZoom));
    const compact = initial < ZOOM_BASE - 0.01;

    return {
        initial,
        min: compact ? Math.max(6, initial * 0.55) : MIN_ZOOM_BASE,
        max: compact ? Math.max(initial * 4, 40) : MAX_ZOOM_BASE,
        labelThreshold: initial * 0.7,
    };
}

export const KITCHEN_PICKUP = { x: 4.5, z: -4.0 };
export const WAITER_COUNT = 3;
export const KITCHEN_PICKUP_SLOTS = Array.from({ length: WAITER_COUNT }, (_, index) => ({
    x: KITCHEN_PICKUP.x + (index - (WAITER_COUNT - 1) / 2) * 0.95,
    z: KITCHEN_PICKUP.z,
}));
export const WAITER_MAX_WAIT_SECONDS = 120;
