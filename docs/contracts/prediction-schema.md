# Contract: prediction row

> These contracts are shared interfaces between team members. Do not modify them casually. Changes need a PR and notification to M2 and M3.

JSONL line in `export/predictions/`, loaded into Mongo `predictions`. Unique key `(location_id, hour_of_week, weather)`.

```json
{
  "location_id": "17",
  "hour_of_week": 32,
  "weather": "clear",
  "predicted_level": "High",
  "probabilities": {"Low": 0.10, "Medium": 0.25, "High": 0.65},
  "n_samples": 6,
  "model_version": "rf_100t_d10",
  "generated_at": "2026-10-04T18:30:00-07:00"
}
```
| Field | Type | Rule |
|---|---|---|
| location_id | string | = `sensor_id` |
| hour_of_week | int | 0–167, 0 = Monday 00:00 |
| weather | string | `clear`, `rain`, `fog` |
| predicted_level | string | `Low`, `Medium`, `High`; argmax of probabilities |
| probabilities | object | keys `Low`, `Medium`, `High`, each 0–1, sum ≈ 1 (±0.001) |
| n_samples | int | test-period rows aggregated (optional field) |
| model_version | string | (optional) |
| generated_at | string | ISO 8601 (optional) |

Rows are aggregated from test-period model outputs (ML_SPEC §5, OPEN-2). Missing combinations simply have no row; the UI must handle "no prediction".
