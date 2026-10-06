# S2-5: Model Evaluation and Metrics

**Student 2 — ML / Data Analytics Engineer**
**Branch:** `ml-phase`
**Commit:** `test(ml): add model evaluation and metrics`

---

## 1. Purpose of S2-5
The purpose of the S2-5 stage is to comprehensively and robustly evaluate the actual trained Random Forest classification model created in S2-4. No models are trained in this stage. We calculate actual performance metrics based on the unseen test set to objectively measure the model's predictive capability before downstream analytics and deployments.

## 2. Input Used
The evaluation reads directly from the outputs produced by S2-4:
- `output/predictions.csv`: Contains `timestamp`, `sensor_id`, `actual_congestion`, `predicted_congestion`, and class probabilities.

## 3. Existing S2-4 Model/Prediction Pipeline
The tested model is a `RandomForestClassifier` trained with `n_estimators=100`, `random_state=42`, and `class_weight='balanced'`. It utilizes deterministic identifiers (`sensor_id`), temporal markers (`hour`, `day_of_week`), and robust trailing traffic features (`current_speed`, `previous_speed`, `rolling_average`).

## 4. Test-set Methodology
The test set consists of the chronologically latest 20% of the entire `ml_prepared_traffic` dataset, totaling **118,197 records**.

## 5. Why Chronological Evaluation is Retained
Shuffling a time-series dataset would introduce temporal leakage, causing the model to train on future observations to predict the past. By testing entirely on chronological holdout data, we simulate a genuine production forecasting scenario and accurately measure the model's true capability on unseen future data.

## 6. Metrics Used
The evaluation focuses heavily on holistic classification metrics instead of just accuracy, especially important due to the class imbalance.

- **Accuracy**: The raw ratio of correct predictions to total predictions. While useful overall, it masks poor performance in minority classes.
- **Precision**: Of the records the model *predicted* to be a certain class, how many actually were? (Measures false positive resistance).
- **Recall**: Of the records that *actually* were a certain class, how many did the model find? (Measures false negative resistance).
- **F1-score**: The harmonic mean of Precision and Recall. High F1 requires both low false positives and low false negatives.

### Averaging Techniques
- **Macro averaging**: Calculates the metric independently for each class and then takes the unweighted mean. This treats the small `MEDIUM` class with exactly the same importance as the massive `LOW` class, which is a rigorous test for imbalanced learning.
- **Weighted averaging**: Averages the per-class metrics by weighing them according to the class's actual support (sample size).

## 7. Handling of Class Imbalance
The TrafficLens dataset is heavily skewed toward free-flowing traffic (`LOW` class contains ~85% of records). To prevent the Random Forest from simply guessing `LOW` constantly to achieve 85% accuracy, S2-4 utilized `class_weight='balanced'`. Our evaluation uses Macro and Per-Class metrics to prove that the model learned robust patterns for the minority `MEDIUM` and `HIGH` classes, rather than just exploiting the majority class.

---

## 8. Actual Evaluation Results

**Overall Metrics:**
- **Accuracy:** 0.9901
- **Macro Precision:** 0.9717
- **Macro Recall:** 0.9704
- **Macro F1:** 0.9710
- **Weighted Precision:** 0.9901
- **Weighted Recall:** 0.9901
- **Weighted F1:** 0.9901

**Per-Class Metrics:**
| Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| **LOW** | 0.9956 | 0.9968 | 0.9962 | 94,066 |
| **MEDIUM** | 0.9296 | 0.9335 | 0.9315 | 8,512 |
| **HIGH** | 0.9900 | 0.9809 | 0.9854 | 15,619 |

## 9. Confusion Matrix
**Class Order: LOW, MEDIUM, HIGH**

| | Pred LOW | Pred MEDIUM | Pred HIGH |
|---|---|---|---|
| **Actual LOW** | 93,763 | 303 | 0 |
| **Actual MEDIUM** | 411 | 7,946 | 155 |
| **Actual HIGH** | 0 | 299 | 15,320 |

---

## 10. Validation Performed
The evaluation script performed exhaustive integrity checks before reporting metrics:
- 118,197 prediction rows read and verified.
- No nulls detected in actual or predicted classes.
- Target labels restricted strictly to `LOW`, `MEDIUM`, `HIGH`.
- Probability limits bounded mathematically to [0, 1].
- Probabilities cleanly sum to `1.0` per row.
- Total count in the Confusion Matrix identically matched the test records length.

## 11. Reproducibility Information
Because the test set was split chronologically rather than randomly, and the original model was seeded with `random_state=42`, running `evaluate_model.py` across multiple iterations will consistently generate these exact figures.
