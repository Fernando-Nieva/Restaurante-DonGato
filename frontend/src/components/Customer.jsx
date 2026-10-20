import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';

const ENTRY_DURATION = 0.4;
const EXIT_DURATION = 0.3;
const ENTRY_C1 = 1.70158;
const ENTRY_C3 = ENTRY_C1 + 1;
const MIN_SCALE = 0.001;
const DARK = '#3d2814';

const SHIRTS = [
    '#d95c4a',
    '#3f6fbf',
    '#4fae6a',
    '#c78f3b',
    '#8a5fc9',
    '#3fb0ac',
    '#d97aa8',
    '#7a6a55',
];
const PANTS = ['#3f4756', '#5a4a3a', '#44544a', '#54465a'];
const SKINS = ['#f2c9a0', '#e8b48a', '#d99f72', '#c68a5c', '#b3764a', '#a06438', '#8a5533', '#6f4428'];

const READY_STYLE = {
    fontSize: '18px',
    lineHeight: 1,
    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45))',
};

const noRaycast = () => null;

export default function Customer({
    position,
    facing = 0,
    phase = 0,
    seatIndex = 0,
    ready = false,
    entering = false,
    leaving = false,
    animationsEnabled = true,
}) {
    const groupRef = useRef(null);
    const torsoRef = useRef(null);
    const headRef = useRef(null);
    const armRef = useRef(null);
    const anim = useRef({
        enterTime: entering ? 0 : ENTRY_DURATION,
        entered: !entering,
        exitTime: 0,
    });
    const [settled, setSettled] = useState(!entering);

    const shirt = SHIRTS[seatIndex % SHIRTS.length];
    const pants = PANTS[seatIndex % PANTS.length];
    const skin = SKINS[seatIndex % SKINS.length];
    const movingArmSide = seatIndex % 2 === 0 ? 1 : -1;

    useFrame((state, rawDelta) => {
        const group = groupRef.current;

        if (!group) {
            return;
        }

        const delta = Math.min(rawDelta, 0.05);
        const time = state.clock.elapsedTime;
        const a = anim.current;

        if (!animationsEnabled) {
            group.scale.setScalar(leaving ? MIN_SCALE : 1);

            if (!a.entered) {
                a.entered = true;
                setSettled(true);
            }

            return;
        }

        if (leaving) {
            a.exitTime = Math.min(a.exitTime + delta, EXIT_DURATION);
            const t = a.exitTime / EXIT_DURATION;
            const eased = t * t * (3 - 2 * t);
            group.scale.setScalar(Math.max(1 - eased, MIN_SCALE));

            return;
        }

        if (!a.entered) {
            a.enterTime = Math.min(a.enterTime + delta, ENTRY_DURATION);
            const t = a.enterTime / ENTRY_DURATION;
            const over = t - 1;
            const eased = 1 + ENTRY_C3 * over ** 3 + ENTRY_C1 * over ** 2;
            group.scale.setScalar(Math.max(eased, MIN_SCALE));

            if (t >= 1) {
                a.entered = true;
                setSettled(true);
            }

            return;
        }

        const currentScale = group.scale.x;

        if (currentScale < 0.999) {
            group.scale.setScalar(currentScale + (1 - currentScale) * Math.min(delta * 12, 1));
        } else if (currentScale !== 1) {
            group.scale.setScalar(1);
        }

        if (torsoRef.current) {
            torsoRef.current.scale.y = 1 + Math.sin(time * 2 + phase) * 0.02;
        }

        if (headRef.current) {
            const envelope = Math.max(0, Math.sin(time * 0.22 + phase));
            headRef.current.rotation.y = Math.sin(time * 1.1 + phase * 1.7) * 0.38 * envelope;
        }

        if (armRef.current) {
            const lift = Math.max(0, Math.sin(time * 0.45 + phase));
            const eased = lift * lift * (3 - 2 * lift);
            armRef.current.rotation.x = -0.15 - eased * 1.3;
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            rotation-y={facing}
            scale={entering ? MIN_SCALE : 1}
        >
            <mesh raycast={noRaycast} castShadow position={[0, 0.5, 0.01]}>
                <boxGeometry args={[0.26, 0.16, 0.22]} />
                <meshToonMaterial color={pants} />
            </mesh>

            <mesh ref={torsoRef} raycast={noRaycast} castShadow position={[0, 0.82, 0.02]}>
                <capsuleGeometry args={[0.13, 0.3, 6, 16]} />
                <meshToonMaterial color={shirt} />
                <Outlines thickness={0.012} color={DARK} />
            </mesh>

            <group ref={headRef} position={[0, 1.1, 0.02]}>
                <mesh raycast={noRaycast} castShadow position={[0, 0.12, 0]}>
                    <sphereGeometry args={[0.115, 20, 16]} />
                    <meshToonMaterial color={skin} />
                    <Outlines thickness={0.01} color={DARK} />
                </mesh>
            </group>

            <mesh
                raycast={noRaycast}
                position={[-movingArmSide * 0.175, 0.88, 0.02]}
                rotation={[-0.18, 0, 0]}
            >
                <capsuleGeometry args={[0.045, 0.2, 4, 12]} />
                <meshToonMaterial color={shirt} />
            </mesh>

            <group ref={armRef} position={[movingArmSide * 0.175, 1.02, 0.02]} rotation={[-0.15, 0, 0]}>
                <mesh raycast={noRaycast} position={[0, -0.145, 0]}>
                    <capsuleGeometry args={[0.045, 0.2, 4, 12]} />
                    <meshToonMaterial color={shirt} />
                </mesh>
            </group>

            {[-1, 1].map((side) => (
                <group key={side}>
                    <mesh
                        raycast={noRaycast}
                        castShadow
                        position={[side * 0.105, 0.52, 0.13]}
                        rotation={[Math.PI / 2, 0, 0]}
                    >
                        <capsuleGeometry args={[0.055, 0.16, 4, 12]} />
                        <meshToonMaterial color={pants} />
                    </mesh>
                    <mesh
                        raycast={noRaycast}
                        castShadow
                        position={[side * 0.105, 0.29, 0.255]}
                    >
                        <capsuleGeometry args={[0.05, 0.36, 4, 12]} />
                        <meshToonMaterial color={pants} />
                    </mesh>
                </group>
            ))}

            {ready && settled && !leaving && (
                <Html center position={[0, 1.55, 0]} style={{ pointerEvents: 'none' }}>
                    <div style={{ transform: 'translate(-50%, -50%)' }}>
                        <span style={READY_STYLE}>🍽️</span>
                    </div>
                </Html>
            )}
        </group>
    );
}
