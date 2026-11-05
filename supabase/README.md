# Backend setup (Supabase, Stripe, push)

The app runs in **demo mode** (on-device data) until it is given Supabase
settings. These steps take it live. Everything here is done once.

## 1. Supabase project

1. Create a project at supabase.com. Pick the **Sydney** region.
2. From this repo, apply the database:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. **Authentication → Providers → Email**: keep email sign-up on. Turn
   "Confirm email" off for the pilot if riders should be able to book straight
   after signing up.
4. **Project Settings → API**: copy the Project URL and the `anon` public key.

## 2. Robert's owner account

Robert signs up in the app like a rider, then you promote that account once
in the SQL editor:

```sql
update public.profiles set role = 'driver' where email = '<robert@his-email>';
```

## 3. App settings

For local runs, copy `.env.example` to `.env` and fill in the URL and anon
key, then `npx expo start -c`.

For the APK built by GitHub Actions, add the same two values as **repository
variables** (Settings → Secrets and variables → Actions → Variables):
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The anon key is
public by design; the database rules decide what each user can do.

## 4. Card payments (Stripe)

Card riders save a card when they book; nothing is charged then. When Robert
completes the trip, the server charges the fare to that card. If the rider
cancels after Robert confirmed, it charges the cancellation fee instead.

1. In Stripe, copy the secret and publishable keys (test keys first).
2. Deploy the functions and set their secrets:
   ```bash
   npx supabase functions deploy payment-sheet
   npx supabase functions deploy booking-events
   npx supabase functions deploy stripe-webhook
   npx supabase secrets set \
     STRIPE_SECRET_KEY=sk_test_... \
     STRIPE_PUBLISHABLE_KEY=pk_test_... \
     EVENTS_SECRET=<any long random string>
   ```
3. Stripe → Developers → Webhooks → add endpoint
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` for
   `payment_intent.succeeded` and `payment_intent.payment_failed`, then
   `npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.

## 5. Database webhooks

Supabase → **Database → Webhooks** → create two webhooks, both calling the
`booking-events` edge function with an HTTP header
`x-events-secret: <the EVENTS_SECRET above>`:

| Name | Table | Events |
| --- | --- | --- |
| booking-payments | `bookings` | Update |
| push-notifications | `notifications` | Insert |

## 6. Push notifications

Push needs an installed build (not Expo Go on Android).

1. `npx eas init` links the app to an Expo project and adds its project id to
   `app.json`.
2. Android: create a Firebase project, add the Android app
   `au.com.bvrrideshare.app`, put `google-services.json` in the repo root, add
   `"googleServicesFile": "./google-services.json"` under `expo.android` in
   `app.json`, and upload the FCM service account key in the Expo dashboard.
3. iOS: EAS sets up the push key when you run `eas build -p ios`.

## Checking the database rules

```bash
./scripts/test-db.sh
```

Runs every migration on a throwaway local Postgres and checks the rules:
who can see and change which bookings, fare calculation, the 90-minute
clash check, cancellation fees, and payments.
