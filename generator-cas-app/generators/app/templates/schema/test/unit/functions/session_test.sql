
begin;

select plan(2);

select has_function('<%- schemaName %>', 'session', 'function <%- schemaName %>.session exists');

set jwt.claims.sub to '11111111-1111-1111-1111-111111111111';
select is((select sub from <%- schemaName %>.session()), '11111111-1111-1111-1111-111111111111'::uuid, 'The session sub is determined by the jwt.claims.sub setting');

select finish();

rollback;
