# S2-6: Final Prediction Output Schema

**Student 2 — ML / Data Analytics Engineer**
**Branch:** `ml-phase`
**Commit:** `docs(ml): finalize prediction outputs and ML documentation`

---

## Final Downstream Artifact
The core deliverable of the Student 2 Machine Learning pipeline that bridges to Student 3's backend/frontend implementation is the predictions file.

### File
`output/predictions.csv`

### Prediction Row Count
`118,197` records

---

## Columns

| Column | Meaning | Type | Downstream Usage |
|--------|---------|------|------------------|
| `timestamp` | The exact time of the prediction. | `string (YYYY-MM-DD HH:MM:SS)` | **Required.** Primary temporal key for API lookup. |
| `sensor_id` | The specific traffic sensor this prediction belongs to. | `int` | **Required.** Primary spatial key for API lookup. |
| `predicted_congestion` | The Random Forest predicted congestion class (`LOW`, `MEDIUM`, `HIGH`). | `string` | **Required.** This is the main ML output to show to the end user. |
| `probability_low` | The model's calculated probability that the state is LOW. | `float [0.0, 1.0]` | **Optional.** Can be used for UI confidence scores. |
| `probability_medium` | The model's calculated probability that the state is MEDIUM. | `float [0.0, 1.0]` | **Optional.** Can be used for UI confidence scores. |
| `probability_high` | The model's calculated probability that the state is HIGH. | `float [0.0, 1.0]` | **Optional.** Can be used for UI confidence scores. |
| `actual_congestion` | The ground-truth actual congestion class. | `string` | **Metadata only.** Useful for evaluation and drift monitoring, but Student 3 does *not* need to expose this to the end user for forward-facing predictions. |

---

## Technical Notes for Student 3 Integration

1. **Row-level uniqueness:** The combination of `(sensor_id, timestamp)` is strictly unique. There are no duplicate prediction records. The primary key for any backend database ingestion should safely be `(sensor_id, timestamp)`.
2. **Probability interpretation:** The three probability columns always sum exactly to `1.0`. They represent the certainty of the Random Forest model (derived from the fraction of voting trees).
3. **Class values:** The predicted classes strictly match `LOW`, `MEDIUM`, `HIGH`. No other string values or nulls exist in this column.
4. **Integration approach:** You can safely load this CSV into your backend database (e.g. MongoDB, PostgreSQL) and expose a REST endpoint `GET /api/predictions?sensor_id=X&time=Y` that simply returns the `predicted_congestion`.
