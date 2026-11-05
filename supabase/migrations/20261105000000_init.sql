-- BVR Rideshare: schema, security rules and ride actions.
--
-- Clients never write bookings directly. Every change goes through a
-- security-definer function below, which checks who is calling, validates
-- the transition and records the matching notifications. Fares are always
-- computed here, from the routes table and the driver's fare settings.

-- ---------------------------------------------------------------- types

create type public.app_role as enum ('rider', 'driver');
create type public.service_area as enum ('Newcastle', 'Medowie', 'Maitland', 'Nelson Bay');
create type public.booking_status as enum ('requested', 'accepted', 'enroute', 'arrived', 'inprogress', 'completed', 'cancelled', 'declined');
create type public.payment_method as enum ('cash', 'card');
create type public.payment_state as enum ('none', 'card_saved', 'processing', 'paid', 'failed');

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'rider',
  name text not null default '' check (char_length(name) <= 80),
  phone text not null default '' check (char_length(phone) <= 30),
  email text not null default '',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- Single row: the driver's rates and cancellation policy.
create table public.fare_settings (
  id boolean primary key default true check (id),
  km_rate numeric(6, 2) not null default 1.25 check (km_rate >= 0),
  min_rate numeric(6, 2) not null default 0.35 check (min_rate >= 0),
  cancellation_enabled boolean not null default true,
  cancellation_fee numeric(6, 2) not null default 8 check (cancellation_fee >= 0),
  -- Fixed per-trip fees (AUD), from the client questionnaire.
  nsw_levy numeric(6, 2) not null default 1.25,
  ctp_fee numeric(6, 2) not null default 1.00,
  admin_fee numeric(6, 2) not null default 1.00,
  updated_at timestamptz not null default now()
);
insert into public.fare_settings default values;

-- Road distance and drive time between service areas (one row per pair, either order).
create table public.routes (
  a public.service_area not null,
  b public.service_area not null,
  km integer not null check (km > 0),
  minutes integer not null check (minutes > 0),
  primary key (a, b)
);
insert into public.routes (a, b, km, minutes) values
  ('Newcastle', 'Medowie', 35, 35),
  ('Newcastle', 'Maitland', 34, 34),
  ('Newcastle', 'Nelson Bay', 62, 58),
  ('Medowie', 'Maitland', 39, 40),
  ('Medowie', 'Nelson Bay', 37, 36),
  ('Maitland', 'Nelson Bay', 69, 67);

-- Single row: whether the driver is taking bookings.
create table public.driver_status (
  id boolean primary key default true check (id),
  online boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.driver_status default values;

-- Single row: the driver's last reported position.
create table public.driver_location (
  id boolean primary key default true check (id),
  latitude double precision,
  longitude double precision,
  heading double precision,
  updated_at timestamptz not null default now()
);
insert into public.driver_location default values;

create sequence public.booking_number start 3101;

create table public.bookings (
  id text primary key default ('BVR-' || nextval('public.booking_number')),
  rider_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (char_length(phone) between 6 and 30),
  pickup public.service_area not null,
  destination public.service_area not null,
  scheduled_at timestamptz, -- null means "ride now"
  passengers smallint not null default 1 check (passengers between 1 and 6),
  payment public.payment_method not null default 'cash',
  payment_state public.payment_state not null default 'none',
  status public.booking_status not null default 'requested',
  fare jsonb not null,
  cancellation_charge numeric(6, 2) not null default 0,
  rating smallint not null default 0 check (rating between 0 and 5),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint different_stops check (pickup <> destination)
);
create index bookings_rider_idx on public.bookings (rider_id, created_at desc);
create index bookings_status_idx on public.bookings (status);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  title text not null,
  message text not null,
  booking_id text references public.bookings (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers

create function public.is_driver() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'driver');
$$;

-- Fare for a trip at the current settings: distance + time + fixed fees.
create function public.fare_quote(p_pickup public.service_area, p_destination public.service_area) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r routes;
  s fare_settings;
  dist numeric;
  tm numeric;
begin
  if p_pickup = p_destination then
    raise exception 'Pickup and destination must be different.' using errcode = 'P0001';
  end if;
  select * into r from routes where (a = p_pickup and b = p_destination) or (a = p_destination and b = p_pickup);
  if not found then
    raise exception 'That route is outside the service area.' using errcode = 'P0001';
  end if;
  select * into s from fare_settings;
  dist := round(r.km * s.km_rate, 2);
  tm := round(r.minutes * s.min_rate, 2);
  return jsonb_build_object(
    'km', r.km, 'min', r.minutes, 'distance', dist, 'time', tm,
    'nsw', s.nsw_levy, 'ctp', s.ctp_fee, 'admin', s.admin_fee,
    'total', round(dist + tm + s.nsw_levy + s.ctp_fee + s.admin_fee, 2));
end;
$$;

create function public.notify_user(p_user uuid, p_role public.app_role, p_title text, p_message text, p_booking text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, role, title, message, booking_id)
  select p_user, p_role, p_title, p_message, p_booking where p_user is not null;
$$;

create function public.notify_driver(p_title text, p_message text, p_booking text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, role, title, message, booking_id)
  select id, 'driver', p_title, p_message, p_booking from profiles where role = 'driver';
$$;

create function public.money(n numeric) returns text language sql immutable as $$
  select 'A$' || to_char(n, 'FM999990.00');
$$;

-- Locks a booking for update, or raises a friendly error.
create function public.lock_booking(p_id text) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = p_id for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  return b;
end;
$$;

-- ---------------------------------------------------------------- new users

-- Every sign-up becomes a rider. The driver account is promoted once, by hand:
--   update public.profiles set role = 'driver' where email = '<robert's email>';
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- ride actions

create function public.request_ride(
  p_pickup public.service_area,
  p_destination public.service_area,
  p_scheduled_at timestamptz,
  p_passengers smallint,
  p_payment public.payment_method,
  p_name text,
  p_phone text
) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to book.' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Please enter your name and phone number.' using errcode = 'P0001';
  end if;
  if p_scheduled_at is not null and p_scheduled_at <= now() then
    raise exception 'Choose a future pickup date and time.' using errcode = 'P0001';
  end if;
  insert into bookings (rider_id, name, phone, pickup, destination, scheduled_at, passengers, payment, fare)
  values (auth.uid(), trim(p_name), trim(p_phone), p_pickup, p_destination, p_scheduled_at,
          coalesce(p_passengers, 1), coalesce(p_payment, 'cash'), fare_quote(p_pickup, p_destination))
  returning * into b;
  perform notify_driver('New ride request', format('%s requested %s → %s.', b.name, b.pickup, b.destination), b.id);
  perform notify_user(b.rider_id, 'rider', 'Booking request sent', format('Your request %s has been sent to Robert.', b.id), b.id);
  return b;
end;
$$;

create function public.accept_booking(p_id text) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b bookings;
  t timestamptz;
begin
  if not is_driver() then raise exception 'Only the driver can accept bookings.' using errcode = 'P0001'; end if;
  b := lock_booking(p_id);
  if b.status <> 'requested' then raise exception 'This request is no longer available.' using errcode = 'P0001'; end if;
  if not (select online from driver_status) then
    raise exception 'Set yourself available before accepting.' using errcode = 'P0001';
  end if;
  t := coalesce(b.scheduled_at, b.created_at);
  if exists (
    select 1 from bookings x
    where x.id <> b.id and x.status in ('accepted', 'enroute', 'arrived', 'inprogress')
      and abs(extract(epoch from coalesce(x.scheduled_at, x.created_at) - t)) < 90 * 60
  ) then
    raise exception 'Booking conflict: another active trip is within 90 minutes.' using errcode = 'P0001';
  end if;
  update bookings set status = 'accepted', accepted_at = now() where id = b.id returning * into b;
  perform notify_user(b.rider_id, 'rider', 'Ride confirmed', format('Robert has accepted booking %s.', b.id), b.id);
  return b;
end;
$$;

create function public.decline_booking(p_id text) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  if not is_driver() then raise exception 'Only the driver can decline bookings.' using errcode = 'P0001'; end if;
  b := lock_booking(p_id);
  if b.status <> 'requested' then raise exception 'This request is no longer available.' using errcode = 'P0001'; end if;
  update bookings set status = 'declined' where id = b.id returning * into b;
  perform notify_user(b.rider_id, 'rider', 'Booking unavailable', format('Robert could not accept booking %s.', b.id), b.id);
  return b;
end;
$$;

-- Moves an accepted ride one step: accepted → enroute → arrived → inprogress → completed.
create function public.advance_ride(p_id text) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b bookings;
  nxt booking_status;
  msg text[];
begin
  if not is_driver() then raise exception 'Only the driver can update a trip.' using errcode = 'P0001'; end if;
  b := lock_booking(p_id);
  nxt := case b.status
    when 'accepted' then 'enroute' when 'enroute' then 'arrived'
    when 'arrived' then 'inprogress' when 'inprogress' then 'completed' end;
  if nxt is null then raise exception 'This trip cannot move forward.' using errcode = 'P0001'; end if;
  update bookings set status = nxt, completed_at = case when nxt = 'completed' then now() end
  where id = b.id returning * into b;
  msg := case nxt
    when 'enroute' then array['Driver on the way', 'Robert is heading to your pickup.']
    when 'arrived' then array['Driver arrived', 'Robert is waiting at your pickup.']
    when 'inprogress' then array['Trip started', format('Enjoy your ride to %s.', b.destination)]
    else array['Trip completed', 'Your receipt is ready. Rate your ride.'] end;
  perform notify_user(b.rider_id, 'rider', msg[1], msg[2], b.id);
  return b;
end;
$$;

-- Rider cancels. A fee applies once the driver has accepted, if enabled.
create function public.cancel_ride(p_id text) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b bookings;
  s fare_settings;
  charge numeric := 0;
begin
  b := lock_booking(p_id);
  if b.rider_id is distinct from auth.uid() and not is_driver() then
    raise exception 'Booking not found.' using errcode = 'P0001';
  end if;
  if b.status in ('completed', 'cancelled', 'declined') then
    raise exception 'This booking is already closed.' using errcode = 'P0001';
  end if;
  select * into s from fare_settings;
  if s.cancellation_enabled and b.status in ('accepted', 'enroute', 'arrived', 'inprogress') and b.rider_id = auth.uid() then
    charge := s.cancellation_fee;
  end if;
  update bookings set status = 'cancelled', cancelled_at = now(), cancellation_charge = charge
  where id = b.id returning * into b;
  perform notify_driver('Booking cancelled',
    format('%s cancelled %s%s.', b.name, b.id, case when charge > 0 then format(' (cancellation fee %s)', money(charge)) else '' end), b.id);
  perform notify_user(b.rider_id, 'rider', 'Ride cancelled', format('Booking %s has been cancelled.', b.id), b.id);
  return b;
end;
$$;

create function public.change_destination(p_id text, p_destination public.service_area) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b bookings;
  old_dest service_area;
begin
  b := lock_booking(p_id);
  if b.rider_id is distinct from auth.uid() then raise exception 'Booking not found.' using errcode = 'P0001'; end if;
  if b.status not in ('requested', 'accepted', 'enroute', 'arrived', 'inprogress') then
    raise exception 'This booking is already closed.' using errcode = 'P0001';
  end if;
  if p_destination = b.pickup then raise exception 'Choose a destination different from pickup.' using errcode = 'P0001'; end if;
  if p_destination = b.destination then return b; end if;
  old_dest := b.destination;
  update bookings set destination = p_destination, fare = fare_quote(b.pickup, p_destination)
  where id = b.id returning * into b;
  perform notify_driver('Destination changed', format('%s changed destination from %s to %s for %s.', b.name, old_dest, p_destination, b.id), b.id);
  perform notify_user(b.rider_id, 'rider', 'Destination updated', format('New destination: %s. Fare estimate updated.', p_destination), b.id);
  return b;
end;
$$;

create function public.rate_ride(p_id text, p_stars smallint) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  b := lock_booking(p_id);
  if b.rider_id is distinct from auth.uid() then raise exception 'Booking not found.' using errcode = 'P0001'; end if;
  if b.status <> 'completed' then raise exception 'You can rate a ride once it is completed.' using errcode = 'P0001'; end if;
  if p_stars not between 1 and 5 then raise exception 'Choose 1 to 5 stars.' using errcode = 'P0001'; end if;
  update bookings set rating = p_stars where id = b.id returning * into b;
  return b;
end;
$$;

create function public.set_online(p_online boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not is_driver() then raise exception 'Only the driver can change availability.' using errcode = 'P0001'; end if;
  update driver_status set online = p_online, updated_at = now();
  return p_online;
end;
$$;

create function public.update_fare_settings(p_km_rate numeric, p_min_rate numeric, p_cancellation_enabled boolean, p_cancellation_fee numeric)
returns public.fare_settings
language plpgsql security definer set search_path = public as $$
declare s fare_settings;
begin
  if not is_driver() then raise exception 'Only the driver can change fares.' using errcode = 'P0001'; end if;
  update fare_settings set km_rate = p_km_rate, min_rate = p_min_rate,
    cancellation_enabled = p_cancellation_enabled, cancellation_fee = p_cancellation_fee, updated_at = now()
  returning * into s;
  return s;
end;
$$;

create function public.report_location(p_latitude double precision, p_longitude double precision, p_heading double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_driver() then raise exception 'Only the driver reports a location.' using errcode = 'P0001'; end if;
  update driver_location set latitude = p_latitude, longitude = p_longitude, heading = p_heading, updated_at = now();
end;
$$;

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.fare_settings enable row level security;
alter table public.routes enable row level security;
alter table public.driver_status enable row level security;
alter table public.driver_location enable row level security;
alter table public.bookings enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

create policy "own profile, or driver sees riders" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_driver());
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "anyone signed in reads fares" on public.fare_settings for select to authenticated using (true);
create policy "anyone signed in reads routes" on public.routes for select to authenticated using (true);
create policy "anyone signed in reads availability" on public.driver_status for select to authenticated using (true);

-- Riders see the driver's position only while they have a trip under way.
create policy "driver, or rider with an active trip" on public.driver_location for select to authenticated
  using (
    public.is_driver() or exists (
      select 1 from public.bookings b
      where b.rider_id = auth.uid() and b.status in ('accepted', 'enroute', 'arrived', 'inprogress')
    )
  );

create policy "rider sees own bookings, driver sees all" on public.bookings for select to authenticated
  using (rider_id = auth.uid() or public.is_driver());

create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own notifications read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own push tokens" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Column-level: users may only flip `read` on notifications and edit name/phone on profiles.
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;
revoke update on public.profiles from authenticated;
grant update (name, phone) on public.profiles to authenticated;
revoke insert, update, delete on public.bookings, public.fare_settings, public.routes, public.driver_status, public.driver_location from authenticated, anon;

-- Helpers are internal; only the ride actions are callable from the app.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_driver(),
  public.fare_quote(public.service_area, public.service_area),
  public.request_ride(public.service_area, public.service_area, timestamptz, smallint, public.payment_method, text, text),
  public.accept_booking(text),
  public.decline_booking(text),
  public.advance_ride(text),
  public.cancel_ride(text),
  public.change_destination(text, public.service_area),
  public.rate_ride(text, smallint),
  public.set_online(boolean),
  public.update_fare_settings(numeric, numeric, boolean, numeric),
  public.report_location(double precision, double precision, double precision)
to authenticated;

-- ---------------------------------------------------------------- realtime

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.bookings, public.notifications, public.driver_status, public.driver_location, public.fare_settings;
  end if;
end;
$$;
