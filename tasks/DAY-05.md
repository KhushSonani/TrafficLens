# DAY 05: Sun 4 Oct: Remaining features, then FEATURE FREEZE (end of day)
Freeze rule: after today no new features. Exception: RF finishing before Day 6 12:00 if go.

---
## D5-M1: Hadoop Streaming job + fault-tolerance demo
- **Owner:** M1 | **Branch:** `m1/hadoop-streaming` then `m1/fault-tolerance`
- **Objective:** MapReduce hourly vehicle count via Hadoop Streaming on YARN; fault-tolerance demo executed with evidence.
- **Dependencies:** clean traffic in HDFS; cluster healthy.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/DATA_PIPELINE.md (Streaming section), docs/EXPERIMENTS.md (Experiment 4), docs/CLUSTER.md, this file.
- **Files:** `src/mapreduce/hourly_mapper.py`, `hourly_reducer.py`, `scripts/run_streaming.sh`, `scripts/fault_tolerance_demo.sh`, `docs/evidence_fault_tolerance.md`.
- **Implementation:** Mapper emits `hour_key\tflow`; reducer sums. Run with `hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar` on YARN, output `analytics/streaming_hourly_count/`. Compare to Spark SQL hourly total for the same input. Fault-tolerance script follows Experiment 4 steps exactly; save outputs and screenshots at each step.
- **Acceptance:** Streaming job SUCCEEDED and result cross-checked (difference explained); demo shows readable data with worker2 stopped, dead node in report, under-replicated blocks, recovery after restart.
- **Verify:**
```bash
bash scripts/run_streaming.sh
docker exec master hdfs dfs -cat /trafficlens/analytics/streaming_hourly_count/part-* | head
bash scripts/fault_tolerance_demo.sh
```
- **Expected:** counts per hour; demo steps 1–6 all succeed. Record observed detection time.
- **Commits:** `feat(mapreduce): add hourly vehicle count streaming job`; `test(hdfs): add fault tolerance experiment`; `docs(cluster): document fault tolerance evidence`.
- **Integration notes:** Ensure worker2 is started again and cluster is healthy before anyone runs jobs.

---
## D5-M2: Weather impact, then lag features + RF (if go)
- **Owner:** M2 | **Branch:** `m2/analytics` then `m2/ml`
- **Objective:** Weather impact analysis + export; if RF = go: lag features, temporal split, RF, baselines, metrics, predictions export.
- **Dependencies:** curated final (D4-M2); RF go decision.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/ML_SPEC.md (§4, §5), docs/contracts/prediction-schema.md, docs/contracts/mongo-schema.md, this file.
- **Files:** `src/analytics/weather_impact.py`, `src/ml/features_hourly.py`, `src/ml/random_forest.py`, `src/analytics/export_jsonl.py` (extend), `tests/ml/test_features.py`, `tests/ml/test_split.py`.
- **Implementation:** Weather impact per ML_SPEC §4 (clear baseline, `n>=4`). RF: hourly grain, window-function lags, gap dropping, explicit label order, temporal split from `config/split.yaml`, RF 100 trees depth 10, persistence + majority baselines on same test rows, per-class recall, confusion matrix, aggregate predictions to contract key. Write metrics to `model_metrics`.
- **Acceptance:** impact export has `n` and delta; tests prove no split overlap and no future lag leakage; baselines computed on identical rows; RF result reported even if it does not beat persistence.
- **Verify:**
```bash
pytest tests/ml tests/analytics -q
docker exec master spark-submit --master yarn src/analytics/weather_impact.py ...
docker exec master spark-submit --master yarn src/ml/random_forest.py ...
docker exec master hdfs dfs -cat /trafficlens/export/predictions/part-* | head -2
```
- **Expected:** valid JSONL lines; metrics in `model_metrics` (values recorded from the real run).
- **Commits:** `feat(spark): add weather impact analysis`; `feat(ml): add lag features and temporal split`; `feat(ml): implement random forest with baselines`; `feat(spark): export impact and predictions`.
- **Integration notes:** If RF is not exported by Day 6 12:00, cut it (write the cut in DECISIONS, tell M3 to hide/annotate the prediction page).

---
## D5-M3: Weather + Prediction pages, end-to-end script
- **Owner:** M3 | **Branch:** `m3/mongo-dashboard`
- **Objective:** Weather Impact page on real data; Prediction page (real when available); `pipeline/run_all.sh` chaining the stages.
- **Dependencies:** D4-M3; M2 exports (impact today, predictions later).
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/DASHBOARD_SPEC.md (§4, §5), docs/SERVING_SPEC.md, docs/contracts/prediction-schema.md, docs/CLUSTER.md (spark-submit), this file.
- **Files:** `src/serving/dashboard/pages/4_Weather_Impact.py`, `5_Prediction.py`, `pipeline/run_all.sh`, `pipeline/README.md`.
- **Implementation:** Pages per spec with "no prediction / no data" states. `run_all.sh`: ingest → clean → curated base → score → analytics/ML → export → pull → load; stops on first failure; prints stage timings; honors `--skip-rf`.
- **Acceptance:** pages render on real data and with RF absent; `run_all.sh --help` and a dry-run mode list the stages.
- **Verify:**
```bash
pytest tests/serving -q
bash pipeline/run_all.sh --dry-run
streamlit run src/serving/dashboard/app.py
```
- **Expected:** all 5 pages work; dry-run prints the ordered stage list.
- **Commits:** `feat(dashboard): add weather impact page`; `feat(dashboard): add prediction page`; `feat(pipeline): add end-to-end script`.
- **Integration notes:** End of day: everyone merges to `develop`; declare **feature freeze** in CURRENT_STATE.
