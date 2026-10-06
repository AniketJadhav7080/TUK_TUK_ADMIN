# Frontend ↔ Backend API Contract

**Base URL:** `https://vending-helpless-slaw.ngrok-free.dev/api`
**Auth:** Bearer token from `POST /auth/login`
**Headers:** `Content-Type: application/json`, `ngrok-skip-browser-warning: true`

---

## ✅ Already Working — Just Need Real Data

These endpoints exist but return placeholders/empty arrays. Replace with real DB data:

| Method | Endpoint | Current Issue | Expected Response Fields |
|--------|----------|--------------|------------------------|
| POST | `/recharges/{id}/approve` | Returns `{"status":"APPROVED"}` only | Process recharge, return updated balance |
| GET | `/security/alerts` | Returns `[]` | `[{id, user, location, device, ip, attempts, lastAttempt}]` |
| GET | `/rooms/voice-logs` | Returns `[]` | `[{id, user, type, confidence, room, detected, status}]` |
| GET | `/host/earnings` | Returns zeros/defaults | `{stats: [{label, value}], transactions: [{date, type, amount, balance}], totalEarnings, monthlyEarnings, diamondsEarned}` |
| POST | `/host/withdraw` | Returns `REQUESTED` only | Create real withdrawal record, return `{id, status, date}` |
| GET | `/host/pk-battles` | Returns all zeros | `[{date, opponent, result, score, reward}]` |
| POST | `/agencies/recruit` | Returns invite only | Full workflow: create recruitment request, return `{id, status}` |

---

## ❌ Still Missing Backend APIs

| Method | Endpoint | Page | Expected Response |
|--------|----------|------|------------------|
| GET/POST | `/clans` | Clans | Array of clan objects / Create clan |
| PATCH/DELETE | `/clans/{id}` | Clans | Update/delete clan |
| POST/DELETE | `/clans/{id}/members`, `/clans/{id}/members/{userId}` | Clans | Add/remove clan member |
| GET | `/nearby-rooms` | Nearby Rooms | Array of `{id, name, host, distance, participants, category}` |
| GET | `/dating/profiles` | Dating | Array of dating profiles |
| GET/POST | `/dating/matches`, `/dating/match` | Dating | Array of matches / create match |
| PATCH | `/dating/profiles/{id}` | Dating | Update dating profile |
| GET/POST | `/ai-moderation/flags`, `/ai-moderation/flags/{id}/resolve` | AI Moderation | Array of flags / resolve flag |
| GET/POST/PUT/DELETE | `/vip/plans` | VIP Membership | VIP plans CRUD |
| GET | `/host/gift-revenue` | Host Panel | `{breakdown: [{gift, count, revenue}], total}` |
| GET | `/agencies/performance` | Agency | `{totalRevenue, growth, activeHosts, ranking, metrics}` |
| GET/POST/PATCH/DELETE | `/missions` | Daily Missions | CRUD for missions |
| GET/POST/PATCH/DELETE | `/badges` | Badges | CRUD for achievement badges |

---

## ✅ Fully Working (61/63 Endpoints OK)

| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/auth/login` | ✅ |
| GET | `/dashboard/stats` | ✅ |
| GET | `/dashboard/charts` | ✅ |
| GET | `/users` | ✅ Supports `?vip=true` filter |
| GET/PATCH/DELETE | `/users/{id}` | ✅ + `/status`, `/vip` |
| GET | `/hosts` | ✅ Supports `?status=&search=&page=&size=` |
| POST/PATCH | `/hosts/approve/{id}`, `/hosts/{id}/approve` | ✅ |
| GET | `/rooms/live`, `/rooms/active` | ✅ |
| POST | `/rooms/{id}/close`, `/mute-all`, `/kick/{userId}`, `/mute-kick` | ✅ |
| GET | `/diamond/summary` | ❌ Not built yet — returns role-based summary (total/allocated/received/remaining) |
| POST | `/diamond/allocate` | ❌ Not built yet — Owner allocates to Super Admin `{country, amount}` |
| POST | `/diamond/distribute` | ❌ Not built yet — Super Admin distributes to Diamond Stock `{sellerId, amount}` |
| GET | `/diamond/history` | ❌ Not built yet — role-based ledger records |
| GET | `/diamond-stock` | ✅ Legacy endpoint (kept for compatibility) |
| GET | `/diamond/transactions` | ✅ |
| GET | `/diamond/credit-requests`, POST `/diamond/credit-requests/{id}/action` | ✅ |
| GET/POST | `/events` | ✅ |
| POST | `/notifications/mass`, `/notifications/send` | ✅ |
| GET/PUT | `/payments/gateways`, `/payments/gateways/{id}` | ✅ |
| GET | `/payments/transactions`, `/payments/withdrawals` | ✅ |
| POST | `/payments/withdrawals/{id}/action` | ✅ |
| GET | `/reports` | ✅ Supports `?status=&page=` |
| POST | `/reports/{id}/resolve` | ✅ |
| GET/POST/DELETE | `/platform-owner/admins` | ✅ + `/roles` |
| GET/PUT | `/settings` | ✅ |
| GET/POST/DELETE | `/admins`, `/staff` | ✅ |
| GET/POST/PUT | `/gifts`, `/gifts/{id}` | ✅ + `/gifts/daily` |
| GET | `/agencies`, `/agencies/commissions`, `/agencies/salaries` | ✅ |
| GET | `/countries/stats` | ✅ |
| GET | `/country/{code}/stats`, `/hosts`, `/rooms`, `/support`, `/revenue` | ✅ |
| POST/PATCH | `/country/{code}/hosts/{id}/approve`, `/rooms/{id}/close`, `/support/{id}/resolve` | ✅ |
| GET/POST/PUT | `/gamification/items`, `/users/grant-item`, `/evaluate` | ✅ |
| GET | `/security/fraud-alerts` | ✅ |
| POST | `/security/block-ip` | ✅ |
| GET | `/host/followers` | ✅ |
| GET/POST/DELETE | `/staff/me`, `/staff` | ✅ |
| GET | `/countries` | ✅ |
| GET | `/app/withdrawals/me` | ✅ |
| GET | `/relationships/followers` | ✅ |
| GET | `/gifts/daily` | ✅ |
| GET | `/agents` | ✅ |
| GET/PATCH | `/platform-owner/countries`, `/platform-owner/countries/{code}/status` | ✅ |
| GET | `/platform-owner/dashboard` | ✅ |
| PATCH | `/users/{id}/vip` | ✅ |

---

## ⚠️ 1 Endpoint With Real Bug

| Method | Endpoint | Issue |
|--------|----------|-------|
| GET | `/app/withdrawals` | **500 Internal Server Error** for all roles. Needs backend fix. |
