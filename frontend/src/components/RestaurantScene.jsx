import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GradientTexture, Html, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Vector3 } from 'three';
import RoomShell from './RoomShell';
import Decor from './Decor';
import Table3D from './Table3D';
import { TARGET_LIMIT, ZOOM_BASE } from './roomLayout';
import styles from './RestaurantScene.module.css';

const CAMERA = {
    position: [14, 14, 14],
    zoom: ZOOM_BASE,
    near: 0.1,
    far: 200,
};

const ENABLE_BLOOM = (navigator.hardwareConcurrency ?? 8) >= 4;

const ISO_POSITION = new Vector3(...CAMERA.position);
const ISO_TARGET = new Vector3(0, 0, 0);
const MIN_POLAR_ANGLE = 0.2;
const MAX_POLAR_ANGLE = Math.PI / 2 - 0.05;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function CameraRig({ focus, resetRequest }) {
    const controls = useThree((state) => state.controls);
    const camera = useThree((state) => state.camera);
    const destination = useRef(null);
    const resetting = useRef(false);
    const lastReset = useRef(resetRequest.current);

    useEffect(() => {
        if (!controls) {
            return undefined;
        }

        const cancelAnimation = () => {
            destination.current = null;
            resetting.current = false;
        };

        controls.addEventListener('start', cancelAnimation);

        return () => controls.removeEventListener('start', cancelAnimation);
    }, [controls]);

    useEffect(() => {
        if (!focus || !controls) {
            destination.current = null;

            return;
        }

        resetting.current = false;
        destination.current = new Vector3(
            clamp(focus[0], -TARGET_LIMIT, TARGET_LIMIT),
            0.4,
            clamp(focus[1], -TARGET_LIMIT, TARGET_LIMIT),
        );
    }, [focus, controls]);

    useFrame((_, delta) => {
        if (!controls) {
            return;
        }

        const ease = Math.min(delta * 6, 1);

        if (resetRequest.current !== lastReset.current) {
            lastReset.current = resetRequest.current;
            destination.current = null;
            resetting.current = true;
        }

        if (resetting.current) {
            controls.target.lerp(ISO_TARGET, ease);
            camera.position.lerp(ISO_POSITION, ease);
            camera.zoom += (ZOOM_BASE - camera.zoom) * ease;
            camera.updateProjectionMatrix();
            controls.update();

            const settled =
                controls.target.distanceTo(ISO_TARGET) < 0.02 &&
                camera.position.distanceTo(ISO_POSITION) < 0.02 &&
                Math.abs(camera.zoom - ZOOM_BASE) < 0.05;

            if (settled) {
                controls.target.copy(ISO_TARGET);
                camera.position.copy(ISO_POSITION);
                camera.zoom = ZOOM_BASE;
                camera.updateProjectionMatrix();
                controls.update();
                resetting.current = false;
            }

            return;
        }

        if (destination.current) {
            const step = destination.current.clone().sub(controls.target).multiplyScalar(ease);
            controls.target.add(step);
            controls.object.position.add(step);
            controls.update();

            if (controls.target.distanceTo(destination.current) < 0.02) {
                destination.current = null;
            }

            return;
        }

        const nextX = clamp(controls.target.x, -TARGET_LIMIT, TARGET_LIMIT);
        const nextY = clamp(controls.target.y, -TARGET_LIMIT, TARGET_LIMIT);
        const nextZ = clamp(controls.target.z, -TARGET_LIMIT, TARGET_LIMIT);
        const dx = nextX - controls.target.x;
        const dy = nextY - controls.target.y;
        const dz = nextZ - controls.target.z;

        if (dx !== 0 || dy !== 0 || dz !== 0) {
            controls.target.set(nextX, nextY, nextZ);
            controls.object.position.x += dx;
            controls.object.position.y += dy;
            controls.object.position.z += dz;
            controls.update();
        }
    });

    return null;
}

export default function RestaurantScene({ tables = [], selectedId = null, onSelect }) {
    const resetRequest = useRef(0);
    const selectedTable =
        tables.find((table) => String(table.id) === String(selectedId)) ?? null;
    const focusX = selectedTable ? Number(selectedTable.pos_x) || 0 : null;
    const focusZ = selectedTable ? Number(selectedTable.pos_z) || 0 : null;
    const focus = useMemo(
        () => (focusX === null || focusZ === null ? null : [focusX, focusZ]),
        [focusX, focusZ],
    );

    return (
        <div className={styles.wrapper}>
            <Canvas orthographic shadows="soft" dpr={[1, 2]} camera={CAMERA}>
                <GradientTexture
                    attach="background"
                    stops={[0, 0.6, 1]}
                    colors={['#1a0c09', '#3a1d15', '#552a1b']}
                    size={512}
                />
                <fog attach="fog" args={['#3a1d15', 22, 62]} />

                <ambientLight intensity={0.35} color="#ffb37c" />
                <directionalLight
                    position={[10, 14, 6]}
                    intensity={1.05}
                    color="#ff9e5e"
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                    shadow-camera-left={-14}
                    shadow-camera-right={14}
                    shadow-camera-top={14}
                    shadow-camera-bottom={-14}
                    shadow-camera-far={45}
                    shadow-bias={-0.0004}
                />

                <pointLight
                    position={[-7, 2.2, -2]}
                    intensity={22}
                    distance={9}
                    decay={2}
                    color="#ff9a4d"
                />
                <pointLight
                    position={[4.5, 2.2, -5]}
                    intensity={22}
                    distance={9}
                    decay={2}
                    color="#ff9a4d"
                />
                <pointLight
                    position={[-1, 2.3, -5.2]}
                    intensity={16}
                    distance={8}
                    decay={2}
                    color="#ff8f52"
                />
                <pointLight
                    position={[5.6, 2.1, 4.8]}
                    intensity={14}
                    distance={8}
                    decay={2}
                    color="#ff8f52"
                />

                <RoomShell />

                <Suspense
                    fallback={
                        <Html center className={styles.loading}>
                            <span>Cargando salón…</span>
                        </Html>
                    }
                >
                    <Decor />

                    {tables.map((table) => (
                        <Table3D
                            key={table.id}
                            id={table.id}
                            number={table.number ?? table.name ?? table.id}
                            pos_x={table.pos_x}
                            pos_y={table.pos_y}
                            pos_z={table.pos_z}
                            seats={table.seats}
                            status={table.status}
                            selected={String(selectedId) === String(table.id)}
                            onSelect={onSelect}
                        />
                    ))}
                </Suspense>

                <CameraRig focus={focus} resetRequest={resetRequest} />

                <OrbitControls
                    makeDefault
                    enableDamping
                    enableRotate
                    enableZoom
                    enablePan
                    minPolarAngle={MIN_POLAR_ANGLE}
                    maxPolarAngle={MAX_POLAR_ANGLE}
                    minZoom={20}
                    maxZoom={140}
                    minDistance={4}
                    maxDistance={40}
                />

                {ENABLE_BLOOM && (
                    <EffectComposer multisampling={4}>
                        <Bloom
                            intensity={0.4}
                            luminanceThreshold={1}
                            luminanceSmoothing={0.25}
                            mipmapBlur
                            radius={0.7}
                        />
                    </EffectComposer>
                )}
            </Canvas>

            <button
                type="button"
                className={styles.resetButton}
                onClick={() => {
                    resetRequest.current += 1;
                }}
            >
                Restablecer vista
            </button>
        </div>
    );
}
