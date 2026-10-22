import { useRef } from 'react';
import { TABLE_STATUS_COLORS } from '../../constants/orderStatus';
import { ROOM_LAYOUT } from '../roomLayout';
import styles from './TableFloorPlan.module.css';

export const MIN_TABLE_DISTANCE = 3;

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 480;
const PADDING = 28;
const ROOM_WIDTH = ROOM_LAYOUT.maxX - ROOM_LAYOUT.minX;
const ROOM_DEPTH = ROOM_LAYOUT.maxZ - ROOM_LAYOUT.minZ;
const SCALE_X = (VIEW_WIDTH - PADDING * 2) / ROOM_WIDTH;
const SCALE_Z = (VIEW_HEIGHT - PADDING * 2) / ROOM_DEPTH;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toSvgX = (x) => PADDING + (x - ROOM_LAYOUT.minX) * SCALE_X;
const toSvgZ = (z) => PADDING + (z - ROOM_LAYOUT.minZ) * SCALE_Z;

const tableRadius = (seats) => 13 + Math.min(Math.max(Number(seats) || 4, 1), 8) * 0.9;

const statusColor = (status) =>
    TABLE_STATUS_COLORS[String(status ?? '').toLowerCase()] ?? 'var(--color-muted)';

export function findTableCollisions(position, tables, ignoreId = null) {
    const x = Number(position?.x);
    const z = Number(position?.z);

    if (!Number.isFinite(x) || !Number.isFinite(z)) return [];

    return tables
        .filter((table) => ignoreId == null || String(table.id) !== String(ignoreId))
        .map((table) => ({
            table,
            distance: Math.hypot(Number(table.pos_x) - x, Number(table.pos_z) - z),
        }))
        .filter((collision) => collision.distance < MIN_TABLE_DISTANCE)
        .sort((a, b) => a.distance - b.distance);
}

export default function TableFloorPlan({
    tables = [],
    selectedTableId = null,
    draftPosition = null,
    draftLabel = 'Nueva',
    onPositionChange,
    onTableSelect,
    disabled = false,
}) {
    const svgRef = useRef(null);
    const draftX = Number(draftPosition?.x);
    const draftZ = Number(draftPosition?.z);
    const hasDraft = Number.isFinite(draftX) && Number.isFinite(draftZ);
    const collisions = hasDraft
        ? findTableCollisions({ x: draftX, z: draftZ }, tables, selectedTableId)
        : [];
    const collisionIds = new Set(collisions.map((collision) => String(collision.table.id)));
    const interactive = Boolean(onPositionChange) && !disabled;

    const markers = tables.map((table) => {
        const isEditing =
            selectedTableId != null && String(table.id) === String(selectedTableId);
        const x = isEditing && hasDraft ? draftX : Number(table.pos_x);
        const z = isEditing && hasDraft ? draftZ : Number(table.pos_z);

        return {
            ...table,
            markerKey: String(table.id),
            markerNumber: table.number,
            markerX: Number.isFinite(x) ? x : 0,
            markerZ: Number.isFinite(z) ? z : 0,
            isEditing,
        };
    });

    if (hasDraft && !markers.some((marker) => marker.isEditing)) {
        markers.push({
            id: 'draft',
            markerKey: 'draft',
            markerNumber: draftLabel,
            markerX: draftX,
            markerZ: draftZ,
            seats: 4,
            status: 'libre',
            isEditing: true,
        });
    }

    markers.sort((a, b) => Number(a.isEditing) - Number(b.isEditing));

    const xGrid = Array.from({ length: ROOM_WIDTH + 1 }, (_, index) => ROOM_LAYOUT.minX + index);
    const zGrid = Array.from({ length: ROOM_DEPTH + 1 }, (_, index) => ROOM_LAYOUT.minZ + index);

    const handlePlanClick = (event) => {
        if (!interactive) return;

        const svg = svgRef.current;
        const matrix = svg?.getScreenCTM();

        if (!svg || !matrix) return;

        const point = svg.createSVGPoint();

        point.x = event.clientX;
        point.y = event.clientY;

        const local = point.matrixTransform(matrix.inverse());
        const x = clamp(
            (local.x - PADDING) / SCALE_X + ROOM_LAYOUT.minX,
            ROOM_LAYOUT.minX,
            ROOM_LAYOUT.maxX,
        );
        const z = clamp(
            (local.y - PADDING) / SCALE_Z + ROOM_LAYOUT.minZ,
            ROOM_LAYOUT.minZ,
            ROOM_LAYOUT.maxZ,
        );

        onPositionChange({
            x: Number(x.toFixed(2)),
            z: Number(z.toFixed(2)),
        });
    };

    return (
        <figure className={styles.figure}>
            <svg
                ref={svgRef}
                className={`${styles.svg} ${interactive ? styles.interactive : ''}`}
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role={interactive ? 'application' : 'img'}
                aria-label={
                    interactive
                        ? 'Plano del salón. Hacé clic para ubicar la mesa en edición.'
                        : 'Plano del salón con las mesas activas.'
                }
                onClick={handlePlanClick}
            >
                <title>Plano del salón</title>

                <rect
                    className={styles.room}
                    x={toSvgX(ROOM_LAYOUT.minX)}
                    y={toSvgZ(ROOM_LAYOUT.minZ)}
                    width={ROOM_WIDTH * SCALE_X}
                    height={ROOM_DEPTH * SCALE_Z}
                    rx="10"
                />

                {xGrid.map((x) => (
                    <line
                        key={`x-${x}`}
                        className={x % 2 === 0 ? styles.gridMajor : styles.grid}
                        x1={toSvgX(x)}
                        y1={toSvgZ(ROOM_LAYOUT.minZ)}
                        x2={toSvgX(x)}
                        y2={toSvgZ(ROOM_LAYOUT.maxZ)}
                    />
                ))}

                {zGrid.map((z) => (
                    <line
                        key={`z-${z}`}
                        className={z % 2 === 0 ? styles.gridMajor : styles.grid}
                        x1={toSvgX(ROOM_LAYOUT.minX)}
                        y1={toSvgZ(z)}
                        x2={toSvgX(ROOM_LAYOUT.maxX)}
                        y2={toSvgZ(z)}
                    />
                ))}

                {hasDraft && (
                    <ellipse
                        className={`${styles.minDistance} ${
                            collisions.length > 0 ? styles.minDistanceCollision : ''
                        }`}
                        cx={toSvgX(draftX)}
                        cy={toSvgZ(draftZ)}
                        rx={MIN_TABLE_DISTANCE * SCALE_X}
                        ry={MIN_TABLE_DISTANCE * SCALE_Z}
                    />
                )}

                {markers.map((marker) => {
                    const isCollision = marker.isEditing
                        ? collisions.length > 0
                        : collisionIds.has(marker.markerKey);
                    const classes = [
                        styles.marker,
                        marker.isEditing ? styles.markerSelected : '',
                        isCollision ? styles.markerCollision : '',
                    ]
                        .filter(Boolean)
                        .join(' ');
                    const radius = tableRadius(marker.seats);

                    return (
                        <g
                            key={marker.markerKey}
                            className={classes}
                            style={{ '--table-color': statusColor(marker.status) }}
                            onClick={(event) => {
                                if (!onTableSelect) return;

                                event.stopPropagation();
                                onTableSelect(marker);
                            }}
                        >
                            <circle
                                className={styles.markerCircle}
                                cx={toSvgX(marker.markerX)}
                                cy={toSvgZ(marker.markerZ)}
                                r={radius}
                            />
                            <text
                                className={styles.markerNumber}
                                x={toSvgX(marker.markerX)}
                                y={toSvgZ(marker.markerZ)}
                            >
                                {marker.markerNumber}
                            </text>
                        </g>
                    );
                })}

                <text
                    className={styles.axisLabel}
                    x={toSvgX(ROOM_LAYOUT.minX)}
                    y={VIEW_HEIGHT - 9}
                >
                    X
                </text>
                <text
                    className={styles.axisLabel}
                    x={10}
                    y={toSvgZ(ROOM_LAYOUT.minZ)}
                >
                    Z
                </text>
            </svg>

            <figcaption className={styles.caption}>
                <span className={styles.legendItem}>
                    <span className={styles.legendSwatch} aria-hidden="true" />
                    Mesa activa
                </span>
                <span className={styles.legendItem}>
                    <span
                        className={`${styles.legendSwatch} ${styles.legendSelected}`}
                        aria-hidden="true"
                    />
                    En edición
                </span>
                <span className={styles.legendItem}>
                    <span
                        className={`${styles.legendSwatch} ${styles.legendCollision}`}
                        aria-hidden="true"
                    />
                    Menos de 3 m
                </span>
            </figcaption>

            {collisions.length > 0 && (
                <p className={styles.warning} role="status">
                    Queda a menos de 3 metros de{' '}
                    {collisions
                        .map((collision) => `Mesa ${collision.table.number}`)
                        .join(', ')}
                    .
                </p>
            )}
        </figure>
    );
}
