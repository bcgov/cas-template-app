-- Verify ggircs-app:mutations/create_user_from_session on pg

begin;

select pg_get_functiondef('<%- schemaName %>.create_user_from_session()'::regprocedure);

rollback;
