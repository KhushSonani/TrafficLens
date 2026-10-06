import pandas as pd
import numpy as np
import os
import sys
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)

def main():
    print("=" * 60)
    print("TrafficLens S2-5 - Model Evaluation")
    print("=" * 60)

    input_path = "output/predictions.csv"
    output_txt_path = "output/evaluation.txt"
    output_csv_path = "output/evaluation_metrics.csv"

    if not os.path.exists(input_path):
        print(f"Error: Input file {input_path} not found.")
        sys.exit(1)

    print(f"Reading predictions from {input_path}...")
    df = pd.read_csv(input_path)
    
    # Validation 1: Required columns
    required_cols = [
        'timestamp', 'sensor_id', 'actual_congestion', 'predicted_congestion',
        'probability_high', 'probability_low', 'probability_medium'
    ]
    for col in required_cols:
        if col not in df.columns:
            print(f"Error: Missing column {col}")
            sys.exit(1)

    # Validation 2: Row count
    num_predictions = len(df)
    if num_predictions != 118197:
        print(f"Warning: Expected 118,197 predictions, found {num_predictions}.")
        
    # Validation 3: No nulls
    if df['actual_congestion'].isnull().any() or df['predicted_congestion'].isnull().any():
        print("Error: Null values found in actual or predicted labels.")
        sys.exit(1)
        
    # Validation 4: Expected classes
    valid_classes = {"LOW", "MEDIUM", "HIGH"}
    if not set(df['actual_congestion'].unique()).issubset(valid_classes):
        print("Error: Invalid actual classes found.")
        sys.exit(1)
    if not set(df['predicted_congestion'].unique()).issubset(valid_classes):
        print("Error: Invalid predicted classes found.")
        sys.exit(1)
        
    # Validation 5: Probability values
    prob_cols = ['probability_low', 'probability_medium', 'probability_high']
    for col in prob_cols:
        if (df[col] < 0).any() or (df[col] > 1).any():
            print(f"Error: Invalid probability values in {col}.")
            sys.exit(1)
            
    prob_sums = df[prob_cols].sum(axis=1)
    if not np.allclose(prob_sums, 1.0, atol=1e-5):
        print("Error: Probabilities do not sum to 1.")
        sys.exit(1)

    # Class ordering strictly enforced
    class_labels = ['LOW', 'MEDIUM', 'HIGH']
    
    y_true = df['actual_congestion']
    y_pred = df['predicted_congestion']

    # Calculate metrics
    print("\nCalculating metrics...")
    acc = accuracy_score(y_true, y_pred)
    
    macro_p = precision_score(y_true, y_pred, average='macro', labels=class_labels, zero_division=0)
    macro_r = recall_score(y_true, y_pred, average='macro', labels=class_labels, zero_division=0)
    macro_f1 = f1_score(y_true, y_pred, average='macro', labels=class_labels, zero_division=0)
    
    weighted_p = precision_score(y_true, y_pred, average='weighted', labels=class_labels, zero_division=0)
    weighted_r = recall_score(y_true, y_pred, average='weighted', labels=class_labels, zero_division=0)
    weighted_f1 = f1_score(y_true, y_pred, average='weighted', labels=class_labels, zero_division=0)

    clf_report = classification_report(y_true, y_pred, labels=class_labels, target_names=class_labels, digits=4, zero_division=0)
    
    cm = confusion_matrix(y_true, y_pred, labels=class_labels)

    # Create text report
    report_text = f"""TrafficLens — Random Forest Congestion Model Evaluation

Model:
Random Forest Classifier

Model configuration:
n_estimators = 100
random_state = 42
class_weight = balanced

Evaluation dataset:
S2-4 chronological test set

Test samples:
{num_predictions}

Classes:
LOW, MEDIUM, HIGH

--------------------------------------------------
Overall Metrics
--------------------------------------------------

Accuracy:
{acc:.4f}

Macro Precision:
{macro_p:.4f}

Macro Recall:
{macro_r:.4f}

Macro F1:
{macro_f1:.4f}

Weighted Precision:
{weighted_p:.4f}

Weighted Recall:
{weighted_r:.4f}

Weighted F1:
{weighted_f1:.4f}

--------------------------------------------------
Per-Class Metrics
--------------------------------------------------
{clf_report}

--------------------------------------------------
Confusion Matrix
--------------------------------------------------

Class order:
LOW
MEDIUM
HIGH

              Pred LOW   Pred MEDIUM   Pred HIGH
Actual LOW       {cm[0][0]:<11} {cm[0][1]:<13} {cm[0][2]:<10}
Actual MEDIUM    {cm[1][0]:<11} {cm[1][1]:<13} {cm[1][2]:<10}
Actual HIGH      {cm[2][0]:<11} {cm[2][1]:<13} {cm[2][2]:<10}

--------------------------------------------------
Validation
--------------------------------------------------

Prediction rows:
{num_predictions}

Probability validation:
PASS

Label validation:
PASS

Confusion matrix total:
{cm.sum()}
"""

    print(f"Saving evaluation text report to {output_txt_path}...")
    os.makedirs(os.path.dirname(output_txt_path), exist_ok=True)
    with open(output_txt_path, 'w') as f:
        f.write(report_text)
        
    print(report_text)

    # Save CSV metrics
    metrics_data = {
        'metric': [
            'accuracy', 'macro_precision', 'macro_recall', 'macro_f1',
            'weighted_precision', 'weighted_recall', 'weighted_f1'
        ],
        'value': [
            acc, macro_p, macro_r, macro_f1,
            weighted_p, weighted_r, weighted_f1
        ]
    }
    metrics_df = pd.DataFrame(metrics_data)
    print(f"Saving evaluation metrics CSV to {output_csv_path}...")
    metrics_df.to_csv(output_csv_path, index=False)

    print("\nS2-5 evaluation completed successfully.")

if __name__ == "__main__":
    main()
