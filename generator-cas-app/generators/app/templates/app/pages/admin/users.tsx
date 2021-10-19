import DefaultLayout from "components/Layout/DefaultLayout";
import { withRelay, RelayProps } from "relay-nextjs";
import { graphql, usePreloadedQuery } from "react-relay/hooks";
import { usersQuery } from "__generated__/usersQuery.graphql";
import withRelayOptions from "lib/relay/withRelayOptions";

const UsersQuery = graphql`
  query usersQuery {
    query {
      session {
        ...DefaultLayout_session
      }
      all<%- pascalCaseUserTable %>s {
        edges {
          node {
            id
            firstName
            lastName
          }
        }
      }
    }
  }
`;

function Users({ preloadedQuery }: RelayProps<{}, usersQuery>) {
  const { query } = usePreloadedQuery(UsersQuery, preloadedQuery);
  console.log("rendering", query);
  return (
    <DefaultLayout session={query.session}>
      <ul>
        {query.allTestAppUsers.edges.map(({ node }) => (
          <li key={node.id}>
            {node.firstName} {node.lastName}
          </li>
        ))}
      </ul>
    </DefaultLayout>
  );
}

export default withRelay(Users, UsersQuery, withRelayOptions);
