# TukTuk Admin Panel — Frontend Description

## Overview
React.js admin panel for managing the TukTuk voice chat app. All pages are built and call real backend APIs. Login, routing, role-based permissions, and all UI are complete.

---

## 1. Super Admin Panel

### Dashboard (`/`)
- **What it shows:** 4 stat cards (Total Users, Active Users, Live Rooms, Revenue Today) + chart
- **APIs called:** `GET /dashboard/stats`, `GET /dashboard/charts`
- **Backend needs:** Return `{totalUsers, activeUsers, liveRooms, revenueToday}` + chart data

### Users (`/users`)
- **What it shows:** Table of all users with search, filter by VIP, actions (edit, ban, delete, set VIP)
- **APIs called:** `GET /users`, `GET /users/{id}`, `PATCH /users/{id}`, `PATCH /users/{id}/status`, `PATCH /users/{id}/vip`, `DELETE /users/{id}`
- **Backend needs:** Return paginated user list with fields: `id, name, email, username, coins, diamonds, status, vipStatus, createdAt`

### User Detail (`/users/:id`)
- **What it shows:** Full user profile with tabs (Overview, VIP, Activity, etc.), edit form, status toggle
- **APIs called:** `GET /users/{id}`, `PATCH /users/{id}`, `PATCH /users/{id}/status`
- **Backend needs:** Return `{id, name, email, username, phone, country, coins, diamonds, status, vipPlan, vipStartDate, vipExpiryDate, createdAt, lastActive}`

### Hosts (`/hosts`)
- **What it shows:** Table of all hosts, approve/reject actions, search/filter by status
- **APIs called:** `GET /hosts`, `POST /hosts/approve/{id}`, `PATCH /hosts/{id}/approve`
- **Backend needs:** Return paginated host list with `{id, name, email, status, country, createdAt}`

### Rooms (`/rooms`)
- **What it shows:** Table of active rooms with close, mute-all, kick user actions
- **APIs called:** `GET /rooms/active`, `POST /rooms/{id}/close`, `POST /rooms/{id}/mute-all`, `POST /rooms/{id}/kick/{userId}`, `POST /rooms/{id}/mute-kick`
- **Backend needs:** Return `[{id, name, hostName, participantCount, status}]`

### Diamond Allocation (`/diamond-allocation`)
- **What it shows:** Role-based action page. Owner allocates diamonds to Super Admin (by country). Super Admin distributes to Diamond Stock (same country only). Diamond Stock recharges end user (by user_id + lookup).
- **APIs called:**
  - `GET /diamond/summary` — role-based summary (total, allocated, received, distributed, remaining, recharged)
  - `POST /diamond/allocate` — Owner allocates to Super Admin `{country, amount}`
  - `POST /diamond/distribute` — Super Admin distributes to Diamond Stock `{sellerId, amount}`
  - `GET /agent/users/{userId}` — lookup end user
  - `POST /agent/wallet/recharge` — recharge end user wallet
- **Backend needs:** Return role-scoped data. Owner sees totals. Super Admin sees their country's data. Diamond Stock sees their own stock.

### Gifts (`/gifts`)
- **What it shows:** Gift catalog table with icon, name, price, coins, category, status, total sent. Create/edit modal.
- **APIs called:** `GET /gifts`, `POST /gifts`, `PATCH /gifts/{id}`, `PUT /gifts/{id}`
- **Backend needs:** Return `[{id, name, icon, price, coins, category, status, totalSent}]`

### Agency (`/agency`)
- **What it shows:** 5 tabs — Agencies (table), Commissions (table), Salary Reports (summary cards), Performance (metrics), Recruit Host (form)
- **APIs called:** `GET /agencies`, `GET /agencies/commissions`, `GET /agencies/salaries`, `GET /agencies/performance`, `POST /agencies/recruit`
- **Backend needs:** Return agencies list, commission data, salary data, performance metrics

### Live Monitor (`/live`)
- **What it shows:** Live rooms grid with participant count, duration, audio quality, flagged status. Close room action.
- **APIs called:** `GET /rooms/live`, `POST /rooms/{id}/close`
- **Backend needs:** Return `[{id, name, hostName, participants, duration, quality, flagged}]`

### Security (`/security`)
- **What it shows:** 3 tabs — Fraud Detection (table), AI Content Moderation (table), Suspicious Logins (table). Block IP action.
- **APIs called:** `GET /security/fraud-alerts`, `GET /rooms/voice-logs`, `GET /security/alerts`, `POST /security/block-ip`
- **Backend needs:** Return fraud alerts list, voice moderation logs, security alerts

### Events (`/events`)
- **What it shows:** Events list with create modal
- **APIs called:** `GET /events`, `POST /events`
- **Backend needs:** Return `[{id, name, description, startDate, endDate, status}]`

### Payments (`/payments`)
- **What it shows:** 3 tabs — Gateways (list/edit), Transactions (table), Withdrawals (table with approve/reject)
- **APIs called:** `GET /payments/gateways`, `PUT /payments/gateways/{id}`, `GET /payments/transactions`, `GET /payments/withdrawals`, `POST /payments/withdrawals/{id}/action`
- **Backend needs:** Return gateways, transactions, withdrawals lists

### Reports (`/reports`)
- **What it shows:** Reports table with filter by status, resolve action
- **APIs called:** `GET /reports`, `POST /reports/{id}/resolve`
- **Backend needs:** Return paginated reports with `{id, reporterName, subject, reason, status, createdAt}`

---

## 2. Country Handler Panel (`/country`)

- **What it shows:** Country dashboard with list of countries, click to see details
- **Detail view shows:** 4 tabs — Hosts (list/approve), Rooms (list/close), Support Tickets (list/resolve), Revenue (summary)
- **APIs called:**
  - `GET /countries/stats` — list countries with stats
  - `GET /country/{code}/stats` — single country stats
  - `GET /country/{code}/hosts` — hosts in this country
  - `GET /country/{code}/rooms` — rooms in this country
  - `GET /country/{code}/support` — support tickets for this country
  - `GET /country/{code}/revenue` — revenue data for this country
  - `PATCH /country/{code}/hosts/{id}/approve` — approve host
  - `POST /country/{code}/rooms/{id}/close` — close room
  - `POST /country/{code}/support/{id}/resolve` — resolve support ticket
- **Backend needs:** Country-level data scoped to the assigned country

---

## 3. Allocation History Panel (`/allocation-history`)

- **What it shows:** Role-based ledger (no forms). Owner sees country-wise allocation history (what was given to each Super Admin). Super Admin sees distribution history to Diamond Stock. Diamond Stock sees recharge history to end users.
- **APIs called:**
  - `GET /diamond/history` — role-based record list
- **Backend needs:** Return array of records filtered by role. Owner: `[{country, superAdminName, amount, date, note}]`. Super Admin: `[{sellerName, amount, date, note}]`. Diamond Seller: `[{userId, userName, diamonds, amount, date, note}]`.

---

## 4. Support Panel

### Tickets (`/tickets`)
- **What it shows:** Stats cards + filtered table of support tickets. Chat modal with message input. Assign and Resolve actions.
- **APIs called:** `GET /reports?status=PENDING`, `GET /reports` (uses reports as initial data source — needs dedicated tickets endpoint)
- **Backend needs:** Dedicated `GET /tickets` returning `[{id, user, subject, category, priority, status, assignee, messages, date}]`
- **Feature complete on frontend but backend tickets API is missing**

### Fraud & Abuse Reports (in Security page)
- See Security section above

### Live Chat Support
- **What it shows:** Chat modal in Tickets page with message input and display
- **Backend needs:** WebSocket endpoint `WS /ws/chat/{ticketId}` for real-time messaging

---

## 5. Moderator Panel

### Room Monitoring (`/live`)
- See Live Monitor in Super Admin (shared page)

### Mute/Kick/Ban Users (`/rooms`)
- See Rooms in Super Admin (shared page)

### Content Moderation (`/security` — "AI Content Moderation" tab)
- See Security in Super Admin (shared page)

### Voice Room Monitoring (`/security` — "Voice Logs" behind the scenes)
- Uses `GET /rooms/voice-logs` but currently gets empty data from backend

---

## 6. Host Panel (`/host-panel`)

- **What it shows:** 4 tabs — Earnings (stats cards + transaction history table), Gift Revenue (gift breakdown table), PK Battles (history table with date/opponent/result/score/reward), Followers (summary cards with total/new/top fans/donated)
- **APIs called:**
  - `GET /host/earnings` — `{stats: [{label, value}], transactions: [{date, type, amount, balance}]}`
  - `GET /host/gift-revenue` — `{breakdown: [{gift, count, revenue}], total}`
  - `GET /host/pk-battles` — `[{date, opponent, result, score, reward}]`
  - `GET /host/followers` — `{total, newThisWeek, topFans, fanCoinsDonated}`
  - `POST /host/withdraw` — request withdrawal `{amount, method}`
- **Backend needs:** Real earnings data, real PK battle data, real follower data, real gift revenue

---

## 7. Agency Panel (`/agency`)
- Same as Super Admin's Agency page (shared page)

---

## 8. Premium Features

### AI Voice Moderation + AI Fake User Detection (`/ai-moderation`)
- **What it shows:** 3 tabs — Voice Moderation (table with AI confidence, user, reason), Fake User Detection (risk score), Content Moderation (type). Resolve flag action.
- **APIs called:**
  - `GET /ai-moderation/flags` — `[{id, user, type, confidence, reason, detectedAt, status}]`
  - `POST /ai-moderation/flags/{id}/resolve` — `{resolved: true}`
- **Backend needs:** Return AI moderation flags and allow resolving them

### Nearby Voice Rooms (`/nearby`)
- **What it shows:** Grid of nearby rooms with distance, host, participants. Sort by distance/popularity/recent. Room detail modal.
- **APIs called:** `GET /nearby-rooms` — `[{id, name, hostName, distance, participants, category, status}]`
- **Backend needs:** Return nearby rooms based on location/proximity

### Dating Match System (`/dating`)
- **What it shows:** 2 tabs — Profiles (grid with age, location, interests) and Matches (table with compatibility score). Profile detail modal.
- **APIs called:**
  - `GET /dating/profiles` — `[{id, name, age, gender, location, bio, interests, status}]`
  - `PATCH /dating/profiles/{id}` — update profile
  - `GET /dating/matches` — `[{id, user1, user2, matchedAt, compatibility, status}]`
  - `POST /dating/match` — create match
- **Backend needs:** Dating profiles and matches data

### VIP Membership (`/vip`)
- **What it shows:** 2 tabs. Plans tab shows VIP plan cards with name, price, coins, features, color. Create/Edit/Delete/Disable actions. Subscribers tab shows user subscription table.
- **APIs called:**
  - `GET /vip/plans` — `[{id, name, price, coins, features, color, duration, subscribers, status}]`
  - `POST /vip/plans` — create plan
  - `PUT /vip/plans/{id}` — update plan
  - `DELETE /vip/plans/{id}` — delete plan
  - `GET /users?vip=true` — list VIP subscribers
- **Backend needs:** Full CRUD for VIP plans, return plan list and subscriber data

### Clan/Family System (`/clans`)
- **What it shows:** Grid of clan cards with name, tag, members, description, status. Create/Delete actions. Manage modal shows members with kick action.
- **APIs called:**
  - `GET /clans` — `[{id, name, tag, description, icon, color, members, maxMembers, status, createdAt, membersList}]`
  - `POST /clans` — create clan
  - `PATCH /clans/{id}` — update clan
  - `DELETE /clans/{id}` — delete clan
  - `POST /clans/{id}/members` — add member
  - `DELETE /clans/{id}/members/{userId}` — remove member
- **Backend needs:** Full CRUD for clans, member management

### Daily Missions (`/missions`)
- **What it shows:** Stats cards + grid of mission cards with name, description, reward, type, goal, completions. Create/Edit/Delete actions.
- **APIs called:**
  - `GET /missions` — `[{id, name, description, reward, type, requirement, icon, completions, status}]`
  - `POST /missions` — create mission
  - `PATCH /missions/{id}` — update mission
  - `DELETE /missions/{id}` — delete mission
- **Backend needs:** Full CRUD for daily/weekly/monthly missions

### Achievement Badges (`/badges`)
- **What it shows:** Grid of badge cards with icon, color, name, category, earned count. Create/Edit/Delete/Enable-Disable actions.
- **APIs called:**
  - `GET /badges` — `[{id, name, description, icon, color, category, requirement, earned, status}]`
  - `POST /badges` — create badge
  - `PATCH /badges/{id}` — update badge
  - `DELETE /badges/{id}` — delete badge
- **Backend needs:** Full CRUD for achievement badges

---

## Role-Permission System

| Role | Can Access |
|------|-----------|
| **Super Admin** | Dashboard, Users, Hosts, Rooms, Reports, Diamond Allocation, Allocation History, Gifts, Agency, Live Monitor, Security, Events, Payments, VIP, Clans, Nearby, Dating, AI Moderation, Notifications, Settings |
| **Country Handler** | Country Dashboard (hosts/rooms/support/revenue for assigned country) |
| **Diamond Stock** | Diamond Allocation + Allocation History panels |
| **Agency** | Agency panel + Host management |
| **Host** | Host Panel (earnings/PK/followers/gift revenue/withdrawals) |
| **Moderator** | Dashboard, Users, Rooms, Reports, Hosts, Notifications |
| **Support** | Dashboard, Users, Reports, Tickets (with live chat), Notifications |
| **Owner** | Everything including Admin management and Official panel |

---

## Authentication Flow

1. User enters email + password on `/login`
2. Frontend calls `POST /auth/login` with `{email, password}`
3. Backend returns `{token, admin: {id, name, email, role, country}, ...}`
4. Frontend stores token in `sessionStorage`, redirects to dashboard
5. All subsequent API calls include `Authorization: Bearer {token}` header
6. If any API returns 401, user is redirected to login

---

## Technical Details

- **Framework:** React.js with Vite
- **Routing:** react-router-dom v6
- **State:** React hooks (useState, useEffect), AuthContext, SidebarContext
- **API client:** Custom `api.js` with `request()` function handling auth, errors, query params
- **Styling:** CSS with CSS variables (`--primary`, `--danger`, `--success`, etc.)
- **Auth:** JWT in sessionStorage, role-based UI filtering
- **Build output:** Single JS bundle (~825KB) + CSS (~20KB) in `dist/`
