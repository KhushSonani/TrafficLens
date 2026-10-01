# DATA_PIPELINE.md

Timezone everywhere: `America/Los_Angeles` (PeMS local time). Weather timestamps (often UTC) must be converted before joining.

## HDFS layout (root `/trafficlens`)
```text
raw/traffic/pems04_long.csv        raw/weather/weather_hourly.csv     raw/metadata/
quarantine/traffic/  quarantine/weather/
clean/traffic/ (Parquet)           clean/weather/ (Parquet)
curated/traffic_15min_base/        curated/traffic_15min/   (partitionBy date)
analytics/{hourly,peak,per_location,trends,hotspots,weather_impact}/
ml/{kmeans_model,features_hourly,rf_model,predictions,metrics}/
export/{locations,traffic_summary,congestion_results,impact_analysis,predictions,model_metrics}/  (JSONL)
```

## Stage 0: Dataset preparation (`dataset/`)
`.npz` shape is expected to be `(time, sensors, 3)` with features flow, occupancy, speed: **verify on Day 1** and record units in `dataset/DATA_DICTIONARY.md`. Convert to long CSV: `sensor_id, ts, flow, occupancy, speed` (ts local, 5-min, ISO string). Attach timestamps from a verified start date. Record whether lat/lon exists.

## Stage 1: Ingestion
`hdfs dfs -mkdir -p` layers; `hdfs dfs -put` raw files. Keep a tiny sample in `dataset/sample/` (git) for local runs.

## Stage 2: Validation → quarantine / clean (M1, PySpark)
- Explicit `StructType` schema (no inferSchema). Parse mode PERMISSIVE with corrupt-record column, or cast and test nulls.
- Quarantine rows with `reject_reason`: `null_key`, `bad_timestamp`, `bad_number`, `out_of_range`, `duplicate`.
- Range rules (adjust after Day-1 units check): `flow >= 0`, `speed` in [0, 100], `occupancy` in [0, 1] (or 0–100 if data says so).
- Dedupe on `(sensor_id, ts)` (keep first).
- Zero → null: `speed = 0` where `flow = 0` (missing-sensor pattern) → null speed and occupancy. Do not blanket-null real zero flow at night.
- Outliers: values beyond physical bounds or per-sensor p99.9 → null (row retained).
- Output `clean/traffic/` Parquet; job prints counts: input, clean, quarantined (by reason). Counts must reconcile: `input = clean + quarantine`.

## Stage 3: Weather enrichment
Clean weather: `hour_ts, temp_c, precip_mm, visibility_km` (visibility nullable if source lacks it). `weather_cat`: `rain` if `precip_mm >= 0.1`; else `fog` if `visibility_km < 1`; else `clear`. Check class counts; report if `fog` is empty. Join: `broadcast(weather)` on `date_trunc('hour', ts)`.

## Stage 4: 15-min aggregation (M1)
Group by `sensor_id`, 15-min window. `avg_speed = avg(speed)`, `avg_occupancy = avg(occupancy)`, `total_flow = sum(flow)`; drop intervals with fewer than 2 non-null 5-min readings. `density = total_flow * 4 / avg_speed` (veh/hr per mph) when `avg_speed > 0`, else null. Derived: `date, hour, dow` (ISO 1=Mon…7=Sun), `is_weekend`, `is_peak` (weekday, hours 7–9 or 16–18, i.e. 07:00–09:59 and 16:00–18:59; defined in `config/thresholds.yaml`).
Write `curated/traffic_15min_base` (contract columns; score columns null), `partitionBy("date")`, mode overwrite.

## Stage 5: Score (M2)
Reads base, adds `speed_index, occ_index, density_idx, congestion_score, level` (see ML_SPEC), writes `curated/traffic_15min` (full contract). Reference statistics come from the training period.

## Stage 6: Analytics / ML / Export (M2)
Spark SQL + MLlib read `curated/traffic_15min`, write `analytics/` and `ml/`, then JSONL to `export/` (see SERVING_SPEC). One JSONL directory per collection.

## Idempotency
Every job: `mode("overwrite")` on its own path, no append, no dependence on prior run state. Run twice ⇒ identical output. Dynamic partition overwrite for date partitions (`spark.sql.sources.partitionOverwriteMode=dynamic`).

## Validation checkpoints (also in TESTING.md)
Row reconciliation (Stage 2); no duplicate `(sensor_id, ts)` in clean; curated has all contract columns and exactly one row per `(sensor_id, ts)`; `date` partitions ≈ 59; sensors ≈ 307; no nulls in `sensor_id, ts`.

## Hadoop Streaming job (M1)
Mapper/reducer in Python (`src/mapreduce/`) computing hourly vehicle count (sum of `flow` per hour) from `clean/traffic` (CSV export) or raw CSV. Output `analytics/streaming_hourly_count/`. Cross-check the result against the Spark SQL hourly total for the same input (small tolerance if null handling differs; document why).
