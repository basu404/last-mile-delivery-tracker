# Last-Mile Delivery Tracker

## Overview

Last-Mile Delivery Tracker is a role-based delivery-management platform for customers, delivery agents, and administrators. Customers obtain server-calculated quotes, create shipments, inspect their timelines, and reschedule failed deliveries. Administrators configure service zones, pincodes, rate cards, and agent accounts; they can assign orders automatically by zone and workload or select an agent manually. Agents receive assigned deliveries and move them through the permitted delivery lifecycle.

Every order status change is written to `OrderStatusHistory` with its actor, note, and timestamp. Charges are always recalculated by the backend; the client cannot submit a trusted final charge.

This repository is a monorepo containing `backend/` and `frontend/`. Deployment targets are Render for the API, Vercel for the web app, and Neon for PostgreSQL.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Axios, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Zod |
| Authentication | JWT bearer tokens, bcrypt password hashing |
| Database | PostgreSQL on Neon, Prisma ORM |
| Notifications | Nodemailer over SMTP (email) |
| Deployment | Render (backend), Vercel (frontend), Neon (database) |

## Local setup

### Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database; Neon is recommended
- Optional SMTP account for real email delivery

### 1. Configure and start the backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` with your database, JWT, CORS, and SMTP values. Then run:

```powershell
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

The API runs at `http://localhost:4000`. Verify it with:

```text
GET http://localhost:4000/health
GET http://localhost:4000/ready
```

`/health` confirms that the API process is running. `/ready` additionally verifies the database connection.

### 2. Configure and start the frontend

Open another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

### 3. Production builds and tests

```powershell
cd backend
npm run test:rate-engine
npm run build

cd ../frontend
npm run build
```

## Environment files

Never commit real environment files. The root `.gitignore` ignores `.env` files throughout the repository.

### `backend/.env.example`

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL/Neon connection string. Prefer Neon's pooled `-pooler` URL in deployment. |
| `JWT_SECRET` | Long, random signing secret for authentication tokens. |
| `JWT_EXPIRES_IN` | Token lifetime, such as `7d`. |
| `PORT` | Local API port; defaults to `4000`. Render supplies its own `PORT`. |
| `FRONTEND_URL` | Exact frontend origin allowed by CORS, without a trailing slash. |
| `SMTP_HOST` | SMTP server, for example `smtp.gmail.com`. |
| `SMTP_PORT` | SMTP port, normally `587` or `465`. |
| `SMTP_USER` | SMTP login email. |
| `SMTP_PASS` | SMTP password or Gmail app password. |
| `EMAIL_FROM` | Sender identity, for example `Last-Mile Tracker <address@gmail.com>`. |

### `frontend/.env.example`

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base URL, locally `http://localhost:4000/api`; in production use the Render URL followed by `/api`. |

## API conventions

The local API base is `http://localhost:4000`. Application endpoints are under `/api`.

Protected requests use:

```http
Authorization: Bearer <jwt>
Content-Type: application/json
```

Successful application responses use:

```json
{
  "success": true,
  "message": "Optional operation message",
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "message": "Readable error message"
}
```

Validation failures also include an `errors` object. Missing or invalid authentication returns `401`; an authenticated user with the wrong role receives `403`.

### Health

| Method | Path | Role | Body/query | Successful response |
|---|---|---|---|---|
| GET | `/health` | Public | None | API health message. |
| GET | `/ready` | Public | None | API/database readiness message; returns `503` when the database is unavailable. |

### Authentication

| Method | Path | Role | Body | Successful response |
|---|---|---|---|---|
| POST | `/api/auth/register` | Public | `{ name, email, password, role?: "customer", phone? }` | `201`; `{ token, user }`. Public registration always creates a customer. |
| POST | `/api/auth/login` | Public | `{ email, password }` | `{ token, user }`, including the user's role and assigned zone when applicable. |

### Zones and pincodes

| Method | Path | Role | Body/query | Successful response |
|---|---|---|---|---|
| GET | `/api/zones` | Public | None | Zones with `pincodeCount`. |
| POST | `/api/zones` | Admin | `{ name }` | `201`; created zone. |
| GET | `/api/zones/:id/pincodes` | Admin | None | Zone and its complete sorted pincode list. |
| POST | `/api/zones/:id/pincodes` | Admin | `{ pincodes: ["110001", "110002"] }` | `201`; zone with its mappings. Each pincode must be globally unique. |
| PATCH | `/api/zones/:zoneId/pincodes/:pincodeId` | Admin | `{ pincode?, newZoneId? }` | Updated mapping; supports correcting or moving a pincode. |
| DELETE | `/api/zones/:zoneId/pincodes/:pincodeId` | Admin | None | Removed mapping. Existing orders keep their stored zone references. |

### Agents

| Method | Path | Role | Body/query | Successful response |
|---|---|---|---|---|
| GET | `/api/agents` | Admin | Optional query `zoneId=<uuid>` | All matching agents with availability, assigned zone, and active-order count. |
| GET | `/api/agents/available` | Admin | Optional query `zoneId=<uuid>` | Available matching agents with active-order count. |
| POST | `/api/agents` | Admin | `{ name, email, password, assignedZoneId, phone? }` | `201`; safe agent record without the password hash. The new agent is available immediately. |

### Rate cards

| Method | Path | Role | Body | Successful response |
|---|---|---|---|---|
| GET | `/api/rate-cards` | Admin | None | Rate cards with source and destination zones. |
| POST | `/api/rate-cards` | Admin | `{ orderType, fromZoneId, toZoneId, rateType, basePrice, pricePerKg, codSurchargeFlat?, codSurchargePct? }` | `201`; created rate card. `rateType` is `intra_zone` or `inter_zone`. |
| PATCH | `/api/rate-cards/:id` | Admin | Any of `{ basePrice, pricePerKg, codSurchargeFlat, codSurchargePct, isActive }` | Updated rate card. At least one property is required. |

`orderType` is `B2B` or `B2C`. Money and percentage inputs must be finite and nonnegative.

### Orders

The common quote input is:

```json
{
  "pickupPincode": "110001",
  "dropPincode": "400001",
  "lengthCm": 50,
  "breadthCm": 40,
  "heightCm": 30,
  "actualWeightKg": 10,
  "orderType": "B2C",
  "paymentType": "prepaid"
}
```

The quote response contains pickup/drop zone IDs and names, actual, volumetric and chargeable weights, rate-card ID, base charge, COD surcharge, and total charge. An order response additionally contains addresses, customer, assigned agent, schedule/failure details, stored charges, current status, and ordered status history.

| Method | Path | Role | Body/query | Successful response |
|---|---|---|---|---|
| POST | `/api/orders/quote` | Customer, Admin | Common quote input | Calculated charge breakdown. No data is persisted. |
| POST | `/api/orders` | Customer, Admin | Common quote input plus `{ pickupAddress, dropAddress, scheduledDate?, customerId? }` | `201`; created order with a `created` history row. `customerId` is required only when an admin creates for a customer. Submitted charge fields are rejected. |
| GET | `/api/orders/mine` | Customer | None | Current customer's orders, newest first. |
| GET | `/api/orders/assigned` | Agent | None | Orders assigned to the current agent. |
| GET | `/api/orders` | Admin | Query: `status?`, `zoneId?`, `agentId?`, `page?`, `limit?` | `{ orders, pagination: { page, limit, total, totalPages } }`. |
| GET | `/api/orders/:id` | Customer owner, assigned Agent, Admin | None | Complete order. Access is scoped for customer and agent roles. |
| GET | `/api/orders/:id/timeline` | Customer owner, assigned Agent, Admin | None | Chronological history entries with actor identity. |
| PATCH | `/api/orders/:id/assign` | Admin | `{ agentId }` | Order updated to `assigned` with a history row. The API validates agent role and availability; the admin UI lists candidates from the pickup zone. |
| POST | `/api/orders/:id/auto-assign` | Admin | None | Selected agent or `null`; selection uses pickup zone and lowest active load. |
| PATCH | `/api/orders/:id/status` | Assigned Agent | `{ status, notes? }` | Updated order. Only a status allowed by the transition map is accepted. |
| PATCH | `/api/orders/:id/override` | Admin | `{ status, notes? }` | Updated order with an explicit admin-override history note. |
| POST | `/api/orders/:id/reschedule` | Customer owner | `{ newDate }` | Rescheduled order after automatic reassignment is attempted. `newDate` must be in the future. |

Normal lifecycle:

```text
created → assigned → picked_up → in_transit → out_for_delivery → delivered
```

Failure path:

```text
out_for_delivery → failed → rescheduled → assigned
```

`created` and `assigned` may also transition to `cancelled`. Every normal transition, reschedule, assignment, and admin override inserts an `OrderStatusHistory` row.

## Database schema summary

| Model | Purpose and important relationships |
|---|---|
| `User` | Customer, agent, and admin accounts. Agents optionally belong to a zone and expose availability/location fields. Relates to customer orders, assigned orders, history actions, and notifications. |
| `Zone` | Service geography. Owns pincode mappings, agents, pickup/drop order relations, and source/destination rate-card relations. |
| `ZonePincode` | Globally unique pincode-to-zone mapping used when quoting or creating a new order. |
| `RateCard` | Pricing configuration unique by order type and directional zone pair. Stores base, per-kg, and COD components plus active state. |
| `Order` | Shipment, addresses, stored zone references, parcel measurements, server-calculated charges, customer/agent, schedule, failure reason, and current status. |
| `OrderStatusHistory` | Immutable-style audit row for an order status event, actor, note, and timestamp. |
| `Notification` | Email delivery attempt for an order and recipient, including message, status (`sent`/`failed`), and timestamp. |

Orders reference `Zone` directly, so removing a pincode lookup later affects future quotes/orders but does not erase the zones displayed on historical orders.

## Rate calculation logic

1. Resolve the pickup and drop pincodes to zones. If either pincode is unmapped, return a readable error.
2. Treat the route as intra-zone when both resolved zone IDs match; otherwise treat it as inter-zone.
3. Find the active rate card matching the order type and the exact directional source/destination zone pair.
4. Calculate volumetric weight as `(length × breadth × height) ÷ 5000`, using centimetres and kilograms.
5. Use the larger of actual weight and volumetric weight as the chargeable weight.
6. Calculate `base charge = rate-card base price + (chargeable weight × price per kg)`.
7. For prepaid orders, the COD surcharge is zero. For COD orders, calculate `COD flat charge + (base charge × COD percentage ÷ 100)`.
8. Calculate `total charge = base charge + COD surcharge`.

The database lookup is separated from the deterministic arithmetic function. Both quote and order creation call the same service, and creation recalculates everything server-side rather than trusting client-provided totals.

## Assignment and notifications

Automatic assignment considers only available agents in the pickup zone. It counts each candidate's orders in `assigned`, `picked_up`, `in_transit`, and `out_for_delivery`, then selects the agent with the smallest active load. Live coordinates are stored but are not used by the current selection algorithm.

Notifications are sent by email for creation, assignment, status changes, rescheduling, and overrides. Every attempt is recorded. SMTP failure is logged as `failed` and does not roll back a successful order-state change.

## Known limitations and scope decisions

- Assignment uses pickup zone plus active-order load rather than live GPS distance or route optimization. This is deterministic, explainable, and sufficient for the specified scope.
- Notifications are email-only. The design can be extended with SMS, but SMS is not implemented.
- The application stores optional agent latitude/longitude but does not provide real-time location streaming or a customer map.
- Rate cards do not have effective-from/effective-to version ranges. An active flag controls current use.
- CORS accepts one configured frontend origin. Vercel preview deployments need that origin updated or a future multi-origin policy.
- Notifications are sent synchronously with a timeout. Delivery-state changes remain successful when SMTP fails, but a slow SMTP server can increase request latency.
- Admins can create agent accounts, but password-reset and self-service availability controls are not implemented.

## Deployment

### Repository choice

Deploy this as one GitHub monorepo. Render uses `backend/` as its root directory, while Vercel uses `frontend/`.

### Neon

1. Use the existing Neon database or create a production branch/database.
2. In Neon, copy the pooled connection string; its hostname contains `-pooler`.
3. Store it only as Render's `DATABASE_URL` secret.
4. Run `npx prisma migrate deploy` during the Render build.
5. Run the seed once after the first successful deployment so demo zones, rate cards, and accounts exist.

### Render backend

The root `render.yaml` defines the service. In Render, choose **New → Blueprint**, connect the GitHub repository, and deploy it. Enter values for every variable marked `sync: false`:

- `DATABASE_URL`: pooled Neon production connection string
- `FRONTEND_URL`: final Vercel origin, for example `https://your-project.vercel.app`
- `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`: production SMTP credentials/sender

Render generates `JWT_SECRET`. The build command is:

```text
npm ci --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build
```

Section 9's shorter command was extended with `npm ci --include=dev` and `npm run build` because the TypeScript compiler and declaration packages are build-time dev dependencies, and this project starts compiled JavaScript from `dist/src/server.js`.

After deployment, verify:

```text
https://YOUR-RENDER-SERVICE.onrender.com/health
https://YOUR-RENDER-SERVICE.onrender.com/ready
```

Run the production seed exactly once from a Render shell/one-off job, or locally with the production `DATABASE_URL` set only for that command:

```powershell
cd backend
$env:DATABASE_URL = "<pooled-production-neon-url>"
npm run prisma:seed
Remove-Item Env:DATABASE_URL
```

### Vercel frontend

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Keep the detected Vite framework settings: build command `npm run build`, output directory `dist`.
4. Add `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api` for Production.
5. Deploy. `frontend/vercel.json` rewrites browser routes to `index.html`, so direct visits such as `/admin/agents` work.
6. Copy the final Vercel origin into Render's `FRONTEND_URL` and redeploy the backend.

### Production smoke test

1. Open the Render `/ready` endpoint.
2. Log in at the Vercel URL using each role.
3. Create and quote an order.
4. Assign it as admin, complete it as an agent, and verify the customer timeline.
5. Exercise the failed/reschedule/reassign path.
6. Confirm notification email arrival in a real inbox.

## Deployment URLs

| Service | URL |
|---|---|
| Frontend | Not deployed yet |
| Backend | Not deployed yet |
| Backend readiness | Not deployed yet |

Replace these entries after Render and Vercel issue their production URLs.

## Demo credentials

| Role | Zone | Email | Password |
|---|---|---|---|
| Admin | — | `admin@test.com` | `Admin@123` |
| Customer | — | `customer@test.com` | `Demo@123` |
| Agent | Zone A | `agent.a@test.com` | `Demo@123` |
| Agent | Zone A | `agent.a2@test.com` | `Demo@123` |
| Agent | Zone A | `agent.a3@test.com` | `Demo@123` |
| Agent | Zone B | `agent.b@test.com` | `Demo@123` |
| Agent | Zone B | `agent.b2@test.com` | `Demo@123` |
| Agent | Zone B | `agent.b3@test.com` | `Demo@123` |

Change all demo passwords for any non-demo production deployment.
