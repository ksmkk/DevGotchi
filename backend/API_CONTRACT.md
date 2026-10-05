# API Contract para DevGotchi

## 1. Estado base del backend

### GET /api

Devuelve un mensaje de prueba para confirmar que el backend está vivo.

Respuesta esperada:

```json
{
  "estado": "El backend de DevGotchi está vivo"
}
```

---

## 2. Health check del servicio

### GET /health

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "DevGotchi backend",
  "uptime": 35
}
```

---

## 3. Estado de la base de datos

### GET /estado-db

Ejecuta `SELECT NOW()` para comprobar que el backend puede conectarse a PostgreSQL.

Respuesta cuando la conexión funciona:

```json
{
  "ok": true,
  "conectado": true,
  "ahora": "2026-08-25T22:00:00.000Z"
}
```

---

## 4. Webhook para actualizar el estado de un proyecto

### POST /api/webhooks/project-status

Recibe el estado del proyecto o pipeline y devuelve la evaluación del DevGotchi.

#### Body de ejemplo

```json
{
  "project": "api-gateway",
  "repository": "devgotchi/api-gateway",
  "branch": "main",
  "workflow": "deploy",
  "status": "failure",
  "timestamp": "2026-08-24T22:22:18.193Z"
}
```

#### Respuesta esperada

```json
{
  "ok": true,
  "data": {
    "project": "api-gateway",
    "branch": "main",
    "workflow": "deploy",
    "status": "failure",
    "health": "critical",
    "vida": 25,
    "message": "El proyecto está en peligro: hubo una falla en la ejecución",
    "timestamp": "2026-08-24T22:22:18.193Z"
  }
}
```

---

## 5. Contrato GraphQL frontend

### Query `devgotchi`

```graphql
query {
  devgotchi {
    id
    nombre
    vida_actual
    repository_url
    devgotchiHealth
    devgotchiMood
    diagnostico {
      score
      summary
      analyzedAt
      checks { key label status detail impact source }
      recommendations
    }
  }
}
```

### Mutation `conectarRepositorio`

```graphql
mutation {
  conectarRepositorio(repositoryUrl: "https://github.com/acme/api") {
    id
    nombre
    vida_actual
    repository_url
  }
}
```

La mutación persiste el repositorio en `projects.repository_url`. La URL se
normaliza quitando espacios, el slash final y el sufijo `.git`; si el
repositorio ya existe para el usuario actual, devuelve su proyecto guardado sin
crear un duplicado. Dos usuarios pueden conectar la misma URL sin compartir estado.
La conexión también marca ese proyecto como el DevGotchi actual del usuario; por eso al
conectar o reconectar otra URL el panel cambia de repositorio y conserva la
selección después de recargar.

### Mutaciones de mascota y diagnóstico

```graphql
mutation {
  renombrarDevgotchi(projectId: "1", nombre: "Bartolo") { nombre }
}

mutation {
  analizarRepositorio(projectId: "1") {
    vida_actual
    diagnostico { score summary }
  }
}
```

`renombrarDevgotchi` cambia `projects.pet_name` sin modificar el nombre ni la
URL del repositorio. `analizarRepositorio` consulta señales públicas de GitHub
(tests, cobertura, Actions, `.gitignore` y `.env`) y analiza pasivamente archivos
de texto para encontrar credenciales redactadas, dependencias de riesgo, patrones
inseguros e IaC con almacenamiento público. Secret Scanning y Code Scanning son
fuentes complementarias. Cada check informa `source`; la ausencia de IaC se
devuelve como `not_applicable`, no como no verificable. El análisis se guarda y
se vuelve a sincronizar cada hora.

Si GitHub no permite leer el repositorio (por ejemplo, porque es privado y no
hay token), el diagnóstico queda en estado no verificable, usa una vida neutral
de 50 puntos y recomienda configurar `GITHUB_TOKEN` u OAuth. No se interpreta
un error de acceso como repositorio saludable ni como una falla de sus tests.

Los eventos `workflow_run` de GitHub Actions se normalizan usando `conclusion`,
`head_branch`, `name` y `repository`. Si `GITHUB_WEBHOOK_SECRET` está configurado,
el webhook también exige una firma `X-Hub-Signature-256` válida.

---

## 6. Consulta del estado actual por proyecto

### GET /api/projects/demo

Devuelve un DevGotchi de prueba con estado saludable y vida completa, sin
necesidad de enviar datos. Sirve para validar rápidamente que el backend corre.

Respuesta esperada:

```json
{
  "ok": true,
  "data": {
    "project": "demo-project",
    "branch": "main",
    "workflow": "demo",
    "status": "success",
    "health": "healthy",
    "vida": 100,
    "message": "Todo está bien: el pipeline pasó correctamente",
    "timestamp": "2026-08-25T12:00:00.000Z"
  }
}
```

### GET /api/projects

Devuelve la lista de todos los proyectos con su último estado evaluado.

### GET /api/projects/:projectName

Devuelve el estado actual de un proyecto en específico.

#### Ejemplo de respuesta

```json
{
  "ok": true,
  "data": {
    "project": "api-gateway",
    "branch": "main",
    "workflow": "deploy",
    "status": "failure",
    "health": "critical",
    "vida": 25,
    "message": "El proyecto está en peligro: hubo una falla en la ejecución",
    "timestamp": "2026-08-24T22:22:18.193Z",
    "updatedAt": "2026-08-24T22:22:18.193Z"
  }
}
```

---

## 7. Mapeo del DevGotchi

| status del proyecto | health | vida | mensaje |
|---|---:|---:|---|
| success / passed | healthy | 100 | Todo está bien: el pipeline pasó correctamente |
| in_progress / running / queued | warning | 60 | El proyecto está en ejecución y aún no hay resultado final |
| failure / failed / error | critical | 25 | El proyecto está en peligro: hubo una falla en la ejecución |
| desconocido | unknown | 50 | Estado desconocido recibido por el backend |

---

## 8. Observaciones para frontend

El frontend solo debe depender de los campos:

- `project`
- `status`
- `health`
- `vida`
- `message`
- `timestamp`

Con eso puede pintar:

- color del DevGotchi
- nivel de vida
- mensaje del estado
- nombre del proyecto
- último timestamp de actualización
