# Investigacion: cliente GraphQL en React

> Documento temporal para dejar registro de la tarea de la semana 2.

## Objetivo

Investigar como integrar un cliente GraphQL en React usando Apollo Client o urql.

## Recomendacion para DevGotchi

Se recomienda **Apollo Client** porque ofrece:

- Cache automatica de consultas.
- Hooks `useQuery` y `useMutation`.
- Estados integrados de carga, error y datos.
- Refetch y polling para actualizar la vida del DevGotchi.

## Instalacion con Apollo Client

Desde la carpeta del frontend:

```bash
npm install @apollo/client graphql rxjs
```

## Conexion del cliente React

El cliente GraphQL se conectara al backend mediante `http://localhost:3000/graphql`.
React no se conecta directamente a PostgreSQL.

La arquitectura sera:

```text
React + Apollo Client -> Backend GraphQL -> PostgreSQL
```

Configuracion basica:

```jsx
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';

const client = new ApolloClient({
  link: new HttpLink({
    uri: 'http://localhost:3000/graphql',
  }),
  cache: new InMemoryCache(),
});

<ApolloProvider client={client}>
  <App />
</ApolloProvider>;
```

## Consulta esperada para DevGotchi

```jsx
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const GET_DEVGOTCHI = gql`
  query GetDevGotchi {
    devgotchi {
      id
      nombre
      vida_actual
    }
  }
`;

function DevGotchi() {
  const { loading, error, data } = useQuery(GET_DEVGOTCHI);

  if (loading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return <p>{data.devgotchi.nombre}: {data.devgotchi.vida_actual}</p>;
}
```

## Alternativa: urql

Instalacion:

```bash
npm install urql graphql
```

Configuracion basica:

```jsx
import { createClient, Provider } from 'urql';

const client = createClient({
  url: 'http://localhost:3000/graphql',
});

<Provider value={client}>
  <App />
</Provider>;
```

urql es mas pequeno y simple. Apollo Client es la opcion recomendada para este proyecto por sus herramientas de cache y actualizacion de datos.

## Estado actual del proyecto

El backend actual utiliza REST y PostgreSQL. Para conectar Apollo Client o urql sera necesario implementar posteriormente:

1. Un endpoint GraphQL en `/graphql`.
2. Un esquema GraphQL para `devgotchi`.
3. Resolvers que consulten PostgreSQL mediante el pool existente.

## Fuentes oficiales

- Apollo Client: https://www.apollographql.com/docs/react/get-started
- Apollo Queries: https://www.apollographql.com/docs/react/data/queries
- urql para React: https://nearform.com/open-source/urql/docs/basics/react-preact/
