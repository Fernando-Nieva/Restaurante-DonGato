const MAX_ATTEMPTS = 20;
const OBSTACLE_MARGIN = 0.25;
const MIN_LENGTH = 1e-4;

const isInsideObstacle = (x, z, obstacle, margin = 0) =>
    x > obstacle.minX - margin &&
    x < obstacle.maxX + margin &&
    z > obstacle.minZ - margin &&
    z < obstacle.maxZ + margin;

const distanceToNearestPoint = (points, x, z) => {
    let nearest = Infinity;

    points.forEach((point) => {
        const distance = Math.hypot(x - point.x, z - point.z);

        if (distance < nearest) {
            nearest = distance;
        }
    });

    return nearest;
};

export function pickWalkTarget(tables, obstacles, bounds, minDistance, avoid = null, avoidDistance = 0) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);

        if (obstacles.some((obstacle) => isInsideObstacle(x, z, obstacle, OBSTACLE_MARGIN))) {
            continue;
        }

        if (distanceToNearestPoint(tables, x, z) < minDistance) {
            continue;
        }

        if (avoid && avoidDistance > 0 && Math.hypot(x - avoid.x, z - avoid.z) < avoidDistance) {
            continue;
        }

        return { x, z };
    }

    return null;
}

export function steerAround(position, direction, obstacles, radius) {
    let steerX = 0;
    let steerZ = 0;
    let steered = false;

    obstacles.forEach((obstacle) => {
        const toX = obstacle.x - position.x;
        const toZ = obstacle.z - position.z;
        const distance = Math.hypot(toX, toZ);

        if (distance >= radius || distance < MIN_LENGTH) {
            return;
        }

        const normalizedX = toX / distance;
        const normalizedZ = toZ / distance;
        const forward = normalizedX * direction.x + normalizedZ * direction.z;

        if (forward <= 0) {
            return;
        }

        const strength = ((radius - distance) / radius) * 2 * forward;
        const awayX = direction.x * forward - normalizedX;
        const awayZ = direction.z * forward - normalizedZ;
        const awayLength = Math.hypot(awayX, awayZ);

        if (awayLength < MIN_LENGTH) {
            const cross = direction.x * normalizedZ - direction.z * normalizedX;
            const side = cross >= 0 ? -1 : 1;
            steerX += -direction.z * side * strength;
            steerZ += direction.x * side * strength;
        } else {
            steerX += (awayX / awayLength) * strength;
            steerZ += (awayZ / awayLength) * strength;
        }

        steered = true;
    });

    if (!steered) {
        return direction;
    }

    const finalX = direction.x + steerX;
    const finalZ = direction.z + steerZ;
    const length = Math.hypot(finalX, finalZ);

    if (length < MIN_LENGTH) {
        return direction;
    }

    return { x: finalX / length, z: finalZ / length };
}
