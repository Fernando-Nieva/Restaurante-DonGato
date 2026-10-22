# Restaurante 3D en tiempo real (Laravel + Reverb + React)

Sistema de restaurante con salón 3D: el mozo elige una mesa y arma el pedido, y la cocina lo recibe al instante mediante WebSockets con [Laravel Reverb](https://reverb.laravel.com/). El frontend usa React, Vite y Three.js.

- Aplicación: <http://localhost:5173>
- API Laravel: <http://localhost:8000>
- WebSocket Reverb: `ws://localhost:8080`

## Con Docker (recomendado)

### Requisitos

- Docker Desktop.
- En Windows, Docker Desktop debe usar el backend WSL2.
- No hace falta instalar PHP, Composer, Node.js ni SQLite por separado.

### Puesta en marcha

1. Clonar el repositorio y entrar en la carpeta:

   ```bash
   git clone https://github.com/Fernando-Nieva/emisor-receptor.git
   cd emisor-receptor
   ```

2. Construir y levantar los servicios:

   ```bash
   docker compose up --build
   ```

   La primera ejecución puede tardar porque descarga imágenes y compila dependencias.

3. Abrir <http://localhost:5173> en el navegador.

Para usar `localhost` no hace falta crear un archivo `.env`: `docker-compose.yml` incluye valores de demostración. La base SQLite se migra y se seedea automáticamente en el primer arranque.

### Usuarios de prueba

| Rol    | Email                | Contraseña |
| ------ | -------------------- | ---------- |
| Mozo   | `mozo@example.com`   | `password` |
| Cocina | `cocina@example.com` | `password` |
| Admin  | `admin@example.com`  | `password` |

> Son usuarios y claves exclusivamente de demostración. No uses estas credenciales en un entorno público.

### Detener, reiniciar datos y ver registros

```bash
# Detener los contenedores sin borrar los datos
docker compose down

# Detener y borrar la base SQLite y el storage de Laravel
docker compose down -v

# Seguir los registros del backend y de Reverb
docker compose logs -f backend reverb
```

Después de `docker compose down -v`, el siguiente `docker compose up --build` vuelve a migrar y seedear la base desde cero. **Se pierden los pedidos y las sesiones emitidas.**

### Problemas comunes

- **Los puertos 5173, 8000 u 8080 están ocupados:** cerrá el programa que los esté usando o cambiá el puerto izquierdo en `docker-compose.yml` (por ejemplo, `"5174:80"`). Si cambiás el puerto de la API o de Reverb, actualizá también `VITE_API_URL` o `VITE_REVERB_PORT` en `.env` y reconstruí.
- **El badge muestra “Sin conexión”:** verificá que Reverb esté corriendo con `docker compose ps` y revisá sus errores con `docker compose logs -f reverb`.
- **Token inválido después de reiniciar los datos:** las sesiones se borraron junto con la base. Cerrá sesión en la aplicación y volvé a iniciar sesión.

### Probar desde un celular en la misma red

1. Conectá la PC y el celular a la misma red Wi-Fi/LAN.
2. Obtené la IPv4 de la PC con `ipconfig` en Windows. Por ejemplo: `192.168.1.50`.
3. Creá el archivo `.env` a partir del ejemplo:

   ```powershell
   Copy-Item .env.docker.example .env
   ```

4. Reemplazá los valores de esas variables con la IP de la PC:

   ```dotenv
   VITE_API_URL=http://192.168.1.50:8000
   VITE_REVERB_HOST=192.168.1.50
   FRONTEND_URL=http://192.168.1.50:5173,http://localhost:5173
   ```

   > `FRONTEND_URL` también debe incluir la IP para que Laravel acepte el origen del celular. `REVERB_HOST=reverb` debe quedar como está: es el nombre interno del servicio.

5. Reconstruí el frontend para aplicar las variables de Vite:

   ```bash
   docker compose up --build
   ```

6. Desde el celular, abrí `http://192.168.1.50:5173` (usá tu IP real).
7. Permití tráfico entrante TCP en los puertos **5173**, **8000** y **8080** en el firewall de Windows.

Si la IP de la PC cambia, actualizá `.env` y volvé a reconstruir con `docker compose up --build`.

## Alternativa (desarrollo)

Esta opción requiere instalar las herramientas localmente:

- PHP >= 8.3 con la extensión `pdo_sqlite` (o MySQL 8 si cambiás la conexión).
- Composer 2.
- Node.js 22 y npm (la imagen Docker también usa Node 22).

### Backend

```bash
cd backend
composer install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
php artisan key:generate
php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"
php artisan migrate --seed
npm install
npm run build
```

Usá `composer install` sin `--no-dev`: los seeders necesitan `fakerphp/faker`. `npm run build` compila los assets de las vistas Blade de demostración.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # PowerShell: Copy-Item .env.example .env
```

`frontend/.env` debe apuntar a la API y usar la misma clave de Reverb que `backend/.env`: `VITE_REVERB_APP_KEY` debe coincidir con `REVERB_APP_KEY`. Los valores de los archivos `.env.example` ya coinciden.

### Ejecutar en desarrollo

Usá tres terminales:

```bash
# 1) API Laravel                 -> http://localhost:8000
cd backend
php artisan serve

# 2) Servidor WebSocket          -> ws://localhost:8080
cd backend
php artisan reverb:start

# 3) Frontend React              -> http://localhost:5173
cd frontend
npm run dev
```

La aplicación React queda disponible en <http://localhost:5173>. Las vistas Blade de demostración quedan en <http://localhost:8000/emisor> y <http://localhost:8000/receptor>.
