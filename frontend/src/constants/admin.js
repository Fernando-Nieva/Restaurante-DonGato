export const PRODUCT_CATEGORIES = [
    { value: 'pizza', label: 'Pizzas' },
    { value: 'hamburguesa', label: 'Hamburguesas' },
    { value: 'bebida', label: 'Bebidas' },
];

export const PRODUCT_CATEGORY_LABELS = Object.fromEntries(
    PRODUCT_CATEGORIES.map((category) => [category.value, category.label]),
);

export const USER_ROLES = [
    { value: 'mozo', label: 'Mozo' },
    { value: 'cocina', label: 'Cocina' },
    { value: 'admin', label: 'Administrador' },
];

export const USER_ROLE_LABELS = Object.fromEntries(
    USER_ROLES.map((role) => [role.value, role.label]),
);
