import { normalizeZone, TABLE_ZONE_LABELS } from '../components/roomLayout';

export const tableZone = (table) => normalizeZone(table?.zone);

export const tableZoneLabel = (tableOrZone) => {
    const zone =
        tableOrZone && typeof tableOrZone === 'object'
            ? tableZone(tableOrZone)
            : normalizeZone(tableOrZone);

    return TABLE_ZONE_LABELS[zone];
};

export const tableDisplayName = (table) => {
    const number = table?.number ?? table?.name ?? table?.id ?? '';
    const label = tableZoneLabel(table);

    return tableZone(table) === 'terraza'
        ? `Mesa ${number} · ${label}`
        : `Mesa ${number}`;
};
