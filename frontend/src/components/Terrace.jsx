import { useEffect, useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three';
import { ENTRANCE_POINT, isTerraceZone } from './roomLayout';

const UMBRELLA_TABLES = new Set([9, 10, 11, 12]);
const UMBRELLA_COLORS = ['#c95a45', '#d98a36', '#3f7f73', '#b44f6b'];
const GARLAND_POINTS = 72;
const GARLAND_SPANS = 4;
const GARLAND_X = 8.25;
const GARLAND_Z = 13.75;
const GARLAND_TOP = 2.55;
const GARLAND_SAG = 0.58;
const BULB_STEP = 6;

const noRaycast = () => null;

function createSignTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;

    const context = canvas.getContext('2d');

    if (!context) return null;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#f6d28b';
    context.lineWidth = 7;
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    context.fillStyle = '#f6d28b';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '600 76px "Fredoka Variable", "Fredoka", "Trebuchet MS", sans-serif';
    context.fillText('Don Gato', canvas.width / 2, 68);
    context.font = '700 25px "Inter Variable", "Inter", "Trebuchet MS", sans-serif';
    context.fillText('TERRAZA', canvas.width / 2, 124);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;

    return texture;
}

function Umbrella({ table, color, index }) {
    const x = Number(table.pos_x) || 0;
    const z = Number(table.pos_z) || 0;
    const rotation = (index % 4) * 0.42;

    return (
        <group position={[x, 0, z]} rotation-y={rotation}>
            <mesh raycast={noRaycast} position={[0, 0.045, 0]}>
                <cylinderGeometry args={[0.46, 0.5, 0.09, 20]} />
                <meshStandardMaterial color="#6e4a31" roughness={0.9} />
            </mesh>
            <mesh raycast={noRaycast} castShadow={false} position={[0, 1.3, 0]}>
                <cylinderGeometry args={[0.045, 0.055, 2.55, 12]} />
                <meshStandardMaterial color="#8a5a3a" roughness={0.85} />
            </mesh>
            <mesh raycast={noRaycast} castShadow={false} position={[0, 2.48, 0]}>
                <coneGeometry args={[1.78, 0.56, 14]} />
                <meshToonMaterial color={color} />
                <Outlines thickness={0.018} color="#4a2e1b" />
            </mesh>
            <mesh raycast={noRaycast} position={[0, 2.79, 0]}>
                <sphereGeometry args={[0.075, 12, 10]} />
                <meshStandardMaterial
                    color="#f6d28b"
                    emissive="#e8a64b"
                    emissiveIntensity={0.3}
                    roughness={0.5}
                />
            </mesh>
            <mesh raycast={noRaycast} position={[0, 2.2, 0]}>
                <torusGeometry args={[1.7, 0.025, 6, 28]} />
                <meshStandardMaterial color="#f6d28b" roughness={0.6} />
            </mesh>
        </group>
    );
}

function Garland() {
    const { positions, bulbs } = useMemo(() => {
        const points = Array.from({ length: GARLAND_POINTS + 1 }, (_, index) => {
            const t = index / GARLAND_POINTS;
            const x = -GARLAND_X + t * GARLAND_X * 2;
            const span = t * GARLAND_SPANS;
            const sag = Math.sin((span % 1) * Math.PI) * GARLAND_SAG;
            const z = GARLAND_Z;

            return { x, y: GARLAND_TOP - sag, z };
        });
        const coordinates = new Float32Array(points.length * 3);

        points.forEach((point, index) => {
            coordinates[index * 3] = point.x;
            coordinates[index * 3 + 1] = point.y;
            coordinates[index * 3 + 2] = point.z;
        });

        return {
            positions: coordinates,
            bulbs: points.filter((_, index) => index % BULB_STEP === 0),
        };
    }, []);

    return (
        <group>
            <line raycast={noRaycast}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[positions, 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#6b4a30" transparent opacity={0.9} />
            </line>

            {bulbs.map((bulb, index) => (
                <group key={`${bulb.x}-${index}`} position={[bulb.x, bulb.y, bulb.z]}>
                    <mesh raycast={noRaycast}>
                        <sphereGeometry args={[0.055, 8, 6]} />
                        <meshBasicMaterial color="#ffe2a1" toneMapped={false} />
                    </mesh>
                    <mesh raycast={noRaycast} scale={2.4}>
                        <sphereGeometry args={[0.055, 8, 6]} />
                        <meshBasicMaterial
                            color="#ffbd66"
                            transparent
                            opacity={0.14}
                            depthWrite={false}
                            blending={AdditiveBlending}
                            toneMapped={false}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

function EntranceSign() {
    const signTexture = useMemo(createSignTexture, []);

    useEffect(() => () => signTexture?.dispose(), [signTexture]);

    return (
        <group>
            <mesh raycast={noRaycast} position={[-1.58, 1.5, ENTRANCE_POINT.z + 0.34]}>
                <boxGeometry args={[0.14, 3, 0.18]} />
                <meshStandardMaterial color="#6b4a30" roughness={0.85} />
            </mesh>
            <mesh raycast={noRaycast} position={[1.58, 1.5, ENTRANCE_POINT.z + 0.34]}>
                <boxGeometry args={[0.14, 3, 0.18]} />
                <meshStandardMaterial color="#6b4a30" roughness={0.85} />
            </mesh>
            <mesh raycast={noRaycast} position={[0, 2.95, ENTRANCE_POINT.z + 0.34]}>
                <boxGeometry args={[3.3, 0.14, 0.18]} />
                <meshStandardMaterial color="#6b4a30" roughness={0.85} />
            </mesh>
            <mesh raycast={noRaycast} position={[0, 2.6, ENTRANCE_POINT.z + 0.36]}>
                <boxGeometry args={[2.75, 0.78, 0.12]} />
                <meshStandardMaterial color="#3d2814" roughness={0.8} />
            </mesh>
            {signTexture && (
                <mesh raycast={noRaycast} position={[0, 2.6, ENTRANCE_POINT.z + 0.425]}>
                    <planeGeometry args={[2.6, 0.68]} />
                    <meshBasicMaterial map={signTexture} transparent toneMapped={false} />
                </mesh>
            )}
        </group>
    );
}

export default function Terrace({ tables = [], decorEnabled = true }) {
    const umbrellas = useMemo(
        () =>
            decorEnabled
                ? tables
                      .filter(
                          (table) =>
                              isTerraceZone(table.zone) &&
                              UMBRELLA_TABLES.has(Number(table.number)),
                      )
                      .map((table, index) => ({
                          table,
                          color: UMBRELLA_COLORS[index % UMBRELLA_COLORS.length],
                          index,
                      }))
                : [],
        [tables, decorEnabled],
    );

    return (
        <group>
            {umbrellas.map(({ table, color, index }) => (
                <Umbrella key={`umbrella-${table.id}`} table={table} color={color} index={index} />
            ))}

            {decorEnabled && <Garland />}
            <EntranceSign />
        </group>
    );
}
