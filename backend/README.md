# Ticketing System — Implementation Notes

TypeScript + Express + Prisma. Companies and their `GLOBAL_ADMIN` are
pre-seeded (`prisma/seed.ts`); everyone else enters via invitation.

## 1. Invitation & onboarding (`src/services/invitation.service.ts`)

- Only `GLOBAL_ADMIN` (any role/department) or `DEPT_ADMIN` (own department,
  and only into non-admin roles) can create an `Invitation`.
- A signed token + 7-day expiry is generated; `notificationService.sendInvitation`
  emails a link (`APP_URL/invitations/accept?token=...`).
- `acceptInvitation` verifies the token, hashes the chosen password, creates
  the `User` (linked back to the invitation via email), stamps
  `onboardedById`, and marks the invitation `ACCEPTED` — all in one transaction.
- An hourly cron (`jobs/scheduler.ts`) flips stale `PENDING` invitations to `EXPIRED`.

## 2. Priority logic (`src/services/priority.service.ts`)

Priority is **never set by the requester** — it's derived server-side from:
- the requester's **role** (CEO/CTO/CFO/COO → P1 floor, admins/managers → P2,
  regular staff → P3, vendors/contractors → P4), and
- the ticket's **category default priority**, and
- the category's **minimum support level** (an L3/L4-required category can't
  be filed as trivial P4 regardless of who files it).

Whichever signal is *most urgent* wins (`mostUrgent()`). This runs once at
ticket creation (`ticketService.createTicket`) and is stored in both
`priority` and `internalPriority` — kept as two fields so you can later mask
the customer-visible one while `internalPriority` still reflects true triage
urgency, without changing the schema again.

## 3. Escalation (`src/services/escalation.service.ts`)

Two paths, one function (`escalate`):
- **Manual** — an agent/manager/admin calls `POST /tickets/:id/escalate`.
- **Automatic** — `runSlaSweep()` runs every 5 minutes, finds tickets past
  `slaDeadline` that aren't resolved/closed and not already flagged, and
  escalates each one exactly once (`slaBreached` guards against repeats).

Escalating moves the ticket to the next `SupportLevel` (L1→L2→L3→L4), picks
the best-fit agent *at that level* using the same keyword-skill scoring as
assignment, records a `TicketEscalation` row, updates the ticket, and emails
the new owner (plus an SLA-breach warning for automatic escalations).

## 4. Auto-assignment (`src/services/assignment.service.ts`)

1. Eligible pool = active, available `AGENT`/`TEAM_LEAD` users in the
   ticket's department, matching its required `supportLevel`.
2. Score each by counting their `UserKeyword` skills that match the
   ticket's linked `TicketKeyword`s (weighted by `proficiency`).
3. Filter out anyone at `maxActiveTickets` capacity.
4. Among the best skill-score tier, pick whoever has the fewest currently
   open tickets (load balancing breaks ties, never overrides a skill match).
5. If literally nobody has a matching skill, fall back to pure
   least-loaded agent so tickets never go unassigned just because no
   keyword hit.

## 5. Keyword matching + "increasing keywords" (`src/services/keyword.service.ts`)

- On ticket creation, title+description is tokenized (lowercased, stopwords
  stripped) and matched against the department's `Keyword.name` +
  `synonyms`. Matches become `TicketKeyword` rows that assignment scores against.
- Tokens that don't match anything known are upserted into
  `KeywordSuggestion` with an incrementing `occurrenceCount` — this is the
  "increasing keywords" logic: admins call
  `GET /keywords/departments/:id/suggestions` to see what people are typing
  that isn't a keyword yet, sorted by frequency, and
  `POST /keywords/suggestions/:id/promote` to turn a suggestion into a real
  `Keyword` and optionally hand it straight to one or more agents as a skill.
- Initial agent onboarding uses the same primitive:
  `POST /keywords/agents/:userId/skills` with a list of `keywordIds`.

## 6. Email notifications (`src/services/notification.service.ts` + `src/lib/mailer.ts`)

Nodemailer over SMTP (swap for SendGrid/SES by changing `mailer.ts` only —
every call site just calls `sendMail`). Covered events: invitation sent,
ticket created (to requester), ticket assigned (to agent), ticket escalated
(to new owner), SLA breach warning, ticket resolved (to requester). Mail
failures are caught and logged, never thrown, so a broken SMTP config can't
take down ticket creation or assignment.

## Layering

`routes/*.ts` → `controllers/*.ts` → `services/*.ts` → Prisma.

- **Routes** only declare `METHOD path, middleware..., controllerFn` — no logic.
- **Controllers** handle req/response shape: pull params, call a service (for
  anything with real logic: invitations, tickets, escalation, assignment,
  keywords) or Prisma directly (for plain CRUD: departments, categories,
  users, comments, attachments, company). They're in `src/controllers/`.
- **Services** hold the actual business rules and are the ones described
  in sections 1–6 below.

### Where each controller is mounted (`src/index.ts`)

| Controller | Mounted at | Routes file |
|---|---|---|
| `companyController` | `/companies` | `routes/companies.ts` |
| `departmentController` + `ticketCategoryController` (nested) | `/departments` | `routes/departments.ts` |
| `ticketCategoryController.update` | `/categories/:id` | `routes/categories.ts` |
| `userController` | `/users` | `routes/users.ts` |
| `invitationController` | `/invitations` | `routes/invitations.ts` |
| `ticketController` + `commentController` + `attachmentController` (nested) | `/tickets` | `routes/tickets.ts` |
| `keywordController` | `/keywords` | `routes/keywords.ts` |

New endpoints added beyond what section 1–6 originally covered:
- `GET/PATCH /departments`, `POST/GET /departments/:id/categories`, `PATCH /categories/:id`
- `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `GET /users/me`, `PATCH /users/me/availability`
- `GET /companies/me`
- `GET /tickets` (list, auto-scoped to the caller's own tickets for
  requester-type roles), `PATCH /tickets/:id`, `POST /tickets/:id/reassign`
- `POST/GET /tickets/:ticketId/comments` (internal comments hidden from requester roles)
- `POST/GET /tickets/:ticketId/attachments` (metadata only — upload bytes to your object storage first, then record the URL here)
- `DELETE /keywords/agents/:userId/skills/:keywordId`

## Full route reference

| Method | Path | Auth / Roles | Controller |
|---|---|---|---|
| GET | `/health` | none | — |
| POST | `/auth/login` | public (rate-limited) | `authController.login` |
| GET | `/companies/me` | any authenticated user | `companyController.getMine` |
| POST | `/departments` | GLOBAL_ADMIN | `departmentController.create` |
| GET | `/departments` | any authenticated user | `departmentController.list` |
| GET | `/departments/:id` | any authenticated user | `departmentController.getById` |
| PATCH | `/departments/:id` | GLOBAL_ADMIN, DEPT_ADMIN | `departmentController.update` |
| POST | `/departments/:departmentId/categories` | GLOBAL_ADMIN, DEPT_ADMIN | `ticketCategoryController.create` |
| GET | `/departments/:departmentId/categories` | any authenticated user | `ticketCategoryController.list` |
| PATCH | `/categories/:id` | GLOBAL_ADMIN, DEPT_ADMIN | `ticketCategoryController.update` |
| GET | `/users/me` | any authenticated user | `userController.me` |
| PATCH | `/users/me/availability` | any authenticated user (self) | `userController.setMyAvailability` |
| GET | `/users` | any authenticated user | `userController.list` |
| GET | `/users/:id` | any authenticated user | `userController.getById` |
| PATCH | `/users/:id` | GLOBAL_ADMIN, DEPT_ADMIN, MANAGER | `userController.update` |
| POST | `/invitations` | GLOBAL_ADMIN, DEPT_ADMIN | `invitationController.create` |
| POST | `/invitations/accept` | public (token in body) | `invitationController.accept` |
| GET | `/invitations` | GLOBAL_ADMIN, DEPT_ADMIN | `invitationController.list` |
| POST | `/invitations/:id/resend` | GLOBAL_ADMIN, DEPT_ADMIN | `invitationController.resend` |
| POST | `/invitations/:id/cancel` | GLOBAL_ADMIN, DEPT_ADMIN | `invitationController.cancel` |
| POST | `/tickets` | any authenticated user | `ticketController.create` |
| GET | `/tickets` | any authenticated user (auto-scoped) | `ticketController.list` |
| GET | `/tickets/:id` | any authenticated user | `ticketController.getById` |
| PATCH | `/tickets/:id` | any authenticated user | `ticketController.update` |
| POST | `/tickets/:id/resolve` | any authenticated user | `ticketController.resolve` |
| POST | `/tickets/:id/escalate` | AGENT, TEAM_LEAD, MANAGER, DEPT_ADMIN, GLOBAL_ADMIN | `ticketController.escalate` |
| GET | `/tickets/:id/escalations` | any authenticated user | `ticketController.listEscalations` |
| POST | `/tickets/:id/assign` | TEAM_LEAD, MANAGER, DEPT_ADMIN, GLOBAL_ADMIN | `ticketController.assign` |
| POST | `/tickets/:id/reassign` | TEAM_LEAD, MANAGER, DEPT_ADMIN, GLOBAL_ADMIN | `ticketController.autoReassign` |
| POST | `/tickets/:id/keywords` | AGENT, TEAM_LEAD, MANAGER, DEPT_ADMIN, GLOBAL_ADMIN | `ticketController.addKeyword` |
| DELETE | `/tickets/:id/keywords/:keywordId` | AGENT, TEAM_LEAD, MANAGER, DEPT_ADMIN, GLOBAL_ADMIN | `ticketController.removeKeyword` |
| POST | `/tickets/:ticketId/comments` | any authenticated user | `commentController.create` |
| GET | `/tickets/:ticketId/comments` | any authenticated user (internal filtered by role) | `commentController.list` |
| POST | `/tickets/:ticketId/attachments` | any authenticated user | `attachmentController.create` |
| GET | `/tickets/:ticketId/attachments` | any authenticated user | `attachmentController.list` |
| POST | `/keywords` | DEPT_ADMIN, GLOBAL_ADMIN | `keywordController.create` |
| GET | `/keywords` | any authenticated user | `keywordController.list` |
| POST | `/keywords/agents/:userId/skills` | DEPT_ADMIN, GLOBAL_ADMIN | `keywordController.assignSkills` |
| DELETE | `/keywords/agents/:userId/skills/:keywordId` | DEPT_ADMIN, GLOBAL_ADMIN | `keywordController.removeSkill` |
| GET | `/keywords/departments/:departmentId/suggestions` | DEPT_ADMIN, GLOBAL_ADMIN | `keywordController.listSuggestions` |
| POST | `/keywords/suggestions/:id/promote` | DEPT_ADMIN, GLOBAL_ADMIN | `keywordController.promoteSuggestion` |
| POST | `/keywords/suggestions/:id/reject` | DEPT_ADMIN, GLOBAL_ADMIN | `keywordController.rejectSuggestion` |
| GET | `/audit-logs` | GLOBAL_ADMIN, DEPT_ADMIN | `auditLogController.list` |

Route order matters in `users.ts`: `/me` and `/me/availability` are
registered before `/:id` so Express doesn't try to treat `"me"` as an id.

## Auth (`src/services/auth.service.ts`, `src/utils/jwt.ts`)

Plain JWT, for local/testing use — **explicitly not SSO**. Two endpoints
cover the whole lifecycle:

- **"Signup"** is `POST /invitations/accept` — there is no open public
  signup route on purpose, since every account (other than the pre-seeded
  company admin) is meant to come from an admin invitation. Accepting an
  invitation creates the `User`, hashes the password, and now also signs
  a token immediately, so the response is `{ user, token }` and the
  invitee is logged in as soon as they finish signing up.
- **`POST /auth/login`** — `{ email, password }` → verifies the bcrypt
  hash, checks `isActive`, and returns `{ token, user }`. Same generic
  "Invalid email or password" error for both a wrong password and a
  nonexistent email, so login can't be used to enumerate accounts.

Both routes go through `publicTokenLimiter` (10 requests/15min) since
they're the only unauthenticated endpoints with a guessable credential.

Token payload is `{ id, role, companyId, departmentId }`, defined once in
`utils/jwt.ts` (`signAuthToken`/`verifyAuthToken`) and consumed by
`middleware/auth.ts`'s `requireAuth`. To swap this for real SSO later,
those are the only two files that need to change — every controller only
ever reads `req.user`, never touches JWTs directly.

**Testing locally**: after running `prisma/seed.ts`, log in as
`admin@acme.com` / `ChangeMe123!` to get a token, then use that as
`Authorization: Bearer <token>` to hit `POST /invitations` and invite
everyone else through the real flow.



Global, applied in this order in `src/index.ts`:
1. `security.ts` — `helmet()` + CORS locked to `CORS_ORIGINS` (comma-separated env var; defaults to allow-all for local dev).
2. `express.json()`
3. `requestLogger.ts` — one line per request: method, path, status, duration, calling user id.
4. `rateLimiter.ts` — `generalLimiter` (300 req/15min) globally; `publicTokenLimiter` (10 req/15min) additionally on `POST /invitations/accept` since it's unauthenticated and the token is the only credential.

Per-route, applied via route-file composition:
- `auth.ts` — `requireAuth` (verifies bearer JWT), `requireRole(...)`.
- `tenantScope.ts` — `requireTicketInCompany` / `requireDepartmentInCompany` / `requireUserInCompany`: loads the resource by the URL `:id` and 404s if it doesn't belong to the caller's `companyId`. **This closes a real gap** — without it, any valid token could fetch another company's ticket/department/user by guessing an id, since the old controllers only filtered by role, never by tenant. There's also `requireSameDepartmentOrGlobalAdmin` for restricting DEPT_ADMIN/MANAGER to their own department once a resource is loaded.
- `validate.ts` — `validateBody(schema)` / `validateQuery(schema)` using the Zod schemas in `src/validation/schemas.ts`. Parses and replaces `req.body`/`req.query`, so controllers receive already-validated, correctly-typed input.
- `asyncHandler.ts` — wraps every controller function passed to a route. Necessary because Express doesn't forward rejected promises from `async` handlers on its own; without this, a thrown error (e.g. a missing record) becomes an unhandled rejection instead of a clean response.

Terminal, registered last in `src/index.ts`:
- `errorHandler.ts` — `notFoundHandler` (404 catch-all) + `errorHandler` (translates `AppError`, `InvitationError`, `ZodError`, and known Prisma error codes — `P2025` not found, `P2002` unique violation, `P2003` FK violation — into the right HTTP status; anything else logs and returns a generic 500).
## Utils (`src/utils/`)

Pulled out of controllers/services where the same logic was duplicated:
- `rbac.ts` — `STAFF_ROLES`, `ADMIN_ROLES`, `REQUESTER_ONLY_ROLES`, `ASSIGNABLE_AGENT_ROLES`, `EXECUTIVE_ROLES` and matching `isStaff()`/`isAdmin()`/`isRequesterOnly()`/`isExecutive()` helpers. Previously each of `comment.controller.ts`, `ticket.controller.ts`, and `assignment.service.ts` declared its own version of these lists — now one source of truth.
- `time.ts` — `hoursToMs`/`daysToMs`/`addHours`/`addDays`/`hoursFromNow`/`daysFromNow`. Replaces the raw `* 60 * 60 * 1000` arithmetic that was duplicated in `invitation.service.ts` (7-day token TTL) and `ticket.service.ts` (SLA deadline calc).
- `pagination.ts` — `parsePagination(req)` / `paginatedResponse(items, total, pagination)`. Used by `GET /tickets` and ready to drop into `GET /users`, `GET /keywords`, etc. the same way.
- `token.ts` — unchanged from before (`generateToken`, `generateTicketNumber`).





```bash
cp .env.example .env  
npm install
npm run prisma:migrate
npx ts-node prisma/seed.ts   
npm run dev
```

