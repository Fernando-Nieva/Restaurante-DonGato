import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Waiter from './Waiter';
import { KITCHEN_PICKUP, KITCHEN_PICKUP_SLOTS, WAITER_COUNT } from './roomLayout';

const MAX_PENDING = 8;
const SAFETY_GRACE = 1;

const WAITER_LOOKS = [
    { shirt: '#f3ede2', bow: '#c0392b' },
    { shirt: '#f3ede2', bow: '#2f6fb3' },
    { shirt: '#a9d4e6', bow: '#2e8b57' },
];

const EMPTY_IDS = [];

const orderTableId = (order) => order.table_id ?? order.table?.id ?? null;

const distanceToKitchen = (position) =>
    Math.hypot(position.x - KITCHEN_PICKUP.x, position.z - KITCHEN_PICKUP.z);

const waiterHasOrder = (waiter, orderId) =>
    waiter.tripOrderIds.includes(orderId) ||
    waiter.readyEvents.some((event) => String(event.orderId) === orderId);

export default function WaiterManager({
    tables = [],
    orders = [],
    consumeReady,
    consumeDone,
    animationsEnabled = true,
    cats = null,
    customers = null,
}) {
    const waiters = useRef(
        Array.from({ length: WAITER_COUNT }, (_, index) => ({
            id: `mozo-${index + 1}`,
            state: 'idle',
            tripOrderIds: EMPTY_IDS,
            tableId: null,
            position: { ...KITCHEN_PICKUP_SLOTS[index] },
            readyEvents: [],
            doneEvents: [],
            returnRequested: false,
            noReadyTime: 0,
            traveled: 0,
        })),
    );
    const pending = useRef([]);

    const tableById = useMemo(
        () => new Map(tables.map((table) => [String(table.id), table])),
        [tables],
    );

    const readyByTable = useMemo(() => {
        const map = new Map();

        orders.forEach((order) => {
            if (String(order.status ?? '').toLowerCase() !== 'listo') {
                return;
            }

            const tableId = orderTableId(order);

            if (tableId == null) {
                return;
            }

            const key = String(tableId);
            const ids = map.get(key);

            if (ids) {
                ids.add(String(order.id));
            } else {
                map.set(key, new Set([String(order.id)]));
            }
        });

        return map;
    }, [orders]);

    useFrame((_, rawDelta) => {
        const list = waiters.current;

        if (!animationsEnabled) {
            consumeReady?.();
            consumeDone?.();

            return;
        }

        const doneEvents = (consumeDone?.() ?? []).filter((event) => event?.orderId != null);
        const doneIds = new Set(doneEvents.map((event) => String(event.orderId)));
        const readyEvents = (consumeReady?.() ?? []).filter(
            (event) => event?.orderId != null && !doneIds.has(String(event.orderId)),
        );

        if (doneEvents.length > 0) {
            pending.current = pending.current.filter(
                (event) => !doneIds.has(String(event.orderId)),
            );

            list.forEach((waiter) => {
                if (waiter.readyEvents.length === 0) {
                    return;
                }

                waiter.readyEvents = waiter.readyEvents.filter(
                    (event) => !doneIds.has(String(event.orderId)),
                );
            });
        }

        doneEvents.forEach((event) => {
            const orderId = String(event.orderId);
            const carrier = list.find(
                (waiter) =>
                    waiter.tripOrderIds.includes(orderId) ||
                    waiter.readyEvents.some((readyEvent) => String(readyEvent.orderId) === orderId),
            );

            if (carrier) {
                carrier.doneEvents.push(event);

                return;
            }

            if (event.tableId == null) {
                return;
            }

            const tableKey = String(event.tableId);
            const readyIds = readyByTable.get(tableKey);

            if (readyIds && readyIds.size > 0) {
                return;
            }

            const waiter = list.find(
                (candidate) =>
                    candidate.tableId === tableKey &&
                    (candidate.state === 'ir_a_mesa' ||
                        candidate.state === 'esperando_en_mesa'),
            );

            if (!waiter) {
                return;
            }

            waiter.doneEvents.push(event);
            waiter.returnRequested = true;
        });

        const isKnown = (orderId) =>
            pending.current.some((event) => String(event.orderId) === orderId) ||
            list.some((waiter) => waiterHasOrder(waiter, orderId));

        readyEvents.forEach((event) => {
            if (event.tableId == null) {
                return;
            }

            const tableKey = String(event.tableId);
            const orderId = String(event.orderId);
            const sameTable = list.find(
                (waiter) =>
                    waiter.tableId === tableKey &&
                    (waiter.state === 'ir_a_mesa' || waiter.state === 'esperando_en_mesa'),
            );

            if (sameTable) {
                if (!waiterHasOrder(sameTable, orderId)) {
                    sameTable.readyEvents.push(event);
                }

                return;
            }

            if (isKnown(orderId)) {
                return;
            }

            pending.current.push(event);
        });

        if (pending.current.length > MAX_PENDING) {
            pending.current.splice(0, pending.current.length - MAX_PENDING);
        }

        while (pending.current.length > 0) {
            const event = pending.current[0];

            if (event.tableId == null) {
                pending.current.shift();

                continue;
            }

            const tableKey = String(event.tableId);
            const orderId = String(event.orderId);
            const sameTable = list.find(
                (waiter) =>
                    waiter.tableId === tableKey &&
                    (waiter.state === 'ir_a_mesa' || waiter.state === 'esperando_en_mesa'),
            );

            if (sameTable) {
                pending.current.shift();

                if (!waiterHasOrder(sameTable, orderId)) {
                    sameTable.readyEvents.push(event);
                }

                continue;
            }

            const idle = list
                .filter((waiter) => waiter.state === 'idle')
                .sort((a, b) => distanceToKitchen(a.position) - distanceToKitchen(b.position))[0];

            if (!idle) {
                break;
            }

            pending.current.shift();

            if (!tableById.has(tableKey)) {
                continue;
            }

            idle.state = 'ir_a_mesa';
            idle.tableId = tableKey;
            idle.returnRequested = false;
            idle.noReadyTime = 0;
            idle.readyEvents.push(event);
        }

        const delta = Math.min(rawDelta, 0.05);

        list.forEach((waiter) => {
            if (waiter.state !== 'esperando_en_mesa' || waiter.tableId == null) {
                waiter.noReadyTime = 0;

                return;
            }

            const readyIds = readyByTable.get(waiter.tableId);

            if (readyIds && readyIds.size > 0) {
                waiter.noReadyTime = 0;

                return;
            }

            waiter.noReadyTime += delta;

            if (waiter.noReadyTime > SAFETY_GRACE) {
                waiter.returnRequested = true;
                waiter.noReadyTime = 0;
            }
        });
    });

    return (
        <>
            {waiters.current.map((entry, index) => (
                <Waiter
                    key={entry.id}
                    id={entry.id}
                    color={WAITER_LOOKS[index % WAITER_LOOKS.length]}
                    slot={KITCHEN_PICKUP_SLOTS[index]}
                    readEntry={() => waiters.current[index]}
                    tables={tables}
                    cats={cats}
                    waiters={waiters}
                    customers={customers}
                    animationsEnabled={animationsEnabled}
                />
            ))}
        </>
    );
}
