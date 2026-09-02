# Technical Decisions Log

A running record of non-obvious decisions made while building SafetyLog,
so future-you (or future-Claude) understands *why* something is built a
certain way without having to re-derive it.

## Phase 1 — Document Register

**Firebase over Supabase.** Chosen mainly for Firestore's mature,
built-in offline persistence — important given users will be on factory
floors with unreliable signal. Trade-off: Firestore is NoSQL, so
relational reporting in later phases (e.g. cross-referencing incidents
with permits with CAPA items) will need more manual denormalization than
a Postgres backend would. Revisit this trade-off if Phase 4's dashboard
reporting needs turn out to require complex joins.

**Firebase compat SDK (not modular v9+ SDK) via `<script>` tags.** Kept
deploy-simple with zero build step, matching "no dev environment"
constraint. Cost: slightly larger JS payload than tree-shaken modular
SDK, and Firebase's newer docs mostly show modular syntax now, so
copy-pasting code from current Firebase docs into this project will need
translating back to compat syntax.

**Three-level Firestore structure** (`documents` → `versions` subcollection →
`acknowledgments` subcollection) instead of one flat collection. This
keeps acknowledgments correctly tied to the specific version they were
made against, so the app can tell you when an acknowledgment is stale
(document was updated since). Costs one extra read per "expand" action
in the UI — acceptable at pilot scale.

**No authentication in Phase 1** (explicit product decision, not an
oversight) — staff pick their name from a hardcoded dropdown. This is a
real gap for audit-trail integrity that should be addressed with
Firebase Auth before this becomes a real compliance record, not just a
pilot tool. Flagged in `staff-list.js` and `firestore.rules`.

**Acknowledgment document IDs are deterministic** (`name_v#`, sanitized)
rather than auto-generated, so clicking "I've Read This" twice for the
same version overwrites the same record (just updates the timestamp)
instead of creating duplicates.

**Firestore security rules are open (`allow read, write: if true`)** for
Phase 1. This is intentional and temporary — see the detailed comment
block in `firestore.rules` for the three-step plan to lock this down.
Do not copy these rules into a later phase without revisiting this.
