import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL;

if (!graphqlUrl) {
  throw new Error(
    "Falta VITE_GRAPHQL_URL. Copia frontend/.env.example como frontend/.env.",
  );
}

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphqlUrl }),
  cache: new InMemoryCache(),
});
