# DAY 03: Fri 2 Oct: Clean layer, score + K-Means prototype

---
## D3-M1: Validation, quarantine, cleaning on YARN
- **Owner:** M1 | **Branch:** `m1/spark-preprocessing`
- **Objective:** Traffic and weather raw → quarantine/clean Parquet on YARN, with counts that reconcile.
- **Dependencies:** D2-M1 (YARN, raw in HDFS), units in `DATA_DICTIONARY.md`.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/DATA_PIPELINE.md (Stage 2–3), docs/CLUSTER.md (spark-submit), this file.
- **Files:** `src/processing/schemas.py`, `src/processing/validate_clean_traffic.py`, `src/processing/clean_weather.py`, `tests/processing/test_cleaning.py`, `config/thresholds.yaml`.
- **Implementation:** Explicit schemas; quarantine with `reject_reason`; dedupe; zero→null rule; outlier rule; weather cleaning incl. local time conversion and `weather_cat`; job prints reconciliation counts; overwrite outputs; `spark_utils.get_spark`.
- **Acceptance:** `input = clean + quarantine`; no dup `(sensor_id, ts)`; runs on YARN; screenshots of the job (Spark UI stages) captured.
- **Verify:**
```bash
pytest tests/processing -q
docker exec master spark-submit --master yarn src/processing/validate_clean_traffic.py --in hdfs:///trafficlens/raw/traffic --clean hdfs:///trafficlens/clean/traffic --quarantine hdfs:///trafficlens/quarantine/traffic
docker exec master hdfs dfs -ls -h /trafficlens/clean/traffic
```
- **Expected:** printed counts reconcile; Parquet present in `clean/`.
- **Commits:** `feat(spark): add validation and quarantine job`; `feat(spark): add cleaning job`; `feat(spark): add weather cleaning`.
- **Integration notes:** Tell M2 the clean path/schema. Post the actual quarantine/null percentages.

---
## D3-M2: Score module + K-Means prototype + hotspots
- **Owner:** M2 | **Branch:** `m2/analytics`
- **Objective:** Congestion score function with calibration report, K-Means with mapping on the local sample, hotspot SQL.
- **Dependencies:** D2-M2; use clean data if available, otherwise the local sample (prototype).
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/ML_SPEC.md (§1–3), docs/contracts/curated-schema.md, docs/DATA_PIPELINE.md (Stage 5), this file.
- **Files:** `src/analytics/score.py`, `src/analytics/hotspots.py`, `src/ml/kmeans_levels.py`, `config/split.yaml`, `tests/analytics/test_score.py`, `tests/ml/test_kmeans_mapping.py`.
- **Implementation:** Score with per-sensor p95 references from the train dates; levels; calibration summary. K-Means pipeline, mapping by centroid speed rank, occupancy/density assertion, silhouette on a sample. Hotspot query per ML_SPEC. Resolve OPEN-1 with the team and record it.
- **Acceptance:** tests pass (thresholds, mapping picks by speed rank even when cluster ids are shuffled, assertion trips on inconsistent centroids); score has no weather column dependency; calibration output prints class shares.
- **Verify:**
```bash
pytest tests/analytics tests/ml -q
spark-submit --master local[2] src/ml/kmeans_levels.py --in <sample_or_clean_15min> --out output/tmp/kmeans
```
- **Expected:** centroid table, mapping and silhouette printed (record the actual values; do not pre-fill).
- **Commits:** `feat(spark): add congestion score`; `feat(ml): implement congestion clustering`; `feat(ml): add cluster-to-level mapping`; `feat(spark): add hotspot analytics`.
- **Integration notes:** Agree the exact score-job input/output paths with M1 for Day 4.

---
## D3-M3: Analytics + Hotspots pages on mocks
- **Owner:** M3 | **Branch:** `m3/mongo-dashboard`
- **Objective:** Analytics and Hotspots pages complete on mock data; loader handles all collections.
- **Dependencies:** D2-M3.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/DASHBOARD_SPEC.md (§2, §3), docs/SERVING_SPEC.md (queries), docs/contracts/mongo-schema.md, this file.
- **Files:** `src/serving/dashboard/pages/2_Analytics.py`, `3_Hotspots.py`, `src/serving/dashboard/db.py`, `tests/serving/test_pages.py`.
- **Implementation:** Query helper with caching, filters, empty-state handling. AppTest smoke tests.
- **Acceptance:** both pages render with mocks and with empty collections; filters change outputs.
- **Verify:** `pytest tests/serving -q` and manual `streamlit run`.
- **Expected:** no exceptions; screenshots for the report.
- **Commits:** `feat(dashboard): add analytics page`; `feat(dashboard): add hotspots page`.
- **Integration notes:** Prepare the JSONL field checklist for M2's exports.
