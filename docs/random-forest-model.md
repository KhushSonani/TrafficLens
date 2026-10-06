# S2-4: Random Forest Congestion Model

**Student 2 — ML / Data Analytics Engineer**
**Branch:** `ml-phase`
**Commit:** `feat(ml): implement random forest congestion model`

---

## 1. Purpose
The purpose of the S2-4 pipeline is to train an actual Random Forest classification model using the validated classification-ready dataset created in S2-3. It implements a robust, reproducible training pipeline with a chronological train/test split, creates predictions on the unseen test set, outputs prediction probabilities, and securely serializes the final trained model for downstream evaluation tasks (S2-5).

This stage does not evaluate the model formally (Accuracy, Precision, Recall, F1); that is reserved for S2-5.

---

## 2. Input Dataset
**File:** `output/classification_data.csv`
- Total records: 590,985

## 3. Feature Columns ($X$)
The model utilizes 7 explicitly selected non-leaking features:
1. `sensor_id`
2. `hour`
3. `day_of_week`
4. `is_weekend`
5. `current_speed`
6. `previous_speed`
7. `rolling_average`

## 4. Target Column ($y$)
**Target:** `congestion_class`
**Expected Classes:** `LOW`, `MEDIUM`, `HIGH`

## 5. Leakage Exclusions
`congestion_score` is explicitly **excluded** from the model feature matrix ($X$) because it is deterministically thresholded to create `congestion_class`. Including it would cause trivial target leakage. The `timestamp` column is also excluded from model features and serves only as traceability metadata. The temporal features (`previous_speed`, `rolling_average`) were strictly created using past and current observations only, avoiding future-leakage.

---

## 6. Train/Test Split Methodology
- **Strategy:** Chronological Split
- **Ratio:** 80% Train / 20% Test
- **Method:** The entire dataset was strictly sorted by `timestamp` ascending. The first 80% was utilized for training and the remaining 20% for testing. 

## 7. Temporal Considerations
Because the TrafficLens dataset is time-series traffic data, randomly shuffling the records would cause severe temporal leakage (where future observations train the model to predict past observations). A strictly chronological split ensures the model trains on the past and predicts the future, reflecting a real-world predictive scenario.

**Counts:**
- **Training rows:** 472,788 (80.0%)
- **Testing rows:** 118,197 (20.0%)

---

## 8. Random Forest Parameters
Model: `sklearn.ensemble.RandomForestClassifier`
- `n_estimators`: 100
- `random_state`: 42 (deterministic reproducibility)
- `class_weight`: 'balanced'
- `n_jobs`: -1 (multi-core acceleration)

## 9. Class Imbalance Handling
The raw dataset is heavily imbalanced toward the `LOW` congestion class.
**Train Class Distribution:**
- LOW: 408,212 (86.34%)
- HIGH: 38,621 (8.17%)
- MEDIUM: 25,955 (5.49%)

**Test Class Distribution:**
- LOW: 94,066 (79.58%)
- HIGH: 15,619 (13.21%)
- MEDIUM: 8,512 (7.20%)

To counteract this, the `class_weight='balanced'` parameter was provided to the Random Forest model, automatically adjusting the weights inversely proportional to class frequencies.

---

## 10. Model Serialization
The trained model was securely serialized using Python's `joblib`.
**Path:** `output/trained_model.pkl`
**Size:** ~96.31 MB

## 11. Prediction Output Schema
**Path:** `output/predictions.csv`
**Row Count:** 118,197 (exactly matches the testing set)
**Columns:**
- `timestamp`
- `sensor_id`
- `actual_congestion`
- `predicted_congestion`
- `probability_high`
- `probability_low`
- `probability_medium`

## 12. Probability Output
Prediction probabilities were generated via `model.predict_proba()`. These probabilities were successfully validated:
- Range bounded [0, 1]
- Sum to exactly 1.0 per row

## 13. Model Reload Validation
As a final validation, the serialized model was reloaded from disk (`joblib.load()`) and used to generate predictions on a subset of the test data. The resulting predictions perfectly matched the in-memory original model's predictions, guaranteeing successful serialization.

## 14. Reproducibility
The pipeline fixes all non-deterministic factors:
- `random_state=42` is set in the classifier.
- The train/test split avoids random shuffling by sorting predictably by `timestamp`.

## 15. How to run the model
Ensure `output/classification_data.csv` exists.
Run the script from the project root:
```bash
python src/analytics/random_forest_model.py
```

## 16. Relationship to S2-5
The serialized `trained_model.pkl` and `predictions.csv` artifacts are the core inputs required for S2-5. In S2-5, these files will be utilized to generate comprehensive model evaluation metrics such as the Confusion Matrix, Accuracy, Precision, Recall, and F1-score.
