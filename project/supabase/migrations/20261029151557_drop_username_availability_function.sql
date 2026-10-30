/*
# Remove public username availability helper

1. Removed
- The `is_username_available` helper function. It was callable by anonymous visitors with elevated rights, which the security check flagged.

2. Impact
- Sign-up no longer pre-checks usernames. If a username is already taken, sign-up shows a general "could not create account" message instead.

3. Security
- Reduces the public surface of the database. No table data is changed.
*/

DROP FUNCTION IF EXISTS public.is_username_available(text);
