-- Verify <%- projectName %>:database_functions/verify_policy_not_present on pg

begin;

select pg_get_functiondef('<%- schemaName %>_private.verify_policy_not_present(text,text)'::regprocedure);

rollback;
