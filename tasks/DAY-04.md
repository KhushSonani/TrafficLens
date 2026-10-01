# DAY 04: Sat 3 Oct: Curated Parquet + thin slice
**Gate (end of day):** thin slice works end to end: raw → clean → curated base → score → JSONL → Mongo → dashboard Overview on real data. Tag `v0.1` on `main` after merge. **RF go/no-go decision** (go only if the thin slice works and K-Means levels are exported).

---
## D4-M1: Weather join, 15-min aggregation, curated base
- **Owner:** M1 | **Branch:** `m1/spark-preprocessing`
- **Objective:** `curated/traffic_15min_base` in Parquet, `partitionBy(date)`, contract columns, run on YARN.
- **Dependencies:** D3-M1 (clean traffic + weather).
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/DATA_PIPELINE.md (Stage 3–4), docs/contracts/curated-schema.md, this file.
- **Files:** `src/processing/build_curated_base.py`, `tests/processing/test_curated.py`, `scripts/run_curated.sh`.
- **Implementation:** `broadcast` join on hour; 15-min window aggregation with ≥2 non-null readings rule; density; time features from `src/analytics/time_features.py` (import M2's function, do not duplicate); score columns null; date-range args (`--start-date/--end-date`, needed by Experiment 2); dynamic partition overwrite.
- **Acceptance:** all contract columns/types; unique `(sensor_id, ts)`; ≈59 date partitions; ~307 sensors; job succeeds on YARN.
- **Verify:**
```bash
pytest tests/processing -q
docker exec master spark-submit --master yarn src/processing/build_curated_base.py --clean hdfs:///trafficlens/clean --out hdfs:///trafficlens/curated/traffic_15min_base
docker exec master hdfs dfs -ls /trafficlens/curated/traffic_15min_base | head
```
- **Expected:** `date=YYYY-MM-DD` directories; schema print matches the contract.
- **Commits:** `feat(spark): add weather join and curated 15-min base`.
- **Integration notes:** Tell M2 immediately when the base exists. Support M2/M3 in the thin-slice run. After merge, tag `v0.1` (M1).

---
## D4-M2: Score on curated, K-Means levels, real exports (thin slice)
- **Owner:** M2 | **Branch:** `m2/analytics`
- **Objective:** Run score → `curated/traffic_15min`; K-Means levels + mapping on real data; hourly/per-location/hotspot analytics on real data; JSONL exports for `traffic_summary`, `congestion_results`, `model_metrics`, `locations`.
- **Dependencies:** D4-M1 (base), D3-M2.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/ML_SPEC.md (§1–3), docs/SERVING_SPEC.md (collections), docs/contracts/curated-schema.md, docs/contracts/mongo-schema.md, this file.
- **Files:** `src/analytics/run_score.py`, `src/analytics/export_jsonl.py`, updates to `src/ml/kmeans_levels.py`, `tests/analytics/test_export.py`.
- **Implementation:** Score job reading base, writing full curated. Record calibration shares (if degenerate → raise per ML_SPEC and log in DECISIONS). K-Means fit on train dates, metrics to `model_metrics`. Exports: one JSONL dir per collection under `hdfs:///trafficlens/export/`, fields exactly per the contract; `locations` from metadata or sensor IDs.
- **Acceptance:** curated has all 20 columns; K-Means mapping assertion passes; exports parse against `mongo-schema.md`; counts printed.
- **Verify:**
```bash
docker exec master spark-submit --master yarn src/analytics/run_score.py --in hdfs:///trafficlens/curated/traffic_15min_base --out hdfs:///trafficlens/curated/traffic_15min
docker exec master spark-submit --master yarn src/ml/kmeans_levels.py ...
docker exec master hdfs dfs -ls /trafficlens/export/*
docker exec master hdfs dfs -cat /trafficlens/export/congestion_results/part-* | head -2
```
- **Expected:** JSONL lines with contract fields (record the real values in the report; do not pre-fill).
- **Commits:** `feat(spark): run congestion score on curated data`; `feat(ml): fit K-Means on training period`; `feat(spark): add JSONL exports`.
- **Integration notes:** Tell M3 when JSONL is in HDFS. **At 18:00 decide RF go/no-go** with the team; write it in DECISIONS.

---
## D4-M3: Load real JSONL, real Overview/Analytics/Hotspots
- **Owner:** M3 | **Branch:** `m3/mongo-dashboard`
- **Objective:** Pull real exports from HDFS into `output/export/`, load into `trafficlens` DB, switch pages to real data; Weather Impact page shell on mocks.
- **Dependencies:** D4-M2 exports (until then, keep testing with mocks).
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/SERVING_SPEC.md, docs/DASHBOARD_SPEC.md (§4), docs/contracts/mongo-schema.md, this file.
- **Files:** `scripts/pull_exports.sh` (M3 note: `scripts/` owned by M1; record ADR-style note or place in `pipeline/`; prefer `pipeline/pull_exports.sh`), `pipeline/load_all.sh`, `src/serving/dashboard/pages/4_Weather_Impact.py`.
- **Implementation:** `hdfs dfs -get` of `export/` via `docker exec` + `docker cp`; loader on real files; fix contract mismatches by talking to M2 (not by editing contracts silently).
- **Acceptance:** Mongo contains real docs; Overview/Analytics/Hotspots show real numbers; counts equal JSONL line counts.
- **Verify:**
```bash
bash pipeline/pull_exports.sh && bash pipeline/load_all.sh
mongosh trafficlens --eval 'db.getCollectionNames().forEach(c=>print(c, db[c].countDocuments()))'
```
- **Expected:** non-empty `locations, traffic_summary, congestion_results, model_metrics`.
- **Commits:** `feat(pipeline): add export pull and load scripts`; `feat(dashboard): add weather impact page shell`.
- **Integration notes:** Screenshot a real Mongo document and the dashboard for evidence. Merge `develop` → `main` and tag `v0.1` with M1.
