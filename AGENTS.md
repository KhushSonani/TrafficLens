# AGENTS.md: TrafficLens AI Rules

TrafficLens = Smart Traffic Congestion Analysis and Prediction on Big Data (university Big Data Systems project, team of 3, **7-day schedule, evaluation Wed 7 Oct 2026**).
Pipeline: PEMS04 + hourly weather → HDFS → PySpark on YARN → Parquet → Spark SQL / MLlib → JSONL → MongoDB → Streamlit.

## Approved stack (nothing else)
Docker (network `bignet`), Hadoop 3.3.x (HDFS, YARN, Hadoop Streaming), Spark 3.5.x (PySpark, Spark SQL, MLlib), MongoDB + `pymongo`, Streamlit, Python, pytest.

## Forbidden unless the team explicitly approves in `docs/DECISIONS.md`
React, FastAPI, Kafka, Kubernetes, synthetic data, maps/heatmaps, accident data, Mongo-Spark connector, live Spark calls from the dashboard, pandas in the main pipeline, any YARN alternative (the only approved fallback is Spark standalone, see `docs/CLUSTER.md`).

## Rules
1. Never silently change architecture, contracts, or decisions. If something contradicts a doc, **stop and flag it**; do not assume.
2. Inspect existing code before editing. Do not modify files outside the task's "Files to create/change".
3. Large-scale processing = PySpark / Spark SQL. pandas is allowed only in Streamlit display code and tiny tests.
4. Every Spark job is idempotent (overwrite its own output path) and sets `spark.sql.session.timeZone = America/Los_Angeles`.
5. Follow `docs/contracts/*`. snake_case everywhere, ISO 8601 in JSON. Contracts are shared interfaces; change only via PR + notifying the affected members.
6. Do not invent results (benchmarks, metrics, coordinates). Unmeasured numbers are written `TBD`.
7. Test what you change (see `docs/TESTING.md`). Do not mark a task done without running its verification commands.
8. One task at a time. Do not implement future tasks.
9. Git: branch from `develop` (`m1/…`, `m2/…`, `m3/…`), Conventional Commits, one commit per working task (no artificial splitting), merge `develop` into your branch at session start, push at session end, PR reviewed by the rotating reviewer (M1→M2→M3→M1), normal merge commit (no squash). Never commit to `main`/`develop` directly.
10. Read only the docs listed in the task. Do not read the whole `docs/` folder.

## Ownership
M1 Data platform: `docker/ config/ dataset/ src/ingestion src/processing src/mapreduce scripts/`
M2 Analytics & ML: `src/analytics src/ml`
M3 Serving & UI: `src/serving pipeline/ tests/ docs/ (shared)`
Cross-ownership edits need a note in `docs/DECISIONS.md`.

## Doc map (load only what the task lists)
| Topic | File |
|---|---|
| Scope, roles, risks | docs/PROJECT_SPEC.md |
| Diagrams, component roles | docs/ARCHITECTURE.md |
| HDFS paths, cleaning, curated | docs/DATA_PIPELINE.md |
| Cluster, configs, commands | docs/CLUSTER.md |
| Score, K-Means, hotspots, weather impact, RF | docs/ML_SPEC.md |
| JSONL → Mongo | docs/SERVING_SPEC.md |
| Streamlit pages | docs/DASHBOARD_SPEC.md |
| Benchmarks, fault tolerance | docs/EXPERIMENTS.md |
| Tests | docs/TESTING.md |
| Why things are the way they are | docs/DECISIONS.md |
| Where we are now | docs/CURRENT_STATE.md |
| Interfaces | docs/contracts/*.md |

## Standard task workflow
1. Read AGENTS.md.
2. Read docs/CURRENT_STATE.md.
3. Read the assigned `tasks/DAY-XX.md` task.
4. Read only the referenced specification files.
5. Inspect relevant source files.
6. Identify dependencies (are upstream outputs really present?).
7. Produce a short implementation plan.
8. Implement only the assigned task.
9. Run the specified verification.
10. Fix task-specific failures.
11. Do not start the next task.
12. Update docs/CURRENT_STATE.md.
13. Report changed files.
14. Report tests/commands executed.
15. Report unresolved issues and any contradictions found.
