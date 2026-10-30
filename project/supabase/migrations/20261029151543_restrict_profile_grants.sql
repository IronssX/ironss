/*
# Tighten profile privileges for signed-in users

1. Problem fixed
- Supabase grants full table rights to the signed-in role by default, which would let users insert or delete profile rows directly.

2. Changes
- Removes all table-level rights on `profiles` from the signed-in role.
- Grants back only: reading the table (row rules still limit it to the user's own profile) and updating the profile photo path and update timestamp.

3. Security
- Users cannot create, delete, or rename profiles through the app's data connection.
- Re-running this migration is safe.
*/

REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (avatar_path, updated_at) ON public.profiles TO authenticated;
