import pandas as pd
import numpy as np
import os
import sys
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

def main():
    print("=" * 60)
    print("TrafficLens S2-4 - Random Forest Congestion Model")
    print("=" * 60)

    input_path = "output/classification_data.csv"
    model_output_path = "output/trained_model.pkl"
    predictions_output_path = "output/predictions.csv"

    if not os.path.exists(input_path):
        print(f"Error: Input file {input_path} not found.")
        sys.exit(1)

    print(f"Reading classification data from {input_path}...")
    df = pd.read_csv(input_path)
    initial_rows = len(df)

    # Validate target and features
    target_col = 'congestion_class'
    feature_cols = ['sensor_id', 'hour', 'day_of_week', 'is_weekend', 'current_speed', 'previous_speed', 'rolling_average']

    for col in feature_cols + [target_col, 'timestamp']:
        if col not in df.columns:
            print(f"Error: Missing column {col}")
            sys.exit(1)
            
    if 'congestion_score' in feature_cols:
        print("Error: Target leakage detected. 'congestion_score' should not be a feature.")
        sys.exit(1)

    # Sort strictly chronologically for temporal safety
    df['timestamp_dt'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp_dt').reset_index(drop=True)
    
    # Chronological train/test split (80/20)
    train_size = int(len(df) * 0.8)
    train_df = df.iloc[:train_size].copy()
    test_df = df.iloc[train_size:].copy()

    X_train = train_df[feature_cols]
    y_train = train_df[target_col]
    X_test = test_df[feature_cols]
    y_test = test_df[target_col]

    print(f"\nChronological Split Strategy:")
    print(f"  Training rows: {len(X_train):,} ({len(X_train)/len(df)*100:.1f}%)")
    print(f"  Testing rows:  {len(X_test):,} ({len(X_test)/len(df)*100:.1f}%)")

    # Train Random Forest
    print("\nTraining RandomForestClassifier...")
    rf_params = {
        'n_estimators': 100,
        'random_state': 42,
        'class_weight': 'balanced',
        'n_jobs': -1 # use all cores
    }
    
    model = RandomForestClassifier(**rf_params)
    model.fit(X_train, y_train)
    print("Training complete.")

    # Save the model
    print(f"\nSaving model to {model_output_path}...")
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(model, model_output_path)
    model_size_mb = os.path.getsize(model_output_path) / (1024 * 1024)
    print(f"Model saved. Size: {model_size_mb:.2f} MB")

    # Generate predictions
    print("\nGenerating predictions on test set...")
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    classes = model.classes_ # usually ['HIGH', 'LOW', 'MEDIUM']
    
    print(f"Model classes: {classes}")

    # Build predictions dataframe
    predictions_df = test_df[['timestamp', 'sensor_id', target_col]].copy()
    predictions_df.rename(columns={target_col: 'actual_congestion'}, inplace=True)
    predictions_df['predicted_congestion'] = y_pred
    
    for i, cls in enumerate(classes):
        prob_col = f"probability_{cls.lower()}"
        predictions_df[prob_col] = y_proba[:, i]
        
    print(f"Saving predictions to {predictions_output_path}...")
    predictions_df.to_csv(predictions_output_path, index=False)

    # Validate Model Reload
    print("\nValidating model serialization (reload test)...")
    loaded_model = joblib.load(model_output_path)
    
    # Test on a small subset (first 100 rows of test set)
    subset_X = X_test.head(100)
    orig_preds = model.predict(subset_X)
    loaded_preds = loaded_model.predict(subset_X)
    
    reload_success = np.array_equal(orig_preds, loaded_preds)
    print(f"Model reload and prediction match: {'SUCCESS' if reload_success else 'FAILED'}")

    # Probability Validation
    invalid_probs = ((y_proba < 0) | (y_proba > 1)).sum()
    prob_sums = np.sum(y_proba, axis=1)
    sum_invalid = (~np.isclose(prob_sums, 1.0)).sum()
    
    print("\n" + "="*40)
    print("ACTUAL DATA STATISTICS")
    print("="*40)
    print(f"Input row count:           {initial_rows:,}")
    print(f"Training row count:        {len(X_train):,}")
    print(f"Testing row count:         {len(X_test):,}")
    print(f"Number of features:        {len(feature_cols)}")
    print(f"Feature names:             {feature_cols}")
    print(f"Target classes:            {list(classes)}")
    
    print("\nTrain Class distribution:")
    for cls, count in y_train.value_counts().items():
        print(f"  {cls}: {count:,} ({count/len(y_train)*100:.2f}%)")
        
    print("\nTest Class distribution:")
    for cls, count in y_test.value_counts().items():
        print(f"  {cls}: {count:,} ({count/len(y_test)*100:.2f}%)")
        
    print(f"\nRandom Forest Parameters:  {rf_params}")
    print(f"Model output path:         {model_output_path} ({model_size_mb:.2f} MB)")
    print(f"Prediction output path:    {predictions_output_path}")
    print(f"Prediction row count:      {len(predictions_df):,}")
    print(f"Probability values valid:  {invalid_probs == 0 and sum_invalid == 0}")
    print(f"Model reload valid:        {reload_success}")
    
    # Check for invalid predictions or duplicates
    invalid_preds = (~predictions_df['predicted_congestion'].isin(classes)).sum()
    dup_preds = predictions_df.duplicated(subset=['timestamp', 'sensor_id']).sum()
    
    print(f"Invalid predictions count: {invalid_preds}")
    print(f"Duplicate prediction rows: {dup_preds}")

    print("\nS2-4 pipeline completed successfully.")

if __name__ == "__main__":
    main()
