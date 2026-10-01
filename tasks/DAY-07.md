# DAY 07: Tue 6 Oct: Rehearsal and release (evaluation is tomorrow)
No new features, no refactors. Only fixes for demo-breaking bugs.

---
## D7-M1: Cluster ready + rehearsal
- **Owner:** M1 | **Branch:** `m1/final`
- **Objective:** Cluster and HDFS demo state verified; rehearse the cluster/YARN/fault-tolerance segments.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/CLUSTER.md, docs/EXPERIMENTS.md, docs/DEMO_SCRIPT.md, this file.
- **Files:** `docs/DEMO_SCRIPT.md` (cluster parts), `screenshots/README.md`.
- **Implementation:** Cold-start the cluster from scratch once (`down`, `up`); confirm data persists on volumes, HDFS healthy, UIs reachable. Prepare terminal tabs with the evidence commands. Practice the live small YARN job (must finish in seconds).
- **Acceptance:** a full cold start reaches "2 live DataNodes, 2 NodeManagers" in a known time; live job succeeds twice in a row.
- **Verify:** commands in CLUSTER.md "Evidence commands".
- **Expected:** all green; note start-up time for the demo.
- **Commits:** `docs(cluster): finalize demo runbook`.
- **Integration notes:** Freeze the laptop config (no updates, no other apps).

## D7-M2: Analytics/ML rehearsal
- **Owner:** M2 | **Branch:** `m2/final`
- **Objective:** Rehearse K-Means centroids/mapping and prediction-vs-baseline segments; be able to explain every number.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/ML_SPEC.md, docs/DEMO_SCRIPT.md, this file.
- **Files:** `docs/DEMO_SCRIPT.md` (ML parts), `docs/REPORT_analytics_ml.md` (final edits).
- **Implementation:** Prepare answers for viva topics: lazy evaluation, transformations vs actions, partitioning/shuffle, K-Means/silhouette, clustering vs prediction, leakage, why RF may not beat persistence.
- **Acceptance:** each member can explain the ML numbers on screen without notes.
- **Verify:** dry run of the segment against the live dashboard.
- **Expected:** segment ≤ 3 min.
- **Commits:** `docs(ml): finalize report`.
- **Integration notes:** None.

## D7-M3: Release, recording, final checks
- **Owner:** M3 | **Branch:** `m3/final`
- **Objective:** Screen recording (backup), final full-flow test, tag `v1.0`.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/TESTING.md, docs/DEMO_SCRIPT.md, this file.
- **Files:** `docs/DEMO_SCRIPT.md`, `output/demo_recording.*` (or link in README; large file, do not commit if big), `README.md`.
- **Implementation:** Record the full 14-minute demo. Check every member has ≥5 (target 8+) meaningful commits from their own account (`git shortlog -sn`). Final merge `develop` → `main`, tag `v1.0`. Verify README steps on a clean checkout.
- **Acceptance:** `main` at `v1.0`, tests green, recording exists, evidence checklist ticked.
- **Verify:**
```bash
git shortlog -sn --no-merges
git tag -l
pytest -q
```
- **Expected:** balanced commit counts; tag present.
- **Commits:** `docs(readme): final touches`.
- **Integration notes:** Team joint rehearsal (2 full run-throughs, time it), agree who answers which Q&A topics, everyone knows all.
