import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import {
    ENTRANCE_POINT,
    isTerraceZone,
    KITCHEN_PICKUP,
    KITCHEN_PICKUP_SLOTS,
    WAITER_MAX_WAIT_SECONDS,
} from './roomLayout';
import { steerAround } from '../utils/navigation';

const WALK_SPEED = 1.4;
const ARRIVE_DISTANCE = 0.1;
const DELIVER_TIME = 1;
const MAX_PENDING = 5;
const STUCK_TIMEOUT = 3;
const STUCK_PROGRESS = 0.05;
const WAIT_TABLE_DISTANCE = 1.2;
const TABLE_STEER_RADIUS = 1.5;
const CAT_STEER_RADIUS = 0.8;
const WAITER_STEER_RADIUS = 0.8;
const WAITER_BLOCK_DISTANCE = 0.8;
const CUSTOMER_STEER_RADIUS = 0.6;
const PAUSE_TIME = 1;
const PAUSE_COOLDOWN = 1.5;
const LEG_RATE = 15.75;
const TAU = Math.PI * 2;
const EMPTY_IDS = [];

const DARK = '#3d2814';
const SKIN = '#e8b48a';
const SHIRT = '#f3ede2';
const APRON = '#40342a';
const PANTS = '#2f2a26';
const TRAY = '#8a6a45';
const PLATE = '#f2f0ea';
const BOW = '#22201d';
const MARKER_Y = 2.45;
const LABEL_Y = 2;

const LABEL_STYLE = {
    display: 'inline-block',
    minWidth: '20px',
    padding: '2px 6px',
    borderRadius: '9999px',
    border: '1px solid rgba(255, 210, 122, 0.9)',
    background: 'rgba(32, 20, 12, 0.85)',
    color: '#ffe9c7',
    fontSize: '11px',
    fontWeight: 700,
    lineHeight: '14px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    opacity: 0,
    transition: 'opacity 0.15s ease',
};

const noRaycast = () => null;

const startReturn = (machine, slot, entry) => {
    const m = machine;
    const fromTerrace = m.trip?.terrace === true || m.pos.z > ENTRANCE_POINT.z;

    m.state = 'volver';
    m.trip = null;
    m.target = { x: slot.x, z: slot.z };
    m.waypoints = fromTerrace ? [{ ...ENTRANCE_POINT }] : [];
    m.bestRemaining = Infinity;
    m.stuckTime = 0;
    m.waitTime = 0;
    m.deliverTimer = 0;
    m.traveled = 0;
    m.pauseTimer = 0;
    m.pauseCooldown = 0;

    if (entry) {
        entry.returnRequested = false;
        entry.noReadyTime = 0;
    }
};

export default function Waiter({
    id = 'mozo',
    color = null,
    slot = KITCHEN_PICKUP_SLOTS[0],
    readEntry = null,
    tables = [],
    cats = null,
    waiters = null,
    customers = null,
    animationsEnabled = true,
}) {
    const groupRef = useRef(null);
    const poseRef = useRef(null);
    const leftLegRef = useRef(null);
    const rightLegRef = useRef(null);
    const trayRef = useRef(null);
    const markerRef = useRef(null);
    const markerArrowRef = useRef(null);
    const labelRef = useRef(null);
    const machine = useRef({
        state: 'idle',
        pos: { x: slot.x, z: slot.z },
        target: null,
        waypoints: [],
        heading: Math.atan2(-slot.x, -slot.z),
        deliverTimer: 0,
        waitTime: 0,
        tray: 0,
        legPhase: 0,
        bestRemaining: Infinity,
        stuckTime: 0,
        traveled: 0,
        pauseTimer: 0,
        pauseCooldown: 0,
        pending: [],
        trip: null,
    });

    const tableCenters = useMemo(
        () =>
            tables.map((table) => ({
                x: Number(table.pos_x) || 0,
                z: Number(table.pos_z) || 0,
            })),
        [tables],
    );

    const tableById = useMemo(
        () => new Map(tables.map((table) => [String(table.id), table])),
        [tables],
    );

    const shirtColor = color?.shirt ?? SHIRT;
    const bowColor = color?.bow ?? BOW;

    useFrame((state, rawDelta) => {
        const entry = readEntry?.();
        const m = machine.current;

        if (!entry) {
            return;
        }

        if (!animationsEnabled) {
            return;
        }

        const group = groupRef.current;

        if (!group) {
            return;
        }

        const delta = Math.min(rawDelta, 0.05);
        const time = state.clock.elapsedTime;
        const readyEvents = entry.readyEvents.splice(0, entry.readyEvents.length);
        const doneEvents = entry.doneEvents.splice(0, entry.doneEvents.length);

        readyEvents.forEach((event) => {
            if (
                m.trip &&
                (m.state === 'ir_a_mesa' || m.state === 'esperando_en_mesa') &&
                String(event.tableId) === m.trip.tableId
            ) {
                const orderId = String(event.orderId);

                if (!m.trip.orderIds.includes(orderId)) {
                    m.trip.orderIds.push(orderId);
                }
            } else {
                m.pending.push(event);
            }
        });

        if (m.pending.length > MAX_PENDING) {
            m.pending.splice(0, m.pending.length - MAX_PENDING);
        }

        doneEvents.forEach((event) => {
            const orderId = String(event.orderId);

            m.pending = m.pending.filter(
                (pendingEvent) => String(pendingEvent.orderId) !== orderId,
            );

            if (!m.trip || !m.trip.orderIds.includes(orderId)) {
                return;
            }

            if (m.state === 'ir_a_mesa') {
                if (event.status === 'cancelado') {
                    startReturn(m, slot, entry);
                } else {
                    m.trip.predelivered = true;
                }

                return;
            }

            if (m.state === 'esperando_en_mesa' || m.state === 'entregar') {
                m.trip.orderIds = m.trip.orderIds.filter((tripOrderId) => tripOrderId !== orderId);

                if (m.trip.orderIds.length === 0) {
                    startReturn(m, slot, entry);
                }
            }
        });

        if (m.state === 'idle' && m.pending.length > 0) {
            let tripEvent = null;
            let table = null;

            while (m.pending.length > 0 && !table) {
                tripEvent = m.pending.shift();
                table = tableById.get(String(tripEvent.tableId)) ?? null;
            }

            if (table) {
                const tableKey = String(table.id);
                const orderIds = [String(tripEvent.orderId)];

                m.pending = m.pending.filter((pendingEvent) => {
                    if (String(pendingEvent.tableId) !== tableKey) {
                        return true;
                    }

                    const orderId = String(pendingEvent.orderId);

                    if (!orderIds.includes(orderId)) {
                        orderIds.push(orderId);
                    }

                    return false;
                });

                const tableX = Number(table.pos_x) || 0;
                const tableZ = Number(table.pos_z) || 0;
                const terrace = isTerraceZone(table.zone);
                const approach = terrace ? ENTRANCE_POINT : KITCHEN_PICKUP;
                const dirX = approach.x - tableX;
                const dirZ = approach.z - tableZ;
                const length = Math.hypot(dirX, dirZ) || 1;

                m.trip = {
                    tableId: tableKey,
                    orderIds,
                    predelivered: false,
                    terrace,
                };
                m.waypoints = terrace ? [{ ...ENTRANCE_POINT }] : [];
                m.target = {
                    x: tableX + (dirX / length) * WAIT_TABLE_DISTANCE,
                    z: tableZ + (dirZ / length) * WAIT_TABLE_DISTANCE,
                };
                m.state = 'ir_a_mesa';
                m.bestRemaining = Infinity;
                m.stuckTime = 0;
                m.waitTime = 0;
                m.traveled = 0;
                m.pauseTimer = 0;
                m.pauseCooldown = 0;

                entry.returnRequested = false;
                entry.noReadyTime = 0;

                if (markerRef.current) {
                    markerRef.current.position.set(tableX, 0, tableZ);
                }
            }
        }

        let bounce = 0;

        if (
            (m.state === 'ir_a_mesa' || m.state === 'volver') &&
            (m.target || m.waypoints.length > 0)
        ) {
            const waypoint = m.waypoints.length > 0 ? m.waypoints[0] : m.target;

            if (waypoint) {
                const dx = waypoint.x - m.pos.x;
                const dz = waypoint.z - m.pos.z;
                const remaining = Math.hypot(dx, dz);

                if (remaining <= ARRIVE_DISTANCE) {
                    if (m.waypoints.length > 0) {
                        m.waypoints.shift();
                        m.bestRemaining = Infinity;
                        m.stuckTime = 0;
                    } else if (m.state === 'ir_a_mesa') {
                        if (m.trip?.predelivered) {
                            m.state = 'entregar';
                            m.deliverTimer = DELIVER_TIME;
                        } else {
                            m.state = 'esperando_en_mesa';
                            m.waitTime = 0;
                        }
                    } else {
                        m.state = 'idle';
                        m.trip = null;
                    }
                } else if (m.state === 'ir_a_mesa' && entry.returnRequested) {
                    startReturn(m, slot, entry);
                } else {
                    m.pauseCooldown = Math.max(0, m.pauseCooldown - delta);

                    const steerScale = 0.6 + 0.9 * Math.min(1, remaining / 2);
                    let direction = steerAround(
                        m.pos,
                        { x: dx / remaining, z: dz / remaining },
                        tableCenters,
                        Math.min(TABLE_STEER_RADIUS, steerScale),
                    );

                    const catObstacles = cats?.current ?? [];

                    if (catObstacles.length > 0) {
                        direction = steerAround(m.pos, direction, catObstacles, CAT_STEER_RADIUS);
                    }

                    const otherWaiters = (waiters?.current ?? []).filter(
                        (other) => other.id !== id,
                    );

                    if (otherWaiters.length > 0) {
                        direction = steerAround(
                            m.pos,
                            direction,
                            otherWaiters.map((other) => other.position),
                            WAITER_STEER_RADIUS,
                        );

                        if (
                            m.state === 'ir_a_mesa' &&
                            m.pauseTimer <= 0 &&
                            m.pauseCooldown <= 0
                        ) {
                            const ahead = otherWaiters.some((other) => {
                                const distance = Math.hypot(
                                    other.position.x - m.pos.x,
                                    other.position.z - m.pos.z,
                                );

                                return (
                                    distance < WAITER_BLOCK_DISTANCE &&
                                    (other.state === 'ir_a_mesa' ||
                                        other.state === 'volver') &&
                                    m.traveled < other.traveled
                                );
                            });

                            if (ahead) {
                                m.pauseTimer = PAUSE_TIME;
                                m.pauseCooldown = PAUSE_COOLDOWN;
                            }
                        }
                    }

                    const customerObstacles = customers?.current ?? [];

                    if (customerObstacles.length > 0) {
                        direction = steerAround(
                            m.pos,
                            direction,
                            customerObstacles,
                            CUSTOMER_STEER_RADIUS * Math.min(1, remaining / 1.5),
                        );
                    }

                    if (m.pauseTimer > 0) {
                        m.pauseTimer = Math.max(0, m.pauseTimer - delta);
                        m.stuckTime = 0;
                    } else {
                        const step = Math.min(WALK_SPEED * delta, remaining);

                        m.pos.x += direction.x * step;
                        m.pos.z += direction.z * step;
                        m.traveled += step;

                        const targetHeading = Math.atan2(direction.x, direction.z);
                        const diff =
                            ((targetHeading - m.heading + Math.PI) % TAU + TAU) % TAU - Math.PI;

                        m.heading += diff * Math.min(delta * 7, 1);
                        m.legPhase += delta * LEG_RATE;
                        bounce = Math.abs(Math.sin(m.legPhase)) * 0.025;

                        if (remaining < m.bestRemaining - STUCK_PROGRESS) {
                            m.bestRemaining = remaining;
                            m.stuckTime = 0;
                        } else {
                            m.stuckTime += delta;

                            if (m.stuckTime > STUCK_TIMEOUT) {
                                m.pos.x = waypoint.x;
                                m.pos.z = waypoint.z;
                            }
                        }
                    }
                }
            }
        }

        if (m.state === 'entregar') {
            m.deliverTimer -= delta;

            if (m.deliverTimer <= 0) {
                startReturn(m, slot, entry);
            }
        }

        if (m.state === 'esperando_en_mesa') {
            m.waitTime += delta;

            if (
                entry.returnRequested ||
                !m.trip ||
                m.trip.orderIds.length === 0 ||
                m.waitTime > WAITER_MAX_WAIT_SECONDS
            ) {
                startReturn(m, slot, entry);
            }
        }

        const walking = (m.state === 'ir_a_mesa' || m.state === 'volver') && m.pauseTimer <= 0;
        const trayTarget = m.state === 'entregar' || m.state === 'esperando_en_mesa' ? 1 : 0;

        m.tray += (trayTarget - m.tray) * Math.min(delta * 6, 1);

        if (poseRef.current) {
            const swaying = m.state === 'idle' || m.state === 'esperando_en_mesa';
            const sway = swaying ? Math.sin(time * 1.15) * 0.04 : 0;
            const lean = walking ? 0.06 : m.state === 'entregar' ? 0.12 : 0;

            poseRef.current.rotation.z +=
                (sway - poseRef.current.rotation.z) * Math.min(delta * 5, 1);
            poseRef.current.rotation.x +=
                (lean - poseRef.current.rotation.x) * Math.min(delta * 5, 1);
            poseRef.current.position.y +=
                (bounce - poseRef.current.position.y) * Math.min(delta * 12, 1);
        }

        if (leftLegRef.current) {
            const swing = walking ? Math.sin(m.legPhase) * 0.55 : 0;

            leftLegRef.current.rotation.x +=
                (swing - leftLegRef.current.rotation.x) * Math.min(delta * 12, 1);
        }

        if (rightLegRef.current) {
            const swing = walking ? Math.sin(m.legPhase + Math.PI) * 0.55 : 0;

            rightLegRef.current.rotation.x +=
                (swing - rightLegRef.current.rotation.x) * Math.min(delta * 12, 1);
        }

        if (trayRef.current) {
            trayRef.current.visible = m.state !== 'volver';
            trayRef.current.position.z = 0.3 + m.tray * 0.14;
            trayRef.current.position.y = 1.06 - m.tray * 0.04;
        }

        group.position.set(m.pos.x, 0, m.pos.z);
        group.rotation.y = m.heading;

        entry.position.x = m.pos.x;
        entry.position.z = m.pos.z;
        entry.state = m.state === 'entregar' ? 'esperando_en_mesa' : m.state;
        entry.tableId = m.trip?.tableId ?? null;
        entry.tripOrderIds = m.trip ? m.trip.orderIds : EMPTY_IDS;
        entry.traveled = m.traveled;

        const table = m.trip ? tableById.get(m.trip.tableId) : null;
        const labelVisible =
            Boolean(m.trip) &&
            (m.state === 'ir_a_mesa' ||
                m.state === 'entregar' ||
                m.state === 'esperando_en_mesa');

        if (labelRef.current) {
            labelRef.current.style.opacity = labelVisible ? '1' : '0';

            if (labelVisible) {
                labelRef.current.textContent = String(
                    table?.number ?? table?.name ?? table?.id ?? '',
                );
            }
        }

        if (markerRef.current) {
            markerRef.current.visible =
                m.state === 'ir_a_mesa' ||
                m.state === 'entregar' ||
                m.state === 'esperando_en_mesa';

            if (markerArrowRef.current) {
                markerArrowRef.current.position.y = MARKER_Y + Math.sin(time * 3.4) * 0.09;
                markerArrowRef.current.rotation.y = time * 1.6;
            }
        }
    });

    if (!animationsEnabled) {
        return null;
    }

    return (
        <>
            <group
                ref={groupRef}
                name={id}
                position={[slot.x, 0, slot.z]}
                rotation={[0, Math.atan2(-slot.x, -slot.z), 0]}
            >
                <group ref={poseRef}>
                    <group ref={leftLegRef} position={[-0.09, 0.6, 0]}>
                        <mesh raycast={noRaycast} castShadow position={[0, -0.3, 0]}>
                            <capsuleGeometry args={[0.05, 0.5, 4, 12]} />
                            <meshToonMaterial color={PANTS} />
                        </mesh>
                    </group>
                    <group ref={rightLegRef} position={[0.09, 0.6, 0]}>
                        <mesh raycast={noRaycast} castShadow position={[0, -0.3, 0]}>
                            <capsuleGeometry args={[0.05, 0.5, 4, 12]} />
                            <meshToonMaterial color={PANTS} />
                        </mesh>
                    </group>

                    <mesh raycast={noRaycast} position={[0, 0.62, 0]}>
                        <boxGeometry args={[0.24, 0.12, 0.2]} />
                        <meshToonMaterial color={PANTS} />
                    </mesh>

                    <mesh raycast={noRaycast} castShadow position={[0, 0.95, 0]}>
                        <capsuleGeometry args={[0.14, 0.36, 6, 16]} />
                        <meshToonMaterial color={shirtColor} />
                        <Outlines thickness={0.012} color={DARK} />
                    </mesh>

                    <mesh raycast={noRaycast} position={[0, 0.8, 0.14]}>
                        <boxGeometry args={[0.27, 0.38, 0.06]} />
                        <meshToonMaterial color={APRON} />
                    </mesh>

                    <mesh raycast={noRaycast} position={[0, 1.21, 0.15]}>
                        <boxGeometry args={[0.13, 0.05, 0.06]} />
                        <meshToonMaterial color={bowColor} />
                    </mesh>

                    <mesh raycast={noRaycast} castShadow position={[0, 1.4, 0]}>
                        <sphereGeometry args={[0.12, 20, 16]} />
                        <meshToonMaterial color={SKIN} />
                        <Outlines thickness={0.01} color={DARK} />
                    </mesh>

                    <mesh
                        raycast={noRaycast}
                        position={[-0.17, 1.13, 0.06]}
                        rotation={[-1.15, 0, -0.12]}
                    >
                        <capsuleGeometry args={[0.045, 0.24, 4, 12]} />
                        <meshToonMaterial color={shirtColor} />
                    </mesh>
                    <mesh
                        raycast={noRaycast}
                        position={[0.17, 1.13, 0.06]}
                        rotation={[-1.15, 0, 0.12]}
                    >
                        <capsuleGeometry args={[0.045, 0.24, 4, 12]} />
                        <meshToonMaterial color={shirtColor} />
                    </mesh>

                    <group ref={trayRef} position={[0, 1.06, 0.3]}>
                        <mesh raycast={noRaycast} castShadow>
                            <cylinderGeometry args={[0.18, 0.18, 0.025, 24]} />
                            <meshToonMaterial color={TRAY} />
                        </mesh>
                        <mesh raycast={noRaycast} position={[0, 0.035, 0]}>
                            <cylinderGeometry args={[0.105, 0.085, 0.025, 20]} />
                            <meshToonMaterial color={PLATE} />
                        </mesh>
                    </group>
                </group>

                <Html center position={[0, LABEL_Y, 0]} style={{ pointerEvents: 'none' }}>
                    <div style={{ transform: 'translate(-50%, -50%)' }}>
                        <span ref={labelRef} style={LABEL_STYLE} />
                    </div>
                </Html>
            </group>

            <group ref={markerRef} visible={false}>
                <mesh
                    ref={markerArrowRef}
                    raycast={noRaycast}
                    position={[0, MARKER_Y, 0]}
                    rotation={[Math.PI, 0, 0]}
                >
                    <coneGeometry args={[0.16, 0.3, 4]} />
                    <meshStandardMaterial
                        color="#ffd27a"
                        emissive="#ffb84d"
                        emissiveIntensity={1.4}
                        roughness={0.6}
                        toneMapped={false}
                    />
                </mesh>
            </group>
        </>
    );
}
