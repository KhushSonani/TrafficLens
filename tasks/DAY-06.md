# DAY 06: Mon 5 Oct: Integration, experiments, tests, report
No new features. RF hard stop 12:00.

---
## D6-M1: Experiments + missing evidence
- **Owner:** M1 | **Branch:** `m1/experiments`
- **Objective:** Run Experiments 1–3 (or the reduced single-run versions if behind), fill evidence gaps, draft the cluster/storage report.
- **Dependencies:** frozen, working curated job with date-range args.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/EXPERIMENTS.md, docs/CLUSTER.md, this file.
- **Files:** `scripts/run_experiments.sh`, `output/experiments/results.csv`, `docs/EXPERIMENTS.md` (results section), `docs/REPORT_cluster_storage.md`, `screenshots/*`.
- **Implementation:** Follow EXPERIMENTS.md exactly (3 repeats, cold run noted, same job). Fill measured values only. Add honest-limits paragraph. Update `screenshots/README.md` with the checklist status.
- **Acceptance:** every metric in the results table is a measured value or `TBD`; screenshot checklist in CURRENT_STATE fully ticked or listed as missing.
- **Verify:** `cat output/experiments/results.csv`; re-run one configuration to confirm reproducibility.
- **Expected:** table filled from real runs.
- **Commits:** `feat(scripts): add worker scaling benchmark`; `docs(experiments): record measured results`; `docs(cluster): write cluster and storage report`.
- **Integration notes:** Never leave worker2 NodeManager stopped after experiments.

---
## D6-M2: RF hard stop, bug fixes, ML tests, ML report
- **Owner:** M2 | **Branch:** `m2/ml`
- **Objective:** Finish or cut RF by 12:00; ML/analytics tests green; report section.
- **Dependencies:** D5-M2.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/ML_SPEC.md, docs/TESTING.md (P0 ML), this file.
- **Files:** `tests/ml/*`, `tests/analytics/*`, `docs/REPORT_analytics_ml.md`.
- **Implementation:** If RF cut: record ADR, keep K-Means metrics, tell M3. Report: score calibration results, K-Means centroids and mapping + silhouette (with sample size), hotspot top list, weather impact caveats, RF vs baselines (real numbers only).
- **Acceptance:** P0 ML tests pass; report contains only measured numbers with sources.
- **Verify:** `pytest tests/ml tests/analytics -q`.
- **Expected:** all pass.
- **Commits:** `test(ml): add mapping, split and leakage tests`; `docs(ml): write analytics and ML report`.
- **Integration notes:** Fix bugs found by M3's end-to-end run.

---
## D6-M3: Full end-to-end run, tests, README, demo script
- **Owner:** M3 | **Branch:** `m3/mongo-dashboard`
- **Objective:** Run the whole pipeline on the full dataset from HDFS raw through the dashboard; P0/P1 tests; README; demo script draft.
- **Dependencies:** freeze reached.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/TESTING.md, docs/PROJECT_SPEC.md (Final demo), this file.
- **Files:** `tests/integration/*`, `README.md`, `docs/DEMO_SCRIPT.md`, `docs/REPORT_serving_ui.md`.
- **Implementation:** Run `pipeline/run_all.sh` fully; log failures to owners. Loader idempotency check on real data. README: overview, architecture, setup, run, folder map, team roles, evidence index. Demo script per the 14-min outline with timings and pre-run checklist.
- **Acceptance:** one clean full run succeeds; all P0 tests pass; README lets a stranger start the cluster and dashboard.
- **Verify:**
```bash
bash pipeline/run_all.sh
pytest -q
```
- **Expected:** exit code 0; Mongo counts match exports.
- **Commits:** `test(pipeline): add integration and end-to-end tests`; `docs(readme): document setup and run`; `docs(demo): add demo script`.
- **Integration notes:** Merge `develop` → `main` when green.
