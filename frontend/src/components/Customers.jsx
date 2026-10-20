import { useEffect, useRef, useState } from 'react';
import Customer from './Customer';
import { getChairLayout } from '../utils/chairs';

const ACTIVE_STATUSES = new Set(['pendiente', 'preparando', 'listo']);
const READY_STATUS = 'listo';
const REMOVE_DELAY_MS = 360;

const hashId = (value) => {
    const text = String(value ?? '');
    let hash = 0;

    for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }

    return hash;
};

const orderTableId = (order) => order.table_id ?? order.table?.id ?? null;

const activeOrdersByTable = (orders) => {
    const map = new Map();

    orders.forEach((order) => {
        const status = String(order.status ?? '').toLowerCase();

        if (!ACTIVE_STATUSES.has(status)) {
            return;
        }

        const tableId = orderTableId(order);

        if (tableId == null) {
            return;
        }

        const key = String(tableId);
        const list = map.get(key);

        if (list) {
            list.push(order);
        } else {
            map.set(key, [order]);
        }
    });

    return map;
};

const oldestOrder = (orders) =>
    orders.reduce((oldest, order) => {
        const current = Number(order.id);
        const reference = Number(oldest.id);

        if (Number.isNaN(current) || Number.isNaN(reference)) {
            return oldest;
        }

        return current < reference ? order : oldest;
    }, orders[0]);

const buildTargets = (tables, activeByTable) => {
    const targets = [];

    tables.forEach((table) => {
        const active = activeByTable.get(String(table.id));

        if (!active || active.length === 0) {
            return;
        }

        const seats = Math.max(2, Math.min(8, Number(table.seats) || 4));
        const hash = hashId(oldestOrder(active).id);
        const count = 1 + (hash % seats);
        const offset = Math.floor(hash / seats) % seats;
        const ready = active.some((order) => String(order.status ?? '').toLowerCase() === READY_STATUS);
        const chairs = getChairLayout(seats);
        const tableX = Number(table.pos_x) || 0;
        const tableZ = Number(table.pos_z) || 0;
        const baseY = Number(table.pos_y) || 0;
        const tablePhase = ((hash % 1000) / 1000) * Math.PI;

        for (let index = 0; index < count; index += 1) {
            const seatIndex = (offset + index) % seats;
            const chair = chairs[seatIndex];

            targets.push({
                key: `${table.id}:${seatIndex}`,
                seatIndex,
                position: [tableX + chair.position[0], baseY, tableZ + chair.position[2]],
                facing: chair.rotationY + Math.PI,
                phase: tablePhase + seatIndex * 2.3,
                ready,
            });
        }
    });

    return targets;
};

const reconcile = (previous, targets, instant) => {
    const previousByKey = new Map(previous.map((customer) => [customer.key, customer]));
    const targetKeys = new Set(targets.map((customer) => customer.key));

    const next = targets.map((target) => {
        const existing = previousByKey.get(target.key);

        if (existing) {
            return { ...existing, ...target, leaving: false };
        }

        return { ...target, entering: !instant, leaving: false };
    });

    previous.forEach((customer) => {
        if (targetKeys.has(customer.key)) {
            return;
        }

        next.push(customer.leaving ? customer : { ...customer, leaving: true, entering: false });
    });

    return next;
};

export default function Customers({
    tables = [],
    orders = [],
    ordersLoaded = false,
    animationsEnabled = true,
    registry = null,
}) {
    const [customers, setCustomers] = useState([]);
    const initialDone = useRef(false);

    useEffect(() => {
        if (!registry) {
            return;
        }

        registry.current = customers.map((customer) => ({
            x: customer.position[0],
            z: customer.position[2],
        }));
    }, [customers, registry]);

    useEffect(() => {
        if (!ordersLoaded) {
            return;
        }

        const targets = buildTargets(tables, activeOrdersByTable(orders));
        const instant = !initialDone.current;

        initialDone.current = true;
        setCustomers((previous) => reconcile(previous, targets, instant));
    }, [tables, orders, ordersLoaded]);

    useEffect(() => {
        if (!customers.some((customer) => customer.leaving)) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCustomers((previous) => previous.filter((customer) => !customer.leaving));
        }, REMOVE_DELAY_MS);

        return () => clearTimeout(timer);
    }, [customers]);

    return (
        <>
            {customers.map((customer) => (
                <Customer
                    key={customer.key}
                    position={customer.position}
                    facing={customer.facing}
                    phase={customer.phase}
                    seatIndex={customer.seatIndex}
                    ready={customer.ready}
                    entering={customer.entering ?? false}
                    leaving={customer.leaving ?? false}
                    animationsEnabled={animationsEnabled}
                />
            ))}
        </>
    );
}
