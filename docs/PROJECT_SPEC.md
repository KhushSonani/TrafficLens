# PROJECT_SPEC.md

## Problem
Urban traffic sensors produce millions of readings. Raw data is hard to use for spotting recurring congestion, judging weather effects, or anticipating the next hour.

## Goal
Build TrafficLens: a distributed pipeline (HDFS + YARN + Spark) that cleans and aggregates PEMS04 traffic data, classifies congestion, finds recurrent hotspots, measures weather impact, forecasts next-hour congestion, and serves precomputed results via MongoDB to a Streamlit dashboard.

## Course requirements (mandatory)
Hadoop ecosystem/Spark based (standalone Python rejected). ≥3-node cluster (1 master + 2 workers) with distributed storage and processing. Must show node config, cluster status, storage distribution, job execution, output. One GitHub repo, 3 collaborators on own accounts, ≥5 meaningful commits each (target 8+), no final dump.

## Scope (kept)
1. HDFS layers `raw/ quarantine/ clean/ curated/ analytics/ ml/ export/`
2. Ingestion via `hdfs dfs -put` (PEMS04 long CSV, hourly weather CSV)
3. PySpark validation/cleaning (explicit schema, quarantine, dedupe, zero→null, outliers)
4. Weather enrichment (broadcast join on hour)
5. Curated 15-min Parquet, `partitionBy(date)`
6. Spark SQL analytics (hourly, peak, per-location, trends)
7. Congestion score (traffic only) + thresholds calibrated on data
8. K-Means k=3 congestion levels
9. Innovation 1: recurrent hotspots
10. Innovation 2: weather impact vs same sensor + hour-of-week baseline
11. Innovation 3: next-hour Random Forest forecast (optional, first cut)
12. Serving: Spark → JSONL → HDFS → pymongo → MongoDB
13. Streamlit dashboard, 5 pages, reads MongoDB only
14. Experiments: worker scaling, data scaling, shuffle partitions
15. Hadoop Streaming hourly vehicle-count job
16. Fault-tolerance demo (stop worker2, data still readable)

## Removed (do not re-add)
React, FastAPI, maps/heatmaps, accident spatial join, anomaly detection, what-if grid, route recommendation, synthetic data generator, accidents.

## Tech stack
See AGENTS.md. Hadoop 3.3.x, Spark 3.5.x, MongoDB, Streamlit, Docker on one laptop (16 GB RAM recommended).

## Dataset
- Traffic: PEMS04, ~307 sensors, ~59 days, 5-min, ~5.2M rows. `.npz` has no timestamps or coordinates → convert to long CSV, attach timestamps (expected start 2018-01-01; **verify**), attach PeMS station metadata if obtainable.
- Weather: one hourly source (NOAA ISD-Lite/ISD or Meteostat). Contract needs `visibility_km`; verify the chosen source provides it, else keep the column nullable.
- **Day-1 gate:** is sensor lat/lon obtainable? If not: sensor IDs only, no map assumptions.

## Team ownership
| Member | Owns |
|---|---|
| M1 Data platform | Docker cluster, HDFS, ingestion, validation, cleaning, weather join, curated base, Hadoop Streaming, scaling + fault-tolerance experiments |
| M2 Analytics & ML | Spark utils, SQL analytics, hotspots, weather impact, score, K-Means, RF, JSONL exports |
| M3 Serving & UI | Contracts, mocks, Mongo schema/loader, Streamlit, end-to-end script, tests, demo, docs |
Shared: rotating review, docs, demo rehearsal; everyone can answer every viva topic.

## Milestones (7 days; Day 1 = Wed 30 Sep, evaluation Wed 7 Oct)
| Day | Date | Milestone |
|---|---|---|
| 1 | Wed 30 Sep | Repo + 3-node cluster with 2 live DataNodes; contracts + mocks; data gate |
| 2 | Thu 1 Oct | YARN job runs (else fallback); data in HDFS; loader + Overview on mocks |
| 3 | Fri 2 Oct | Clean layer on YARN; score + K-Means prototype; dashboard pages on mocks |
| 4 | Sat 3 Oct | Curated Parquet; **thin slice end-to-end**; tag v0.1; RF go/no-go |
| 5 | Sun 4 Oct | Weather impact, Streaming job, fault tolerance, all pages real; **feature freeze (end of day)** |
| 6 | Mon 5 Oct | Integration, experiments, RF hard stop at 12:00, report, tests |
| 7 | Tue 6 Oct | Rehearsal, recording, tag v1.0. No new features |
No buffer days exist; slipping a day means cutting per the order below.

## Cut order if late
1. Random Forest → 2. Weather Impact page → 3. Fault-tolerance demo.
Before any cut, experiments 2 and 3 shrink to one run each (measurement scope, not features).
**Never cut:** 3-node cluster, HDFS, Spark, core pipeline, K-Means, evidence screenshots.

## Risks
| Risk | Mitigation |
|---|---|
| YARN fails on Docker | Gate at end of Day 2 → Spark standalone + HDFS on 2 DataNodes |
| RAM (16 GB) | Worker `memory-mb` 2560, 1g executors; close other apps |
| No lat/lon | IDs only; no map |
| 7-day time | Thin slice by Day 4, freeze Day 5 |
| Contract drift | Contracts in `docs/contracts/`, PR-only changes |
| Single-host cluster acceptability | Ask instructor Day 1 |
| Unverified data units/timestamps | Day-1 data dictionary |

## Final demo (~14 min)
Problem → architecture → dataset → cluster status → HDFS block distribution → live Spark job on YARN (Spark UI/RM UI) → analytics → K-Means centroids + mapping → prediction metrics vs baseline → Mongo document → dashboard → experiments → fault tolerance → Q&A. Everything pre-run; screen recording as backup.
