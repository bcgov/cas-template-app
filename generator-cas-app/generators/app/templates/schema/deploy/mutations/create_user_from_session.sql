-- Deploy ggircs-app:mutations/create_user_from_session to pg

begin;

create or replace function <%- schemaName %>.create_user_from_session()
returns <%- schemaName %>.<%- userTable %>
as $function$
declare
  jwt <%- schemaName %>.keycloak_jwt;
  result <%- schemaName %>.<%- userTable %>;
begin
  select * from <%- schemaName %>.session() into jwt;

  if ((select count(*) from <%- schemaName %>.<%- userTable %> where uuid = jwt.sub) = 0) then
    insert into <%- schemaName %>.<%- userTable %>(uuid, first_name, last_name, email_address)
    values (jwt.sub, jwt.given_name, jwt.family_name, jwt.email);
  end if;


  select * from <%- schemaName %>.<%- userTable %> where uuid = jwt.sub into result;
  return result;
end;
$function$ language plpgsql strict volatile;

grant execute on function <%- schemaName %>.create_user_from_session to <%- authenticatedRoles.join(", ") %>;

commit;
