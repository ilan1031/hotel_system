# Periya Veedu · Dine-in Orders

Next.js 16 app for taking dine-in orders on phones and tablets, with a kitchen screen and billing.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
# production
npm run build && npm start
```

Phones on the same Wi-Fi open `http://<this-computer-ip>:3000`.

For real service, run the production server (`npm run build && npm start`). It's faster, and it never reloads pages on its own. `npm run dev` is only for changing the code.

Don't run `npm run build` while `npm run dev` is running. Both write to `.next`, which corrupts the dev cache, and every open screen then keeps reloading itself. If that happens, stop the server, delete the `.next` folder and start again.

The first admin (`ADMIN_EMAIL`, default `abielanabielan@gmail.com`) is created on first start with the password in `ADMIN_PASSWORD`. That password is never stored in the code. Change it after the first login (tap your avatar → Password). There is no sign-up: only users with *Manage users* can add people. This first admin is the **owner**: other admins don't see it in Admin → Users and can't edit, reset or delete it.

## Flow (colours on the table board)

| Colour | Meaning |
| --- | --- |
| White, dashed border | Free |
| Grey | Seated, nothing ordered yet |
| Amber | A dish is ordered, not started yet (the badge shows minutes; red after 15) |
| Orange | A dish is cooking |
| Green, pulsing | A dish is ready to serve |
| Blue | Everything served |

Every dish on an order has its own status.

1. **Waiter** taps a table → **Order** → taps dishes → **Send**.
2. **Kitchen** taps **Start** on a dish when it goes on the stove (orange), then **Ready** when it's done. The ticket's two **All** buttons start or finish every dish at once, and ↶ steps a dish back one stage. Quick dishes can go straight to ready. When a dish is ready, waiters' screens chime and the table pulses green.
3. **Waiter** taps ✓ next to each ready dish to mark it served.
4. **Cancel** (✕) works any time before a dish is served, even while it's cooking. Served or billed dishes can't be cancelled.
5. When every dish is served or cancelled, **Bill** sends the guest to the cashier and **frees the table straight away** for new diners. Billed orders can't be changed.
6. **Cashier** opens **Bills** → prints → **Paid**. Payment is only possible from a bill.

**Takeaway (parcel):** tap **+ Parcel** on the Tables screen, pick dishes and send. Parcels are numbered P1, P2… (restarting each day) and appear as coloured chips above the tables. They go through the same kitchen → ready → handed over → bill → paid steps, with a bag icon on kitchen tickets and bills.

**Customer left:** **Remove A** (or **Cancel P3** for a parcel) cancels every unserved dish and frees the seat. Once any dish has been served, the guest has to be billed instead. Removed guests don't appear in the day's bills.

Every action that can't be undone (cancel a dish, remove a guest, bill, paid, admin delete) asks first with large **Yes / No** buttons.

**Kitchen dish filter:** the chips at the top of the kitchen screen show how many of each dish are still to start (amber) and on the stove (🔥). Tap a chip to see only the tickets that need that dish. Its other dishes fade, and a bar offers **Start** / **Ready** for that dish across every ticket at once. Tap it again, or **All**, to clear the filter.

**History (ⓘ):** every kitchen ticket, every ticket in a table, and every bill has an ⓘ in its top-right corner. It shows who ordered, who started, finished, served or cancelled each dish (step-backs included), and who opened, billed and took payment, all with times.

**Split table:** in a table, the dashed `+` button adds another customer (B, C…). Each customer has their own orders and bill, and the table tile shows one coloured square per customer: A and B on top, C and D below, then E over F in a new column, and so on. A customer alone at the end of a pair stretches to fill the gap.

## Roles (editable under Admin → Roles)

| Role | Permissions |
| --- | --- |
| Admin | everything (locked) |
| Waiter | see tables, take orders, mark served, cancel unserved dishes, mark bill |
| Kitchen | see tables, kitchen screen |
| Cashier | see tables, mark bill, settle bills |

The server checks every permission. The UI only hides what a role can't use.

## Data

- **Live (Vercel):** Postgres on Supabase (or Neon), used whenever `DATABASE_URL` is set.
  - Tables, menu, roles and users live in one row (`pv_meta`). Each customer and each kitchen ticket is its own row (`pv_guests`, `pv_orders`).
  - Screens only load what's live right now, so months of history don't slow anything down.
  - Every change runs in a transaction that locks `pv_meta`. Two phones saving at the same moment can't overwrite each other.
  - Tables and the starting data are created automatically on the first request.
  - Row level security is on for these tables, so Supabase's public REST API (anon or publishable key) can't read users or password hashes.
- **Local:** with no `DATABASE_URL`, everything is kept in `data/db.json`. Delete it to reset. Set `DATA_DIR` to put it elsewhere. This mode refuses to run on Vercel.

## Deploy to Vercel + Supabase

The app talks to the database directly with a Postgres connection string. It does **not** use Supabase's API keys (publishable, secret, anon or service_role), so don't add those to Vercel.

1. **Supabase:** open your project → **Connect** → **Transaction pooler** (port `6543`, host `…pooler.supabase.com`). Copy the URI and replace `[YOUR-PASSWORD]` with your database password. If you've forgotten it, reset it under **Project Settings → Database**. Don't use the **Direct connection** (`db.<ref>.supabase.co:5432`). It's IPv6-only, and Vercel can't reach it.
2. **Vercel:** import the GitHub repo. Under **Settings → Environment Variables**, add the keys from [.env.example](.env.example):
   - `DATABASE_URL` – the Supabase transaction pooler URI
   - `AUTH_SECRET` – a long random string (`openssl rand -hex 32`). Changing it logs everyone out.
   - `APP_UTC_OFFSET_MINUTES` – `330` for India
   - `ADMIN_PASSWORD` – password for the first admin. Only used when the database is empty; skip it if you import your local data.
   - `NEXT_PUBLIC_POLL_MS` – optional; `3000` is a good default
3. In **Settings → Functions**, set the function region close to your Supabase region (for example `bom1` Mumbai for `ap-south-1`). Each database round trip is then a few milliseconds instead of hundreds.
4. Deploy, open the site and sign in with the admin. Change the password straight away.

**Branches:** `main` is production and `uat` is for testing. Vercel builds every branch other than `main` as a **Preview** deployment, so give the `uat` environment variables the **Preview** scope (you can limit them to the `uat` branch). Point `uat` at a separate Supabase project if you don't want testing to touch real orders.

Neon works the same way: use its **pooled** connection string as `DATABASE_URL`.

**Bring your current local data across (optional):** put the connection string in `.env.local` as `DATABASE_URL=…`, then run:

```bash
npm run db:import
```

This copies `data/db.json` (tables, menu, users, open orders and past bills) into the database. It refuses to touch a database that already has data unless you add `-- --force`. Do this before staff start using the live site.

**Costs to watch:** every open screen checks for changes every few seconds, so each check is one Vercel function call and one small database query. Supabase's free plan pauses projects after a week without activity and has usage limits, and Vercel's free Hobby plan is for non-commercial use with a monthly invocation limit. For a working restaurant, plan on Vercel Pro and keep an eye on your database usage. If you're near a limit, set `NEXT_PUBLIC_POLL_MS=4000`, which cuts the calls by about a third.

The seeded menu comes from the printed Periya Veedu menu. Goli soda is listed at MRP, so it's seeded at ₹20; adjust it under Admin → Menu.
