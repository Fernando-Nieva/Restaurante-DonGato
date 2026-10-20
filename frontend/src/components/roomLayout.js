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

export const KITCHEN_PICKUP = { x: 4.5, z: -4.0 };
export const WAITER_COUNT = 3;
export const KITCHEN_PICKUP_SLOTS = Array.from({ length: WAITER_COUNT }, (_, index) => ({
    x: KITCHEN_PICKUP.x + (index - (WAITER_COUNT - 1) / 2) * 0.95,
    z: KITCHEN_PICKUP.z,
}));
export const WAITER_MAX_WAIT_SECONDS = 120;
