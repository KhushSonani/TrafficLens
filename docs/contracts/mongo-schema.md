# Contract: MongoDB schemas

> These contracts are shared interfaces between team members. Do not modify them casually. Changes need a PR and notification to M2 and M3.

DB `trafficlens`. Exactly six collections. Aggregates only. Timestamps ISO 8601 strings. `_id` left to Mongo unless stated.

## locations  (key: `location_id`, unique)
`location_id` string, `name` string|null, `latitude` double|null, `longitude` double|null, `freeway` string|null, `district` string|null, `source` string (`pems_metadata` | `sensor_id_only`).

## traffic_summary  (key depends on `summary_type`)
Common: `summary_type` ∈ {`hourly`, `per_location`, `daily`}; `location_id` string (`"ALL"` for network-wide); `avg_speed`, `avg_flow`, `avg_occupancy`, `avg_congestion_score` doubles; `n` int.
- `hourly`: + `hour` int, `is_weekend` bool. Key `(summary_type, location_id, hour, is_weekend)`.
- `per_location`: + `peak_avg_speed`, `offpeak_avg_speed`. Key `(summary_type, location_id)`.
- `daily`: + `date` (YYYY-MM-DD). Key `(summary_type, location_id, date)`.

## congestion_results  (key: `location_id`, unique)
`location_id`, `mean_score`, `level_share` {`Low`,`Medium`,`High`} (score levels), `kmeans_level_share` {`Low`,`Medium`,`High`}, `peak_intervals` int, `high_peak_intervals` int, `high_peak_share` double, `hotspot_rank` int, `is_hotspot` bool.

## impact_analysis  (key: `location_id, hour_of_week, weather`, unique)
`location_id` (`"ALL"` allowed for network summary with `hour_of_week` null → use separate key `(location_id, weather)` and `hour_of_week: -1`), `hour_of_week` int, `weather` string, `mean_score`, `baseline_score`, `delta` doubles, `n` int.

## predictions  (key: `location_id, hour_of_week, weather`, unique)
See `prediction-schema.md`.

## model_metrics  (key: `model, split`)
`model` ∈ {`kmeans`, `random_forest`, `persistence`, `majority`, `score_calibration`}; `split` ∈ {`train`,`validation`,`test`}; `accuracy`, `weighted_f1` doubles|null; `recall` {`Low`,`Medium`,`High`}; `confusion_matrix` 3×3 int array, row = actual, column = predicted, order Low, Medium, High; `silhouette` double|null; `silhouette_sample_size` int|null; `centroids` array of {`level`, `avg_speed`, `avg_occupancy`, `density`} (K-Means only); `cluster_to_level` object; `trained_at` string.

## Indexes
`location_id` on `locations, traffic_summary, congestion_results, impact_analysis, predictions`; unique compound `(location_id, hour_of_week, weather)` on `impact_analysis` and `predictions`; unique `(model, split)` on `model_metrics`.
