ABORWARII DEPLOYMENT

1. Upload the CONTENTS of this public folder to your GitHub Pages repository.
2. Before testing admin login, run the complete supabase_schema.sql in Supabase SQL Editor.
   The final section creates get_my_profile(), which the fixed website uses.
3. In Supabase Authentication -> Users, make sure ambangiirwe@gmail.com exists.
4. Run:
   update public.profiles
   set role='admin', status='approved', name='Administrator'
   where lower(email)=lower('ambangiirwe@gmail.com');
5. Open the site in Chrome Incognito/private mode or clear the site's cached data.
6. Use the administrator email and its Supabase Auth password.

The website does NOT contain a service_role/secret key.
