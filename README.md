# Restaurante 3D en tiempo real (Laravel + Reverb + React)

Sistema de restaurante con plano 3D: el mozo elige una mesa, arma el pedido y la cocina lo ve al instante vía WebSockets. La comunicación en vivo usa [Laravel Reverb](https://reverb.laravel.com/) y el frontend usa React + Vite + Three.js.

## Estructura

```text
emisor-receptor/
├── backend/    # Laravel 13 + Reverb (API, eventos, broadcasting; SQLite por defecto)
└── frontend/   # React 19 + Vite + Three.js
```

## Requisitos

- PHP >= 8.3 con la extensión `pdo_sqlite` (o MySQL 8 si preferís cambiar la conexión)
- Composer 2
- Node.js >= 20 y npm

## Instalación

### Backend

```bash
cd backend
composer install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
php artisan key:generate
php artisan migrate --seed    # crea database/database.sqlite si no existe
npm install
npm run build                 # assets de las vistas Blade (emisor/receptor)
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
```

> `frontend/.env` debe apuntar al backend (`VITE_API_URL`) y usar la misma `REVERB_APP_KEY` que `backend/.env` (los valores de `.env.example` ya coinciden entre sí).

## Levantar el proyecto

Tres terminales:

```bash
# 1) API y vistas          -> http://localhost:8000
cd backend && php artisan serve

# 2) Servidor WebSocket    -> ws://localhost:8080
cd backend && php artisan reverb:start

# 3) Frontend              -> http://localhost:5173
cd frontend && npm run dev
```

## Usuarios de prueba

El seeder crea un usuario administrador de la demo:

| Email            | Contraseña |
| ---------------- | ---------- |
| test@example.com | password   |

> Los usuarios con rol `mozo`, `cocina` y `admin` (y el login por API) todavía no existen: dependen del módulo de autenticación del backend, que aún no está implementado (ver Estado actual).

## Flujo de demo

**Demo actual (WebSockets emisor/receptor):**

1. Levantá `php artisan serve` y `php artisan reverb:start`.
2. Abrí `http://localhost:8000/emisor` y `http://localhost:8000/receptor` en dos pestañas.
3. Enviá un mensaje/estilo desde el emisor: el receptor lo muestra al instante, sin recargar.

**Flujo objetivo del restaurante (una vez implementada la API):**

1. El mozo abre el salón 3D, elige la mesa 5 y arma el pedido en el panel lateral.
2. Al enviarlo (`POST /api/orders`), la mesa cambia de color y el pedido aparece en la vista de cocina sin recargar (evento `OrderCreated` por el canal privado `restaurant`).
3. Cocina avanza el estado del pedido (Pendiente → Preparando → Listo) y el color de la mesa se actualiza en el salón.

## Estado actual

- Implementado:
  - Backend demo emisor/receptor con Laravel Reverb y panel Blade.
  - Frontend: hook `useOrders` (carga inicial + WebSocket), salón 3D con geometría procedural, panel de pedido por mesa y tablero de cocina (`KitchenPage`).
  - Rate limiters registrados en `AppServiceProvider`: `login` (5 req/min por IP) y `orders` (30 req/min por usuario/IP), listos para aplicarse con `->middleware('throttle:login')` y `->middleware('throttle:orders')` cuando existan las rutas.
- Pendiente:
  - API REST del restaurante: `POST /api/login`, `GET /api/tables`, `GET/POST /api/orders`, `PATCH /api/orders/{id}/status`, `GET /api/products`.
  - Modelos, migraciones y seeders de mesas, productos y pedidos (con roles de usuario).
  - Rutear en el frontend `RestaurantPage` y `KitchenPage` (hoy `App.jsx` monta solo la demo del hook).
  - CORS/CSRF para el frontend en `localhost:5173` (Sanctum y `/broadcasting/auth`).
