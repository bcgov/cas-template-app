import delay from "delay";
import express from "express";
import http from "http";
import morgan from "morgan";
import nextjs from "next";
import bodyParser from "body-parser";
import Keycloak from "keycloak-connect";
import cookieParser from "cookie-parser";
import { createLightship } from "lightship";
import session from "./middleware/session";
import browserSupportMiddleware from "./middleware/browserSupport";
import headersMiddleware from "./middleware/headers";
import graphQlMiddleware from "./middleware/graphql";
import { getUserGroupLandingRoute } from "../lib/userGroups";
import { getSessionRemainingTime } from "./helpers/keycloakHelpers";
import { getUserGroups } from "./helpers/userGroupAuthentication";
import { pgPool } from "./db";

const port = Number.parseInt(process.env.PORT, 10) || 3004;
const dev = process.env.NODE_ENV !== "production";
const app = nextjs({ dev });
const handle = app.getRequestHandler();

/**
 * Override keycloak accessDenied handler to redirect to our 403 page
 */
Keycloak.prototype.accessDenied = ({ res }) => res.redirect("/403");

const NO_AUTH = process.argv.includes("NO_AUTH");
const AS_REPORTER = process.argv.includes("AS_REPORTER");
const AS_ANALYST = process.argv.includes("AS_ANALYST");
const AS_ADMIN = process.argv.includes("AS_ADMIN");
const AS_PENDING = process.argv.includes("AS_PENDING");
const AS_CYPRESS = process.argv.includes("AS_CYPRESS");

const getRedirectURL = (req) => {
  if (req.query.redirectTo) return req.query.redirectTo;

  const groups = getUserGroups(req);

  return getUserGroupLandingRoute(groups);
};

app.prepare().then(async () => {
  const server = express();

  // nginx proxy is running in the same pod
  server.set("trust proxy", "loopback");

  const lightship = createLightship();

  lightship.registerShutdownHandler(async () => {
    await delay(10000);
    await new Promise((resolve) => {
      server.close(() => pgPool.end().then(resolve));
    });
  });

  server.use(headersMiddleware());

  server.use(morgan("combined"));

  server.use(bodyParser.json({ limit: "50mb" }));

  server.use("/", browserSupportMiddleware());

  const { middleware: sessionMiddleware, store: sessionStore } = session();
  server.use(sessionMiddleware);

  // Keycloak instantiation for dev/test/prod
  const kcConfig = {
    realm: "pisrwwhx",
    "auth-server-url": `https://dev-oidc.gov.bc.ca/auth`,
    "ssl-required": "external",
    resource: "cas-ciip-portal",
    "public-client": true,
    "confidential-port": 0,
  };
  const kcRegistrationUrl = `${kcConfig["auth-server-url"]}/realms/${
    kcConfig.realm
  }/protocol/openid-connect/registrations?client_id=${
    kcConfig.resource
  }&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(
    `${process.env.HOST}/login?auth_callback=1`
  )}`;
  const keycloak = new Keycloak({ store: sessionStore }, kcConfig);

  // Nuke the siteminder session token on logout if we can
  // this will be ignored by the user agent unless we're
  // currently deployed to a subdomain of gov.bc.ca
  server.post("/logout", (_req, res, next) => {
    res.clearCookie("SMSESSION", { domain: ".gov.bc.ca", secure: true });
    next();
  });

  // Retrieves keycloak grant for the session
  server.use(
    keycloak.middleware({
      logout: "/logout",
      admin: "/",
    })
  );

  // Returns the time, in seconds, before the refresh_token expires.
  // This corresponds to the SSO idle timeout configured in keycloak.
  server.get("/session-idle-remaining-time", async (req, res) => {
    if (
      NO_AUTH ||
      AS_ADMIN ||
      AS_ANALYST ||
      AS_PENDING ||
      AS_REPORTER ||
      AS_CYPRESS
    ) {
      return res.json(3600);
    }

    if (!req.kauth || !req.kauth.grant) {
      return res.json(null);
    }

    return res.json(await getSessionRemainingTime(keycloak, req, res));
  });

  // For any request (other than getting the remaining idle time), refresh the grant
  // if needed. If the access token is expired (defaults to 5min in keycloak),
  // the refresh token will be used to get a new access token, and the refresh token expiry will be updated.
  server.use(async (req, res, next) => {
    if (req.kauth && req.kauth.grant) {
      try {
        const grant = await keycloak.getGrant(req, res);
        await keycloak.grantManager.ensureFreshness(grant);
      } catch (error) {
        return next(error);
      }
    }
    next();
  });

  // This ensures grant freshness with the next directive - we just return a success response code.
  server.get("/extend-session", async (req, res) => {
    return res.json(await getSessionRemainingTime(keycloak, req, res));
  });

  server.use(cookieParser());

  server.use(graphQlMiddleware());

  server.post("/login", keycloak.protect(), (req, res) =>
    // This request handler gets called on a POST to /login if the user is already authenticated
    res.redirect(302, getRedirectURL(req))
  );

  // Keycloak callbak; do not keycloak.protect() to avoid users being authenticated against their will via XSS attack
  server.get("/login", (req, res) => res.redirect(302, getRedirectURL(req)));

  server.get("/register", ({ res }) => res.redirect(302, kcRegistrationUrl));

  server.get("*", async (req, res) => {
    return handle(req, res);
  });

  http
    .createServer(server)
    .listen(port, () => {
      lightship.signalReady();
      console.log(`> Ready on http://localhost:${port}`);
    })
    .on("error", (err) => {
      console.error(err);
      lightship.shutdown();
    });
});
