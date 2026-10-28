# Acme Orders: a mock app for testing Frankie

A small React (Vite) app with a **fully mocked API**, built to test a Frankie workspace such as
<https://frankie-web-ebon.vercel.app/app/workspaces/ws-3e9a97944571> end to end.

- **Fake sign-in** with three demo users (each has its own orders and tickets).
- **Mocked REST API** (`/api/*`) answered in the browser by [Mock Service Worker](https://mswjs.io). Frankie's Product agent runs actions *in the user's browser* by default, so its calls hit the same mocks, and the pages refresh when the agent changes data.
- **OpenAPI spec** for those mocks at [`public/frankie.openapi.json`](public/frankie.openapi.json) (15 operations) to connect in Frankie.
- **Real Frankie server routes** `POST /api/frankie/token` and `GET /api/frankie/health` (in [`server/frankie.ts`](server/frankie.ts)). They are not mocked because they sign a JWT with `FRANKIE_JWT_SECRET`, which must never reach the browser.
- **Mock API panel** (bottom left) for adding latency, forcing error statuses, resetting data, and a live log of every API call, so you can see exactly which actions the agent ran.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:5173
```

`.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `VITE_FRANKIE_KEY` | Frankie → workspace → Keys & settings → publishable key |
| `FRANKIE_JWT_SECRET` | Frankie → Keys & settings → JWT secret (server only, never commit it) |
| `VITE_FRANKIE_KEY_SUPPORT`, `VITE_FRANKIE_KEY_DOCS` | Optional page agents |

Restart `npm run dev` after changing env values.

## Connect it to the Frankie workspace

1. **Allowed sites:** turn on *Allow localhost*, or add `http://localhost:5173` (and your Vercel URL if you deploy).
2. **Connect your API:** Product agent → Connect your API → *Paste JSON* and paste `public/frankie.openapi.json`. When deployed, you can give the URL `https://<your-app>/frankie.openapi.json` instead.
3. **How Frankie calls this API:** choose **User's browser** and leave **API base URL empty**. Frankie's server can't reach mocks that only exist in your browser.
4. **Allow actions** you want to test, then *Save allowed actions*.
5. Sign in as a demo user and chat, either with the floating widget or on the full-page **Assistant** tab (`/chat`).

Check the install:

```bash
curl -s localhost:5173/api/frankie/health
# {"frankie":true,"publishableKey":true,...,"jwtSecret":true,"jwtSecretFingerprint":"…"}
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:5173/api/frankie/token   # 401 when signed out
curl -s -o /dev/null -w "%{http_code}\n" -H "x-frankie-key: $VITE_FRANKIE_KEY" \
  https://frankie-control-665333762719.us-central1.run.app/v1/config                # 200
```

## Mock API

All endpoints require the session cookie and only see the signed-in user's data.

| Operation | Route | Interesting behaviour |
| --- | --- | --- |
| `getCurrentUser` / `updateProfile` | `GET/PATCH /api/me` | |
| `listProducts` / `getProduct` | `GET /api/products[/{id}]` | `q`, `category`, `inStock` filters; Ethiopia has 3 in stock and the kettle has 0 |
| `listOrders` / `getOrder` | `GET /api/orders[/{id}]` | `status`, `limit`; another user's order returns 404 |
| `createOrder` | `POST /api/orders` | 409 when stock is short, 422 for unknown products; defaults to the user's address |
| `updateOrder` | `PATCH /api/orders/{id}` | 409 unless the order is pending or processing |
| `cancelOrder` | `POST /api/orders/{id}/cancel` | 409 once shipped or delivered; restores stock |
| `deleteOrder` | `DELETE /api/orders/{id}` | Only cancelled orders (409 otherwise); Frankie always asks before deletes |
| `listTickets` / `getTicket` / `createTicket` / `updateTicket` | `/api/tickets[/{id}]` | |
| `getAccountSummary` | `GET /api/reports/summary` | Counts by status, spend by month |

Errors look like `{ "error": { "status": 409, "message": "…" } }`.

Data is seeded in [`src/mocks/db.ts`](src/mocks/db.ts) and saved in localStorage, so changes survive a reload. Use **Reset data** in the panel to start over.

### Things to try

- "What's the status of my latest order?" (a read runs straight away)
- "Order 2 bags of decaf and a brew scale." (a write shows an approval card)
- "Change the shipping address on ord_1003 to 1 Test St, Perth."
- "Cancel ord_1002." (shipped, so 409: the agent should suggest a ticket)
- "Order 5 Ethiopia Yirgacheffe." (409 for short stock)
- "Cancel my pending order, then delete it." (multi-step; the delete asks)
- "Show my spend by month as a table."
- In the panel, set *Force response* to 500 or 429, or latency to 20 s, and check how the chat handles it.
- Sign in as a different user and confirm the agent can't see Jorge's orders.

## Deploy (optional)

The app deploys to Vercel as is: a static Vite build, plus `api/frankie/*.ts` as functions. Mocks also run in production builds on purpose. Set `VITE_FRANKIE_KEY` and `FRANKIE_JWT_SECRET` in the Vercel project's env, then add the deployed URL to Allowed sites in Frankie.

## Layout

```
shared/users.ts          demo users + session cookie helpers (browser and server)
server/frankie.ts        token + health handlers (server only)
api/frankie/*.ts         the same handlers as Vercel functions
vite.config.ts           serves those handlers in dev/preview
src/mocks/               MSW handlers, seed data, scenario knobs + request log
src/frankie.ts           keys + getUserToken
src/App.tsx              routes and the single <FrankieAgents> mount
public/frankie.openapi.json   spec to connect in Frankie
```
