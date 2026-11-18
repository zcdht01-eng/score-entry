# 校运会成绩录入

汕头市谢易初中学第二十七届学生田径运动会查询与成绩录入原型。

## Files

- `index.html` and `client.js`: mobile-first student and staff interface.
- `supabase/schema.sql`: schema snapshot for `public.meet_results`.
- `supabase/functions/score-api/index.ts`: public read endpoint and password-protected create/update endpoint.

## Supabase configuration

The current Supabase project is `score-entry` (`ddnbywabawofmmoxazdq`) in Singapore (`ap-southeast-1`). The database has a `meet_results` table with RLS enabled and direct `anon`/`authenticated` table access revoked. The Edge Function uses the service-role key only on the server.

Before staff writes can be used, set `ADMIN_PASSWORD` in Supabase Dashboard → Edge Functions → Secrets. Use a new password; the old demo PIN was present in an earlier public GitHub commit and should be treated as exposed. Never add the secret to this repository or the frontend.

## Prototype limitations

The app ranks times ascending and field marks descending within each event and division; it awards 7/5/4/3/2/1 points, doubles relay points, adds 7 for a school record and 5 for a grade record, and rolls scores up by class. Ties share the same placement points. The class list is generated for classes 1–12 and should be adjusted if the school's class range differs.

This Supabase project is in Singapore, not mainland China. Mainland student access may be slow or unavailable. Test it on mainland mobile networks before distributing it as the official event site.

