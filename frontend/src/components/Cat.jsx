import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import { ROOM_LAYOUT } from './roomLayout';
import { pickWalkTarget, steerAround } from '../utils/navigation';

const WALK_BOUNDS = {
    minX: ROOM_LAYOUT.minX + 1,
    maxX: ROOM_LAYOUT.maxX - 1,
    minZ: ROOM_LAYOUT.minZ + 1,
    maxZ: ROOM_LAYOUT.maxZ - 1,
};
const TABLE_KEEP_OUT = 1.2;
const TABLE_STEER_RADIUS = 1.3;
const CAT_STEER_RADIUS = 0.6;
const CAT_BLOCK_DISTANCE = 0.35;
const CAT_BLOCK_DOT = 0.3;
const CAT_BLOCK_MIN = 0.6;
const CAT_BLOCK_MAX = 1.3;
const CAT_FLEE_DISTANCE = 1.0;
const CAT_FLEE_CLEARANCE = 2.5;
const CAT_FLEE_COOLDOWN = 2.5;
const ZONE_LOOK_AHEAD = 0.3;
const ZONE_BLOCK_MIN = 0.5;
const ZONE_BLOCK_MAX = 1.0;
const ARRIVE_DISTANCE = 0.06;
const STUCK_TIMEOUT = 4;
const STUCK_PROGRESS = 0.05;
const JUMP_DURATION = 0.45;
const JUMP_HEIGHT = 0.16;
const MEOW_MS = 1500;
const LEG_RATE = 11.25;
const TAU = Math.PI * 2;

const DARK = '#3d2814';
const NOSE = '#d97a8a';

const BLOCKED_ZONES = [
    { minX: -8, maxX: -5.7, minZ: -5.6, maxZ: 1.6 },
    { minX: 1.9, maxX: 7, minZ: -6, maxZ: -4.2 },
    { minX: -8, maxX: -6.9, minZ: 2.3, maxZ: 4.2 },
];
const ZONE_MARGIN = 0.25;

const LEGS = [
    [0.075, 0.115],
    [-0.075, 0.115],
    [0.075, -0.115],
    [-0.075, -0.115],
];
const LEG_PHASES = [0, Math.PI, Math.PI, 0];

const MEOW_STYLE = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    height: '24px',
    padding: '0 10px',
    borderRadius: '9999px',
    border: '2px solid rgba(61, 40, 20, 0.4)',
    color: DARK,
    fontSize: '13px',
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: 'nowrap',
};

const noRaycast = () => null;

const isZoneBlocked = (x, z) =>
    BLOCKED_ZONES.some(
        (zone) =>
            x > zone.minX - ZONE_MARGIN &&
            x < zone.maxX + ZONE_MARGIN &&
            z > zone.minZ - ZONE_MARGIN &&
            z < zone.maxZ + ZONE_MARGIN,
    );

export default function Cat({
    name = 'gato',
    color = '#e08a3c',
    bellyColor = '#f6d7ab',
    eyeColor = DARK,
    speed = 0.8,
    restMin = 2,
    restMax = 5,
    startPosition = [0.8, 0, 3.8],
    tables = [],
    registry = null,
    waiters = null,
    animationsEnabled = true,
}) {
    const catRef = useRef(null);
    const poseRef = useRef(null);
    const headRef = useRef(null);
    const tailRef = useRef(null);
    const legsRef = useRef([]);
    const meowTimer = useRef(null);
    const positionEntry = useRef(null);
    const behavior = useRef({
        state: 'descansar',
        wait: 0.8,
        target: null,
        heading: Math.PI,
        legPhase: 0,
        crouch: 0,
        jump: 0,
        bestRemaining: Infinity,
        stuckTime: 0,
        fleeCooldown: 0,
    });
    const [meowing, setMeowing] = useState(false);

    const tableCenters = useMemo(
        () =>
            tables.map((table) => ({
                x: Number(table.pos_x) || 0,
                z: Number(table.pos_z) || 0,
            })),
        [tables],
    );

    useEffect(() => {
        if (!registry) {
            return undefined;
        }

        const entry = { x: startPosition[0], z: startPosition[2] };
        positionEntry.current = entry;
        registry.current.push(entry);

        return () => {
            const index = registry.current.indexOf(entry);

            if (index >= 0) {
                registry.current.splice(index, 1);
            }

            positionEntry.current = null;
        };
    }, [registry, startPosition]);

    useEffect(
        () => () => {
            if (meowTimer.current) {
                clearTimeout(meowTimer.current);
            }

            document.body.style.cursor = 'auto';
        },
        [],
    );

    const startResting = (min, max) => {
        const b = behavior.current;

        b.state = 'descansar';
        b.target = null;
        b.wait = min + Math.random() * (max - min);
        b.bestRemaining = Infinity;
        b.stuckTime = 0;
    };

    useFrame((state, rawDelta) => {
        const cat = catRef.current;

        if (!cat) {
            return;
        }

        const b = behavior.current;
        const delta = Math.min(rawDelta, 0.05);
        const time = state.clock.elapsedTime;
        const entry = positionEntry.current;

        if (entry) {
            entry.x = cat.position.x;
            entry.z = cat.position.z;
        }

        if (!animationsEnabled) {
            b.jump = 0;
            cat.position.y += (0 - cat.position.y) * Math.min(delta * 8, 1);
            b.crouch += (0 - b.crouch) * Math.min(delta * 6, 1);

            if (poseRef.current) {
                poseRef.current.position.y += (0 - poseRef.current.position.y) * Math.min(delta * 6, 1);
            }

            legsRef.current.forEach((leg) => {
                if (leg) {
                    leg.rotation.x += (0 - leg.rotation.x) * Math.min(delta * 14, 1);
                }
            });

            if (headRef.current) {
                headRef.current.rotation.y +=
                    (0 - headRef.current.rotation.y) * Math.min(delta * 3, 1);
            }

            if (tailRef.current) {
                tailRef.current.rotation.y +=
                    (0 - tailRef.current.rotation.y) * Math.min(delta * 4, 1);
            }

            return;
        }

        const waiterEntries = waiters?.current
            ? Array.isArray(waiters.current)
                ? waiters.current
                : [waiters.current]
            : [];

        b.fleeCooldown = Math.max(0, b.fleeCooldown - delta);

        let nearestWaiter = null;
        let nearestDistance = Infinity;

        waiterEntries.forEach((candidate) => {
            const point = candidate?.position ?? candidate;

            if (!point) {
                return;
            }

            const distance = Math.hypot(cat.position.x - point.x, cat.position.z - point.z);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestWaiter = point;
            }
        });

        if (nearestWaiter && nearestDistance < CAT_FLEE_DISTANCE && b.fleeCooldown <= 0) {
            const target = pickWalkTarget(
                tableCenters,
                BLOCKED_ZONES,
                WALK_BOUNDS,
                TABLE_KEEP_OUT,
                nearestWaiter,
                CAT_FLEE_CLEARANCE,
            );

            if (target) {
                b.state = 'caminar';
                b.target = target;
                b.bestRemaining = Infinity;
                b.stuckTime = 0;
                b.fleeCooldown = CAT_FLEE_COOLDOWN;
            } else {
                b.fleeCooldown = 0.5;
            }
        }

        if (b.jump > 0) {
            b.jump = Math.max(0, b.jump - delta);
            const progress = 1 - b.jump / JUMP_DURATION;
            cat.position.y = Math.sin(progress * Math.PI) * JUMP_HEIGHT;
        } else {
            cat.position.y = 0;
        }

        if (b.state === 'caminar' && b.target) {
            const dx = b.target.x - cat.position.x;
            const dz = b.target.z - cat.position.z;
            const remaining = Math.hypot(dx, dz);

            if (remaining < ARRIVE_DISTANCE) {
                startResting(restMin, restMax);
            } else if (remaining < b.bestRemaining - STUCK_PROGRESS) {
                b.bestRemaining = remaining;
                b.stuckTime = 0;
            } else {
                b.stuckTime += delta;

                if (b.stuckTime > STUCK_TIMEOUT) {
                    startResting(restMin, restMax);
                }
            }

            if (b.state === 'caminar' && b.target) {
                let direction = steerAround(
                    cat.position,
                    { x: dx / remaining, z: dz / remaining },
                    tableCenters,
                    TABLE_STEER_RADIUS,
                );

                const otherCats = registry
                    ? registry.current.filter((other) => other !== entry)
                    : [];

                if (otherCats.length > 0) {
                    direction = steerAround(cat.position, direction, otherCats, CAT_STEER_RADIUS);
                }

                const lookX = cat.position.x + direction.x * ZONE_LOOK_AHEAD;
                const lookZ = cat.position.z + direction.z * ZONE_LOOK_AHEAD;

                const catAhead = otherCats.some((other) => {
                    const toX = other.x - cat.position.x;
                    const toZ = other.z - cat.position.z;
                    const distance = Math.hypot(toX, toZ);

                    if (distance >= CAT_BLOCK_DISTANCE || distance < 1e-4) {
                        return false;
                    }

                    return (
                        (toX / distance) * direction.x + (toZ / distance) * direction.z >
                        CAT_BLOCK_DOT
                    );
                });

                if (catAhead) {
                    startResting(CAT_BLOCK_MIN, CAT_BLOCK_MAX);
                } else if (isZoneBlocked(lookX, lookZ)) {
                    startResting(ZONE_BLOCK_MIN, ZONE_BLOCK_MAX);
                } else {
                    const step = Math.min(speed * delta, remaining);
                    cat.position.x += direction.x * step;
                    cat.position.z += direction.z * step;

                    const targetHeading = Math.atan2(direction.x, direction.z);
                    const diff =
                        ((targetHeading - b.heading + Math.PI) % TAU + TAU) % TAU - Math.PI;
                    b.heading += diff * Math.min(delta * 7, 1);
                    b.legPhase += delta * speed * LEG_RATE;
                }
            }
        } else {
            b.wait -= delta;

            if (b.wait <= 0) {
                const target = pickWalkTarget(
                    tableCenters,
                    BLOCKED_ZONES,
                    WALK_BOUNDS,
                    TABLE_KEEP_OUT,
                );

                if (target) {
                    b.state = 'caminar';
                    b.target = target;
                    b.bestRemaining = Infinity;
                    b.stuckTime = 0;
                } else {
                    b.wait = 1;
                }
            }
        }

        cat.rotation.y = b.heading;

        const walking = b.state === 'caminar';
        const crouchTarget = walking ? 0 : -0.02;
        b.crouch += (crouchTarget - b.crouch) * Math.min(delta * 6, 1);

        if (poseRef.current) {
            const bob = walking ? Math.abs(Math.sin(b.legPhase)) * 0.012 : 0;
            poseRef.current.position.y = b.crouch + bob;
        }

        legsRef.current.forEach((leg, index) => {
            if (!leg) {
                return;
            }

            const target = walking ? Math.sin(b.legPhase + LEG_PHASES[index]) * 0.5 : 0;
            leg.rotation.x += (target - leg.rotation.x) * Math.min(delta * 14, 1);
        });

        if (headRef.current) {
            const target = walking ? 0 : Math.sin(time * 0.8) * 0.28;
            headRef.current.rotation.y +=
                (target - headRef.current.rotation.y) * Math.min(delta * 3, 1);
        }

        if (tailRef.current) {
            const tailSpeed = walking ? 3.4 : 1.6;
            const tailAmplitude = walking ? 0.18 : 0.32;
            tailRef.current.rotation.y = Math.sin(time * tailSpeed) * tailAmplitude;
        }
    });

    const handleColliderClick = (event) => {
        event.stopPropagation();

        if (animationsEnabled) {
            behavior.current.jump = JUMP_DURATION;
        }

        setMeowing(true);

        if (meowTimer.current) {
            clearTimeout(meowTimer.current);
        }

        meowTimer.current = setTimeout(() => setMeowing(false), MEOW_MS);
    };

    const handlePointerOver = (event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = () => {
        document.body.style.cursor = 'auto';
    };

    return (
        <group ref={catRef} name={name} position={startPosition} rotation={[0, Math.PI, 0]}>
            <group scale={0.85}>
                <group ref={poseRef}>
                    <mesh
                        raycast={noRaycast}
                        castShadow
                        position={[0, 0.21, -0.02]}
                        scale={[0.155, 0.115, 0.21]}
                    >
                        <sphereGeometry args={[1, 20, 16]} />
                        <meshToonMaterial color={color} />
                        <Outlines thickness={0.012} color={DARK} />
                    </mesh>

                    <mesh
                        raycast={noRaycast}
                        castShadow
                        position={[0, 0.155, -0.01]}
                        scale={[0.105, 0.06, 0.145]}
                    >
                        <sphereGeometry args={[1, 16, 12]} />
                        <meshToonMaterial color={bellyColor} />
                    </mesh>

                    <group ref={headRef} position={[0, 0.3, 0.24]}>
                        <mesh raycast={noRaycast} castShadow>
                            <sphereGeometry args={[0.12, 20, 16]} />
                            <meshToonMaterial color={color} />
                            <Outlines thickness={0.012} color={DARK} />
                        </mesh>

                        <mesh
                            raycast={noRaycast}
                            castShadow
                            position={[0.062, 0.105, -0.012]}
                            rotation={[0, Math.PI / 4, -0.16]}
                        >
                            <coneGeometry args={[0.045, 0.09, 4]} />
                            <meshToonMaterial color={color} />
                        </mesh>
                        <mesh
                            raycast={noRaycast}
                            castShadow
                            position={[-0.062, 0.105, -0.012]}
                            rotation={[0, Math.PI / 4, 0.16]}
                        >
                            <coneGeometry args={[0.045, 0.09, 4]} />
                            <meshToonMaterial color={color} />
                        </mesh>

                        <mesh raycast={noRaycast} position={[0.05, 0.025, 0.105]}>
                            <sphereGeometry args={[0.018, 10, 8]} />
                            <meshToonMaterial color={eyeColor} />
                        </mesh>
                        <mesh raycast={noRaycast} position={[-0.05, 0.025, 0.105]}>
                            <sphereGeometry args={[0.018, 10, 8]} />
                            <meshToonMaterial color={eyeColor} />
                        </mesh>

                        <mesh raycast={noRaycast} position={[0, -0.012, 0.117]}>
                            <sphereGeometry args={[0.013, 10, 8]} />
                            <meshToonMaterial color={NOSE} />
                        </mesh>
                    </group>

                    <group ref={tailRef} position={[0, 0.24, -0.2]}>
                        <mesh raycast={noRaycast} castShadow position={[0, 0, -0.02]}>
                            <sphereGeometry args={[0.034, 12, 10]} />
                            <meshToonMaterial color={color} />
                        </mesh>
                        <mesh raycast={noRaycast} castShadow position={[0, 0.065, -0.075]}>
                            <sphereGeometry args={[0.029, 12, 10]} />
                            <meshToonMaterial color={color} />
                        </mesh>
                        <mesh raycast={noRaycast} castShadow position={[0, 0.13, -0.1]}>
                            <sphereGeometry args={[0.024, 12, 10]} />
                            <meshToonMaterial color={color} />
                            <Outlines thickness={0.008} color={DARK} />
                        </mesh>
                    </group>

                    {LEGS.map(([x, z], index) => (
                        <group
                            key={`${x}:${z}`}
                            ref={(element) => {
                                legsRef.current[index] = element;
                            }}
                            position={[x, 0.15, z]}
                        >
                            <mesh raycast={noRaycast} castShadow position={[0, -0.075, 0]}>
                                <cylinderGeometry args={[0.022, 0.026, 0.15, 10]} />
                                <meshToonMaterial color={bellyColor} />
                            </mesh>
                        </group>
                    ))}
                </group>

                <mesh
                    position={[0, 0.2, 0]}
                    onClick={handleColliderClick}
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                >
                    <sphereGeometry args={[0.26, 12, 10]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
            </group>

            {meowing && (
                <Html center position={[0, 0.62, 0]} style={{ pointerEvents: 'none' }}>
                    <div style={{ transform: 'translate(-50%, -50%)' }}>
                        <span style={{ ...MEOW_STYLE, background: bellyColor }}>¡Miau!</span>
                    </div>
                </Html>
            )}
        </group>
    );
}
