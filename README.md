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

The first admin (`ADMIN_EMAIL`, default `abielanabielan@gmail.com`) is created on first start with the password in `ADMIN_PASSWORD`. That password is never stored in the code. Change it after the first login (tap your avatar → Password). There is no sign-up: only users with *Manage users* can add people.

## Flow (colours on the table board)

| Colour | Meaning |
| --- | --- |
| White, dashed border | Free |
| Grey | Seated, nothing ordered yet |
| Amber | A dish is waiting in the kitchen (the badge shows minutes; red after 15) |
| Green, pulsing | A dish is ready to serve |
| Blue | Everything served |

Every dish on an order has its own status.

1. **Waiter** taps a table → **Order** → taps dishes → **Send**.
2. **Kitchen** taps a single dish when it's ready, or **All ready** for the whole ticket. Waiters' screens chime and the table pulses green.
3. **Waiter** taps ✓ next to each ready dish to mark it served.
4. **Cancel** (✕) works only before a dish is served. Served or billed dishes can't be cancelled.
5. When every dish is served or cancelled, **Bill** sends the guest to the cashier and **frees the table straight away** for new diners. Billed orders can't be changed.
6. **Cashier** opens **Bills** → prints → **Paid**. Payment is only possible from a bill.

**Takeaway (parcel):** tap **+ Parcel** on the Tables screen, pick dishes and send. Parcels are numbered P1, P2… (restarting each day) and appear as coloured chips above the tables. They go through the same kitchen → ready → handed over → bill → paid steps, with a bag icon on kitchen tickets and bills.

**Customer left:** **Remove A** (or **Cancel P3** for a parcel) cancels every unserved dish and frees the seat. Once any dish has been served, the guest has to be billed instead. Removed guests don't appear in the day's bills.

Every action that can't be undone (cancel a dish, remove a guest, bill, paid, admin delete) asks first with large **Yes / No** buttons.

**Split table:** in a table, the dashed `+` button adds another customer (B, C…). Each customer has their own orders and bill, and the table tile shows one colour stripe per customer.

## Roles (editable under Admin → Roles)

| Role | Permissions |
| --- | --- |
| Admin | everything (locked) |
| Waiter | see tables, take orders, mark served, cancel unserved dishes, mark bill |
| Kitchen | see tables, kitchen screen |
| Cashier | see tables, mark bill, settle bills |

The server checks every permission. The UI only hides what a role can't use.

## Data

- **Live (Vercel):** Postgres on [Neon](https://neon.tech), used whenever `DATABASE_URL` is set.
  - Tables, menu, roles and users live in one row (`pv_meta`). Each customer and each kitchen ticket is its own row (`pv_guests`, `pv_orders`).
  - Screens only load what's live right now, so months of history don't slow anything down.
  - Every change runs in a transaction that locks `pv_meta`. Two phones saving at the same moment can't overwrite each other.
  - Tables and the starting data are created automatically on the first request.
- **Local:** with no `DATABASE_URL`, everything is kept in `data/db.json`. Delete it to reset. Set `DATA_DIR` to put it elsewhere. This mode refuses to run on Vercel.

## Deploy to Vercel + Neon

1. **Neon:** create a project (region: Singapore `ap-southeast-1` is closest to India). Open **Connect**, turn on **Connection pooling**, and copy the connection string (the host contains `-pooler`).
2. **Vercel:** import the repo. Under **Settings → Environment Variables**, add the keys from [.env.example](.env.example):
   - `DATABASE_URL` – the Neon pooled string
   - `AUTH_SECRET` – a long random string (`openssl rand -hex 32`). Changing it logs everyone out.
   - `APP_UTC_OFFSET_MINUTES` – `330` for India
   - `ADMIN_PASSWORD` – password for the first admin. Only used when the database is empty; skip it if you import your local data.
   - `NEXT_PUBLIC_POLL_MS` – optional; `3000` is a good default
3. In **Settings → Functions**, set the function region to the same area as Neon (for example `sin1` Singapore). Each database round trip is then a few milliseconds instead of hundreds.
4. Deploy, open the site and sign in with the default admin. Change the password straight away.

**Bring your current local data across (optional):** put the Neon string in `.env.local` as `DATABASE_URL=…`, then run:

```bash
npm run db:import
```

This copies `data/db.json` (tables, menu, users, open orders and past bills) into Neon. It refuses to touch a database that already has data unless you add `-- --force`. Do this before staff start using the live site.

**Costs to watch:** every open screen checks for changes every few seconds, so the database stays awake during service hours and each check is one Vercel function call. Neon's free plan has limited compute hours per month, and Vercel's free Hobby plan is for non-commercial use with a monthly invocation limit. For a working restaurant, plan on Vercel Pro and keep an eye on Neon usage. If you're near a limit, set `NEXT_PUBLIC_POLL_MS=4000`, which cuts the calls by about a third.

The seeded menu comes from the printed Periya Veedu menu. Goli soda is listed at MRP, so it's seeded at ₹20; adjust it under Admin → Menu.
