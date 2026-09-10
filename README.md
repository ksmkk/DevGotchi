# Proyecto 1: DevGotchi

Este es el repositorio de DevGotchi, nuestro proyecto para arquitectura de sistemas. Básicamente es un tamagotchi pensado para monitorear pipelines.

### El problema
Revisar el estado de los servidores o los pipelines de CI/CD es aburrido, y la verdad es que muchas veces terminamos ignorando las alertas que llegan.

### Nuestra solución
Vamos a hacer una mascota virtual web. La lógica es simple:
- Si los pipelines de GitHub Actions pasan a verde, la mascota come y está feliz.
- Si un pipeline falla o se cae un servidor, la mascota se enferma o pierde vida.

### Stack tecnológico
Decidimos usar las siguientes herramientas para el desarrollo:
- Backend: Node.js
- Frontend: React
- Base de datos: SQL
- Consultas: GraphQL

Para conectar todo, vamos a usar REST API para recibir los webhooks desde GitHub Actions cuando termine un pipeline. Después, vamos a usar WebSockets para actualizar la salud del tamagotchi en el frontend en tiempo real.

### Requisitos de la rúbrica
Tenemos dos objetivos principales para aprobar esta parte:
1. Lograr un 60% de coverage en los tests (nos vamos a enfocar en testear la función de sumar/restar vida que es la más sencilla).
2. Dockerizar la aplicación.

### Cómo correr el proyecto localmente
(Nota: esto lo vamos a ir actualizando a medida que avancemos con el código)

1. Clonar el repositorio.
2. Para el backend:
   - Entrar a la carpeta `backend`.
   - Instalar dependencias con `npm install`.
   - Levantar el servidor con `npm run dev`.
3. Para el frontend: entrar a la carpeta y correr `npm install`.
4. Levantar la base de datos siguiendo la sección de PostgreSQL.

### Base de datos PostgreSQL

1. Instalar dependencias del backend con `npm install` dentro de `backend`.
2. Desde la raíz del proyecto, iniciar PostgreSQL con `docker compose up -d`.
3. El archivo `docker-compose.yml` configura `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB`; acepta valores personalizados mediante variables de entorno.
4. Iniciar el backend con `npm run dev` dentro de `backend`.
5. Al iniciar, el backend crea automáticamente la tabla `devgotchi` mediante `backend/src/db/schema.sql`.
6. Verificar la conexión en `http://localhost:3000/estado-db`.

La tabla inicial contiene únicamente `id`, `nombre` y `vida_actual`.

### Backend inicial
El backend se encuentra en la carpeta `backend` y ya está configurado con:
- `express` para crear el servidor web.
- `nodemon` para reiniciar el servidor automáticamente durante el desarrollo.
- un endpoint inicial en la ruta `/` que devuelve:
  `{"estado": "El backend de DevGotchi está vivo"}`

### API contract para frontend
El backend ya define el contrato de datos para el frontend en el archivo `backend/API_CONTRACT.md`.
Allí se documentan los endpoints y el formato JSON que el frontend debe consumir para pintar el DevGotchi.

### Evaluación del DevGotchi
La lógica de evaluación ya está implementada y validada con pruebas. El backend recibe el estado del proyecto, lo interpreta y devuelve:
- `health`
- `vida`
- `message`
- `status`
- `timestamp`

Eso permite que el frontend solo se preocupe por renderizar la mascota según el estado del proyecto.

### GraphQL

El frontend usa Apollo Client y obtiene el endpoint desde `VITE_GRAPHQL_URL`. Para
desarrollo, copia `frontend/.env.example` como `frontend/.env`; su valor inicial apunta
a `http://localhost:3000/graphql`. La consulta `GetDevGotchi` incluye estados de carga,
error y reintento.

El diagnóstico de conexión GraphQL no se muestra en la vista principal. Para habilitarlo
en el apartado plegable **Opciones técnicas**, define
`VITE_SHOW_TECHNICAL_OPTIONS=true` al compilar el frontend. Esta bandera separa la
interfaz general de la información técnica; si el proyecto incorpora cuentas y roles,
el backend deberá autorizar también el acceso para que la restricción sea segura.
