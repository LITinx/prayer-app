## Backend setup (Supabase)

1. Create a project at supabase.com → SQL editor → run `supabase/schema.sql`.
2. Google Cloud Console → OAuth client (Web application):
   - Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google: paste client ID + secret.
4. Supabase → Authentication → URL Configuration: add `http://localhost:5173`,
   `http://localhost:5199`, and your production URL to Redirect URLs.
5. Copy `.env.example` to `.env.local` and fill in the project URL and anon key
   (Settings → API). Set the same two vars in your host (e.g. Vercel).
