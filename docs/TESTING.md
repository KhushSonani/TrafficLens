# TESTING.md

Runner: `pytest` (`tests/`, owner M3; each member writes tests for own modules under `tests/<area>/`). Priority = protect the critical pipeline first. Do not build a large suite; 7 days.

| Priority | Layer | What | How |
|---|---|---|---|
| P0 | Data validation | clean output has no duplicate `(sensor_id, ts)`; `input = clean + quarantine`; no null keys; curated has every contract column with right types; one row per `(sensor_id, ts)` | Spark local[2] on `dataset/sample/`; also a `scripts/check_pipeline.py` run against HDFS output |
| P0 | Spark unit | time features (`hour, dow, is_weekend, is_peak`), density, 15-min aggregation, score formula on hand-computed rows, level thresholds at 29.9/30/60/60.1 | small in-memory DataFrames, `tests/fixtures/` |
| P0 | ML | K-Means mapping picks cluster by speed rank and assertion trips on inconsistent centroids; score has no weather input (column check); temporal split has no date overlap and is ordered; lag features have no future leakage (lag at t uses only ≤ t-1) | synthetic tiny frames |
| P0 | Mongo | loader idempotent (run twice ⇒ same counts), bad line rejected and counted, indexes exist | test DB `trafficlens_test` on the local Mongo |
| P1 | Integration | Spark job on sample → JSONL → loader → Mongo doc matches contract | `pipeline/` script on sample |
| P1 | Contract | mock JSONL files validate against `docs/contracts` field lists | pytest schema check |
| P2 | Dashboard | each page renders without exception on mock data and on empty collections | `streamlit.testing.v1.AppTest` |
| P0 | End-to-end | `pipeline/run_all.sh` from HDFS raw → Mongo → dashboard smoke on the sample (fast) and full data (once, before freeze and before v1.0) | manual + script exit codes |

Rules: tests run locally without the cluster (Spark local mode) except cluster smoke checks documented in the DAY files. A task is not done until its P0 tests pass. Cluster-only checks are recorded in `docs/CURRENT_STATE.md` under Testing Status. Never mark a test skipped without a note.
