# Phase 6 Test Report

Test date: 24 August 2026  
Environment: local React/Express applications using the configured Neon database and SMTP transport

## Section 8 checklist

| Checklist item | Result | Evidence |
|---|---|---|
| Full order lifecycle works end-to-end through the UI | **Manual visual confirmation pending** | Live API integration passed `created → assigned → picked_up → in_transit → out_for_delivery → delivered`. Six history rows were present in order, with actors `customer → admin → agent → agent → agent → agent` and ascending timestamps. The protected frontend route was reachable but browser credential entry was not performed automatically. |
| Failed → reschedule → reassign flow verified visually | **Manual visual confirmation pending** | Live integration passed `created → assigned → picked_up → in_transit → out_for_delivery → failed → rescheduled → assigned`. Failure reason was preserved and automatic reassignment selected an eligible Zone A agent. Visual confirmation in the customer/admin/agent pages remains a manual submission check. |
| Admin can override status and it is logged with a note | **PASS** | A created order was overridden to `cancelled`; the history actor was `admin` and the note was `Admin override from created to cancelled: Cancelled during Phase 6 override verification`. |
| Rate engine tested with at least four combinations | **PASS** | Pure-function tests passed: intra-zone B2C prepaid (₹228), inter-zone B2B COD (₹425.70), intra-zone B2B COD (₹221.90), and inter-zone B2C prepaid (₹350). |
| Volumetric weight overrides actual weight when larger | **PASS** | 50 × 40 × 30 cm produced 12 kg volumetric weight; with 10 kg actual weight, chargeable weight was 12 kg. |
| Unmapped pincode returns a clear error, not a crash | **PASS** | Quote with `999999` returned HTTP `400` and `No zone mapped for pincode 999999`. |
| JWT-protected routes reject missing/invalid tokens | **PASS** | `GET /api/orders/mine` returned `401` for both a missing token and an invalid bearer token. |
| Role-gated routes reject wrong roles | **PASS** | A customer attempting `POST /api/zones` received HTTP `403`. |
| Email notifications actually arrive | **SMTP acceptance PASS; inbox confirmation pending** | The three test scenarios created 19 notification records and every record was `sent` (SMTP accepted): 7 normal-lifecycle, 10 failure/reschedule, and 2 override notifications. Actual inbox placement cannot be proven without viewing the recipient mailbox; check inbox/spam once using a real registered customer email. |
| No secrets committed; `.env` ignored and examples present | **PASS with credential-rotation action** | A new Git repository was initialized after redaction. `backend/.env` is ignored by the root `.gitignore`; both `.env.example` files are present. A scan of all 78 commit-candidate files found zero credential-like values. The Neon password that had previously appeared in `backend/.env.example` should still be rotated before deployment. |

## Additional verification

| Check | Result |
|---|---|
| Backend TypeScript production build | PASS |
| Frontend TypeScript/Vite production build | PASS (109 modules transformed) |
| Prisma schema validation | PASS |
| Prisma migration status | PASS; one migration found and the Neon schema is up to date |
| History actor present on every integration-test row | PASS |
| History timestamps chronological | PASS |
| Notification failure isolation design | PASS by inspection and prior failure-path behavior; order writes occur before notification attempts and delivery errors are caught/logged |
| Temporary test-data cleanup | PASS; the three Phase 6 orders, their history rows, and notification rows were removed after verification |

## Commands used

```powershell
cd backend
npm run test:rate-engine
npm run build
npx prisma validate
npx prisma migrate status

cd ../frontend
npm run build
```

## Remaining manual submission checks

1. In separate browser profiles, visually repeat the delivered lifecycle using the customer, admin, and agent pages.
2. Visually repeat failed delivery and customer rescheduling, then confirm the reassigned order in the admin/agent pages.
3. Register a customer with an inbox you control, trigger one notification, and confirm it appears in inbox or spam.
4. After deployment, repeat the production smoke test at the Vercel URL and record the final URLs in `README.md`.
