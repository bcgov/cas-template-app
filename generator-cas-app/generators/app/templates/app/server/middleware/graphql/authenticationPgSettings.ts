import { getPriorityGroup } from "../../../lib/userGroups";
import { getUserGroups } from "../../helpers/userGroupAuthentication";
import groupData from "../../../data/groups.json";

const AUTH_BYPASS_COOKIE = "mocks.auth";
<% roles.forEach(role => { %>
const AS_<%- role.toUpperCase() %> = process.argv.includes("AS_<%- role.toUpperCase() %>");
<% }) %>

const AS_UNAUTHORIZED_IDIR = process.argv.includes("AS_UNAUTHORIZED_IDIR");
const AS_CYPRESS = process.argv.includes("AS_CYPRESS");

const allowCypressForRole = (roleName, req) => {
  return AS_CYPRESS && req.cookies[AUTH_BYPASS_COOKIE] === roleName;
};

const authenticationPgSettings = (req) => {
<% roles.forEach((role, index) => { %>
  if (AS_<%- role.toUpperCase() %> || allowCypressForRole("<%- role %>", req)) {
    return {
      "jwt.claims.sub": "<%- '00000000-0000-0000-0000-00000000000' + index %>",
      "jwt.claims.user_groups": "<%- role %>",
      "jwt.claims.priority_group": "<%- role %>",
      role: "<%- role %>",
    };
  }
<% }) %>

  if (AS_UNAUTHORIZED_IDIR || allowCypressForRole("unauthorized_idir", req)) {
    return {
      "jwt.claims.sub": "00000000-0000-0000-0000-000000000000",
      "jwt.claims.user_groups": "UNAUTHORIZED_IDIR",
      "jwt.claims.priority_group": "UNAUTHORIZED_IDIR",
      role: "ciip_guest",
    };
  }

  const groups = getUserGroups(req);
  const priorityGroup = getPriorityGroup(groups);

  const claims = {
    role: groupData[priorityGroup].pgRole,
  };
  if (
    !req.kauth ||
    !req.kauth.grant ||
    !req.kauth.grant.id_token ||
    !req.kauth.grant.id_token.content
  )
    return {
      ...claims,
    };

  const token = req.kauth.grant.id_token.content;

  token.user_groups = groups.join(",");
  token.priority_group = priorityGroup;

  const properties = [
    "jti",
    "exp",
    "nbf",
    "iat",
    "iss",
    "aud",
    "sub",
    "typ",
    "azp",
    "auth_time",
    "session_state",
    "acr",
    "email_verified",
    "name",
    "preferred_username",
    "given_name",
    "family_name",
    "email",
    "broker_session_id",
    "user_groups",
    "priority_group",
  ];
  properties.forEach((property) => {
    claims[`jwt.claims.${property}`] = token[property];
  });

  return {
    ...claims,
  };
};

export default authenticationPgSettings;
