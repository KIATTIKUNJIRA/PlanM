PlanM - Create Forms (Next.js pages router)

Files in this pack:
1) apps/web/src/pages/create.tsx                      -> New page at /create
2) apps/web/src/components/forms/CreateForms.tsx      -> All forms (Organization, Project, Site, Building, Floor, Room)
3) apps/web/src/lib/supabase.client.example.ts        -> Only if you don't already have "@/lib/supabase"
-------------------------------------------------------------------------------------
How to install:

A) Copy files into your repo keeping the same paths.
   - If your project already has "@/lib/supabase", delete the *.example.ts file and keep your client.

B) Start dev server:
   cd apps/web
   pnpm dev

C) Open http://localhost:3000/create

Notes:
- For quick testing, enable "Anonymous" provider in Supabase Dashboard > Auth > Providers > Anonymous.
- The RLS policies require an authenticated user to create data. The "ทดลองล็อกอิน (Anonymous)" button will sign in anonymously if enabled.
- Forms include basic validation and dependent dropdowns (org -> project -> site -> building -> floor).