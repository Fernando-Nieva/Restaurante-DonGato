import { useRef } from 'react';
import { TABLE_STATUS_COLORS, TABLE_STATUS_LABELS } from '../../constants/orderStatus';
import {
    ENTRANCE_POINT,
    getZoneBounds,
    normalizeZone,
    PLAN_BOUNDS,
    TABLE_ZONES,
    TABLE_ZONE_LABELS,
    TERRACE,
} from '../roomLayout';
import styles from './TableFloorPlan.module.css';

export const MIN_TABLE_DISTANCE = 3;

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 720;
const PADDING = 28;
const PLAN_WIDTH = PLAN_BOUNDS.maxX - PLAN_BOUNDS.minX;
const PLAN_DEPTH = PLAN_BOUNDS.maxZ - PLAN_BOUNDS.minZ;
const SCALE = Math.min(
    (VIEW_WIDTH - PADDING * 2) / PLAN_WIDTH,
    (VIEW_HEIGHT - PADDING * 2) / PLAN_DEPTH,
);
const CONTENT_WIDTH = PLAN_WIDTH * SCALE;
const CONTENT_HEIGHT = PLAN_DEPTH * SCALE;
const OFFSET_X = (VIEW_WIDTH - PADDING * 2 - CONTENT_WIDTH) / 2;
const OFFSET_Y = (VIEW_HEIGHT - PADDING * 2 - CONTENT_HEIGHT) / 2;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toSvgX = (x) => PADDING + OFFSET_X + (x - PLAN_BOUNDS.minX) * SCALE;
const toSvgZ = (z) => PADDING + OFFSET_Y + (z - PLAN_BOUNDS.minZ) * SCALE;

const tableRadius = (seats) => 13 + Math.min(Math.max(Number(seats) || 4, 1), 8) * 0.9;

const statusKey = (status) => String(status ?? '').toLowerCase();

const statusColor = (status) =>
    TABLE_STATUS_COLORS[statusKey(status)] ?? 'var(--color-muted)';

const statusLabel = (status) =>
    TABLE_STATUS_LABELS[statusKey(status)] ?? 'Sin estado';

const markerLabel = (number, zone) =>
    normalizeZone(zone) === 'terraza'
        ? `Mesa ${number} · ${TABLE_ZONE_LABELS.terraza}`
        : `Mesa ${number}`;

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
    draftZone = 'salon',
    onPositionChange,
    onTableSelect,
    disabled = false,
}) {
    const svgRef = useRef(null);
    const draftX = Number(draftPosition?.x);
    const draftZ = Number(draftPosition?.z);
    const hasDraft = Number.isFinite(draftX) && Number.isFinite(draftZ);
    const activeBounds = getZoneBounds(draftZone);
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
        const zone = isEditing ? draftZone : table.zone;

        return {
            ...table,
            markerKey: String(table.id),
            markerNumber: table.number,
            markerX: Number.isFinite(x) ? x : 0,
            markerZ: Number.isFinite(z) ? z : 0,
            markerZone: normalizeZone(zone),
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
            markerZone: normalizeZone(draftZone),
            seats: 4,
            status: 'libre',
            isEditing: true,
        });
    }

    markers.sort((a, b) => Number(a.isEditing) - Number(b.isEditing));

    const xGrid = Array.from(
        { length: PLAN_WIDTH + 1 },
        (_, index) => PLAN_BOUNDS.minX + index,
    );
    const zGrid = Array.from(
        { length: PLAN_DEPTH + 1 },
        (_, index) => PLAN_BOUNDS.minZ + index,
    );

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
            (local.x - PADDING - OFFSET_X) / SCALE + PLAN_BOUNDS.minX,
            activeBounds.minX,
            activeBounds.maxX,
        );
        const z = clamp(
            (local.y - PADDING - OFFSET_Y) / SCALE + PLAN_BOUNDS.minZ,
            activeBounds.minZ,
            activeBounds.maxZ,
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
                        ? 'Plano del salón y la terraza. Hacé clic para ubicar la mesa en edición.'
                        : 'Plano del salón y la terraza con las mesas activas.'
                }
                onClick={handlePlanClick}
            >
                <title>Plano del salón y la terraza</title>

                <rect
                    className={styles.salon}
                    x={toSvgX(TABLE_ZONES.salon.minX)}
                    y={toSvgZ(TABLE_ZONES.salon.minZ)}
                    width={(TABLE_ZONES.salon.maxX - TABLE_ZONES.salon.minX) * SCALE}
                    height={(TABLE_ZONES.salon.maxZ - TABLE_ZONES.salon.minZ) * SCALE}
                    rx="10"
                />
                <rect
                    className={styles.terrace}
                    x={toSvgX(TABLE_ZONES.terraza.minX)}
                    y={toSvgZ(TABLE_ZONES.terraza.minZ)}
                    width={(TABLE_ZONES.terraza.maxX - TABLE_ZONES.terraza.minX) * SCALE}
                    height={(TABLE_ZONES.terraza.maxZ - TABLE_ZONES.terraza.minZ) * SCALE}
                    rx="10"
                />
                <rect
                    className={styles.entrance}
                    x={toSvgX(ENTRANCE_POINT.x - TERRACE.entranceHalfWidth)}
                    y={toSvgZ(ENTRANCE_POINT.z)}
                    width={TERRACE.entranceHalfWidth * 2 * SCALE}
                    height={(TABLE_ZONES.terraza.minZ - ENTRANCE_POINT.z) * SCALE}
                />

                {hasDraft && (
                    <rect
                        className={styles.activeZone}
                        x={toSvgX(activeBounds.minX)}
                        y={toSvgZ(activeBounds.minZ)}
                        width={(activeBounds.maxX - activeBounds.minX) * SCALE}
                        height={(activeBounds.maxZ - activeBounds.minZ) * SCALE}
                        rx="10"
                    />
                )}

                {xGrid.map((x) => (
                    <line
                        key={`x-${x}`}
                        className={x % 2 === 0 ? styles.gridMajor : styles.grid}
                        x1={toSvgX(x)}
                        y1={toSvgZ(PLAN_BOUNDS.minZ)}
                        x2={toSvgX(x)}
                        y2={toSvgZ(PLAN_BOUNDS.maxZ)}
                    />
                ))}

                {zGrid.map((z) => (
                    <line
                        key={`z-${z}`}
                        className={z % 2 === 0 ? styles.gridMajor : styles.grid}
                        x1={toSvgX(PLAN_BOUNDS.minX)}
                        y1={toSvgZ(z)}
                        x2={toSvgX(PLAN_BOUNDS.maxX)}
                        y2={toSvgZ(z)}
                    />
                ))}

                <text
                    className={styles.zoneLabel}
                    x={toSvgX(TABLE_ZONES.salon.minX) + 10}
                    y={toSvgZ(TABLE_ZONES.salon.minZ) + 18}
                >
                    Salón
                </text>
                <text
                    className={styles.zoneLabel}
                    x={toSvgX(TABLE_ZONES.terraza.minX) + 10}
                    y={toSvgZ(TABLE_ZONES.terraza.maxZ) - 10}
                >
                    Terraza
                </text>

                {hasDraft && (
                    <circle
                        className={`${styles.minDistance} ${
                            collisions.length > 0 ? styles.minDistanceCollision : ''
                        }`}
                        cx={toSvgX(draftX)}
                        cy={toSvgZ(draftZ)}
                        r={MIN_TABLE_DISTANCE * SCALE}
                    />
                )}

                {markers.map((marker) => {
                    const isCollision = marker.isEditing
                        ? collisions.length > 0
                        : collisionIds.has(marker.markerKey);
                    const classes = [
                        styles.marker,
                        onTableSelect ? styles.markerInteractive : '',
                        marker.isEditing ? styles.markerSelected : '',
                        isCollision ? styles.markerCollision : '',
                    ]
                        .filter(Boolean)
                        .join(' ');
                    const radius = tableRadius(marker.seats);
                    const label = markerLabel(marker.markerNumber, marker.markerZone);

                    return (
                        <g
                            key={marker.markerKey}
                            className={classes}
                            style={{ '--table-color': statusColor(marker.status) }}
                            aria-label={`${label}, ${statusLabel(marker.status)}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onTableSelect?.(marker);
                            }}
                        >
                            <title>
                                {label} · {statusLabel(marker.status)}
                            </title>
                            <circle
                                className={styles.markerCircle}
                                cx={toSvgX(marker.markerX)}
                                cy={toSvgZ(marker.markerZ)}
                                r={radius}
                            />
                            {marker.isEditing && (
                                <circle
                                    className={styles.markerSelectionRing}
                                    cx={toSvgX(marker.markerX)}
                                    cy={toSvgZ(marker.markerZ)}
                                    r={radius + 4}
                                />
                            )}
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
                    x={toSvgX(PLAN_BOUNDS.minX)}
                    y={VIEW_HEIGHT - 9}
                >
                    X
                </text>
                <text
                    className={styles.axisLabel}
                    x={10}
                    y={toSvgZ(PLAN_BOUNDS.minZ)}
                >
                    Z
                </text>
            </svg>

            <figcaption className={styles.caption}>
                <span className={styles.legendItem}>
                    <span
                        className={styles.legendSwatch}
                        style={{ '--legend-color': TABLE_STATUS_COLORS.libre }}
                        aria-hidden="true"
                    />
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
                <span className={styles.legendItem}>
                    <span
                        className={`${styles.legendSwatch} ${styles.legendTerrace}`}
                        aria-hidden="true"
                    />
                    Terraza
                </span>
            </figcaption>

            {collisions.length > 0 && (
                <p className={styles.warning} role="status">
                    Queda a menos de 3 metros de{' '}
                    {collisions
                        .map((collision) =>
                            markerLabel(collision.table.number, collision.table.zone),
                        )
                        .join(', ')}
                    .
                </p>
            )}
        </figure>
    );
}
