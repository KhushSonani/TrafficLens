# DAY 01: Wed 30 Sep: Foundations
**Gate (end of day):** 2 live DataNodes; PEMS04 lat/lon answer known; contracts + mocks ready; Mongo up. Also: ask the instructor whether a single-host Docker cluster is acceptable (M3 sends the message).

---
## D1-M1: Repo + 3-node cluster
- **Owner:** M1 | **Branch:** `m1/cluster-ingestion` (from `develop`)
- **Objective:** Repo skeleton (all folders, README stub, `.gitignore`, `develop` + branch protection, all 3 collaborators) and a running 1-master/2-worker Docker cluster with HDFS.
- **Dependencies:** none.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/CLUSTER.md, docs/PROJECT_SPEC.md, this file.
- **Files:** `README.md`, `.gitignore`, `docker/Dockerfile`, `docker/docker-compose.yml`, `docker/entrypoint.sh`, `config/hadoop/{core,hdfs}-site.xml`, `config/hadoop/workers`, repo folder skeleton with `.gitkeep`.
- **Implementation:** Single Dockerfile (JDK, Hadoop 3.3.x, Spark 3.5.x, Python3), role chosen by env var. Compose: services `master`, `worker1`, `worker2`, network `bignet`, named volumes for NN/DN data, published ports 9870/8088/18080. Configs per CLUSTER.md (replication 2, blocksize 32 MB, heartbeat recheck). NameNode format only when the volume is empty. Create HDFS dirs `/trafficlens/{raw,quarantine,clean,curated,analytics,ml,export}` and `/spark-logs`.
- **Acceptance:** `docker compose up -d` brings up 3 containers; NameNode UI shows 2 live DataNodes; a test file put into HDFS shows replication 2.
- **Verify:**
```bash
docker compose -f docker/docker-compose.yml up -d --build
docker compose -f docker/docker-compose.yml ps
docker exec master hdfs dfsadmin -report | grep -E "Live datanodes|Name:"
docker exec master bash -c 'echo hi > /tmp/t.txt && hdfs dfs -put -f /tmp/t.txt /trafficlens/raw/ && hdfs dfs -stat "%r" /trafficlens/raw/t.txt'
```
- **Expected:** `Live datanodes (2)`; stat prints `2`.
- **Commits:** `feat(docker): add Dockerfile and 3-node compose` then `feat(hadoop): add core and hdfs configuration` (two working tasks). Repo skeleton commit first: `chore(repo): add project skeleton`.
- **Integration notes:** Screenshot `docker compose ps`, dfsadmin report, NameNode UI into `screenshots/`. If containers die from RAM, lower memory now, not later.

---
## D1-M2: Data gate + Spark utils + local sample
- **Owner:** M2 (cross-ownership exception ADR-18; M1 reviews) | **Branch:** `m2/analytics`
- **Objective:** Get PEMS04 as long CSV with timestamps, answer the lat/lon question, document units, build a tiny local sample, write the Spark session utility, and run PySpark locally on the sample.
- **Dependencies:** none.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/DATA_PIPELINE.md (Stage 0), docs/PROJECT_SPEC.md (Dataset), docs/contracts/curated-schema.md, this file.
- **Files:** `dataset/download_pems04.py`, `dataset/npz_to_long_csv.py`, `dataset/DATA_DICTIONARY.md`, `dataset/sample/pems04_sample.csv` (few sensors × 7 days), `src/analytics/spark_utils.py`, `src/analytics/__init__.py`.
- **Implementation:** Obtain PEMS04 `.npz` (do not commit the full file; add to `.gitignore`). Confirm shape, feature order and value ranges (are zeros missing?), occupancy scale, speed unit. Attach timestamps from a verified start (expected 2018-01-01, 5-min). Write long CSV `sensor_id, ts, flow, occupancy, speed`. Search for PeMS station metadata / lat-lon; record the result honestly (available / not available / partial) in the dictionary. `spark_utils.get_spark(app_name)` sets timezone `America/Los_Angeles`, shuffle partitions from arg/env, and works for local and YARN. Pick and document the weather source (OPEN-4: check visibility field) with M3's help.
- **Acceptance:** Long CSV row count ≈ 5.2M and sensors ≈ 307 (use actual numbers); dictionary lists units, timestamp assumption, lat/lon status; local PySpark reads the sample with an explicit schema and prints count.
- **Verify:**
```bash
python dataset/npz_to_long_csv.py --in <pems04.npz> --out dataset/pems04_long.csv
wc -l dataset/pems04_long.csv
python -c "from src.analytics.spark_utils import get_spark; s=get_spark('t'); print(s.conf.get('spark.sql.session.timeZone'))"
```
- **Expected:** counts consistent with 307 × 16992 ≈ 5.2M (verify, do not assume); prints `America/Los_Angeles`.
- **Commits:** `feat(dataset): add PEMS04 conversion scripts and data dictionary`; `feat(spark): add spark session utilities`.
- **Integration notes:** Tell M1 the CSV path/schema by end of day (M1 ingests it Day 2). Tell M3 whether lat/lon exists (affects `locations`). Flag OPEN-1/2/3 for team confirmation.

---
## D1-M3: Contracts, mocks, Mongo up, skeleton
- **Owner:** M3 | **Branch:** `m3/mongo-dashboard`
- **Objective:** Contracts reviewed by all, mock JSONL for all six collections, Mongo running, Streamlit skeleton, loader draft, instructor question sent.
- **Dependencies:** none.
- **Relevant context:** AGENTS.md, docs/CURRENT_STATE.md, docs/SERVING_SPEC.md, docs/contracts/*.md, docs/DASHBOARD_SPEC.md (Overview only), this file.
- **Files:** `docker/mongo-compose.yml`, `src/serving/mocks/*.jsonl`, `src/serving/load_mongo.py` (draft), `src/serving/dashboard/app.py`, `tests/serving/test_contract_mocks.py`.
- **Implementation:** Get all three members to read/approve the contracts (PR). Mocks: ≥10 fake sensors, clearly labelled mock (allowed as UI mocks only, ADR-13 forbids synthetic *dataset*, so keep mocks tiny and never load them into the real DB). Mongo via compose, separate from the Hadoop cluster. Loader draft reads one collection and upserts. Streamlit app boots with sidebar and page stubs.
- **Acceptance:** `docker compose -f docker/mongo-compose.yml up -d` works; loader loads mocks into `trafficlens_mock` DB; `streamlit run` starts; mock files pass the contract test.
- **Verify:**
```bash
docker compose -f docker/mongo-compose.yml up -d
python -m src.serving.load_mongo --input src/serving/mocks --db trafficlens_mock
streamlit run src/serving/dashboard/app.py --server.headless true &
pytest tests/serving -q
```
- **Expected:** loader prints upsert counts per collection; pytest passes.
- **Commits:** `docs(contracts): add curated, prediction and mongo contracts with mocks`; `feat(mongo): add loader draft`.
- **Integration notes:** Announce contract approval in the team chat. Record OPEN-1…5 outcomes in DECISIONS.
