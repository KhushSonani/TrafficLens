# Contract: curated `traffic_15min`

> These contracts are shared interfaces between team members. Do not modify them casually. Changes need a PR and notification to M1, M2, M3.

Location: `hdfs:///trafficlens/curated/traffic_15min/` (final, written by M2 score job). `hdfs:///trafficlens/curated/traffic_15min_base/` (written by M1) has identical columns; the five score columns are null. Format Parquet, `partitionBy("date")`. Unique key `(sensor_id, ts)`. Timezone `America/Los_Angeles`.

| Column | Type | Notes | Writer |
|---|---|---|---|
| sensor_id | string | PEMS04 sensor id, e.g. "0"…"306" or station id | M1 |
| ts | timestamp | 15-min window start | M1 |
| date | date | partition column | M1 |
| hour | int | 0–23 | M1 |
| dow | int | ISO 1=Mon … 7=Sun | M1 |
| is_weekend | boolean | dow ∈ {6,7} | M1 |
| is_peak | boolean | weekday, hour ∈ {7,8,9,16,17,18} | M1 |
| avg_speed | double | mph, verify units Day 1 | M1 |
| total_flow | double | sum of 5-min flows in the window | M1 |
| avg_occupancy | double | unit per data dictionary | M1 |
| density | double | `total_flow*4 / avg_speed`, null if speed ≤ 0 | M1 |
| speed_index | double | 0–1 | M2 |
| occ_index | double | 0–1 | M2 |
| density_idx | double | 0–1 | M2 |
| congestion_score | double | 0–100 | M2 |
| level | string | `Low`, `Medium`, `High` (score thresholds) | M2 |
| temp_c | double | | M1 |
| precip_mm | double | | M1 |
| visibility_km | double | nullable if source lacks it | M1 |
| weather_cat | string | `clear`, `rain`, `fog` | M1 |

Column order as listed. `hour_of_week = (dow−1)*24 + hour` is derived downstream, not stored.
