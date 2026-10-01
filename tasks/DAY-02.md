# DAY 02: Thu 1 Oct: YARN + data in HDFS
**Gate (end of day):** `spark-submit --master yarn` succeeds with executors on both workers, or switch to the Spark-standalone fallback (log in DECISIONS).

---
## D2-M1: YARN, ingestion, first evidence
- **Owner:** M1 | **Branch:** `m1/cluster-ingestion`
- **Objective:** YARN + Spark on YARN working; PEMS04 and weather in HDFS `raw/`; first evidence screenshots.
- **Dependencies:** D1-M1 done; long CSV from D1-M2; weather source chosen.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/CLUSTER.md, docs/DATA_PIPELINE.md (Stage 0–1), this file.
- **Files:** `config/hadoop/{yarn,mapred}-site.xml`, `config/spark/spark-defaults.conf`, `scripts/start_cluster.sh`, `scripts/ingest_hdfs.sh`, `dataset/download_weather.py`, `screenshots/README.md`.
- **Implementation:** Add YARN/MapReduce config, start RM/NMs and History Server, run the Spark Pi (or a tiny PySpark) example on YARN. Write ingestion script (`hdfs dfs -mkdir -p`, `-put`) for traffic CSV and weather CSV, idempotent (`-put -f`). Weather download script for the chosen source, hourly, one Bay Area station, covering the traffic dates; convert times to local. Capture evidence batch 1: node config, cluster status, storage distribution.
- **Acceptance:** `yarn node -list` lists 2 RUNNING nodes; YARN app finishes SUCCEEDED with executors on worker1 and worker2 (Spark UI/History); raw traffic file has multiple blocks (32 MB) with locations on both DataNodes.
- **Verify:**
```bash
docker exec master yarn node -list
docker exec master spark-submit --master yarn --num-executors 2 --executor-memory 1g $SPARK_HOME/examples/src/main/python/pi.py 50
docker exec master yarn application -list -appStates ALL
bash scripts/ingest_hdfs.sh
docker exec master hdfs dfs -ls -h /trafficlens/raw/traffic
docker exec master hdfs fsck /trafficlens/raw/traffic/pems04_long.csv -files -blocks -locations
```
- **Expected:** app SUCCEEDED; fsck lists several blocks each with 2 replicas on distinct DataNodes (do not assume the number; record it).
- **Commits:** `feat(yarn): add YARN and Spark-on-YARN configuration`; `feat(hdfs): add ingestion pipeline`; `feat(dataset): add weather download script`.
- **Integration notes:** Tell M2/M3 the HDFS paths. If YARN fails after 2 focused hours, start the fallback and record it.

---
## D2-M2: Time features + hourly/peak/per-location SQL (local sample)
- **Owner:** M2 | **Branch:** `m2/analytics`
- **Objective:** Reusable time-feature functions with tests; Spark SQL hourly, peak and per-location analytics on the local sample, written as parameterized jobs (input/output paths).
- **Dependencies:** D1-M2.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/DATA_PIPELINE.md (Stage 4), docs/ML_SPEC.md (§3 only), docs/contracts/curated-schema.md, this file.
- **Files:** `src/analytics/time_features.py`, `src/analytics/hourly_peak.py`, `src/analytics/per_location.py`, `tests/analytics/test_time_features.py`.
- **Implementation:** `add_time_features(df, ts_col)` → `date, hour, dow (ISO), is_weekend, is_peak` (peak from `config/thresholds.yaml`, M2 adds keys if absent and tells M1). SQL jobs read the curated-style schema (for now build a temporary 15-min view from the sample using the same rules as DATA_PIPELINE Stage 4 inside a test fixture, not a production job). Jobs are idempotent overwrite.
- **Acceptance:** unit tests pass (boundary hours 6/7/9/10, Sunday/Monday, weekend); hourly and per-location outputs produce the columns needed by `traffic_summary`.
- **Verify:**
```bash
pytest tests/analytics -q
spark-submit --master local[2] src/analytics/hourly_peak.py --in <sample_curated> --out output/tmp/hourly
```
- **Expected:** tests green; hourly output has 24×2 rows per scope.
- **Commits:** `feat(spark): add time feature utilities` (with tests); `feat(spark): add hourly and peak analytics`.
- **Integration notes:** Confirm `dow` = ISO 1–7 with M1 and M3.

---
## D2-M3: Idempotent loader + schema + Overview on mocks
- **Owner:** M3 | **Branch:** `m3/mongo-dashboard`
- **Objective:** Finish the loader for all six collections with indexes and validation; Overview page on mocks.
- **Dependencies:** D1-M3.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/SERVING_SPEC.md, docs/contracts/mongo-schema.md, docs/DASHBOARD_SPEC.md (§1), this file.
- **Files:** `src/serving/load_mongo.py`, `src/serving/schema.py`, `src/serving/dashboard/pages/1_Overview.py`, `tests/serving/test_loader.py`.
- **Implementation:** Per-collection key definitions, field validation, `bulk_write` upserts, index creation, counts summary, `--db` and `--input` args. Overview uses cached queries; handles empty collections.
- **Acceptance:** loading mocks twice gives identical counts; invalid line rejected and counted; indexes exist; Overview renders KPIs and charts from mocks.
- **Verify:**
```bash
pytest tests/serving -q
python -m src.serving.load_mongo --input src/serving/mocks --db trafficlens_test
python -m src.serving.load_mongo --input src/serving/mocks --db trafficlens_test
mongosh trafficlens_test --eval 'db.predictions.getIndexes()'
```
- **Expected:** second run reports 0 new docs; indexes match contract.
- **Commits:** `feat(mongo): add schema validation and indexes`; `feat(mongo): add idempotent loader`; `feat(dashboard): add overview page on mocks`.
- **Integration notes:** Share the loader command with M2 for export testing.
