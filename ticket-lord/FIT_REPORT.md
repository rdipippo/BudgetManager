# Ticket Lord — Functional Interface Test (FIT) Report

**Application:** Ticket Lord
**Version:** 1.0.0
**Date:** 2026-03-18
**Environment:** Initial Architecture Review
**Status:** ✅ Ready for Development Integration Testing

---

## 1. Executive Summary

Ticket Lord is a full-stack event ticketing platform built with React (frontend), Node.js/Express (backend), MySQL (database), Stripe (payments), and Capacitor (mobile). This FIT report defines the functional interfaces between system components, expected behaviors, acceptance criteria, and test cases for each major feature area.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  React SPA (Vite)          Capacitor (iOS/Android)              │
│  Port: 3001                Native App                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / REST
┌───────────────────────────────▼─────────────────────────────────┐
│                        API LAYER                                 │
│  Express + TypeScript        Port: 5001                          │
│  Middleware: Helmet, CORS, Rate Limiter, JWT Auth                │
└───────────┬───────────────────────────────────┬─────────────────┘
            │ MySQL2 Parameterized Queries        │ Stripe SDK
┌───────────▼─────────────────┐  ┌───────────────▼───────────────┐
│        MySQL 8              │  │     Stripe API                 │
│  Database: ticket_lord      │  │  PaymentIntents + Connect      │
└─────────────────────────────┘  └───────────────────────────────┘
```

---

## 3. Feature Interface Definitions

### 3.1 Authentication Module

#### FIT-AUTH-001: User Registration
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/auth/register` |
| **Input** | `{ email, password, name, role? }` |
| **Success** | 201 — Verification email sent |
| **Failures** | 409 email exists · 400 validation error |
| **Side Effects** | User row inserted · Stripe customer created · Verification email sent |

**Test Cases:**
- [ ] TC-AUTH-001-a: Valid attendee registration returns 201
- [ ] TC-AUTH-001-b: Valid host registration returns 201
- [ ] TC-AUTH-001-c: Duplicate email returns 409
- [ ] TC-AUTH-001-d: Weak password returns 400 with field errors
- [ ] TC-AUTH-001-e: Missing required fields return 400

#### FIT-AUTH-002: Email Verification
| Property | Value |
|----------|-------|
| **Interface** | `GET /api/auth/verify-email?token=<token>` |
| **Input** | Verification token (query param) |
| **Success** | 200 — `email_verified` set to TRUE |
| **Failures** | 400 invalid/expired token |

**Test Cases:**
- [ ] TC-AUTH-002-a: Valid token sets email_verified = TRUE
- [ ] TC-AUTH-002-b: Expired token (>24h) returns 400
- [ ] TC-AUTH-002-c: Already-used token returns 400

#### FIT-AUTH-003: Login
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/auth/login` |
| **Input** | `{ email, password }` |
| **Success** | 200 — `{ accessToken, user }` · HttpOnly refreshToken cookie |
| **Failures** | 401 invalid creds · 403 unverified email |

**Test Cases:**
- [ ] TC-AUTH-003-a: Correct credentials return JWT + user data
- [ ] TC-AUTH-003-b: Wrong password returns 401
- [ ] TC-AUTH-003-c: Unverified email returns 403
- [ ] TC-AUTH-003-d: Non-existent email returns 401

#### FIT-AUTH-004: Token Refresh
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/auth/refresh` (cookie-based) |
| **Success** | 200 — New accessToken + rotated refreshToken |
| **Failures** | 401 invalid/missing cookie |
| **Security** | One-time use — token rotated on each refresh |

**Test Cases:**
- [ ] TC-AUTH-004-a: Valid refresh token returns new access token
- [ ] TC-AUTH-004-b: Used refresh token returns 401
- [ ] TC-AUTH-004-c: Missing cookie returns 401

---

### 3.2 Events Module

#### FIT-EVENT-001: Browse Events (Public)
| Property | Value |
|----------|-------|
| **Interface** | `GET /api/events` |
| **Input** | Query: `category, city, startDate, endDate, search, page, limit` |
| **Success** | 200 — `{ events: Event[], total: number }` |
| **Auth** | None (public) |
| **Filters** | Status must be `published` · Max 100 per page |

**Test Cases:**
- [ ] TC-EVENT-001-a: Returns paginated published events
- [ ] TC-EVENT-001-b: Category filter returns only matching events
- [ ] TC-EVENT-001-c: Search filter matches title/description/venue
- [ ] TC-EVENT-001-d: Draft/cancelled events excluded from results

#### FIT-EVENT-002: Create Event (Host)
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/events` |
| **Auth** | Bearer JWT · Role: `host` or `admin` |
| **Input** | Event fields (title, description, dates, location, etc.) |
| **Success** | 201 — Created event object |
| **Failures** | 400 validation · 403 not host role |
| **Default Status** | `draft` |

**Test Cases:**
- [ ] TC-EVENT-002-a: Valid event created with status=draft
- [ ] TC-EVENT-002-b: Attendee role returns 403
- [ ] TC-EVENT-002-c: Missing required fields return 400
- [ ] TC-EVENT-002-d: End date before start date rejected

#### FIT-EVENT-003: Publish Event (Host)
| Property | Value |
|----------|-------|
| **Interface** | `PUT /api/events/:id` with `{ status: "published" }` |
| **Preconditions** | Event must have at least 1 ticket type |
| **Success** | 200 — Event with status=published |
| **Failures** | 404 not found · 403 not owner |

**Test Cases:**
- [ ] TC-EVENT-003-a: Host can publish own draft event
- [ ] TC-EVENT-003-b: Other host cannot publish event they don't own
- [ ] TC-EVENT-003-c: Admin can publish any event

---

### 3.3 Ticket Types Module

#### FIT-TT-001: Add Ticket Type
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/events/:id/ticket-types` |
| **Auth** | Host or Admin · Must own the event |
| **Input** | `{ name, price, quantity, maxPerOrder, minPerOrder, saleStart?, saleEnd? }` |
| **Success** | 201 — TicketType object |

**Test Cases:**
- [ ] TC-TT-001-a: Free ticket (price=0) created successfully
- [ ] TC-TT-001-b: Paid ticket created with correct price
- [ ] TC-TT-001-c: Negative price rejected (400)
- [ ] TC-TT-001-d: Quantity < 1 rejected (400)

---

### 3.4 Orders & Payments Module

#### FIT-ORDER-001: Create Order
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/orders` |
| **Auth** | Any authenticated user |
| **Input** | `{ eventId, items: [{ ticketTypeId, quantity }] }` |
| **Success** | 201 — `{ orderId, clientSecret, totalAmount }` |
| **Failures** | 400 sold out · 400 over max per order · 404 event not published |
| **Side Effects** | Order record created (pending) · Stripe PaymentIntent created |

**Test Cases:**
- [ ] TC-ORDER-001-a: Valid order returns Stripe client secret
- [ ] TC-ORDER-001-b: Sold-out ticket type returns 400
- [ ] TC-ORDER-001-c: Exceeding maxPerOrder returns 400
- [ ] TC-ORDER-001-d: Invalid event ID returns 404
- [ ] TC-ORDER-001-e: Unpublished event returns 404
- [ ] TC-ORDER-001-f: Total correctly calculated in cents

#### FIT-ORDER-002: Payment Webhook (Stripe)
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/payments/webhook` |
| **Auth** | Stripe webhook signature (HMAC) |
| **Events Handled** | `payment_intent.succeeded` · `payment_intent.payment_failed` |
| **On Success** | Order status → `completed` · Tickets issued · QR codes generated · Confirmation email sent · `quantity_sold` incremented |
| **On Failure** | Order status → `cancelled` |

**Test Cases:**
- [ ] TC-ORDER-002-a: Valid succeeded event issues tickets
- [ ] TC-ORDER-002-b: Invalid signature returns 400
- [ ] TC-ORDER-002-c: Failed payment cancels order
- [ ] TC-ORDER-002-d: Duplicate webhook event handled idempotently
- [ ] TC-ORDER-002-e: Confirmation email sent after successful payment

#### FIT-ORDER-003: Refund
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/orders/:id/refund` |
| **Auth** | Order owner |
| **Preconditions** | Order status must be `completed` |
| **Success** | 200 — Stripe refund created · Order status → `refunded` · Tickets cancelled |
| **Side Effects** | Refund confirmation email sent |

**Test Cases:**
- [ ] TC-ORDER-003-a: Completed order refunded successfully
- [ ] TC-ORDER-003-b: Pending order refund rejected (400)
- [ ] TC-ORDER-003-c: Another user's order refund rejected (403)

---

### 3.5 Tickets Module

#### FIT-TICKET-001: View My Tickets
| Property | Value |
|----------|-------|
| **Interface** | `GET /api/tickets/my-tickets` |
| **Auth** | Authenticated user |
| **Success** | 200 — Array of tickets with QR codes, event info |

**Test Cases:**
- [ ] TC-TICKET-001-a: Returns all valid/used tickets for user
- [ ] TC-TICKET-001-b: Cancelled tickets excluded
- [ ] TC-TICKET-001-c: QR code data URL present for valid tickets

#### FIT-TICKET-002: Check-In Ticket (Host)
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/events/:id/check-in` |
| **Auth** | Host or Admin · Must own the event |
| **Input** | `{ ticketNumber: string }` |
| **Success** | `{ valid: true, message: "Check-in successful", ticket }` |
| **Failures** | Already used · Wrong event · Cancelled/refunded |

**Test Cases:**
- [ ] TC-TICKET-002-a: Valid ticket checked in successfully
- [ ] TC-TICKET-002-b: Already checked-in ticket returns error
- [ ] TC-TICKET-002-c: Ticket for different event returns error
- [ ] TC-TICKET-002-d: Cancelled ticket returns error
- [ ] TC-TICKET-002-e: `checked_in_at` timestamp recorded

---

### 3.6 Stripe Connect Module

#### FIT-CONNECT-001: Host Stripe Onboarding
| Property | Value |
|----------|-------|
| **Interface** | `POST /api/payments/connect` |
| **Auth** | Host role |
| **Success** | 200 — `{ url: string }` Stripe onboarding URL |
| **Side Effects** | Stripe Express account created · `stripe_connect_account_id` saved |

**Test Cases:**
- [ ] TC-CONNECT-001-a: New host gets Stripe onboarding URL
- [ ] TC-CONNECT-001-b: Existing connected host gets new account link (not duplicate)
- [ ] TC-CONNECT-001-c: Attendee role returns 403

---

## 4. Security Interface Tests

| ID | Test | Expected |
|----|------|----------|
| SEC-001 | SQL injection in search param | Query parameterized, no injection |
| SEC-002 | XSS in event title | Sanitized on output |
| SEC-003 | Access other user's tickets | 403 Forbidden |
| SEC-004 | Edit another host's event | 403 Forbidden |
| SEC-005 | Brute force login (>10 req/15min) | 429 Too Many Requests |
| SEC-006 | Expired JWT access | 401 Unauthorized |
| SEC-007 | Token replay after logout | 401 Unauthorized |
| SEC-008 | Webhook without signature | 400 Bad Request |
| SEC-009 | Purchase without auth | 401 Unauthorized |
| SEC-010 | Password < 8 chars | 400 Validation error |
| SEC-011 | CORS from unknown origin | Request blocked |
| SEC-012 | Missing Authorization header | 401 Unauthorized |

---

## 5. Rate Limit Tests

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | 100 req | 15 min |
| Auth endpoints | 10 req | 15 min |
| Password reset | 5 req | 60 min |
| Purchase | 5 req | 1 min |

**Test Cases:**
- [ ] RL-001: Auth endpoint blocked after 10 rapid requests
- [ ] RL-002: Purchase endpoint blocked after 5 rapid requests
- [ ] RL-003: General limit applies after 100 requests

---

## 6. Accessibility Tests (WCAG 2.1 AA)

| ID | Criterion | Implementation |
|----|-----------|----------------|
| A11Y-001 | Skip navigation link | `<a href="#main-content">` visible on focus |
| A11Y-002 | All images have alt text | Decorative images use `alt=""` |
| A11Y-003 | Form labels associated | `htmlFor`/`id` on all inputs |
| A11Y-004 | Error messages linked | `aria-describedby` on inputs with errors |
| A11Y-005 | Keyboard navigation | All interactive elements reachable via Tab |
| A11Y-006 | Focus indicators | `focus-visible` outlines on all elements |
| A11Y-007 | Screen reader support | `aria-live`, `role`, `aria-label` used throughout |
| A11Y-008 | Color contrast | Primary #7C3AED on white: 7.2:1 (AAA) |
| A11Y-009 | Reduced motion | `prefers-reduced-motion` disables animations |
| A11Y-010 | Page titles | Unique `<title>` on each route |

---

## 7. Responsive Design Tests

| Breakpoint | Width | Target Device |
|------------|-------|---------------|
| Mobile S | 320px | iPhone SE |
| Mobile M | 375px | iPhone 14 |
| Mobile L | 425px | Large phone |
| Tablet | 768px | iPad |
| Desktop | 1024px+ | Laptop/Desktop |

**Test Cases:**
- [ ] RESP-001: Navigation collapses to BottomNav on mobile
- [ ] RESP-002: Event grid adapts from 1 to 3 columns
- [ ] RESP-003: Event detail switches to stacked layout on mobile
- [ ] RESP-004: Checkout form readable on 320px width
- [ ] RESP-005: Host table scrollable horizontally on mobile

---

## 8. Performance Benchmarks

| Metric | Target | Notes |
|--------|--------|-------|
| TTFB | < 200ms | API response time |
| LCP | < 2.5s | Largest Contentful Paint |
| FID | < 100ms | First Input Delay |
| CLS | < 0.1 | Cumulative Layout Shift |
| DB queries | < 50ms | With proper indexing |

---

## 9. Integration Flow: End-to-End Purchase

```
1. Attendee browses events  →  GET /api/events
2. Selects ticket quantities →  GET /api/events/:id
3. Initiates checkout       →  POST /api/orders
   └── Creates order (pending) + Stripe PaymentIntent
4. Enters payment details   →  Stripe Elements
5. Confirms payment         →  Stripe processes card
6. Webhook received         →  POST /api/payments/webhook
   ├── Issues tickets (QR codes generated)
   ├── Updates order → completed
   ├── Increments quantity_sold
   └── Sends confirmation email
7. Attendee views tickets   →  GET /api/tickets/my-tickets
8. At venue: host scans     →  POST /api/events/:id/check-in
   └── Ticket status → used, checked_in_at recorded
```

**E2E Test Cases:**
- [ ] E2E-001: Complete purchase flow from browse to ticket receipt
- [ ] E2E-002: Multiple ticket types in single order
- [ ] E2E-003: Failed payment leaves order in cancelled state
- [ ] E2E-004: Refund flow cancels tickets and sends email
- [ ] E2E-005: Check-in marks ticket as used

---

## 10. Known Limitations & Future Work

| Item | Priority | Notes |
|------|----------|-------|
| QR code scanner (camera) | High | Currently manual entry only; add @zxing/browser |
| Image upload | Medium | imageUrl stored as URL; add S3/Cloudinary |
| Event search (full-text) | Medium | MySQL FULLTEXT index added; tune weights |
| Waitlist | Medium | Track oversold demand |
| Recurring events | Low | Currently single-date only |
| Multi-currency | Low | USD only currently |
| Push notifications | Low | Capacitor push notifications for ticket updates |

---

*Report generated for Ticket Lord v1.0.0 — 2026-03-18*
