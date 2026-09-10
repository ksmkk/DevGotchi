import http from "node:http";

const PORT = 3000;
let devgotchi = {
  __typename: "DevGotchi",
  id: "1",
  nombre: "Pixel",
  vida_actual: 72,
  repository_url: null,
};

function sendJson(response, body, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "content-type");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "POST" || request.url !== "/graphql") {
    sendJson(response, { errors: [{ message: "Ruta no encontrada" }] }, 404);
    return;
  }

  let requestBody = "";
  request.on("data", (chunk) => { requestBody += chunk; });
  request.on("end", () => {
    try {
      const { query = "", variables = {} } = JSON.parse(requestBody);

      if (query.includes("cuidarDevgotchi")) {
        devgotchi = {
          ...devgotchi,
          vida_actual: Math.min(100, devgotchi.vida_actual + 10),
        };
        sendJson(response, { data: { cuidarDevgotchi: devgotchi } });
        return;
      }

      if (query.includes("conectarRepositorio")) {
        devgotchi = { ...devgotchi, repository_url: variables.repositoryUrl };
        sendJson(response, { data: { conectarRepositorio: devgotchi } });
        return;
      }

      sendJson(response, { data: { devgotchi } });
    } catch {
      sendJson(response, { errors: [{ message: "Petición inválida" }] }, 400);
    }
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-undef
  console.log(`Mock GraphQL disponible en http://localhost:${PORT}/graphql`);
});
