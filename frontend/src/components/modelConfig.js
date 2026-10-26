export const MODEL_CONFIG = {
    table: null,
    chair: null,
    chairCushion: null,
    bar: null,
    bench: null,
    counter: null,
    rug: null,
    plantSmall: null,
    plantLarge: null,
    lamp: null,
    bookcase: null,
    picture: null,
};

export const TABLE_TOP_Y = {
    procedural: 0.78,
};

export function getTableTopY(model = MODEL_CONFIG.table) {
    if (model?.path && Number.isFinite(TABLE_TOP_Y[model.path])) {
        return TABLE_TOP_Y[model.path];
    }

    if (Number.isFinite(model?.topY)) {
        return model.topY;
    }

    return TABLE_TOP_Y.procedural;
}
