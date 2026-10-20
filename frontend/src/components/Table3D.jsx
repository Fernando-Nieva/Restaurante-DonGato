import { Suspense, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import { ExtrudeGeometry, Shape } from 'three';
import GlbModel from './GlbModel';
import ModelErrorBoundary from './ModelErrorBoundary';
import { MODEL_CONFIG } from './modelConfig';
import { TABLE_STATUS_COLORS } from '../constants/orderStatus';
import { getChairLayout } from '../utils/chairs';

const HOVER_LIFT = 0.08;
const CLICK_MAX_DRAG_PX = 5;
const READY_ICON_Y = 1.95;
const READY_ICON_BOUNCE = 0.14;

const noRaycast = () => null;

const READY_GEOMETRY = (() => {
    const shape = new Shape();

    for (let index = 0; index < 10; index += 1) {
        const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
        const radius = index % 2 === 0 ? 0.22 : 0.095;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (index === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }

    shape.closePath();

    const geometry = new ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
    geometry.center();

    return geometry;
})();

function ProceduralTable() {
    return (
        <group>
            <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
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
    seats = 4,
    status = 'libre',
    selected = false,
    animationsEnabled = true,
    onSelect,
}) {
    const [hovered, setHovered] = useState(false);
    const contentRef = useRef(null);
    const ringRef = useRef(null);
    const readyRef = useRef(null);
    const lift = useRef(0);

    const baseY = Number(pos_y) || 0;
    const statusKey = String(status ?? '').toLowerCase();
    const ringColor = TABLE_STATUS_COLORS[statusKey] ?? TABLE_STATUS_COLORS.libre;
    const pulsing = statusKey === 'pendiente' || statusKey === 'listo';
    const chairs = getChairLayout(seats);

    useFrame((state, delta) => {
        const content = contentRef.current;

        if (content) {
            const target = hovered || selected ? HOVER_LIFT : 0;
            lift.current += (target - lift.current) * Math.min(delta * 12, 1);
            content.position.y = baseY + lift.current;
        }

        const ring = ringRef.current;

        if (ring) {
            const wave = pulsing ? Math.sin(state.clock.elapsedTime * 3.2) : 0;
            ring.scale.setScalar(1 + wave * 0.05);
            ring.material.opacity = 0.85 + wave * 0.15;
        }

        const ready = readyRef.current;

        if (ready) {
            ready.position.y =
                READY_ICON_Y + Math.abs(Math.sin(state.clock.elapsedTime * 3.2)) * READY_ICON_BOUNCE;
            ready.rotation.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.35;
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

    const handleClick = (event) => {
        event.stopPropagation();

        if (event.delta >= CLICK_MAX_DRAG_PX) {
            return;
        }

        onSelect?.(id);
    };

    return (
        <group
            position={[Number(pos_x) || 0, 0, Number(pos_z) || 0]}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            <group ref={contentRef} position={[0, baseY, 0]}>
                <TableModel />

                {chairs.map((chair) => (
                    <Chair key={chair.key} position={chair.position} rotationY={chair.rotationY} />
                ))}

                <mesh position={[0, 0.78, 0]}>
                    <cylinderGeometry args={[0.85, 0.85, 0.06, 24]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    {hovered && <Outlines thickness={0.06} color="#3d2814" />}
                </mesh>
            </group>

            <Html center position={[0, 1.5, 0]} style={{ pointerEvents: 'none' }}>
                <div style={{ transform: 'translate(-50%, -50%)' }}>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            height: '28px',
                            padding: '0 10px',
                            borderRadius: '9999px',
                            background: ringColor,
                            border: '2px solid rgba(61, 40, 20, 0.4)',
                            color: '#1f1305',
                            fontSize: '14px',
                            fontWeight: 700,
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {number}
                    </span>
                </div>
            </Html>

            <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={selected ? [0.95, 1.38, 48] : [1.06, 1.28, 48]} />
                <meshBasicMaterial
                    color={ringColor}
                    transparent
                    opacity={0.85}
                    toneMapped={false}
                />
            </mesh>

            {statusKey === 'listo' && animationsEnabled && (
                <mesh
                    ref={readyRef}
                    geometry={READY_GEOMETRY}
                    position={[0, READY_ICON_Y, 0]}
                    raycast={noRaycast}
                >
                    <meshStandardMaterial
                        color="#e8a53a"
                        emissive="#ffcf5c"
                        emissiveIntensity={1.6}
                        roughness={0.6}
                        toneMapped={false}
                    />
                </mesh>
            )}
        </group>
    );
}
