# sampleNest — Webhook-based payments & orders (NestJS + Razorpay)

A small NestJS backend where customers place orders and pay with
**Razorpay (test mode)**. The interesting part is how it learns that a payment
succeeded: not from the browser, but from a **signed webhook** that Razorpay
sends to the server.

## The flow

```
 Client / Shop           Our API (NestJS)                 Razorpay
 ─────────────           ────────────────                 ────────
 POST /orders  ───────▶  calculate total, save order
                         create Razorpay order  ───────▶  returns order_XXXX
               ◀───────  { id, amount, status: "created", razorpayOrderId }

 Customer opens /checkout/:id ─▶ Razorpay payment popup ─▶ customer pays

                         POST /webhooks/razorpay  ◀─────  "payment.captured"
                         1. verify signature                (signed with your
                         2. skip if already seen             webhook secret)
                         3. order → "paid"
                         4. log the event
                                                 ───────▶  200 OK
```

The browser is never trusted to say "I paid". It can be closed mid-payment
or faked. Only the webhook, which carries a signature only Razorpay can
produce, changes an order's status.

## Order status rules

```
created ──payment.captured──▶ paid
created ──payment.failed────▶ failed ──payment.captured (retry)──▶ paid
```

A `paid` order never changes again, so a late or duplicated event can't
downgrade it or record a second payment.

## Endpoints

| Method | Route | Auth | What it does |
|---|---|---|---|
| GET | `/` | public | Health check |
| POST | `/orders` | `x-api-key` | Create an order |
| GET | `/orders?status=paid` | `x-api-key` | List orders (status filter optional) |
| GET | `/orders/:id` | `x-api-key` | Get one order |
| GET | `/checkout/:id` | public | Payment page that opens Razorpay Checkout |
| POST | `/webhooks/razorpay` | Razorpay signature | Receives payment events |

Money is always in **paise** (₹1 = 100), as Razorpay expects. Whole numbers
avoid rounding errors.

## Folder structure

```
src/
├── main.ts                    starts the app; rawBody on, global validation
├── app.module.ts              root module: config, MongoDB, global API-key guard
├── common/                    reusable building blocks
│   ├── api-key.guard.ts       every route needs x-api-key...
│   ├── public.decorator.ts    ...unless marked @Public()
│   ├── logger.middleware.ts   logs every request
│   └── response.interceptor.ts wraps responses as { success, data, timestamp }
├── razorpay/
│   └── razorpay.service.ts    the ONLY code that talks to Razorpay:
│                              create order + verify webhook signature
├── orders/
│   ├── schemas/order.schema.ts    what an order looks like in MongoDB
│   ├── dto/create-order.dto.ts    validation for POST /orders
│   ├── orders.service.ts          create, find, markPaid / markFailed
│   ├── orders.controller.ts       /orders routes
│   └── checkout.controller.ts     /checkout/:id payment page
└── webhooks/
    ├── schemas/webhook-event.schema.ts  log of processed events (dedupe)
    ├── webhooks.service.ts        verify → dedupe → update order → log
    └── webhooks.controller.ts     POST /webhooks/razorpay
```

## Key ideas (the things to explain in an interview)

1. **Signature verification.** Razorpay signs each webhook with
   HMAC-SHA256(raw body, webhook secret). We recompute it and compare in
   constant time. It must be the *raw* bytes, which is why `main.ts` enables
   `rawBody`. Re-serialised JSON wouldn't match.
   → [razorpay.service.ts](src/razorpay/razorpay.service.ts)
2. **Idempotency.** Razorpay retries webhooks, so the same event can arrive
   twice. Each event id is stored with a unique index, and repeats are
   skipped. → [webhooks.service.ts](src/webhooks/webhooks.service.ts)
3. **Atomic status changes.** `markPaid` / `markFailed` use one
   `findOneAndUpdate` that only matches allowed "from" statuses. Even two
   simultaneous webhooks can't double-process an order.
   → [orders.service.ts](src/orders/orders.service.ts)
4. **Server-side totals.** The client sends items. The server computes the
   amount, so nobody can edit the price in the request.
5. **Fail fast on config.** The app refuses to start if any required env
   variable is missing. → [app.module.ts](src/app.module.ts)

## Setup

### 1. Environment (`.env`)

```bash
PORT=3000
API_KEY=<long random string>
MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/sampleNest?retryWrites=true&w=majority
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
RAZORPAY_WEBHOOK_SECRET=<any secret you choose>
```

- **MongoDB Atlas:** create a database user, allow your IP under Network
  Access, then copy the string from Connect → Drivers.
- **Razorpay:** sign up, stay in **Test Mode**, and generate keys under
  Account & Settings → API Keys.

### 2. Expose localhost so Razorpay can reach it

Razorpay's servers can't call `localhost`. Use a tunnel:

```bash
npm run start:dev
npx ngrok http 3000          # gives you https://xxxx.ngrok-free.app
```

### 3. Create the webhook in Razorpay

Dashboard → Account & Settings → Webhooks → Add New Webhook:
- **URL:** `https://xxxx.ngrok-free.app/webhooks/razorpay`
- **Secret:** the same value as `RAZORPAY_WEBHOOK_SECRET`
- **Events:** `payment.captured`, `payment.failed`, `order.paid`

### 4. Try it

```bash
# Create an order: 2 × ₹499
curl -X POST http://localhost:3000/orders \
  -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"customerEmail":"buyer@example.com","items":[{"name":"T-shirt","quantity":2,"unitPrice":49900}]}'
```

Open `http://localhost:3000/checkout/<id from the response>` and pay with a
[Razorpay test card](https://razorpay.com/docs/payments/payments/test-card-details/)
(or test UPI `success@razorpay`). A few seconds later:

```bash
curl http://localhost:3000/orders/<id> -H "x-api-key: $API_KEY"   # status: "paid"
```

## Tests

```bash
npm test            # unit tests: order logic and status rules
npm run test:e2e    # full HTTP flow: orders, signed webhooks, duplicates, bad signatures
```

The tests use an in-memory MongoDB and a fake Razorpay client. They never
touch Atlas or the network.

## Natural next steps

- Refunds (`refund.processed` webhook → `refunded` status)
- Product catalogue with stock that is reserved on order and released on failure
- Swagger docs (`@nestjs/swagger`)
- HTTPS + rate limiting before deploying
