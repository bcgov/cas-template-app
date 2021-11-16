-- Revert ggircs-app:mutations/create_user_from_session from pg

begin;

drop function <%- schemaName %>.create_user_from_session;

commit;
