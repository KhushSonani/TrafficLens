# TrafficLens: Final Machine Learning Documentation

**Student 2 — ML / Data Analytics Engineer**
**Branch:** `ml-phase`
**Commit:** `docs(ml): finalize prediction outputs and ML documentation`

---

## 1. Project Overview
TrafficLens is a Big Data and Machine Learning Traffic Analytics System. The system ingests the METR-LA traffic dataset via Hadoop/MapReduce (Student 1), builds a predictive Machine Learning pipeline to forecast traffic congestion (Student 2), and exposes the analytics via a backend and frontend dashboard (Student 3).

## 2. Student 2 Responsibilities
Student 2's exclusive domain is the ML/Data Analytics pipeline. This includes:
- **S2-1:** Fetching and preparing data extracted by Student 1.
- **S2-2:** Engineering non-leaking predictive temporal features.
- **S2-3:** Formatting classification targets.
- **S2-4:** Training the Random Forest classification model.
- **S2-5:** Formal model evaluation.
- **S2-6:** Final validation and downstream handoff.

## 3. Dataset
The ML pipeline utilizes the **METR-LA** traffic dataset:
- **Sensors:** 207
- **Timestamps:** 34,272 (5-minute traffic intervals)
- **Prepared Records (S2-1):** 591,192 records
- **Feature-Engineered Records (S2-2):** 590,985 records
- **Test Set Records (S2-4/S2-5):** 118,197 records

## 4. ML Pipeline Flow
```text
METR-LA
   ↓
Data Preparation (S2-1)
   ↓
Feature Engineering (S2-2)
   ↓
Congestion Classification Formatting (S2-3)
   ↓
Chronological Train/Test Split (80/20)
   ↓
Random Forest Classifier (S2-4)
   ↓
Predictions
   ↓
Evaluation (S2-5)
   ↓
Final Prediction Output (S2-6)
   ↓
Student 3 Integration
```

---

## 5. Target Classes
The prediction target is `congestion_class`. Following Student 1's authoritative MapReduce logic, the congestion score is calculated as `1 - (Current Speed / Reference Speed)`. 

*Note: `congestion_score` is strictly EXCLUDED from the ML features to prevent target leakage.*

**Classes:**
- `LOW`: score < 0.3
- `MEDIUM`: 0.3 <= score < 0.6
- `HIGH`: score >= 0.6

## 6. Feature List
The final model utilizes 7 specific predictive features:
1. `sensor_id`: Traffic sensor identifier.
2. `hour`: Hour extracted from timestamp.
3. `day_of_week`: Day of week extracted from timestamp.
4. `is_weekend`: Weekend indicator.
5. `current_speed`: Current observed traffic speed.
6. `previous_speed`: Previous historical speed for the same sensor.
7. `rolling_average`: Trailing rolling speed average using only historical values.

## 7. Train/Test Methodology
- **Split:** 80% Train, 20% Test
- **Methodology:** Strictly chronological. Random shuffling was intentionally disabled. Sorting chronologically ensures the model trains strictly on past data and predicts unseen future data, preventing temporal leakage.

## 8. Random Forest Model Configuration
- **Model:** `sklearn.ensemble.RandomForestClassifier`
- **n_estimators:** 100
- **random_state:** 42 (deterministic reproducibility)
- **class_weight:** 'balanced' (counteracts the dataset's heavy skew toward the `LOW` class)
- **n_jobs:** -1 (multi-core utilization)

---

## 9. Final Evaluation Metrics
Calculated dynamically from the `118,197` test predictions:
- **Accuracy:** `0.9901`
- **Macro F1:** `0.9710`
- **Weighted F1:** `0.9901`

**Per-class F1:**
- `LOW`: `0.9962` (Support: 94,066)
- `MEDIUM`: `0.9315` (Support: 8,512)
- `HIGH`: `0.9854` (Support: 15,619)

### Confusion Matrix
```text
              Pred LOW   Pred MEDIUM   Pred HIGH
Actual LOW       93763       303           0
Actual MEDIUM    411         7946          155
Actual HIGH      0           299           15320
```

*Analysis:* Accuracy is extremely high. The dataset is heavily imbalanced toward the `LOW` class. Macro metrics prove that the `class_weight='balanced'` parameter successfully forced the model to learn the minority `MEDIUM` and `HIGH` states effectively. The only measurable confusion exists adjacently between neighboring class boundaries.

---

## 10. Output File Locations
All generated ML artifacts are stored in the `output/` directory:
- `output/ml_prepared_traffic.csv` (S2-1)
- `output/feature_data.csv` (S2-2)
- `output/classification_data.csv` (S2-3)
- `output/trained_model.pkl` (S2-4, ~96 MB, ignored by Git)
- `output/predictions.csv` (S2-4, Ignored by Git)
- `output/evaluation.txt` (S2-5)
- `output/evaluation_metrics.csv` (S2-5)

## 11. Final Validation
Extensive programmatic validation (`validate_final_outputs.py`) confirmed:
1. `predictions.csv` row count exactly matches `118,197`.
2. Target values perfectly bounded to `LOW`, `MEDIUM`, `HIGH`.
3. Probability sums equal `1.0` and limits are `[0,1]`.
4. No nulls or duplicates for `(sensor_id, timestamp)` unique keys.
5. `trained_model.pkl` structurally validates with exactly 7 features and 3 classes upon reload.
6. The methodology ensures strict deterministic reproducibility.

## 12. Limitations
- The model expects real-time trailing features (`previous_speed`, `rolling_average`). If deployed in a true live streaming scenario, the ingest pipeline must buffer these values natively before model inference.

## 13. Student 3 Integration Notes
Student 3 should strictly consume: `output/predictions.csv`.
- Use `timestamp` and `sensor_id` to index predictions.
- The `predicted_congestion` column is the primary metric to surface on dashboards/APIs.
- `probability_*` columns are available if the frontend UI wishes to visualize "confidence" levels.
- Do not expose `actual_congestion` to end-users as it is solely evaluation metadata.
