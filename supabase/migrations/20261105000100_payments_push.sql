-- Card payments and push notifications.
--
-- Card riders save a card when they book (Stripe SetupIntent). The
-- booking-events function charges it off-session when the trip completes, or
-- charges the cancellation fee, and records the outcome here. Push
-- notifications fan out from the notifications table to push_tokens.

alter table public.bookings add column stripe_payment_intent text;

-- Edge functions (service role) record payment outcomes; nobody else may.
create function public.record_payment(p_id text, p_state public.payment_state, p_intent text)
returns void language sql security definer set search_path = public as $$
  update bookings set payment_state = p_state, stripe_payment_intent = coalesce(p_intent, stripe_payment_intent) where id = p_id;
$$;
revoke execute on function public.record_payment(text, public.payment_state, text) from public, anon, authenticated;
grant execute on function public.record_payment(text, public.payment_state, text) to service_role;

-- A card booking is only accepted once the rider's card is saved.
create function public.mark_card_saved(p_id text) returns public.bookings
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  b := lock_booking(p_id);
  if b.rider_id is distinct from auth.uid() then raise exception 'Booking not found.' using errcode = 'P0001'; end if;
  if b.payment <> 'card' then return b; end if;
  update bookings set payment_state = 'card_saved' where id = b.id and payment_state = 'none' returning * into b;
  return b;
end;
$$;
revoke execute on function public.mark_card_saved(text) from public, anon;
grant execute on function public.mark_card_saved(text) to authenticated;

-- Push tokens are registered with an upsert from the app.
create function public.register_push_token(p_token text, p_platform text) returns void
language sql security definer set search_path = public as $$
  insert into push_tokens (token, user_id, platform) values (p_token, auth.uid(), coalesce(p_platform, ''))
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
$$;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Tells the rider and Robert when a saved card could not be charged.
create function public.notify_payment_failed(p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = p_id;
  if not found then return; end if;
  perform notify_user(b.rider_id, 'rider', 'Payment failed',
    format('We could not charge your card for %s. Please pay Robert directly.', b.id), b.id);
  perform notify_driver('Card payment failed', format('The card payment for %s did not go through. Collect payment from %s.', b.id, b.name), b.id);
end;
$$;
revoke execute on function public.notify_payment_failed(text) from public, anon, authenticated;
grant execute on function public.notify_payment_failed(text) to service_role;
