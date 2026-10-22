import {
    Component,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
    AdaptiveDpr,
    GradientTexture,
    Html,
    OrbitControls,
    PerformanceMonitor,
} from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { TOUCH, Vector3 } from 'three';
import RoomShell from './RoomShell';
import Decor from './Decor';
import Cats from './Cats';
import Customers from './Customers';
import WaiterManager from './WaiterManager';
import Table3D from './Table3D';
import { TARGET_LIMIT, ZOOM_BASE, getZoomProfile } from './roomLayout';
import { TABLE_STATUS_COLORS, TABLE_STATUS_LABELS } from '../constants/orderStatus';
import useBreakpoint from '../hooks/useBreakpoint';
import {
    QUALITY_OPTIONS,
    getInitialQuality,
    getLowerQuality,
    getQualityConfig,
    saveQuality,
} from '../utils/quality';
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
const ANIMATIONS_KEY = 'restaurante-animaciones';
const TABLE_LEGEND = Object.entries(TABLE_STATUS_LABELS).map(([status, label]) => ({
    status,
    label,
    color: TABLE_STATUS_COLORS[status],
}));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function supportsWebGL() {
    if (typeof document === 'undefined') {
        return false;
    }

    try {
        const canvas = document.createElement('canvas');
        const context =
            canvas.getContext('webgl2') ??
            canvas.getContext('webgl') ??
            canvas.getContext('experimental-webgl');

        if (!context) {
            return false;
        }

        context.getExtension('WEBGL_lose_context')?.loseContext();

        return true;
    } catch {
        return false;
    }
}

function readAnimationsPreference() {
    try {
        const stored = window.localStorage.getItem(ANIMATIONS_KEY);

        return stored === null ? null : stored !== 'false';
    } catch {
        return null;
    }
}

function useDocumentHidden() {
    const [hidden, setHidden] = useState(
        () => typeof document !== 'undefined' && document.hidden,
    );

    useEffect(() => {
        const handleVisibilityChange = () => setHidden(document.hidden);

        handleVisibilityChange();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return hidden;
}

class SceneErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error) {
        this.props.onError?.(error);
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

function WebGLContextGuard({ onLost }) {
    const gl = useThree((state) => state.gl);

    useEffect(() => {
        const canvas = gl.domElement;
        const handleContextLost = (event) => {
            event.preventDefault();
            onLost();
        };

        canvas.addEventListener('webglcontextlost', handleContextLost);

        return () => canvas.removeEventListener('webglcontextlost', handleContextLost);
    }, [gl, onLost]);

    return null;
}

function CameraRig({ focus, resetRequest, onLabelsVisibleChange }) {
    const controls = useThree((state) => state.controls);
    const camera = useThree((state) => state.camera);
    const size = useThree((state) => state.size);
    const profile = useMemo(
        () => getZoomProfile(size.width, size.height),
        [size.width, size.height],
    );
    const destination = useRef(null);
    const resetting = useRef(false);
    const lastReset = useRef(resetRequest.current);
    const labelsVisible = useRef(true);

    useEffect(() => {
        if (!controls) {
            return;
        }

        camera.zoom = profile.initial;
        camera.updateProjectionMatrix();
        controls.update();
    }, [camera, controls, profile.initial]);

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
        const nextLabelsVisible = camera.zoom >= profile.labelThreshold;

        if (nextLabelsVisible !== labelsVisible.current) {
            labelsVisible.current = nextLabelsVisible;
            onLabelsVisibleChange?.(nextLabelsVisible);
        }

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
            camera.zoom += (profile.initial - camera.zoom) * ease;
            camera.updateProjectionMatrix();
            controls.update();

            const settled =
                controls.target.distanceTo(ISO_TARGET) < 0.02 &&
                camera.position.distanceTo(ISO_POSITION) < 0.02 &&
                Math.abs(camera.zoom - profile.initial) < 0.05;

            if (settled) {
                controls.target.copy(ISO_TARGET);
                camera.position.copy(ISO_POSITION);
                camera.zoom = profile.initial;
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

    return (
        <OrbitControls
            makeDefault
            enableDamping
            enableRotate
            enableZoom
            enablePan
            touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
            minPolarAngle={MIN_POLAR_ANGLE}
            maxPolarAngle={MAX_POLAR_ANGLE}
            minZoom={profile.min}
            maxZoom={profile.max}
            minDistance={4}
            maxDistance={40}
        />
    );
}

function SceneFallback({ tables = [], selectedId = null, onSelect }) {
    return (
        <div className={styles.fallback} role="region" aria-label="Salón en modo lista">
            <div className={styles.fallbackIntro}>
                <span className={styles.fallbackKicker}>Vista simplificada</span>
                <h2 className={styles.fallbackTitle}>Vista 3D no disponible</h2>
                <p className={styles.fallbackText}>
                    Este dispositivo no pudo iniciar WebGL. Elegí una mesa para abrir el
                    mismo panel de pedidos.
                </p>
            </div>

            {tables.length === 0 ? (
                <p className={styles.fallbackEmpty}>No hay mesas disponibles.</p>
            ) : (
                <ul className={styles.fallbackList}>
                    {tables.map((table) => {
                        const number = table.number ?? table.name ?? table.id;
                        const seats = Number(table.seats) || 0;
                        const statusKey = String(table.status ?? 'libre').toLowerCase();
                        const statusLabel = TABLE_STATUS_LABELS[statusKey] ?? 'Libre';
                        const statusColor =
                            TABLE_STATUS_COLORS[statusKey] ?? TABLE_STATUS_COLORS.libre;
                        const selected = String(selectedId) === String(table.id);

                        return (
                            <li key={table.id}>
                                <button
                                    type="button"
                                    className={`${styles.fallbackTable} ${
                                        selected ? styles.fallbackTableSelected : ''
                                    }`}
                                    aria-pressed={selected}
                                    aria-label={`Mesa ${number}, ${seats} asientos, ${statusLabel}`}
                                    onClick={() => onSelect?.(table.id)}
                                >
                                    <span className={styles.fallbackNumber}>Mesa {number}</span>
                                    <span className={styles.fallbackSeats}>
                                        {seats} asiento{seats === 1 ? '' : 's'}
                                    </span>
                                    <span
                                        className={styles.fallbackStatus}
                                        style={{ '--status-color': statusColor }}
                                    >
                                        <span className={styles.fallbackDot} aria-hidden="true" />
                                        {statusLabel}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default function RestaurantScene({
    tables = [],
    orders = [],
    ordersLoaded = false,
    consumeReady,
    consumeDone,
    selectedId = null,
    onSelect,
    panelOpen = false,
}) {
    const resetRequest = useRef(0);
    const catRegistry = useRef([]);
    const waiterRegistry = useRef([]);
    const customerRegistry = useRef([]);
    const breakpoint = useBreakpoint();
    const isMobile = breakpoint === 'mobile';
    const [quality, setQuality] = useState(getInitialQuality);
    const qualityConfig = useMemo(() => getQualityConfig(quality), [quality]);
    const [webglSupported] = useState(supportsWebGL);
    const [sceneFailed, setSceneFailed] = useState(false);
    const [labelsVisible, setLabelsVisible] = useState(true);
    const animationsPreference = useRef(readAnimationsPreference());
    const [animationsEnabled, setAnimationsEnabled] = useState(
        () => animationsPreference.current ?? !(isMobile && quality === 'low'),
    );
    const animationsTouched = useRef(animationsPreference.current !== null);
    const [legendOpen, setLegendOpen] = useState(() => !isMobile);
    const documentHidden = useDocumentHidden();
    const selectedTable =
        tables.find((table) => String(table.id) === String(selectedId)) ?? null;
    const focusX = selectedTable ? Number(selectedTable.pos_x) || 0 : null;
    const focusZ = selectedTable ? Number(selectedTable.pos_z) || 0 : null;
    const focus = useMemo(
        () => (focusX === null || focusZ === null ? null : [focusX, focusZ]),
        [focusX, focusZ],
    );
    const sceneUnavailable = !webglSupported || sceneFailed;

    useEffect(() => {
        if (!animationsTouched.current) {
            return;
        }

        try {
            window.localStorage.setItem(ANIMATIONS_KEY, String(animationsEnabled));
        } catch {
            return;
        }
    }, [animationsEnabled]);

    useEffect(() => {
        if (!animationsTouched.current) {
            setAnimationsEnabled(!(isMobile && quality === 'low'));
        }
    }, [isMobile, quality]);

    useEffect(() => {
        if (isMobile) setLegendOpen(false);
    }, [isMobile]);

    const handleLabelsVisibleChange = useCallback((visible) => {
        setLabelsVisible(visible);
    }, []);

    const handleSceneFailure = useCallback(() => {
        setSceneFailed(true);
    }, []);

    const handleQualityChange = (event) => {
        const nextQuality = event.target.value;

        setQuality(nextQuality);
        saveQuality(nextQuality);
    };

    const handlePerformanceDecline = useCallback(() => {
        setQuality((current) => {
            const nextQuality = getLowerQuality(current);

            if (!nextQuality) {
                return current;
            }

            saveQuality(nextQuality);

            return nextQuality;
        });
    }, []);

    const handleAnimationsToggle = () => {
        animationsTouched.current = true;
        setAnimationsEnabled((current) => !current);
    };

    return (
        <div className={styles.wrapper}>
            {sceneUnavailable ? (
                <SceneFallback
                    tables={tables}
                    selectedId={selectedId}
                    onSelect={onSelect}
                />
            ) : (
                <>
                    <SceneErrorBoundary onError={handleSceneFailure}>
                        <Canvas
                            orthographic
                            shadows="soft"
                            dpr={qualityConfig.dpr}
                            frameloop={documentHidden ? 'never' : 'always'}
                            camera={CAMERA}
                        >
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
                                castShadow={qualityConfig.lightsCastShadow}
                                shadow-mapSize={[
                                    Math.max(1, qualityConfig.shadowMapSize),
                                    Math.max(1, qualityConfig.shadowMapSize),
                                ]}
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
                                <Decor
                                    animationsEnabled={animationsEnabled}
                                    steamEnabled={qualityConfig.steam}
                                    plantMotionEnabled={qualityConfig.plantMotion}
                                />
                                <Cats
                                    tables={tables}
                                    animationsEnabled={animationsEnabled}
                                    registry={catRegistry}
                                    waiters={waiterRegistry}
                                    maxCats={qualityConfig.maxCats}
                                />
                                <Customers
                                    tables={tables}
                                    orders={orders}
                                    ordersLoaded={ordersLoaded}
                                    animationsEnabled={animationsEnabled}
                                    registry={customerRegistry}
                                />
                                <WaiterManager
                                    key={`waiters-${qualityConfig.maxWaiters}`}
                                    tables={tables}
                                    orders={orders}
                                    consumeReady={consumeReady}
                                    consumeDone={consumeDone}
                                    animationsEnabled={animationsEnabled}
                                    cats={catRegistry}
                                    customers={customerRegistry}
                                    waiterCount={qualityConfig.maxWaiters}
                                />

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
                                        animationsEnabled={animationsEnabled}
                                        labelsVisible={labelsVisible}
                                        onSelect={onSelect}
                                    />
                                ))}
                            </Suspense>

                            <CameraRig
                                focus={focus}
                                resetRequest={resetRequest}
                                onLabelsVisibleChange={handleLabelsVisibleChange}
                            />

                            <PerformanceMonitor
                                bounds={() => [30, 50]}
                                onDecline={handlePerformanceDecline}
                            />
                            <AdaptiveDpr />
                            <WebGLContextGuard onLost={handleSceneFailure} />

                            {qualityConfig.bloom && ENABLE_BLOOM && (
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
                    </SceneErrorBoundary>

                    <aside
                        className={`${styles.legend} ${
                            panelOpen ? styles.overlayHidden : ''
                        }`}
                        aria-label="Estados de las mesas"
                    >
                        <details
                            className={styles.legendCard}
                            open={legendOpen}
                            onToggle={(event) => setLegendOpen(event.currentTarget.open)}
                        >
                            <summary className={styles.legendSummary}>
                                <span className={styles.legendTitle}>Estados de mesa</span>
                                <svg
                                    className={styles.chevron}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </summary>
                            <ul className={styles.legendList}>
                                {TABLE_LEGEND.map((item) => (
                                    <li key={item.status}>
                                        <span
                                            className={styles.legendDot}
                                            style={{ backgroundColor: item.color }}
                                            aria-hidden="true"
                                        />
                                        {item.label}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    </aside>

                    <div
                        className={`${styles.controls} ${
                            panelOpen ? styles.overlayHidden : ''
                        }`}
                        role="group"
                        aria-label="Controles de la vista"
                    >
                        <button
                            type="button"
                            className={styles.controlButton}
                            aria-label="Restablecer vista"
                            data-tooltip="Restablecer vista"
                            onClick={() => {
                                resetRequest.current += 1;
                            }}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M3 5v5h5" />
                                <path d="M3.5 10a8 8 0 1 1 2.1 6.4" />
                            </svg>
                        </button>

                        <label className={styles.qualityControl}>
                            <span className={styles.qualityLabel}>Calidad</span>
                            <select
                                className={styles.qualitySelect}
                                value={quality}
                                onChange={handleQualityChange}
                                aria-label="Calidad"
                            >
                                {QUALITY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            className={styles.controlButton}
                            role="switch"
                            aria-checked={animationsEnabled}
                            aria-label={
                                animationsEnabled
                                    ? 'Desactivar animaciones'
                                    : 'Activar animaciones'
                            }
                            data-tooltip={
                                animationsEnabled
                                    ? 'Desactivar animaciones'
                                    : 'Activar animaciones'
                            }
                            onClick={handleAnimationsToggle}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M12 4.5 13.6 9.4 18.5 11 13.6 12.6 12 17.5 10.4 12.6 5.5 11 10.4 9.4Z" />
                                {!animationsEnabled && <path d="M4 4 20 20" />}
                            </svg>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
