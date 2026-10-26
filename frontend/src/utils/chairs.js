export const CHAIR_RADIUS = 1.15;

const CHAIR_MARGIN = 0.45;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function getChairLayout(seats = 4, bounds = null, origin = { x: 0, z: 0 }) {
    const chairCount = Math.max(2, Math.min(8, Number(seats) || 4));
    const originX = Number(origin?.x) || 0;
    const originZ = Number(origin?.z) || 0;

    return Array.from({ length: chairCount }, (_, index) => {
        const angle = (index / chairCount) * Math.PI * 2;
        let x = Math.cos(angle) * CHAIR_RADIUS;
        let z = Math.sin(angle) * CHAIR_RADIUS;

        if (bounds) {
            const absoluteX = clamp(
                originX + x,
                bounds.minX + CHAIR_MARGIN,
                bounds.maxX - CHAIR_MARGIN,
            );
            const absoluteZ = clamp(
                originZ + z,
                bounds.minZ + CHAIR_MARGIN,
                bounds.maxZ - CHAIR_MARGIN,
            );

            x = absoluteX - originX;
            z = absoluteZ - originZ;
        }

        return {
            key: index,
            position: [x, 0, z],
            rotationY: Math.PI / 2 - angle,
        };
    });
}
