import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import {
    AdditiveBlending,
    CircleGeometry,
    CylinderGeometry,
    DoubleSide,
    MeshBasicMaterial,
    MeshStandardMaterial,
    RingGeometry,
} from 'three';
import GlbModel from './GlbModel';
import ModelErrorBoundary from './ModelErrorBoundary';
import TableStatusIcon from './TableStatusIcon';
import { getTableTopY, MODEL_CONFIG, TABLE_TOP_Y } from './modelConfig';
import { getZoneBounds, isTerraceZone } from './roomLayout';
import { TABLE_STATUS, TABLE_STATUS_CONFIG } from '../constants/orderStatus';
import { getChairLayout } from '../utils/chairs';
import styles from './Table3D.module.css';

const HOVER_LIFT = 0.08;
const CLICK_MAX_DRAG_PX = 5;
const TOUCH_MAX_DRAG_PX = 8;
const TABLE_RADIUS = 0.75;
const RING_RADIUS = TABLE_RADIUS + 0.9;
const RING_THICKNESS = 0.18;
const RING_THICKNESS_SELECTED = 0.3;
const OUTER_RING_INNER = RING_RADIUS + 0.03;
const OUTER_RING_OUTER = RING_RADIUS + 0.07;
const HALO_RADIUS = RING_RADIUS + 0.3;
const TOUCH_COLLIDER_RADIUS = TABLE_RADIUS * 1.25;
const CLOTH_RADIUS = TABLE_RADIUS * 0.93;
const CLOTH_HEIGHT = 0.025;
const BEAM_RADIUS = 0.35;
const BEAM_HEIGHT = 1.8;
const CHOCOLATE = '#2b1d12';
const CLOTH_NEUTRAL = '#fff6e5';
const LABEL_Y = 1.62;

const noRaycast = () => null;

const RING_GEOMETRY = new RingGeometry(
    RING_RADIUS - RING_THICKNESS,
    RING_RADIUS,
    64,
);
const SELECTED_RING_GEOMETRY = new RingGeometry(
    RING_RADIUS - RING_THICKNESS_SELECTED,
    RING_RADIUS,
    64,
);
const OUTER_RING_GEOMETRY = new RingGeometry(OUTER_RING_INNER, OUTER_RING_OUTER, 64);
const HALO_GEOMETRY = new CircleGeometry(HALO_RADIUS, 64);
const CLOTH_GEOMETRY = new CylinderGeometry(
    CLOTH_RADIUS,
    CLOTH_RADIUS,
    CLOTH_HEIGHT,
    40,
);
const BEAM_GEOMETRY = new CylinderGeometry(BEAM_RADIUS, BEAM_RADIUS, BEAM_HEIGHT, 24, 1, true);

const formatReservationTime = (value) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

function ProceduralTable() {
    const topY = TABLE_TOP_Y.procedural;

    return (
        <group>
            <mesh position={[0, topY - 0.04, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.75, 0.75, 0.08, 32]} />
                <meshStandardMaterial color="#c08a52" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.37, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.12, 0.74, 16]} />
                <meshStandardMaterial color="#8a5a3a" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.03, 0]} receiveShadow>
                <cylinderGeometry args={[0.45, 0.5, 0.06, 24]} />
                <meshStandardMaterial color="#8a5a3a" roughness={0.8} />
            </mesh>
        </group>
    );
}

function ProceduralChair() {
    return (
        <group>
            <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.42, 0.06, 0.42]} />
                <meshStandardMaterial color="#c9a06a" roughness={0.75} />
            </mesh>
            {[
                [-0.17, -0.17],
                [0.17, -0.17],
                [-0.17, 0.17],
                [0.17, 0.17],
            ].map(([x, z]) => (
                <mesh key={`${x}:${z}`} position={[x, 0.23, z]} castShadow>
                    <boxGeometry args={[0.05, 0.46, 0.05]} />
                    <meshStandardMaterial color="#8a5a3a" roughness={0.8} />
                </mesh>
            ))}
            <mesh position={[0, 0.72, 0.18]} castShadow>
                <boxGeometry args={[0.42, 0.44, 0.06]} />
                <meshStandardMaterial color="#a9793f" roughness={0.75} />
            </mesh>
        </group>
    );
}

function TableModel() {
    const model = MODEL_CONFIG.table;

    if (!model?.path) {
        return <ProceduralTable />;
    }

    return (
        <ModelErrorBoundary fallback={<ProceduralTable />}>
            <Suspense fallback={<ProceduralTable />}>
                <GlbModel model={model} />
            </Suspense>
        </ModelErrorBoundary>
    );
}

function Chair({ position, rotationY }) {
    const model = MODEL_CONFIG.chair ?? MODEL_CONFIG.chairCushion;

    if (!model?.path) {
        return (
            <group position={position} rotation-y={rotationY}>
                <ProceduralChair />
            </group>
        );
    }

    return (
        <group position={position} rotation-y={rotationY}>
            <ModelErrorBoundary fallback={<ProceduralChair />}>
                <Suspense fallback={<ProceduralChair />}>
                    <GlbModel model={model} />
                </Suspense>
            </ModelErrorBoundary>
        </group>
    );
}

export default function Table3D({
    id,
    number,
    pos_x = 0,
    pos_y = 0,
    pos_z = 0,
    zone = 'salon',
    seats = 4,
    status = TABLE_STATUS.Libre,
    reservation = null,
    next_reservation: nextReservation = null,
    selected = false,
    animationsEnabled = true,
    showEffects = true,
    labelsVisible = true,
    onSelect,
}) {
    const [hovered, setHovered] = useState(false);
    const contentRef = useRef(null);
    const lift = useRef(0);
    const touchStart = useRef(null);

    const tableX = Number(pos_x) || 0;
    const tableZ = Number(pos_z) || 0;
    const baseY = Number(pos_y) || 0;
    const terrace = isTerraceZone(zone);
    const displayName = terrace ? `Mesa ${number} · Terraza` : `Mesa ${number}`;
    const tableTopY = getTableTopY(MODEL_CONFIG.table);
    const statusKey = String(status ?? '').toLowerCase();
    const statusConfig =
        TABLE_STATUS_CONFIG[statusKey] ?? TABLE_STATUS_CONFIG[TABLE_STATUS.Libre];
    const statusColor = statusConfig.color;
    const isReserved = statusKey === TABLE_STATUS.Reservada;
    const isFree = statusKey === TABLE_STATUS.Libre;
    const pulsing = animationsEnabled && statusConfig.pulseSpeed > 0;
    const beamVisible =
        showEffects &&
        (statusKey === TABLE_STATUS.Pendiente ||
            statusKey === TABLE_STATUS.Listo ||
            isReserved);
    const beamBaseOpacity = isReserved ? 0.2 : 0.3;
    const beamPulse = isReserved ? 0.04 : 0.15;
    const clothColor = isFree ? CLOTH_NEUTRAL : statusColor;
    const clothEmissive = isFree ? CLOTH_NEUTRAL : statusColor;
    const clothGlow = isFree ? 0.12 : statusConfig.glow * 0.45;
    const activeReservation = isReserved && !terrace ? reservation : null;
    const upcomingReservation = isFree && !terrace ? nextReservation : null;
    const chairs = getChairLayout(seats, getZoneBounds(zone), { x: tableX, z: tableZ });
    const ringGeometry = selected ? SELECTED_RING_GEOMETRY : RING_GEOMETRY;
    const reservationColor = TABLE_STATUS_CONFIG[TABLE_STATUS.Reservada].color;

    const ringMaterial = useMemo(
        () =>
            new MeshStandardMaterial({
                color: statusColor,
                emissive: statusColor,
                emissiveIntensity: statusConfig.glow,
                roughness: 0.42,
                metalness: 0.05,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
                toneMapped: false,
            }),
        [statusColor, statusConfig.glow],
    );

    const clothMaterial = useMemo(
        () =>
            new MeshStandardMaterial({
                color: clothColor,
                emissive: clothEmissive,
                emissiveIntensity: clothGlow,
                roughness: 0.55,
                metalness: 0.02,
                toneMapped: false,
            }),
        [clothColor, clothEmissive, clothGlow],
    );

    const haloMaterial = useMemo(() => {
        if (!showEffects) return null;

        return new MeshBasicMaterial({
            color: statusColor,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
            blending: AdditiveBlending,
            toneMapped: false,
        });
    }, [showEffects, statusColor]);

    const beamMaterial = useMemo(() => {
        if (!beamVisible) return null;

        return new MeshBasicMaterial({
            color: statusColor,
            transparent: true,
            opacity: beamBaseOpacity,
            depthWrite: false,
            blending: AdditiveBlending,
            side: DoubleSide,
            toneMapped: false,
        });
    }, [beamVisible, statusColor, beamBaseOpacity]);

    useEffect(
        () => () => {
            ringMaterial.dispose();
            clothMaterial.dispose();
            haloMaterial?.dispose();
            beamMaterial?.dispose();
        },
        [ringMaterial, clothMaterial, haloMaterial, beamMaterial],
    );

    useFrame((state, delta) => {
        const content = contentRef.current;

        if (content) {
            const target = hovered || selected ? HOVER_LIFT : 0;
            const bounce =
                selected && animationsEnabled
                    ? Math.abs(Math.sin(state.clock.elapsedTime * 3.4)) * 0.035
                    : 0;

            lift.current += (target - lift.current) * Math.min(delta * 12, 1);
            content.position.y = baseY + lift.current + bounce;
        }

        const wave = pulsing ? Math.sin(state.clock.elapsedTime * statusConfig.pulseSpeed) : 0;
        const emphasized = selected || hovered;
        const ringBoost = selected ? 0.3 : hovered ? 0.12 : 0;
        const ringWave = pulsing ? wave * (emphasized ? 0.18 : 0.12) : 0;

        ringMaterial.emissiveIntensity = Math.min(
            statusConfig.glow + ringBoost + ringWave,
            2.2,
        );
        ringMaterial.opacity = Math.min(
            (emphasized ? 0.98 : 0.88) + (pulsing ? wave * 0.04 : 0),
            1,
        );

        clothMaterial.emissiveIntensity =
            clothGlow + (emphasized ? 0.35 : 0) + (pulsing ? wave * 0.08 : 0);

        if (beamMaterial) {
            beamMaterial.opacity = beamBaseOpacity + (pulsing ? wave * beamPulse : 0);
        }
    });

    const handlePointerOver = (event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = () => {
        setHovered(false);
        document.body.style.cursor = 'auto';
    };

    const handlePointerDown = (event) => {
        if (event.nativeEvent?.pointerType === 'mouse') {
            return;
        }

        touchStart.current = {
            x: event.nativeEvent.clientX,
            y: event.nativeEvent.clientY,
        };
    };

    const handleClick = (event) => {
        event.stopPropagation();

        const pointerType = event.nativeEvent?.pointerType ?? 'mouse';
        const isTouch = pointerType !== 'mouse';
        const threshold = isTouch ? TOUCH_MAX_DRAG_PX : CLICK_MAX_DRAG_PX;
        const start = touchStart.current;
        const moved = start
            ? Math.hypot(event.nativeEvent.clientX - start.x, event.nativeEvent.clientY - start.y)
            : (event.delta ?? 0);

        touchStart.current = null;

        if (moved >= threshold) {
            return;
        }

        if (isTouch && typeof navigator.vibrate === 'function') {
            navigator.vibrate(10);
        }

        onSelect?.(id);
    };

    return (
        <group
            position={[tableX, 0, tableZ]}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            <group ref={contentRef} position={[0, baseY, 0]}>
                <TableModel />

                {chairs.map((chair) => (
                    <Chair key={chair.key} position={chair.position} rotationY={chair.rotationY} />
                ))}

                <mesh geometry={CLOTH_GEOMETRY} material={clothMaterial} position={[0, tableTopY + 0.014, 0]} />

                <mesh position={[0, tableTopY, 0]} raycast={noRaycast}>
                    <cylinderGeometry args={[0.85, 0.85, 0.06, 24]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    {hovered && <Outlines thickness={0.06} color={CHOCOLATE} />}
                </mesh>

                {beamVisible && beamMaterial && (
                    <mesh
                        geometry={BEAM_GEOMETRY}
                        material={beamMaterial}
                        position={[0, tableTopY + BEAM_HEIGHT / 2, 0]}
                        raycast={noRaycast}
                        renderOrder={4}
                    />
                )}
            </group>

            <mesh position={[0, tableTopY, 0]} castShadow={false} receiveShadow={false}>
                <cylinderGeometry
                    args={[TOUCH_COLLIDER_RADIUS, TOUCH_COLLIDER_RADIUS, 1.56, 24]}
                />
                <meshBasicMaterial
                    transparent
                    opacity={0}
                    depthWrite={false}
                    colorWrite={false}
                />
            </mesh>

            {labelsVisible && (
                <Html center position={[0, baseY + LABEL_Y, 0]} style={{ pointerEvents: 'none' }}>
                    <div
                        className={styles.labelAnchor}
                        style={{
                            '--status-color': statusColor,
                            '--status-text': statusConfig.textColor,
                            '--reservation-color': reservationColor,
                        }}
                    >
                        <div
                            className={styles.statusBubble}
                            role="img"
                            aria-label={`${displayName}, ${statusConfig.label}`}
                        >
                            <span className={styles.number}>{number}</span>
                            <TableStatusIcon
                                status={statusKey}
                                className={styles.statusIcon}
                                size={16}
                            />
                            <span className={styles.statusText}>
                                {statusConfig.shortLabel}
                            </span>
                        </div>

                        {activeReservation && (
                            <span
                                className={styles.reservationChip}
                                title={`${activeReservation.customer_name} · ${formatReservationTime(
                                    activeReservation.reserved_for,
                                )}`}
                            >
                                {activeReservation.customer_name} ·{' '}
                                {formatReservationTime(activeReservation.reserved_for)}
                            </span>
                        )}

                        {upcomingReservation && (
                            <span className={styles.nextChip}>
                                <span className={styles.nextDot} aria-hidden="true" />
                                Reserva {formatReservationTime(upcomingReservation.reserved_for)}
                            </span>
                        )}
                    </div>
                </Html>
            )}

            {showEffects && haloMaterial && (
                <mesh
                    geometry={HALO_GEOMETRY}
                    material={haloMaterial}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.012, 0]}
                    renderOrder={1}
                />
            )}

            <mesh
                geometry={OUTER_RING_GEOMETRY}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.03, 0]}
                renderOrder={2}
            >
                <meshBasicMaterial color={CHOCOLATE} toneMapped={false} />
            </mesh>

            <mesh
                geometry={ringGeometry}
                material={ringMaterial}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.032, 0]}
                renderOrder={3}
            />
        </group>
    );
}
