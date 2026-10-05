import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const graphqlUrl =
  import.meta.env.VITE_GRAPHQL_URL || "/graphql";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphqlUrl, credentials: "include" }),
  cache: new InMemoryCache(),
});
