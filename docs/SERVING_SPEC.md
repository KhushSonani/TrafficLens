# SERVING_SPEC.md

Owner: M3 (loader, schemas). M2 produces the JSONL. Field definitions live in `docs/contracts/mongo-schema.md` and `prediction-schema.md`; this file defines behavior.

## Flow
```text
Spark → /trafficlens/export/<collection>/part-*.jsonl → hdfs dfs -get → output/export/<collection>/
→ python -m src.serving.load_mongo --collection all → MongoDB db `trafficlens`
```
JSONL: one JSON object per line, snake_case, ISO 8601 timestamps, no NaN (null instead). No Mongo-Spark connector.

## Collections and natural keys (upsert filter)
| Collection | Key | Content |
|---|---|---|
| locations | `location_id` | sensor metadata (lat/lon nullable) |
| traffic_summary | `summary_type` + keys per type | hourly, per-location, daily aggregates |
| congestion_results | `location_id` | score stats, level shares, hotspot rank, kmeans level shares |
| impact_analysis | `location_id, hour_of_week, weather` | weather delta vs baseline |
| predictions | `location_id, hour_of_week, weather` | predicted level + probabilities |
| model_metrics | `model` (+ `split`) | kmeans/RF/baseline metrics |
Aggregates only. Never load raw or full 15-min data.

## Loader behavior
- Reads all files of a collection, validates required fields/types (fail loudly, report bad-line count), `bulk_write` of `UpdateOne(filter, {"$set": doc}, upsert=True)`, batch ~1000.
- Idempotent: re-running yields identical collection contents and counts. Optional `--replace` mode deletes collection docs not present in the new load (default off).
- Creates indexes on startup (idempotent `create_index`): `location_id` on all sensor-level collections, compound `(location_id, hour_of_week, weather)` on `impact_analysis` and `predictions` (unique).
- Prints per-collection: read, upserted, modified, rejected.
- Config via env: `MONGO_URI` (default `mongodb://localhost:27017`), `MONGO_DB` (default `trafficlens`).

## Dashboard queries (Streamlit uses `pymongo`, cached with `st.cache_data`)
- Overview: `traffic_summary` where `summary_type="hourly"`, `congestion_results` top hotspots, count of `locations`.
- Analytics: hourly profiles by `is_weekend`; per-location list; daily trend.
- Hotspots: `congestion_results` sorted by `high_peak_share` desc, limit N.
- Weather Impact: `impact_analysis.find({location_id})` and the all-sensor summary docs (`location_id = "ALL"`).
- Prediction: `predictions.find_one({location_id, hour_of_week, weather})`, `model_metrics.find({})`.
