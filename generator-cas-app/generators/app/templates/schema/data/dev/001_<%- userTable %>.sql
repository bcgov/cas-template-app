begin;

insert into <%- schemaName %>.<%- userTable %> (uuid, first_name, last_name, email_address)
values
<% authenticatedRoles.forEach((role,index) => { %>
  ('<%- '00000000-0000-0000-0000-00000000000' + index %>', '<%- role %>', 'Testuser', '<%- role %>@somemail.com')<%- index < roles.length - 1 ? ',' : '' %>
<% }) %>
on conflict (uuid) do update set
uuid = excluded.uuid,
first_name = excluded.first_name,
last_name = excluded.last_name,
email_address = excluded.email_address;

commit;
