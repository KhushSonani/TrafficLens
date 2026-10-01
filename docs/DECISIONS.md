# DECISIONS.md

AI must not reverse an **Accepted** decision without explicit team approval recorded here. Format: context → decision → consequence.

| ID | Decision | Status |
|---|---|---|
| ADR-01 | **HDFS** as the storage layer. Course requires distributed storage; replication 2, block 32 MB so a modest file spans several blocks. Consequence: all data in layered `/trafficlens/*` paths. | Accepted |
| ADR-02 | **3-node Docker cluster** (1 master, 2 workers) on one laptop. Meets the node-count rule cheaply. Consequence: no real network scaling; state this honestly. Instructor confirmation pending (Day 1). | Accepted |
| ADR-03 | **YARN** as resource manager, Spark `--master yarn`. Fallback: Spark standalone by end of Day 2 if YARN fails. | Accepted |
| ADR-04 | **Spark (PySpark, SQL, MLlib)** for all large processing. Course demands Hadoop/Spark. | Accepted |
| ADR-05 | **Hadoop Streaming** hourly vehicle-count job to demonstrate MapReduce. | Accepted |
| ADR-06 | **PySpark, never pandas** in the main pipeline (pandas only in UI/tests). | Accepted |
| ADR-07 | **Parquet**, partitioned by `date`, for clean/curated data. Columnar, partition pruning for date-range experiments. | Accepted |
| ADR-08 | **MongoDB** for serving precomputed aggregates; six collections only. Complements HDFS (low-latency lookups vs bulk storage). | Accepted |
| ADR-09 | **Streamlit** for the dashboard, reads MongoDB directly. | Accepted |
| ADR-10 | **JSONL export + pymongo loader**; no Mongo-Spark connector (fewer moving parts, easy to test). | Accepted |
| ADR-11 | **No live Spark from the dashboard**; predictions precomputed. | Accepted |
| ADR-12 | **No React/FastAPI**; scope and time. | Accepted |
| ADR-13 | **No synthetic data**; PEMS04 + real hourly weather only. | Accepted |
| ADR-14 | **No maps**; lat/lon unverified. Table columns only if metadata exists. | Accepted |
| ADR-15 | **Cut order:** Random Forest → Weather Impact page → fault-tolerance demo. Never cut cluster, HDFS, Spark, pipeline, K-Means, evidence. | Accepted |
| ADR-16 | **Weather is excluded from the congestion score** (avoids circular impact analysis). Score uses speed, occupancy, density. | Accepted |
| ADR-17 | **7-day compression** (evaluation Wed 7 Oct): 12-day plan merged into 7 days, no buffer days, feature freeze end of Day 5, RF hard stop Day 6 12:00, YARN gate end of Day 2. Experiments 2/3 reduce to one run each before any feature cut. | Accepted |
| ADR-18 | **Cross-ownership exception:** M2 writes the `.npz`→CSV conversion in `dataset/` on Day 1 (M1 reviews) because M2 needs the sample and M1 is busy with the cluster. | Proposed |
| ADR-19 | **Timezone** `America/Los_Angeles` for all jobs. | Accepted |

## Open items (flag; resolve on the day noted; then convert to ADRs)
- **OPEN-1 (Day 3):** two level definitions exist: score-threshold `level` (contract column) and `kmeans_level`. Proposal: `level` in curated = score thresholds; `kmeans_level` stored in `ml/` and shown as the K-Means result with centroids and the agreement table; RF label uses score-based `hour_level`.
- **OPEN-2 (Day 1, M2+M3):** the prediction row is keyed by `(location_id, hour_of_week, weather)` but the model is a lag-feature next-hour forecast. Proposal: aggregate test-period predictions to that key (mean probabilities, argmax) as defined in ML_SPEC.
- **OPEN-3 (Day 1, M1+M2):** curated ownership. Proposal: M1 writes `traffic_15min_base` (score columns null), M2's score job writes the full `traffic_15min`.
- **OPEN-4 (Day 1):** weather source and whether it has `visibility_km`.
- **OPEN-5 (Day 1):** instructor confirms a single-host Docker cluster is acceptable.
