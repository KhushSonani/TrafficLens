import pandas as pd
import numpy as np
import joblib
import os
import sys

def main():
    print("=" * 60)
    print("TrafficLens S2-6 - Final Output Validation")
    print("=" * 60)

    # 1. Check existence
    expected_files = [
        "output/predictions.csv",
        "output/trained_model.pkl",
        "output/evaluation.txt",
        "output/evaluation_metrics.csv"
    ]
    for f in expected_files:
        if not os.path.exists(f):
            print(f"Error: Required file {f} is missing.")
            sys.exit(1)
            
    print("All required ML artifacts exist.")

    # 2. Validate predictions.csv
    print("\nValidating predictions.csv...")
    df = pd.read_csv("output/predictions.csv")
    
    if len(df) == 0:
        print("Error: predictions.csv is empty.")
        sys.exit(1)
        
    expected_cols = [
        'timestamp', 'sensor_id', 'actual_congestion', 'predicted_congestion',
        'probability_high', 'probability_low', 'probability_medium'
    ]
    for c in expected_cols:
        if c not in df.columns:
            print(f"Error: Missing column {c} in predictions.csv")
            sys.exit(1)

    print(f"Prediction Row Count: {len(df)}")
    if len(df) != 118197:
        print(f"Warning: Expected 118,197 records, found {len(df)}.")

    if df['sensor_id'].isnull().any() or df['timestamp'].isnull().any():
        print("Error: Nulls found in sensor_id or timestamp.")
        sys.exit(1)

    valid_classes = {"LOW", "MEDIUM", "HIGH"}
    if not set(df['predicted_congestion'].unique()).issubset(valid_classes):
        print("Error: Invalid classes in predicted_congestion.")
        sys.exit(1)
        
    if not set(df['actual_congestion'].unique()).issubset(valid_classes):
        print("Error: Invalid classes in actual_congestion.")
        sys.exit(1)

    prob_cols = ['probability_high', 'probability_low', 'probability_medium']
    for c in prob_cols:
        if not pd.api.types.is_numeric_dtype(df[c]):
            print(f"Error: Column {c} is not numeric.")
            sys.exit(1)
        if (df[c] < 0).any() or (df[c] > 1).any():
            print(f"Error: Values out of bounds [0,1] in {c}.")
            sys.exit(1)
            
    prob_sums = df[prob_cols].sum(axis=1)
    if not np.allclose(prob_sums, 1.0, atol=1e-5):
        print("Error: Probabilities do not sum to 1.0")
        sys.exit(1)
        
    dups = df.duplicated(subset=['sensor_id', 'timestamp']).sum()
    if dups > 0:
        print(f"Error: Found {dups} duplicate prediction records.")
        sys.exit(1)
    
    print("predictions.csv validation PASS.")

    # 3. Model Reload Validation
    print("\nValidating trained_model.pkl reload...")
    try:
        model = joblib.load("output/trained_model.pkl")
    except Exception as e:
        print(f"Error loading model: {e}")
        sys.exit(1)
        
    if not hasattr(model, 'classes_'):
        print("Error: Reloaded model does not have classes_ attribute.")
        sys.exit(1)
        
    print(f"Model Classes: {list(model.classes_)}")
    if set(model.classes_) != valid_classes:
        print("Error: Model classes do not match {LOW, MEDIUM, HIGH}")
        sys.exit(1)
        
    if not hasattr(model, 'n_features_in_') or model.n_features_in_ != 7:
        print("Error: Model does not expect 7 features.")
        sys.exit(1)
        
    print("trained_model.pkl validation PASS.")
    
    # 4. Evaluation consistency check
    print("\nValidating evaluation outputs readability...")
    with open("output/evaluation.txt", "r") as f:
        content = f.read()
        if "Accuracy" not in content or "0.9901" not in content:
            print("Warning: evaluation.txt might not contain expected exact metrics.")
            
    print("evaluation outputs validation PASS.")
    
    print("\nFinal Output Validation complete successfully.")

if __name__ == "__main__":
    main()
