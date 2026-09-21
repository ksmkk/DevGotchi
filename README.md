# DevGotchi

DevGotchi es una mascota virtual que representa la salud de un repositorio y sus
pipelines. El backend recibe estados de actividad, los evalúa y expone el estado
de la mascota mediante GraphQL. El frontend React muestra la vida y permite
conectar un repositorio de GitHub.

## Requisitos

- Git.
- Node.js 20 o superior y npm.
- Docker Desktop con Docker Compose.
- Windows PowerShell, macOS/Linux shell o una terminal equivalente.

Verifica las herramientas:

Para conectar todo, usamos REST para recibir los webhooks de GitHub Actions y GraphQL para consultar el estado desde React. El frontend actualiza la tarjeta mediante polling.
```bash
node --version
npm --version
docker --version
docker compose version
```

## Instalacion

Clona el repositorio y entra en su carpeta:

1. Clonar el repositorio.
2. Para el backend:
   - Entrar a la carpeta `backend`.
   - Instalar dependencias con `npm install`.
   - Levantar el servidor con `npm run dev`.
3. Para el frontend: entrar a la carpeta y correr `npm install`.
4. Levantar la base de datos siguiendo la sección de PostgreSQL.
5. Abrir `http://localhost:5173` y conectar una URL de GitHub desde el formulario.

El frontend consulta GraphQL en `http://localhost:3000/graphql`. Para cambiarlo,
definir `VITE_GRAPHQL_URL` antes de ejecutar Vite.
```bash
git clone <URL_DEL_REPOSITORIO>
cd DevGotchi
```

Instala las dependencias de cada aplicacion:

1. Copiar `.env.example` a `.env` en la carpeta `backend`.
2. Desde la raíz del proyecto, iniciar PostgreSQL: `docker compose up -d`.
3. En la carpeta `backend`, instalar dependencias: `npm install`.
4. Iniciar el servidor: `npm run dev`.
5. Verificar conexión: `curl http://localhost:3000/estado-db`.

El backend inicializa automáticamente el esquema de la base de datos al arrancar.
```bash
cd backend
npm install

cd ../frontend
npm install
cd ..
```

## Variables de entorno

No coloques secretos en React ni en archivos versionados. Los archivos `.env`
locales estan ignorados por Git.

### Backend

Eso permite que el frontend solo se preocupe por renderizar la mascota según el estado del proyecto.

### Flujo GitHub Actions

1. Configurar `GITHUB_WEBHOOK_SECRET` en `backend/.env` y usar el mismo secreto en GitHub.
2. Crear un webhook apuntando a `POST /api/webhooks/project-status`.
3. Seleccionar el evento `Workflow runs` y enviar el formato JSON.
4. Conectar primero el repositorio desde el formulario del frontend.

Cuando el secreto está configurado, el backend valida `X-Hub-Signature-256` y guarda
la nueva vida en `projects` y `health_history`.
Copia el ejemplo:

```bash
cd backend
cp .env.example .env
```

En Windows PowerShell usa:

```powershell
Copy-Item .env.example .env
```

Variables disponibles en `backend/.env`:

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP del backend. Por defecto: `3000`. |
| `FRONTEND_URL` | Origen permitido para el frontend local, por ejemplo `http://127.0.0.1:5173`. |
| `GITHUB_CLIENT_ID` | Client ID de la OAuth App de GitHub. |
| `GITHUB_CLIENT_SECRET` | Client secret de GitHub. Nunca lo expongas al frontend. |
| `GITHUB_CALLBACK_URL` | URL de callback OAuth, por ejemplo `http://localhost:3000/api/auth/github/callback`. |
| `GITHUB_WEBHOOK_SECRET` | Secreto compartido para validar firmas HMAC de webhooks. |
| `SESSION_SECRET` | Secreto usado para proteger el estado temporal de OAuth. |
| `DB_HOST` | Host de PostgreSQL. Por defecto: `localhost`. |
| `DB_PORT` | Puerto de PostgreSQL. Por defecto: `5432`. |
| `POSTGRES_USER` | Usuario de PostgreSQL. |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL. |
| `POSTGRES_DB` | Nombre de la base de datos. |

Para este flujo local puedes conservar los valores por defecto de PostgreSQL y
dejar vacias las variables de GitHub si solo vas a probar la aplicacion y el
webhook simulado.

### Frontend

Copia el ejemplo:

```bash
cd frontend
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

El frontend usa:

| Variable | Uso |
| --- | --- |
| `VITE_GRAPHQL_URL` | Endpoint GraphQL. Para desarrollo: `http://127.0.0.1:3000/graphql`. |
| `VITE_SHOW_TECHNICAL_OPTIONS` | Muestra opciones tecnicas si vale `true`. |

No pongas `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` ni `GITHUB_WEBHOOK_SECRET`
en variables `VITE_*`: Vite las incluiria en el codigo del navegador.

## Levantar el proyecto completo

### 1. PostgreSQL con Docker

Desde la raiz del proyecto:

```bash
docker compose -f frontend/docker-compose.yml up -d
```

Comprueba el contenedor:

```bash
docker ps
```

Debe aparecer `devgotchi-postgres` en estado `Up`.

### 2. Backend

En una terminal nueva:

```bash
cd backend
npm run dev
```

El backend queda disponible en `http://127.0.0.1:3000`.

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

Abre `http://127.0.0.1:5173/` en el navegador.

## Verificar la conexion

Backend activo:

```bash
curl http://127.0.0.1:3000/health
```

Base de datos conectada:

```bash
curl http://127.0.0.1:3000/estado-db
```

GraphQL responde:

```bash
curl -X POST http://127.0.0.1:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { devgotchi { id nombre vida_actual repository_url } }"}'
```

En PowerShell, si `curl` no funciona como esperado:

```powershell
$body = @{ query = "query { devgotchi { id nombre vida_actual repository_url } }" } | ConvertTo-Json
Invoke-RestMethod `
  -Uri http://127.0.0.1:3000/graphql `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## Pruebas y calidad

Pruebas del backend:

```bash
cd backend
npm test
```

Incluyen evaluacion de estados, resolvers GraphQL, OAuth y firma HMAC del
webhook. Las pruebas OAuth no usan internet ni credenciales reales.

Pruebas, lint y build del frontend:

```bash
cd frontend
npm test
npm run lint
npm run build
```

## Probar el MVP completo

1. Levanta PostgreSQL, backend y frontend con los comandos anteriores.
2. Abre `http://127.0.0.1:5173/`.
3. Comprueba que aparece DevGotchi y su vida actual.
4. Pulsa **Cuidar +10** y verifica que la vida se actualiza sin recargar.
5. Introduce una URL como `https://github.com/usuario/repositorio` y pulsa
   **Conectar**.
6. Para simular actividad de un pipeline, envia un webhook local:

```bash
curl -X POST http://127.0.0.1:3000/api/webhooks/project-status \
  -H "Content-Type: application/json" \
  -d '{"project":"devgotchi/app","repository":"devgotchi/app","branch":"main","workflow":"push","status":"success"}'
```

Los estados aceptados son `success`, `failure`, `running`, `queued`, `error` y
`unknown`. El estado calculado puede consultarse con:

```bash
curl http://127.0.0.1:3000/api/projects/devgotchi/app
```

El endpoint seguro para futuros webhooks de GitHub es
`POST /api/github/webhook`; requiere `X-Hub-Signature-256` y responde `202` con
una firma valida. En este primer corte acepta el evento, pero todavia no cambia
la vida de DevGotchi.

## OAuth de GitHub

El backend expone:

```text
GET /api/auth/github
GET /api/auth/github/callback
```

El flujo usa Authorization Code, `state`, PKCE S256 y el scope minimo `read:user`.
Configura la callback exacta en la OAuth App de GitHub y en `GITHUB_CALLBACK_URL`.
Los tokens permanecen en el backend y todavia no se persisten porque esta etapa
no incluye una capa de almacenamiento de credenciales.

## Detener el entorno

Deten el backend y frontend con `Ctrl+C`. Para detener PostgreSQL:

```bash
docker compose -f frontend/docker-compose.yml down
```

Para borrar tambien los datos locales de PostgreSQL:

```bash
docker compose -f frontend/docker-compose.yml down -v
```
