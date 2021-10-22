import { getUserGroupLandingRoute } from "../../lib/userGroups";
import { getUserGroups } from "../helpers/userGroupAuthentication";
import ssoUtils from "@bcgov-cas/sso-express";

const AS_CYPRESS = process.argv.includes("AS_CYPRESS");
<% authenticatedRoles.forEach(role => { %>
  const AS_<%- role.toUpperCase() %> = process.argv.includes("AS_<%- role.toUpperCase() %>");
<% }) %>

const mockLogin = <%- authenticatedRoles.map(role => `AS_${role.toUpperCase()}`).join(" || ") %>;
const mockSessionTimeout = mockLogin || AS_CYPRESS;

let ssoServerHost;
if (!process.env.NAMESPACE || process.env.NAMESPACE.endsWith("-dev"))
  ssoServerHost = "dev.oidc.gov.bc.ca";
else if (process.env.NAMESPACE.endsWith("-test"))
  ssoServerHost = "test.oidc.gov.bc.ca";
else ssoServerHost = "oidc.gov.bc.ca";

const keycloakConfig = {
  realm: "pisrwwhx",
  "auth-server-url": `https://${ssoServerHost}/auth`,
  "ssl-required": "external",
  resource: "<%- projectName %>",
  "public-client": true,
  "confidential-port": 0,
};

export let keycloak;

export default function middleware(sessionStore) {
  const { ssoMiddleware, keycloak: keycloakObj } = new ssoUtils({
    applicationHost: process.env.HOST,
    applicationDomain: ".gov.bc.ca",
    sessionStore,
    getLandingRoute: (req) => {
      if (req.query.redirectTo) return req.query.redirectTo;

      const groups = getUserGroups(req);
      console.log("groups", groups);
      console.log("landingroute", getUserGroupLandingRoute(groups));

      return getUserGroupLandingRoute(groups);
    },
    bypassAuthentication: {
      login: mockLogin,
      sessionIdleRemainingTime: mockSessionTimeout,
    },
    accessDenied: (_req, res) => res.redirect("/403"),
    keycloakConfig,
  });

  keycloak = keycloakObj;

  return ssoMiddleware;
}
