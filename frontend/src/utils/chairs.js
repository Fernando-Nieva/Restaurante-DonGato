export const CHAIR_RADIUS = 1.15;

export function getChairLayout(seats = 4) {
    const chairCount = Math.max(2, Math.min(8, Number(seats) || 4));

    return Array.from({ length: chairCount }, (_, index) => {
        const angle = (index / chairCount) * Math.PI * 2;

        return {
            key: index,
            position: [Math.cos(angle) * CHAIR_RADIUS, 0, Math.sin(angle) * CHAIR_RADIUS],
            rotationY: Math.PI / 2 - angle,
        };
    });
}
