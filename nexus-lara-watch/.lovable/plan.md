# NTPC Lara — Enterprise Operations Expansion

Builds on top of what already ships (auth, RBAC, live telemetry grid, alerts list, thresholds v1). Preserves the existing dark industrial aesthetic, tightens it toward the "control-room premium" spec, and layers the six new operational modules on top without rewriting live data flow.

## Design polish (applies globally)

- Keep the current dark slate base; add glass panels (`bg-slate-900/60 backdrop-blur-xl border-slate-800`) for drawers, modals, top bar.
- Extend status tokens with a fourth state — **Maintenance = electric purple** — alongside existing normal/warning/critical.
- All live numerics + timestamps stay on the existing mono stack (JetBrains Mono via `font-num`); labels stay Inter.
- Critical sensor cards gain a soft red glow ring; alert badges keep the subtle pulse. No decorative motion.
- Add a top-bar **System Health pill** wired to `GET /api/v1/shared-systems/{id}/health` (mocked).

## New / extended API layer (`src/lib/api.ts`)

Add typed helpers + mocks (used when the backend 404/errors):

- `getSlaMetrics()` → `/api/v1/alerts/sla-metrics`
- `resolveAlert(id, { resolutionType, notes })` → `/api/v1/alerts/{id}/resolve`
- `getAlertAnalysis(id)` → `/api/v1/alerts/{alertId}/analysis`
- `getSensorDefinitions()` → `/api/v1/sensor-definitions`
- `overrideThreshold(sensorId, { newWarn, newCrit, reason, durationHours })`
- `getMaintenanceDue()`, `markMaintenanceComplete(sensorId)`
- `startHandover(payload)`, `getActiveHandover()`, `submitHandoverNotes(id, payload)`
- `getOperatorActions(username, filters)`
- `getSystemHealth(systemId)`

All wrapped in the existing `apiFetch` / `apiMutate` (bearer + toast on failure) with local fallbacks so the UI is fully clickable offline.

## Module work

### A. Telemetry dashboard (preserve + polish)
- Keep existing Overview + Unit pages, live polling, trend arrows, `(3x)` alert grouping — no rewrite.
- Add red glow ring on critical cards, purple accent when a sensor is under maintenance/override.
- Surface "Override Active" pill on any sensor with an active override.

### B. Alert Lifecycle & SLA Center — `/alerts`
- New top strip of **SLA KPI cards** (avg ack, avg resolution, breach count, MTTR) with big mono numerals.
- Table row gains **SLA countdown bar** (ack + resolution deadlines) that recolors as time drains.
- Row action dropdown grows a third option: **Resolve…** → modal with `resolutionType` toggle (MANUAL/AUTO) + notes. Ack & Suppress already implemented.

### C. Root Cause & Correlation Explorer
- New `AlertAnalysisSheet` (shadcn `Sheet`, right side) triggered from an **Analyze** button on every active-alert row.
- Header: trigger sensor + breach values.
- Body: correlated-sensor list with anomaly score bar and mini sparkline; simple SVG node graph (trigger in the center, correlated nodes around it, colored by severity).

### D. Dynamic Threshold Management — `/settings` (extend)
- Replace the ad-hoc list with a full **Sensor Definitions** table (base warn/crit, current overrides, TTL).
- Override dialog captures `newWarn`, `newCrit`, `reason`, `durationHours` and shows a live-preview of the new band.
- Sensors with active overrides show an animated purple "OVERRIDE ACTIVE · expires in Xh" badge — reused on telemetry cards.

### E. Shift Handover & Maintenance Hub — new `/operations`
Dual-pane layout:
- **Left — Shift Handover**: start-handover form (outgoing/incoming operator, shift #), state-snapshot card (active + critical counts frozen at start), outgoing notes + incoming acknowledgment textareas, submit + timeline of recent handovers.
- **Right — Preventive Maintenance**: sensors grouped OVERDUE (red banner) / DUE ≤7d (amber) / SCHEDULED. Each row: sensor, unit, last-maintained, due-in, **Mark Complete** button.

### F. Operator Audit Log — new `/audit`
- Filterable table: username, action type (ACK/RESOLVE/SUPPRESS/OVERRIDE/HANDOVER/MAINT), unit, date range, free-text.
- Row expands to show the payload/notes captured for that action.
- Read-only for everyone; visible to Operator + Supervisor.

## Navigation

Sidebar gets three new items: **Alerts → SLA** already covered, **Operations**, **Audit Log**. Icons: `GitPullRequestArrow`, `Wrench`, `ScrollText`.

## Files

New:
```
src/routes/operations.tsx
src/routes/audit.tsx
src/components/sla-kpi-strip.tsx
src/components/sla-countdown.tsx
src/components/alert-analysis-sheet.tsx
src/components/resolve-dialog.tsx
src/components/threshold-override-dialog.tsx  (extract from settings)
src/components/maintenance-panel.tsx
src/components/shift-handover-panel.tsx
src/components/system-health-pill.tsx
```

Edited:
```
src/lib/api.ts            (new endpoints + mocks + Maintenance status token)
src/styles.css            (--status-maintenance purple, glow ring utility)
src/components/app-shell.tsx  (nav items, system health pill in top bar)
src/components/telemetry.tsx  (glow ring, override pill, maintenance chip)
src/routes/alerts.tsx     (SLA strip, countdown col, Analyze + Resolve actions)
src/routes/settings.tsx   (sensor-definitions table)
src/routeTree.gen.ts      (auto)
```

## Verification

- Build passes; `tsgo` clean.
- Playwright smoke: login as `operator`, visit `/`, `/alerts` (open Analyze drawer + Resolve modal), `/operations` (start handover, mark maintenance), `/audit` (filter), `/settings` (open override dialog). Screenshot each.
- Confirm graceful toast when `/api/v1/*` is unreachable — no crashes.

## Out of scope

- Real WebSocket wiring (keep existing polling; leave a `useLiveFeed` seam).
- Backend changes.
- Writing the changes to GitHub — will do after you approve the plan and I finish the build.
