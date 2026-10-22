import { useMemo, useState } from 'react';
import { formatHour } from '../../utils/date';
import { formatPrice } from '../../utils/formatPrice';
import styles from './SalesByHourChart.module.css';

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 300;
const MARGIN = { top: 28, right: 18, bottom: 44, left: 84 };
const PLOT_WIDTH = VIEW_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;
const TICK_COUNT = 4;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const niceCeiling = (value) => {
    if (!Number.isFinite(value) || value <= 0) return 1;

    const exponent = Math.floor(Math.log10(value));
    const magnitude = 10 ** exponent;
    const fraction = value / magnitude;
    const niceFraction =
        fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;

    return niceFraction * magnitude;
};

const formatAxisValue = (value) => {
    if (value >= 1_000_000) {
        return `$ ${(value / 1_000_000).toLocaleString('es-AR', {
            maximumFractionDigits: 1,
        })} M`;
    }

    if (value >= 1_000) {
        return `$ ${(value / 1_000).toLocaleString('es-AR', {
            maximumFractionDigits: 0,
        })} k`;
    }

    return `$ ${Math.round(value).toLocaleString('es-AR')}`;
};

const ordersLabel = (count) => `${count} pedido${Number(count) === 1 ? '' : 's'}`;

export default function SalesByHourChart({ hours = [] }) {
    const [activeIndex, setActiveIndex] = useState(null);
    const maxValue = useMemo(
        () => Math.max(...hours.map((hour) => Number(hour.total_sales ?? 0)), 1),
        [hours],
    );
    const yMax = useMemo(() => niceCeiling(maxValue), [maxValue]);
    const slotWidth = PLOT_WIDTH / 24;
    const barWidth = slotWidth * 0.58;
    const plotBottom = MARGIN.top + PLOT_HEIGHT;
    const activeHour = activeIndex == null ? null : hours[activeIndex];
    const tooltipLeft =
        activeIndex == null
            ? 50
            : clamp(
                  ((MARGIN.left + slotWidth * (activeIndex + 0.5)) / VIEW_WIDTH) * 100,
                  12,
                  88,
              );

    const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => {
        const value = (yMax / TICK_COUNT) * index;

        return {
            value,
            y: plotBottom - (value / yMax) * PLOT_HEIGHT,
        };
    });

    const handlePointerLeave = (event) => {
        if (event.pointerType === 'mouse') setActiveIndex(null);
    };

    return (
        <div className={styles.chartScroll}>
            <div className={styles.stage}>
                <svg
                    className={styles.svg}
                    viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                    role="img"
                    aria-label={`Gráfico de ventas por hora. Máximo ${formatPrice(
                        maxValue,
                    )} por hora.`}
                    onPointerLeave={handlePointerLeave}
                >
                    <title>Ventas entregadas por hora</title>

                    {ticks.map((tick) => (
                        <g key={tick.value}>
                            <line
                                className={styles.gridLine}
                                x1={MARGIN.left}
                                y1={tick.y}
                                x2={VIEW_WIDTH - MARGIN.right}
                                y2={tick.y}
                            />
                            <text
                                className={styles.axisText}
                                x={MARGIN.left - 10}
                                y={tick.y}
                                textAnchor="end"
                                dominantBaseline="middle"
                            >
                                {formatAxisValue(tick.value)}
                            </text>
                        </g>
                    ))}

                    <line
                        className={styles.axisLine}
                        x1={MARGIN.left}
                        y1={MARGIN.top}
                        x2={MARGIN.left}
                        y2={plotBottom}
                    />
                    <line
                        className={styles.axisLine}
                        x1={MARGIN.left}
                        y1={plotBottom}
                        x2={VIEW_WIDTH - MARGIN.right}
                        y2={plotBottom}
                    />

                    <text
                        className={styles.axisTitle}
                        x={17}
                        y={MARGIN.top + PLOT_HEIGHT / 2}
                        textAnchor="middle"
                        transform={`rotate(-90 17 ${MARGIN.top + PLOT_HEIGHT / 2})`}
                    >
                        Ventas
                    </text>

                    {hours.map((hour, index) => {
                        const value = Number(hour.total_sales ?? 0);
                        const barHeight =
                            value > 0 ? Math.max((value / yMax) * PLOT_HEIGHT, 4) : 2;
                        const x = MARGIN.left + slotWidth * index + (slotWidth - barWidth) / 2;
                        const y = plotBottom - barHeight;
                        const active = activeIndex === index;

                        return (
                            <rect
                                key={`bar-${hour.hour}`}
                                className={`${styles.bar} ${value > 0 ? '' : styles.barEmpty} ${
                                    active ? styles.barActive : ''
                                }`}
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx="4"
                            />
                        );
                    })}

                    {hours.map((hour, index) => {
                        const center = MARGIN.left + slotWidth * (index + 0.5);
                        const showLabel = hour.hour % 3 === 0 || hour.hour === 23;

                        return (
                            <g key={`hit-${hour.hour}`}>
                                {showLabel && (
                                    <text
                                        className={styles.axisText}
                                        x={center}
                                        y={plotBottom + 20}
                                        textAnchor="middle"
                                    >
                                        {formatHour(hour.hour)}
                                    </text>
                                )}
                                <rect
                                    className={styles.hitArea}
                                    x={MARGIN.left + slotWidth * index}
                                    y={MARGIN.top}
                                    width={slotWidth}
                                    height={PLOT_HEIGHT}
                                    onPointerEnter={() => setActiveIndex(index)}
                                    onPointerDown={() => setActiveIndex(index)}
                                />
                            </g>
                        );
                    })}
                </svg>

                {activeHour && (
                    <div
                        className={styles.tooltip}
                        style={{ left: `${tooltipLeft}%` }}
                        role="status"
                        aria-live="polite"
                    >
                        <span className={styles.tooltipHour}>
                            {formatHour(activeHour.hour)}
                        </span>
                        <strong className={styles.tooltipValue}>
                            {formatPrice(activeHour.total_sales)}
                        </strong>
                        <span className={styles.tooltipMeta}>
                            {ordersLabel(activeHour.orders_count)}
                        </span>
                    </div>
                )}

                <table className={styles.srOnly}>
                    <caption>Ventas entregadas por hora</caption>
                    <thead>
                        <tr>
                            <th scope="col">Hora</th>
                            <th scope="col">Ventas</th>
                            <th scope="col">Pedidos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hours.map((hour) => (
                            <tr key={`table-${hour.hour}`}>
                                <th scope="row">{formatHour(hour.hour)}</th>
                                <td>{formatPrice(hour.total_sales)}</td>
                                <td>{ordersLabel(hour.orders_count)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
