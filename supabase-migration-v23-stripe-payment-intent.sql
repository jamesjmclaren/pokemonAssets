-- Migration v23: store the Stripe PaymentIntent on each paid booking so the
-- admin "Stripe" link can deep-link straight to the payment (instead of a
-- search that doesn't resolve a Checkout Session id). Idempotent.

ALTER TABLE event_bookings_v2 ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;

CREATE INDEX IF NOT EXISTS idx_ev2_payment_intent ON event_bookings_v2(stripe_payment_intent);
