# Feature Plan: Configurable Call Duration

This document outlines the phased implementation plan for allowing users to choose the maximum simulated call length (5 min, 10 min, 20 min, 30 min, 60 min) in the SalesTraining-AI platform.

---
## Phase 1 – Schema & Config Groundwork
1. **Database migration**  
   • Add `call_duration_min` (INT, nullable) to `training_sessions`.  
   • Add `default_call_duration_min` (INT) to `organizations` or `settings` table.  
   • Back-fill existing sessions with `20`.
2. **Code refactor**  
   • Replace hard-coded `MAX_CALL_MIN` with `session.max_call_minutes or GLOBAL_DEFAULT` (currently 20).

---
## Phase 2 – API & Service Layer
1. **Session creation API**  
   • Accept optional `"call_duration": <int>` field (allowed: 5,10,20,30,60).  
   • Validate against allowed values & subscription tier.
2. **Business logic**  
   • For omitted values, fall back to org default; else to global default.
3. **Tier gating**  
   • Require `subscription_tier ≥ PRO` for 30 & 60 min durations.

---
## Phase 3 – Dashboard UI
1. **Org settings page**  
   • Dropdown with presets (5,10,20,30,60).  
   • Lock icons on paid tiers.
2. **Session-start modal**  
   • Show the selected default & allow per-session override.

---
## Phase 4 – Prompt & Timer Logic
1. **Dynamic prompt**  
   • Inject `{max_call_minutes}` into timer instructions.  
   • Compute warning time: `max_call_minutes – 2`.  
   • Wrap-up cue at 0 minutes.
2. **Service layer**  
   • Use `session.max_call_minutes` to set `force_wrap_up` and `time_warning` flags.

---
## Phase 5 – Analytics & Billing
1. **Usage logging**  
   • Record chosen duration per session.  
   • Aggregate for admin dashboards.
2. **Billing enforcement**  
   • Block starting 30/60 min sessions when the quota or tier limit is reached.

---
## Phase 6 – QA / UX
1. Unit tests: defaulting, validation, tier enforcement.  
2. E2E test: start 5-min call → verify wrap-up at 5 min.  
3. Usability testing: ensure setting discoverability & clarity.

---
## Phase 7 – Gradual Release
1. **Feature flag** for internal dog-food testing.  
2. **Staged rollout** to selected customers → monitor feedback & metrics.  
3. Full launch when stable.

---
## Future Enhancements
* Allow custom durations per meeting type.  
* CRM integration to set duration automatically.  
* Adaptive timer that extends if the prospect commits early (premium tiers).
