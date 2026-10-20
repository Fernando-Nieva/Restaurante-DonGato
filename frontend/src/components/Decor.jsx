import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture } from 'three';
import GlbModel from './GlbModel';
import ModelErrorBoundary from './ModelErrorBoundary';
import { MODEL_CONFIG } from './modelConfig';
import { ROOM_LAYOUT } from './roomLayout';

const { minX, maxX, minZ, maxZ, deckY } = ROOM_LAYOUT;

const LANTERN_SWAY = 0.035;
const LANTERN_SWAY_SPEED = 0.85;
const PLANT_SWAY = 0.026;
const STEAM_DURATION = 3;
const STEAM_PUFFS = [
    { delay: 0, x: -0.7, z: 0.05 },
    { delay: 0.75, x: -0.25, z: -0.06 },
    { delay: 1.5, x: 0.25, z: 0.06 },
    { delay: 2.25, x: 0.7, z: -0.05 },
];
const STEAM_BASE = [4.5, 1.05, minZ + 0.7];

const noRaycast = () => null;

let glowTexture = null;

function getGlowTexture() {
    if (!glowTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 196, 128, 0.9)');
        gradient.addColorStop(0.45, 'rgba(255, 154, 74, 0.32)');
        gradient.addColorStop(1, 'rgba(255, 154, 74, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        glowTexture = new CanvasTexture(canvas);
    }

    return glowTexture;
}

const BOTTLE_COLORS = ['#5f7a3d', '#8a5a2b', '#9c6b35', '#4f6e33'];
const BOTTLE_OFFSETS = [-1.7, -1.06, -0.42, 0.22, 0.86, 1.5];

const LANTERN_GLOW = {
    type: 'sprite',
    ref: 'glow',
    scale: [1.2, 1.2, 1],
    offset: [0, -0.32, 0],
    color: '#ffb066',
    opacity: 0.85,
};

const LANTERN_FALLBACK = [
    { type: 'cylinder', args: [0.015, 0.015, 0.56, 8], offset: [0, 0.28, 0], color: '#2f2a24' },
    {
        type: 'cylinder',
        args: [0.12, 0.3, 0.32, 12],
        offset: [0, -0.16, 0],
        color: '#3d3020',
        emissive: '#d97a2a',
        emissiveIntensity: 0.35,
    },
    {
        type: 'sphere',
        args: [0.09, 12, 12],
        offset: [0, -0.32, 0],
        color: '#ffb066',
        emissive: '#ff9a3c',
        emissiveIntensity: 2.2,
        ref: 'bulb',
    },
    LANTERN_GLOW,
];

const LANTERN_BULB = LANTERN_FALLBACK[2];

const LANTERN_POSITIONS = [
    [minX + 0.6, 2.5, -3.6],
    [minX + 0.6, 2.5, -2.0],
    [minX + 0.6, 2.5, -0.4],
    [-1.5, 2.5, minZ + 0.65],
    [0.6, 2.5, minZ + 0.65],
];

const LARGE_PLANT_FALLBACK = [
    { type: 'cylinder', args: [0.26, 0.32, 0.5, 12], offset: [0, 0.25, 0], color: '#8a5a3a' },
    { type: 'sphere', args: [0.55, 12, 12], offset: [0, 0.95, 0], color: '#4e7a3d', leaf: true },
    { type: 'sphere', args: [0.4, 12, 12], offset: [0.2, 1.32, 0.1], color: '#5c8a46', leaf: true },
    {
        type: 'sphere',
        args: [0.34, 12, 12],
        offset: [-0.22, 1.28, -0.08],
        color: '#446e36',
        leaf: true,
    },
];

const SMALL_PLANT_FALLBACK = [
    { type: 'cylinder', args: [0.18, 0.22, 0.34, 12], offset: [0, 0.17, 0], color: '#8a5a3a' },
    { type: 'sphere', args: [0.36, 12, 12], offset: [0, 0.62, 0], color: '#4e7a3d', leaf: true },
    { type: 'sphere', args: [0.26, 12, 12], offset: [0.14, 0.94, 0.08], color: '#5c8a46', leaf: true },
];

const PLANTS = [
    {
        id: 'planta-fondo-derecha',
        modelKey: 'plantLarge',
        position: [maxX - 0.5, 0, minZ + 0.7],
        fallback: LARGE_PLANT_FALLBACK,
        animation: { type: 'plant', phase: 0.8 },
    },
    {
        id: 'planta-frente-izquierda',
        modelKey: 'plantLarge',
        position: [minX + 0.9, 0, maxZ - 1.0],
        fallback: LARGE_PLANT_FALLBACK,
        animation: { type: 'plant', phase: 2.0 },
    },
    {
        id: 'planta-deck-derecha',
        modelKey: 'plantSmall',
        position: [maxX - 1.0, deckY, maxZ + 0.8],
        fallback: SMALL_PLANT_FALLBACK,
        animation: { type: 'plant', phase: 3.2 },
    },
    {
        id: 'planta-deck-frente-izquierda',
        modelKey: 'plantLarge',
        position: [minX - 0.9, deckY, maxZ + 0.9],
        fallback: LARGE_PLANT_FALLBACK,
        animation: { type: 'plant', phase: 4.4 },
    },
    {
        id: 'planta-deck-frente-derecha',
        modelKey: 'plantLarge',
        position: [maxX + 0.9, deckY, maxZ + 0.9],
        fallback: LARGE_PLANT_FALLBACK,
        animation: { type: 'plant', phase: 5.6 },
    },
];

const PIECES = [
    {
        id: 'barra-larga',
        modelKey: 'bar',
        position: [minX + 0.5, 0, -2],
        rotation: [0, Math.PI / 2, 0],
        fallback: [
            { type: 'box', args: [0.9, 1.1, 6.1], offset: [0, 0.55, 0], color: '#b98a5a' },
            { type: 'box', args: [1, 0.06, 6.2], offset: [0, 1.13, 0], color: '#e3c79c' },
        ],
    },
    {
        id: 'banco-barra',
        modelKey: 'bench',
        position: [minX + 1.55, 0, -2],
        rotation: [0, Math.PI / 2, 0],
        fallback: [
            { type: 'box', args: [0.5, 0.32, 5.6], offset: [-0.06, 0.16, 0], color: '#8f3a2f' },
            { type: 'box', args: [0.66, 0.16, 5.6], offset: [-0.02, 0.4, 0], color: '#b5453a' },
            { type: 'box', args: [0.12, 0.52, 5.6], offset: [0.27, 0.74, 0], color: '#b5453a' },
        ],
    },
    {
        id: 'estante-botellas',
        position: [minX + 0.15, 0, -2],
        fallback: [
            { type: 'box', args: [0.22, 0.05, 4.2], offset: [0, 2.58, 0], color: '#6b4a30' },
            { type: 'box', args: [0.06, 0.26, 0.08], offset: [0.05, 2.4, -1.7], color: '#5a3d28' },
            { type: 'box', args: [0.06, 0.26, 0.08], offset: [0.05, 2.4, 1.7], color: '#5a3d28' },
            ...BOTTLE_OFFSETS.map((dz, index) => ({
                type: 'cylinder',
                args: [0.045, 0.045, 0.26, 10],
                offset: [0, 2.735, dz],
                color: BOTTLE_COLORS[index % BOTTLE_COLORS.length],
            })),
        ],
    },
    {
        id: 'mostrador-pase',
        modelKey: 'counter',
        position: [4.5, 0, minZ + 0.7],
        rotation: [0, 0, 0],
        fallback: [
            { type: 'box', args: [4.6, 0.95, 0.85], offset: [0, 0.475, 0], color: '#7d838a' },
            { type: 'box', args: [4.8, 0.06, 0.95], offset: [0, 0.98, 0], color: '#cfd4d8' },
        ],
    },
    {
        id: 'campana-cocina',
        position: [4.5, 0, minZ + 0.65],
        fallback: [
            { type: 'box', args: [4.2, 0.5, 1.15], offset: [0, 2.55, 0], color: '#464b52' },
            { type: 'cylinder', args: [0.03, 0.03, 0.2, 8], offset: [-1.6, 2.9, 0], color: '#3a3f45' },
            { type: 'cylinder', args: [0.03, 0.03, 0.2, 8], offset: [1.6, 2.9, 0], color: '#3a3f45' },
        ],
    },
    {
        id: 'biblioteca',
        modelKey: 'bookcase',
        position: [minX + 0.4, 0, 3.2],
        rotation: [0, Math.PI / 2, 0],
        fallback: [
            { type: 'box', args: [0.7, 1.9, 1.3], offset: [0, 0.95, 0], color: '#6b4a30' },
            { type: 'box', args: [0.64, 1.7, 1.2], offset: [0.04, 0.98, 0], color: '#4f3823' },
        ],
    },
    {
        id: 'cuadro',
        modelKey: 'picture',
        position: [-2.5, 0.62, minZ + 0.07],
        rotation: [0, 0, 0],
        fallback: [
            { type: 'box', args: [0.85, 0.65, 0.06], offset: [0, 0, 0], color: '#5a4632' },
            { type: 'box', args: [0.72, 0.52, 0.02], offset: [0, 0, 0.026], color: '#c8d4c4' },
        ],
    },
    {
        id: 'alfombra',
        modelKey: 'rug',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        fallback: [
            { type: 'cylinder', args: [2.5, 2.5, 0.03, 48], offset: [0, 0.015, 0], color: '#e6d6b8' },
            { type: 'cylinder', args: [1.7, 1.7, 0.02, 48], offset: [0, 0.031, 0], color: '#d8c39d' },
        ],
    },
    ...LANTERN_POSITIONS.map((position, index) => ({
        id: `farol-${index + 1}`,
        modelKey: 'lamp',
        position,
        rotation: [0, 0, 0],
        fallback: LANTERN_FALLBACK,
        attachments: [LANTERN_BULB, LANTERN_GLOW],
        animation: { type: 'lantern', phase: index * 1.7 },
    })),
    ...PLANTS,
];

function DecorMesh({ spec, meshRef }) {
    if (spec.type === 'sprite') {
        return (
            <sprite
                ref={meshRef}
                raycast={noRaycast}
                position={spec.offset}
                scale={spec.scale ?? [1, 1, 1]}
            >
                <spriteMaterial
                    map={getGlowTexture()}
                    color={spec.color}
                    transparent
                    opacity={spec.opacity ?? 1}
                    depthWrite={false}
                    blending={AdditiveBlending}
                    fog={false}
                />
            </sprite>
        );
    }

    return (
        <mesh ref={meshRef} raycast={noRaycast} castShadow receiveShadow position={spec.offset}>
            {spec.type === 'sphere' ? (
                <sphereGeometry args={spec.args} />
            ) : spec.type === 'cylinder' ? (
                <cylinderGeometry args={spec.args} />
            ) : (
                <boxGeometry args={spec.args} />
            )}
            <meshStandardMaterial
                color={spec.color}
                emissive={spec.emissive ?? '#000000'}
                emissiveIntensity={spec.emissiveIntensity ?? 0}
                roughness={spec.roughness ?? 0.85}
            />
        </mesh>
    );
}

function FallbackGroup({ piece, refs }) {
    const specs = piece.fallback ?? [];
    const entries = specs.map((spec, index) => ({ spec, index }));
    const baseEntries = entries.filter(({ spec }) => !spec.leaf);
    const leafEntries = entries.filter(({ spec }) => spec.leaf);

    return (
        <group>
            {baseEntries.map(({ spec, index }) => (
                <DecorMesh key={index} spec={spec} meshRef={refs?.[spec.ref]} />
            ))}

            {leafEntries.length > 0 && (
                <group ref={refs?.leaves}>
                    {leafEntries.map(({ spec, index }) => (
                        <DecorMesh key={index} spec={spec} meshRef={refs?.[spec.ref]} />
                    ))}
                </group>
            )}
        </group>
    );
}

function Piece({ piece, groupRef, refs }) {
    const config = piece.modelKey ? MODEL_CONFIG[piece.modelKey] : null;

    if (!config?.path) {
        return piece.fallback ? (
            <group ref={groupRef} position={piece.position}>
                <FallbackGroup piece={piece} refs={refs} />
            </group>
        ) : null;
    }

    return (
        <group ref={groupRef} position={piece.position} rotation={piece.rotation ?? [0, 0, 0]}>
            <ModelErrorBoundary fallback={<FallbackGroup piece={piece} refs={refs} />}>
                <Suspense fallback={<FallbackGroup piece={piece} refs={refs} />}>
                    <GlbModel
                        model={piece.scale ? { ...config, scale: piece.scale } : config}
                        interactive={false}
                    />
                </Suspense>
            </ModelErrorBoundary>

            {piece.attachments?.map((spec, index) => (
                <DecorMesh key={index} spec={spec} meshRef={refs?.[spec.ref]} />
            ))}
        </group>
    );
}

function AnimatedPiece({ piece, animationsEnabled }) {
    const groupRef = useRef(null);
    const leavesRef = useRef(null);
    const bulbRef = useRef(null);
    const glowRef = useRef(null);
    const refs = useMemo(
        () => ({ leaves: leavesRef, bulb: bulbRef, glow: glowRef }),
        [],
    );
    const { type, phase } = piece.animation;

    useFrame((state) => {
        const time = state.clock.elapsedTime;

        if (type === 'lantern') {
            const angle = animationsEnabled
                ? Math.sin(time * LANTERN_SWAY_SPEED + phase) * LANTERN_SWAY
                : 0;

            if (groupRef.current) {
                groupRef.current.rotation.z = angle;
                groupRef.current.rotation.x =
                    Math.cos(time * LANTERN_SWAY_SPEED * 0.7 + phase) * angle * 0.6;
            }

            const flicker = animationsEnabled
                ? 0.86 + Math.sin(time * 2.4 + phase * 3.1) * 0.14
                : 1;

            if (bulbRef.current) {
                bulbRef.current.material.emissiveIntensity =
                    LANTERN_BULB.emissiveIntensity * flicker;
            }

            if (glowRef.current) {
                glowRef.current.material.opacity = LANTERN_GLOW.opacity * flicker;
            }

            return;
        }

        const leaves = leavesRef.current ?? groupRef.current;

        if (leaves) {
            leaves.rotation.z = animationsEnabled
                ? Math.sin(time * 0.7 + phase) * PLANT_SWAY
                : 0;
            leaves.rotation.x = animationsEnabled
                ? Math.sin(time * 0.55 + phase * 1.3) * PLANT_SWAY * 0.6
                : 0;
        }
    });

    return <Piece piece={piece} groupRef={groupRef} refs={refs} />;
}

function Steam({ animationsEnabled }) {
    const puffRefs = useRef([]);

    useFrame((state) => {
        const time = state.clock.elapsedTime;

        puffRefs.current.forEach((puff, index) => {
            if (!puff) {
                return;
            }

            const offset = STEAM_PUFFS[index];
            const progress = ((time + offset.delay) % STEAM_DURATION) / STEAM_DURATION;

            puff.position.set(offset.x, 0.06 + progress * 0.55, offset.z);
            puff.scale.setScalar(0.45 + progress * 0.95);
            puff.material.opacity = animationsEnabled ? 0.5 * (1 - progress) : 0;
        });
    });

    return (
        <group position={STEAM_BASE}>
            {STEAM_PUFFS.map((puff, index) => (
                <mesh
                    key={puff.delay}
                    ref={(element) => {
                        puffRefs.current[index] = element;
                    }}
                    raycast={noRaycast}
                >
                    <sphereGeometry args={[0.075, 12, 10]} />
                    <meshBasicMaterial
                        color="#f6f1e7"
                        transparent
                        opacity={0.5}
                        depthWrite={false}
                        fog={false}
                    />
                </mesh>
            ))}
        </group>
    );
}

export default function Decor({ animationsEnabled = true }) {
    return (
        <>
            {PIECES.map((piece) =>
                piece.animation ? (
                    <AnimatedPiece
                        key={piece.id}
                        piece={piece}
                        animationsEnabled={animationsEnabled}
                    />
                ) : (
                    <Piece key={piece.id} piece={piece} />
                ),
            )}

            <Steam animationsEnabled={animationsEnabled} />
        </>
    );
}
