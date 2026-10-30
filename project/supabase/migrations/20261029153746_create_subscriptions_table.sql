/*
# Create subscriptions (channel follows)

1. New tables
- `subscriptions`: one row per subscription. `subscriber_id` is the signed-in user (defaults to the current user), `channel_id` is the channel owner's profile id, and `created_at` is the subscription date.
- The pair (subscriber, channel) is the primary key, so the same user cannot subscribe to the same channel twice.
- A check prevents a user from subscribing to their own channel.

2. Functions
- `get_channel_subscriber_count(channel_id)` returns only the number of subscribers for a channel, so the subscriber count is calculated from real rows without exposing who subscribed to whom.

3. Security
- Row level security is enabled.
- Signed-in users can read, add and remove only their own subscriptions.
- Anyone can call the count function; it returns a number only.
*/

CREATE TABLE IF NOT EXISTS public.subscriptions (
  subscriber_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscriber_id, channel_id),
  CHECK (subscriber_id <> channel_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_channel_id_idx ON public.subscriptions (channel_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.subscriptions TO authenticated;
GRANT INSERT (channel_id) ON public.subscriptions TO authenticated;

DROP POLICY IF EXISTS "select_own_subscriptions" ON public.subscriptions;
CREATE POLICY "select_own_subscriptions" ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = subscriber_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON public.subscriptions;
CREATE POLICY "insert_own_subscription" ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = subscriber_id);

DROP POLICY IF EXISTS "delete_own_subscription" ON public.subscriptions;
CREATE POLICY "delete_own_subscription" ON public.subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = subscriber_id);

CREATE OR REPLACE FUNCTION public.get_channel_subscriber_count(target_channel_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::integer
  FROM public.subscriptions s
  WHERE s.channel_id = target_channel_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_channel_subscriber_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_channel_subscriber_count(uuid) TO anon, authenticated;
