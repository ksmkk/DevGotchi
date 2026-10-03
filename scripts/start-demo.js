const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const rootDirectory = path.resolve(__dirname, "..");
const children = new Set();
let stopping = false;

function runNpm(args, directory, extraEnvironment = {}) {
  const child = spawn("npm", args, {
    cwd: directory,
    env: { ...process.env, ...extraEnvironment },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  children.add(child);
  child.once("exit", (code) => {
    children.delete(child);
    if (!stopping && code !== null) {
      console.error(`\nUno de los servicios terminó inesperadamente (código ${code}).`);
      stop(code || 1);
    }
  });

  return child;
}

async function endpointIsReady(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function responseIncludes(url, expectedText) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return response.ok && (await response.text()).includes(expectedText);
  } catch {
    return false;
  }
}

function portIsAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}

async function findFrontendPort() {
  for (let port = 5173; port <= 5183; port += 1) {
    const url = `http://127.0.0.1:${port}/`;
    if (await responseIncludes(url, "<title>DevGotchi</title>")) {
      return { port, running: true };
    }
    if (await portIsAvailable(port)) return { port, running: false };
  }
  throw new Error("No hay un puerto libre entre 5173 y 5183 para el frontend.");
}

async function waitForEndpoint(name, url, options, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await endpointIsReady(url, options)) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`${name} no respondió en ${url} después de ${timeoutMs / 1000}s.`);
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(exitCode), 250);
}

async function main() {
  const backendDirectory = path.join(rootDirectory, "backend");
  const frontendDirectory = path.join(rootDirectory, "frontend");
  const graphqlUrl = process.env.VITE_GRAPHQL_URL || "http://127.0.0.1:3000/graphql";
  const graphqlEndpoint = new URL(graphqlUrl);
  const backendPort = Number(
    graphqlEndpoint.port || (graphqlEndpoint.protocol === "https:" ? 443 : 80),
  );
  const graphqlProbe = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "{ __typename }" }),
  };

  if (!(await endpointIsReady(graphqlUrl, graphqlProbe))) {
    if (!["127.0.0.1", "localhost"].includes(graphqlEndpoint.hostname)) {
      throw new Error(`El backend remoto no responde en ${graphqlUrl}.`);
    }
    if (!(await portIsAvailable(backendPort))) {
      throw new Error(
        `El puerto ${backendPort} está ocupado por un servicio que no responde como DevGotchi GraphQL.`,
      );
    }
    console.log("Iniciando backend…");
    runNpm(["start"], backendDirectory, { PORT: String(backendPort) });
    await waitForEndpoint("El backend", graphqlUrl, graphqlProbe);
  } else {
    console.log(`Backend ya disponible en ${graphqlUrl}`);
  }

  const frontend = await findFrontendPort();
  const frontendUrl = `http://127.0.0.1:${frontend.port}/`;
  if (!frontend.running) {
    console.log("Iniciando frontend…");
    runNpm(
      [
        "run",
        "dev",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        String(frontend.port),
        "--strictPort",
      ],
      frontendDirectory,
      { VITE_GRAPHQL_URL: graphqlUrl },
    );
    await waitForEndpoint("El frontend", frontendUrl);
  } else {
    console.log(`Frontend ya disponible en ${frontendUrl}`);
  }

  console.log(`\nDevGotchi está listo para la demo: ${frontendUrl}`);
  console.log("Presiona Ctrl+C para detener los servicios iniciados por este comando.");

  if (children.size === 0) process.exit(0);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

main().catch((error) => {
  console.error(`\nNo se pudo iniciar la demo: ${error.message}`);
  console.error("Si faltan dependencias, ejecuta npm run install:all desde la raíz.");
  stop(1);
});
