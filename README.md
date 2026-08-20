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
2. Para el backend: entrar a la carpeta y correr `npm install`.
3. Para el frontend: entrar a la carpeta y correr `npm install`.
4. Levantar la base de datos (próximamente vamos a agregar el archivo de Docker para esto).
