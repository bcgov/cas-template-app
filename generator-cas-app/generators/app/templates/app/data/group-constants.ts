export const GUEST = "Guest";
export const NON_IDIR_USER = "NON_IDIR_USER";
export const UNAUTHORIZED_IDIR_USER = "UNAUTHORIZED_IDIR_USER";
export const REALM_ADMINISTRATOR = "Realm Administrator";
<% authenticatedRoles.forEach((role) => { %>
export const <%- role.toUpperCase() %> = "<%- role %>";
<% }) %>

export const ADMIN_ROLES = [REALM_ADMINISTRATOR, <%- adminRole.toUpperCase() %>];

