begin;
select plan(2);

select has_function(
  '<%- schemaName %>', 'create_user_from_session',
  'Function create_user_from_session should exist'
);

-- Add a user via create_user_from_session()
set jwt.claims.sub to '11111111-1111-1111-1111-111111111111';
set jwt.claims.given_name to 'Bob';
set jwt.claims.family_name to 'Loblaw';
set jwt.claims.email to 'bob.loblaw@gov.bc.ca';

select <%- schemaName %>.create_user_from_session();

select results_eq (
  $$
    select first_name, last_name, email_address, uuid
    from <%- schemaName %>.<%- userTable %>
    where uuid = '11111111-1111-1111-1111-111111111111'::uuid
  $$,
  $$
  values (
    'Bob'::varchar(1000),
    'Loblaw'::varchar(1000),
    'bob.loblaw@gov.bc.ca'::varchar(1000),
    '11111111-1111-1111-1111-111111111111'::uuid
  )
  $$,
  'create_user_from_session() successfully creates a user'
);

select finish();
rollback;
