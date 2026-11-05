-- Checks the security rules and ride actions. Run with scripts/test-db.sh.
\set ON_ERROR_STOP on
set client_min_messages = warning;

-- Users: two riders and Robert.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alex@example.com', '{"name":"Alex Morgan","phone":"0400 123 456"}'),
  ('00000000-0000-0000-0000-00000000000b', 'emma@example.com', '{"name":"Emma Wilson","phone":"0400 000 001"}'),
  ('00000000-0000-0000-0000-00000000000d', 'robert@example.com', '{"name":"Robert Burns","phone":"0400 987 654"}');
update public.profiles set role = 'driver' where email = 'robert@example.com';

create function pg_temp.act_as(who text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', case who
    when 'alex' then '00000000-0000-0000-0000-00000000000a'
    when 'emma' then '00000000-0000-0000-0000-00000000000b'
    when 'robert' then '00000000-0000-0000-0000-00000000000d' end, false);
end;
$$;
grant execute on function pg_temp.act_as(text) to authenticated;

create function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'expected an error containing "%" from: %', needle, sql;
exception when others then
  if position(needle in sqlerrm) = 0 then
    raise exception 'expected "%" but got "%" from: %', needle, sqlerrm, sql;
  end if;
end;
$$;
grant execute on function pg_temp.expect_error(text, text) to authenticated;

create function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if;
  raise notice 'ok - %', what;
end;
$$;
grant execute on function pg_temp.check(boolean, text) to authenticated;

set client_min_messages = notice;
set role authenticated;

-- Sign-up creates a rider profile from the sign-up details.
select pg_temp.act_as('alex');
select pg_temp.check((select role = 'rider' and name = 'Alex Morgan' from profiles where id = auth.uid()), 'sign-up creates a rider profile');
select pg_temp.expect_error($$update profiles set role = 'driver' where id = auth.uid()$$, 'permission denied');
update profiles set name = 'Alex M.' where id = auth.uid();
select pg_temp.check((select name = 'Alex M.' from profiles where id = auth.uid()), 'rider edits own name');

-- Booking: fare is computed on the server.
select id as alex_ride from request_ride('Newcastle', 'Nelson Bay', null, 2::smallint, 'card', 'Alex M.', '0400 123 456') \gset
select pg_temp.check((select (fare ->> 'total')::numeric = 101.05 from bookings where id = :'alex_ride'),
  'request_ride stores the server fare (62 km, 58 min = A$101.05)');
select pg_temp.expect_error($$select request_ride('Newcastle', 'Newcastle', null, 1::smallint, 'cash', 'A', '0400 000 000')$$, 'must be different');
select pg_temp.expect_error($$select request_ride('Medowie', 'Maitland', now() - interval '1 hour', 1::smallint, 'cash', 'A', '0400 000 000')$$, 'future pickup');
select pg_temp.expect_error($$insert into bookings (name, phone, pickup, destination, fare) values ('x', '0400000000', 'Newcastle', 'Medowie', '{}')$$, 'permission denied');
select pg_temp.expect_error($$update bookings set status = 'completed'$$, 'permission denied');
select pg_temp.expect_error($$select accept_booking((select id from bookings limit 1))$$, 'Only the driver');

-- Other riders cannot see it.
select pg_temp.act_as('emma');
select pg_temp.check((select count(*) = 0 from bookings), 'another rider sees none of Alex''s bookings');
select pg_temp.check((select count(*) = 0 from notifications), 'another rider sees none of Alex''s notifications');
select pg_temp.expect_error(format($$select cancel_ride(%L)$$, :'alex_ride'), 'Booking not found');
select pg_temp.expect_error(format($$select change_destination(%L, 'Maitland')$$, :'alex_ride'), 'Booking not found');

-- Robert sees and accepts it.
select pg_temp.act_as('robert');
select pg_temp.check((select count(*) = 1 from bookings), 'driver sees the request');
select pg_temp.check((select count(*) = 1 from notifications where title = 'New ride request'), 'driver is notified');
select pg_temp.check((select status = 'accepted' from accept_booking((select id from bookings where name = 'Alex M.'))), 'driver accepts');

-- A second ride at the same time clashes.
select pg_temp.act_as('emma');
select id as emma_ride from request_ride('Maitland', 'Medowie', null, 1::smallint, 'cash', 'Emma Wilson', '0400 000 001') \gset
select pg_temp.act_as('robert');
select pg_temp.expect_error(format($$select accept_booking(%L)$$, :'emma_ride'), 'Booking conflict');
select set_online(false);
select pg_temp.expect_error(format($$select accept_booking(%L)$$, :'emma_ride'), 'Set yourself available');
select set_online(true);
select pg_temp.check((select status = 'declined' from decline_booking(:'emma_ride')), 'driver declines');

-- Driver location is visible to Alex (active trip) but not Emma.
select report_location(-32.9, 151.78, 45);
select pg_temp.act_as('alex');
select pg_temp.check((select latitude = -32.9 from driver_location), 'rider with an active trip sees the driver');
select pg_temp.act_as('emma');
select pg_temp.check((select count(*) = 0 from driver_location), 'rider without a trip does not see the driver');
select pg_temp.check((select title = 'Booking unavailable' from notifications limit 1), 'declined rider is notified');

-- Change destination recomputes the fare.
select pg_temp.act_as('alex');
select pg_temp.check(
  (select destination = 'Medowie' and (fare ->> 'total')::numeric = 59.25 from change_destination((select id from bookings where name = 'Alex M.'), 'Medowie')),
  'change_destination updates the fare (A$59.25)');
select pg_temp.expect_error($$select rate_ride((select id from bookings limit 1), 5::smallint)$$, 'once it is completed');

-- Robert drives the trip to the end.
select pg_temp.act_as('robert');
select pg_temp.check((select string_agg(s::text, ',') = 'enroute,arrived,inprogress,completed'
  from (select (advance_ride((select id from bookings where name = 'Alex M.'))).status s from generate_series(1, 4)) x),
  'advance_ride walks the trip to completed');
select pg_temp.expect_error($$select advance_ride((select id from bookings where name = 'Alex M.'))$$, 'cannot move forward');

select pg_temp.act_as('alex');
select pg_temp.check((select rating = 5 from rate_ride((select id from bookings where name = 'Alex M.'), 5::smallint)), 'rider rates a completed ride');
select pg_temp.check((select count(*) = 0 from driver_location), 'driver location hidden once the trip is over');
select pg_temp.check((select count(*) >= 6 from notifications), 'rider got an update for every step');
update notifications set read = true;
select pg_temp.check((select bool_and(read) from notifications), 'rider marks updates read');
select pg_temp.expect_error($$update notifications set title = 'x'$$, 'permission denied');

-- Cancelling after acceptance charges the fee; before acceptance it is free.
select id as free_ride from request_ride('Medowie', 'Nelson Bay', now() + interval '1 day', 1::smallint, 'cash', 'Alex M.', '0400 123 456') \gset
select pg_temp.check((select cancellation_charge = 0 from cancel_ride(:'free_ride')), 'cancel before acceptance is free');
select id as fee_ride from request_ride('Medowie', 'Nelson Bay', now() + interval '2 day', 1::smallint, 'cash', 'Alex M.', '0400 123 456') \gset
select pg_temp.act_as('robert');
select accept_booking(:'fee_ride');
select pg_temp.act_as('alex');
select pg_temp.check((select cancellation_charge = 8 from cancel_ride(:'fee_ride')), 'cancel after acceptance charges A$8');
select pg_temp.expect_error(format($$select cancel_ride(%L)$$, :'fee_ride'), 'already closed');

-- Only Robert changes fares.
select pg_temp.expect_error($$select update_fare_settings(2, 1, true, 10)$$, 'Only the driver');
select pg_temp.expect_error($$update fare_settings set km_rate = 0$$, 'permission denied');
select pg_temp.act_as('robert');
select update_fare_settings(1.5, 0.4, false, 0);
select pg_temp.check((select (fare_quote('Newcastle', 'Medowie') ->> 'total')::numeric = 69.75), 'new rates apply to quotes (35 km × 1.5 + 35 min × 0.4 + 3.25)');

-- Anonymous visitors get nothing.
reset role;
set role anon;
select pg_temp.check((select count(*) = 0 from bookings), 'signed-out visitors see no bookings');
select pg_temp.expect_error($$select request_ride('Newcastle', 'Medowie', null, 1::smallint, 'cash', 'A', '0400000000')$$, 'permission denied');
reset role;

-- Payments: only the service role records outcomes; riders flag a saved card.
set role authenticated;
select pg_temp.act_as('alex');
select id as card_ride from request_ride('Newcastle', 'Maitland', now() + interval '3 day', 1::smallint, 'card', 'Alex M.', '0400 123 456') \gset
select pg_temp.check((select payment_state = 'card_saved' from mark_card_saved(:'card_ride')), 'rider marks the card saved');
select pg_temp.expect_error(format($$select record_payment(%L, 'paid', 'pi_x')$$, :'card_ride'), 'permission denied');
select register_push_token('ExponentPushToken[alex]', 'android');
select pg_temp.check((select count(*) = 1 from push_tokens), 'rider registers a push token');
reset role;
set role service_role;
select record_payment(:'card_ride', 'paid', 'pi_123');
reset role;
select pg_temp.check((select payment_state = 'paid' and stripe_payment_intent = 'pi_123' from bookings where id = :'card_ride'), 'service role records a payment');
