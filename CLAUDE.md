# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FamilyGest — a multi-tenant ("multi-famille") household organizer SPA. Vue 3 (Composition API, `<script setup>`) frontend built with Vite, Express/Mongoose backend, MongoDB storage. Backend and frontend are two separate npm packages in one repo (root = client, `server/` = API).

## Commands

```bash
# Install (must be done in both places)
npm install
npm --prefix server install

# Dev: runs backend (port 5000) and frontend (port 5173, proxies /api -> 5000) concurrently
npm run dev
npm run dev:client   # frontend only (vite)
npm run dev:server   # backend only (node --watch)

# Production build (frontend only; outputs to dist/, served statically by Express)
npm run build
npm run preview

# Regenerate PWA/avatar icon assets from source images (uses sharp)
npm run generate-icons
```

There is no test suite and no lint script configured in either `package.json`. Don't invent `npm test`/`npm run lint` commands.

Docker: `Dockerfile` builds the Vite frontend then bundles it into the Express server image (`server/` + compiled `dist/`) as a single container; `compose.yaml` runs that image alongside a `mongo:7.0` container. See `DOCKGE.md` for the deployment guide and `Migration.md` for the multi-family design spec this codebase implements.

## Architecture

### Backend is one file

`server/index.js` (~4500 lines) defines almost the entire API: Express app setup, an inline SMTP helper, web-push notification helpers, and ~85 routes, in this order: health check → web push (VAPID/subscribe) → alert log journal → auth → super-admin → user families/family context → invitations → members → tasks → events → shopping (categories + items) → absences → long absences → meal guests → weekly meals → email/app settings → shortcuts → data export → static file/SPA fallback (production only). When adding a route, find the matching `// === SECTION ===` comment block and add it there rather than restructuring the file.

Supporting backend files:
- `server/config/db.js` — Mongo connection with a 3-tier fallback: explicit `MONGODB_URI` / production → retry loop against that URI; else try local Mongo; else fall back to an embedded, disk-persisted `mongodb-memory-server` instance under `server/data/db` (dev convenience, not just in-memory-only).
- `server/seed.js` — creates one default super-admin user only if the `User` collection is completely empty.
- `server/scripts/migrate-to-multi-family.js` — one-time migration invoked from `index.js` startup, converting a legacy single-family dataset into the multi-family schema.
- `server/middleware/auth.js` — JWT verification (`requireAuth`), role guards (`requireAdmin`, `requireSuperAdmin`). Tokens are valid 30 days and **silently renewed on every authenticated request**: a fresh token is returned in the `X-Renewed-Token` response header, and the frontend must persist it (see `familyStore.js`'s `getHeaders`/fetch wrapper usage) or sessions will appear to expire early.
- `server/middleware/familyContext.js` — exports `resolveFamilyContext`/`requireFamilyAdmin`, but **this file is dead code**. `server/index.js` defines its own local `attachFamilyContext`/`requireFamilyAdmin` (around line 89) with extra logic (auto-accepting a pending `FamilyInvitation` on first access) that the middleware file's version lacks. Always check `index.js`'s local implementation, not the middleware file, when touching family-context resolution.

### Multi-tenancy model

Two-level identity, per `Migration.md`:
- `User` — one global account per person (email/password/avatar, `isSuperAdmin` flag). A single Super Administrator manages the whole platform.
- `Family` — a tenant, identified by a unique URL `slug`, with a member quota (`maxMembers`).
- `FamilyMember` — the join model per (family, user): family-scoped role, `isAdmin` (family admin, distinct from `isSuperAdmin`), points, presence, and per-family notification preferences. A user can belong to multiple families with different roles/admin status in each.

All business data (tasks, events, shopping items/categories, absences, long absences, meal guests, meals, shortcuts) is scoped by `familyId` and reached only through routes guarded by `requireAuth` + `attachFamilyContext` (and `requireFamilyAdmin` where family-admin-only). The active family is selected client-side and sent to the API via the `X-Family-Slug` header (or `:familySlug` route param); there's no server-side "current family" session state.

Email delivery is a single global configuration (see `Migration.md` §4): the platform-wide SMTP (`GlobalConfig`, managed by the super admin only) is used for every family's invitations and notifications — there is no per-family SMTP override. The `getSmtpConfig()` helper in `index.js` reads this singleton config.

### Frontend structure

- `src/router/index.js` — all authenticated app routes are nested under `/:familySlug/...` (dashboard/tasks/calendar/absences/meals/shopping/settings). A `beforeEach` guard handles: auth check, super-admin-only routes, verifying the user actually belongs to `:familySlug` (via `familyStore`), lazily loading family data on family switch, and redirecting legacy un-prefixed URLs (`/tasks`, `/calendar`, ...) to `/<activeSlug>/...` using the last-active slug cached in `localStorage`.
- `src/stores/authStore.js` (Pinia) — token/user, persisted to `localStorage` under `familygest_*` keys; owns login/logout and profile updates.
- `src/stores/familyStore.js` (Pinia) — everything family-scoped: current family/role/admin flag, member quota, and all the collections (members, tasks, events, shopping, absences, meals, shortcuts). Also owns the dark/light theme toggle (`data-theme` attribute + `localStorage`). `getHeaders()` here is the canonical way API calls attach the JWT and `X-Family-Slug`.
- Views under `src/views/` map 1:1 to the family-scoped routes above, plus `SelectFamilyView` (multi-family picker), `SuperAdminView`, `InvitationView`/`SetPasswordView` (onboarding), `LoginView`.
- PWA: configured via `vite-plugin-pwa` in `vite.config.js` (manifest, Workbox runtime caching for Google Fonts); `public/sw-push.js` is a separate importScripts service worker file handling Web Push display, wired in via `workbox.importScripts`. `src/utils/pushNotifications.js` and `src/components/DevicePushPrompt.vue` handle subscription on the client; VAPID keys/subscriptions are managed server-side via `PushConfig`/`PushSubscription` models and the `/api/push/*` routes.

### Alert logging

`server/models/AlertLog.js` + `server/constants/alertActions.js` record every push/email notification sent (invitations, reminders, etc.) for audit purposes, surfaced in the Super Admin console via `/api/super-admin/alert-logs`.
