# ML_SPEC.md

Owner: M2. All jobs PySpark, idempotent, timezone set. Weather is **never** an input to the congestion score.

## Shared split (`config/split.yaml`, created by M2)
Split distinct dates chronologically 70/15/15 (≈ 41/9/9 of 59 days). Computed once from the data and stored; K-Means, score reference stats and RF all read it. Never random.

## 1. Congestion score
```text
score = 100 × (0.5·speed_index + 0.3·occ_index + 0.2·density_idx)
speed_index = 1 − clip(avg_speed / free_flow_speed, 0, 1)      free_flow_speed = per-sensor p95 speed (train period)
occ_index   = clip(avg_occupancy / occ_ref, 0, 1)               occ_ref  = per-sensor p95 occupancy (train)
density_idx = clip(density / density_ref, 0, 1)                 density_ref = per-sensor p95 density (train)
density = total_flow × 4 / avg_speed
```
Flow alone is not used (non-monotonic). Rows with null components → null score/level (do not impute silently).
**Levels:** Low < 30, Medium 30–60, High > 60.
**Calibration (mandatory):** on the train period report score histogram and share of Low/Medium/High. If any class < 2% or High > 60%, the thresholds or reference percentiles need review: propose the change in DECISIONS, do not silently retune. Save reference stats to `analytics/score_reference/` and the report to `ml/metrics/score_calibration.json`.

## 2. K-Means levels
- Features: `avg_speed, avg_occupancy, density` (15-min rows, non-null).
- Pipeline: `VectorAssembler → StandardScaler → KMeans(k=3, seed fixed)`; fit on **train period only**, transform all.
- Mapping (never assume cluster 0 = Low): rank clusters by centroid `avg_speed` (highest = Low, middle = Medium, lowest = High), computed in the **original** feature scale (invert scaling or compute cluster means).
- Sanity assertion: centroid occupancy and density must be monotonic in the opposite direction (High cluster has highest occupancy and density). If the assertion fails, stop and flag; do not force the mapping.
- Silhouette (`ClusteringEvaluator`) on a fixed-seed sample (e.g. 5%); report sample size.
- Output `ml/` with `kmeans_level` column; centroids + mapping + silhouette to `model_metrics` (`model = "kmeans"`).
- Also report agreement (confusion table) between `kmeans_level` and score `level` as a descriptive check, not as ground truth.

## 3. Recurrent hotspots
Per sensor, restricted to `is_peak = true` and non-null `level`:
```sql
SELECT sensor_id,
       COUNT(*) AS peak_intervals,
       SUM(CASE WHEN level='High' THEN 1 ELSE 0 END) AS high_peak_intervals,
       SUM(CASE WHEN level='High' THEN 1 ELSE 0 END) / COUNT(*) AS high_peak_share
FROM traffic_15min WHERE is_peak GROUP BY sensor_id HAVING COUNT(*) >= 100
```
Rank descending by `high_peak_share`; `is_hotspot = rank <= 20`. Output feeds `congestion_results`.

## 4. Weather impact
Baseline per `(sensor_id, hour_of_week)` = mean `congestion_score` over `weather_cat = 'clear'` intervals. For each `(sensor_id, hour_of_week, weather_cat)` with `n >= 4`: `mean_score`, `baseline_score`, `delta = mean_score − baseline_score`. `hour_of_week = (dow−1)*24 + hour` (0 = Mon 00:00 … 167). Also produce an all-sensor summary by `weather_cat`.
Caveat for the report: observational, confounded by which days it rained; do not claim causation. If `fog` or `rain` has too few samples, say so.

## 5. Next-hour forecast (Random Forest, optional)
- Grain: hourly per sensor, `hour_score = mean(congestion_score)` over the hour (min 3 of 4 intervals), `hour_level` from the score thresholds. **Label = `hour_level` at t+1.**
- Lag features via window functions (`partitionBy sensor_id orderBy hour_ts`): `lag_1h, lag_2h, lag_3h` score, `lag_24h`, `roll_mean_3h`, plus `hour, dow, is_weekend`, and weather of the target hour (`temp_c, precip_mm, weather_cat`, assumed available as a forecast; state this assumption). Drop rows whose lags are not exactly 1 h apart (gaps) instead of filling.
- Label encoding with explicit order Low, Medium, High (do not use alphabetical `StringIndexer`).
- Model: `RandomForestClassifier(numTrees=100, maxDepth=10, seed fixed)`.
- Temporal split from `config/split.yaml`; fit on train, check on validation, report on test.
- Baselines on the same test rows: **persistence** (`predicted = hour_level at t`), **majority class** (most frequent train class).
- Metrics: accuracy, weighted F1, per-class recall, confusion matrix, for RF and both baselines, into `model_metrics`. If RF does not beat persistence, report that honestly.
- Predictions export: aggregate test-period predictions per `(location_id, hour_of_week, weather)`: mean probabilities, argmax `predicted_level`, `n_samples` (see contract). **OPEN-2 in DECISIONS: confirm this mapping.**
- Cut rule: RF is the first feature cut (see PROJECT_SPEC).
