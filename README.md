# New Shiv Jyoti — independent Vercel edition

A standalone Next.js 16 + React + TypeScript fashion catalogue. The customer website and backend API routes run together on Vercel. Supabase supplies Postgres and email/password authentication. Product images live in a private Cloudflare R2 or Amazon S3 bucket.

Your logo, burgundy/gold design, categories, WhatsApp ordering, admin editor, stock status, collection labels, and latest heading changes are included.

## Start here

1. Extract this folder and open it in VS Code.
2. Create your Supabase project and run `supabase/schema.sql` once in its SQL Editor.
3. Create your shop-owner account in Supabase Authentication.
4. Create a private R2/S3 bucket and configure `storage/cors.json` for your website origins.
5. Fill in the included `.env` beside `package.json`.
6. Install and run:

```sh
npm ci
npm run check:env
npm run dev
```

Open http://localhost:3000. Admin login: http://localhost:3000/login.

Use Node.js 22.13 or newer. The project contains a locked `package-lock.json` and uses npm. No pnpm, Wrangler, Cloudflare Worker, or ChatGPT account is required to run this edition.

## 1. Configure Supabase

Create a new Supabase project. Copy the project URL and API keys from its settings:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key (`sb_publishable_...`) or legacy anon key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Secret key (`sb_secret_...`) or legacy service_role key → `SUPABASE_SECRET_KEY`

The secret key is used only inside server modules and must never have a `NEXT_PUBLIC_` prefix.

Open SQL Editor and run the entire `supabase/schema.sql`. It creates `products`, `settings`, and `uploads` in `public`. Run it once in a fresh project; it deliberately errors if conflicting tables already exist, rather than changing an unrelated schema.

Tables have Row Level Security enabled and no anonymous/authenticated direct-access policies. Browser clients cannot access the tables directly. Authorized Next.js routes use the server secret key. Public catalogue routes explicitly return only published products; admin routes verify the owner using Supabase Auth before any write.

This app connects to Supabase Postgres through Supabase's HTTP Data API. You do **not** need a `DATABASE_URL` or direct Postgres connection for this implementation. Keep the Supabase Data API enabled for the public schema. An ordinary Postgres database without Supabase's API/Auth is not a drop-in replacement.

### Create the owner

In Supabase Authentication → Users, create a user with your email and a strong password. Confirm/autoconfirm the email when creating the user. Set `ADMIN_EMAIL` in `.env` to exactly that email. Only this confirmed account can manage the store.

Disable public sign-ups in Supabase Auth settings for this owner-only app. Set the Auth Site URL to your final website URL. This version uses direct email/password sign-in; it does not require a social OAuth provider, ChatGPT login, a callback route, or a test/demo account.

There is no password in the source code or `.env`. Use the password created for your Supabase user on `/login`. Password recovery UI is not included; use Supabase's admin account-management tools if needed.

## 2. Configure Cloudflare R2 (recommended storage configuration for this project)

1. Create a bucket, for example `new-shiv-jyoti-products`.
2. Keep it private: do not enable public r2.dev access or a public bucket domain. Images are served through short-lived signed links.
3. Create S3 API credentials restricted to object read/write access for this bucket. The app needs PutObject, GetObject, HeadObject, and DeleteObject (for invalid uploads).
4. Set:

```dotenv
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=new-shiv-jyoti-products
S3_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
S3_FORCE_PATH_STYLE=true
```

Use R2's **S3 Access Key ID and Secret Access Key**, not a general Cloudflare dashboard API token.

5. Open the bucket's CORS settings. Paste `storage/cors.json`, replacing `https://YOUR-PROJECT.vercel.app` with your real URL. Add your custom domain if applicable, and retain `http://localhost:3000` for local testing.

Origins have no trailing slash or path. Preview deployments need their exact origin added if you want to test uploads there. For a different local port, update both APP_URL and CORS.

### Use Amazon S3 instead

Leave `S3_ENDPOINT` blank, set `S3_REGION` to your actual region (for example `ap-south-1`), set `S3_FORCE_PATH_STYLE=false`, and use your private S3 bucket and IAM credentials with the same object permissions. Add the same CORS origins/methods/headers in its CORS configuration. Other S3-compatible services must support signed PUT/GET, conditional PUT (`If-None-Match`), HEAD, byte-range GET, and DELETE.

## 3. Fill the included .env

`.env` is included with **empty credential fields**. `.env.example` is a duplicate template. `.gitignore` excludes your filled `.env` while retaining `.env.example`.

| Variable | Value |
| --- | --- |
| APP_URL | `http://localhost:3000` locally; your HTTPS domain on Vercel |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable or legacy anon key |
| SUPABASE_SECRET_KEY | Server secret or legacy service_role key |
| ADMIN_EMAIL | Confirmed Supabase owner's email |
| S3_ENDPOINT | R2/S3-compatible endpoint; blank for AWS S3 |
| S3_REGION | `auto` for R2; actual region for AWS |
| S3_BUCKET | Private bucket name |
| S3_ACCESS_KEY_ID | Storage access key ID |
| S3_SECRET_ACCESS_KEY | Storage secret key |
| S3_FORCE_PATH_STYLE | `true` for R2, usually `false` for AWS |

Run `npm run check:env` to detect missing settings. It prints variable names, never credential values. It does not test provider connectivity. Restart `npm run dev` after changing `.env`.

## 4. Deploy frontend and backend together on Vercel

1. Create your own GitHub repository and push the extracted project. Include `package-lock.json`, `supabase/schema.sql`, and `.env.example`; do not commit the filled `.env`.
2. In Vercel, import the repository. Choose **Next.js** as the framework.
3. Select the project folder containing `package.json` as the Root Directory if your repository has a containing folder.
4. Use Node.js 22.x or 24.x, install command `npm ci`, and build command `npm run build`. Leave the output directory at the Next.js default. Do not use static export.
5. Add every required `.env` value in Vercel Project Settings → Environment Variables. Put real secret values there, not in the repository. Use your production HTTPS URL for `APP_URL`. Configure Preview variables separately if you want preview deployments.
6. Deploy. The `app/api/*` backend routes become Vercel functions automatically; there is no separate backend hosting service.
7. Add the resulting Vercel/custom-domain origin to your bucket CORS configuration and Supabase Auth Site URL. If APP_URL or other environment settings change, redeploy.
8. Visit `/login` and sign in with your Supabase owner account.

If the Vercel URL is not known yet, create/import the project first to see its assigned domain, then set APP_URL before the final deployment. A custom domain is optional and can be connected in Vercel later.

Do not publish this edition back through the original Sites hosting workflow. It is a new independently deployable project; the original Sites deployment is unchanged.

## How uploads and privacy work

1. Signed-in owner requests an upload URL from `/api/upload`.
2. The browser uploads the file directly to R2/S3. Photo bytes never pass through Vercel's request-body limit.
3. `/api/upload/complete` checks recorded ownership, expiry, byte count, content type, and PNG/JPEG/WebP file signature before marking the photo ready.
4. Products can reference only completed, registered uploads.
5. `/api/images/[key]` permits published product photos or the authenticated owner, then redirects to a signed storage URL valid for 60 seconds. Image bytes do not pass through Vercel's response-body limit either.

Maximum: 8 images per product, 8 MiB per image. Upload links expire after 60 seconds and include the expected content type/length and `If-None-Match: *`, preventing an existing key from being overwritten. Retry a failed upload through the editor to get a new key.

Unpublishing removes new anonymous access immediately; a signed image link issued just before unpublishing may remain usable for up to 60 seconds. Copies already downloaded cannot be recalled.

Deleting a product or removing a photo from its editor retains the object in storage to avoid deleting a photo used elsewhere. Abandoned uploads can also remain in storage. No automatic object-cleanup job is included; review database references before manually deleting unused objects. Do not add a blanket bucket expiry rule, which would remove active product images too.

## Code map

- `app/storefront.tsx`, `app/globals.css`: customer design and interactions.
- `app/admin/ui.tsx`: product and store-content editor.
- `app/login/page.tsx`: Supabase email/password login form.
- `app/api/auth/*`: login/logout.
- `app/api/admin/route.ts`: authorized product/store changes.
- `app/api/catalog/route.ts`: published catalogue.
- `app/api/upload/*`: signed uploads and verification.
- `app/api/images/[key]/route.ts`: private image authorization and redirect.
- `lib/supabase/`: cookie-based auth client and server-only database client.
- `lib/auth.ts`, `proxy.ts`: verified owner checks and session refresh.
- `lib/storage.ts`: S3-compatible client configuration.
- `supabase/schema.sql`: Postgres schema and access restrictions.
- `storage/cors.json`: storage CORS template.

## Validation commands

```sh
npm run typecheck
npm test
npm run build
npm run start
```

`npm run test:smoke` builds and runs the actual Next.js server against local Supabase/S3 test doubles. It exercises route wiring and auth/upload workflows without real accounts. It builds with dummy settings; run `npm run build` again with your real `.env` before a local production run. Vercel always builds fresh using its configured variables.

## Before customer launch

With your own accounts configured, perform a real end-to-end check:

1. Sign in at `/login`.
2. Add a draft product with a real photo, sizes, colour and price.
3. Reload the admin page and confirm it was saved.
4. In a signed-out/incognito window, confirm the draft and its image are hidden.
5. Publish it; verify its category, product details and image appear publicly.
6. Select size/colour/quantity and verify the WhatsApp message.
7. Edit the product, unpublish it, and verify it disappears publicly.
8. Sign out and confirm admin access requires login again.

The source build and local test doubles cannot verify your actual keys, bucket CORS, SQL execution, permissions or deployed domain. Those require this final check after configuration.

## Existing data

The ZIP includes source code and brand assets, not live product records or uploaded product files from the earlier Sites database/bucket. A new Supabase project starts with an empty catalogue and the built-in shop details. Add products through the admin portal. Moving existing live inventory would require a separate export/import of records and image objects; it is not performed automatically.

## Troubleshooting

- **Catalogue unavailable:** Check Supabase URL/server secret and that schema.sql completed.
- **Cannot sign in:** Check the Supabase user password, confirmed email and exact ADMIN_EMAIL. No old mock account works here.
- **Photo transfer failed:** Check bucket CORS includes the actual browser origin, PUT, Content-Type and If-None-Match. Check R2 S3 credentials and endpoint.
- **Photo verification failed:** Confirm object read/head/delete permissions and a real JPG/PNG/WebP file; upload again.
- **403 on save:** Sign in as the owner and check APP_URL matches the site you are using.
- **Changes missing after deployment:** Rebuild/redeploy after environment changes. The local and production databases are the same only if you deliberately configure the same Supabase project.

## Official references

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/api/api-keys
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- https://developers.cloudflare.com/r2/buckets/cors/
- https://vercel.com/docs/frameworks/full-stack/nextjs
- https://vercel.com/docs/functions/limitations
