import pandas as pd
import numpy as np
import os
import sys

def main():
    print("=" * 60)
    print("TrafficLens S2-2 - ML Feature Engineering Pipeline")
    print("=" * 60)

    input_path = "output/ml_prepared_traffic.csv"
    output_path = "output/feature_data.csv"

    if not os.path.exists(input_path):
        print(f"Error: Input file {input_path} not found.")
        sys.exit(1)

    # 1. Read S2-1 prepared data
    print(f"Reading data from {input_path}...")
    df = pd.read_csv(input_path)
    initial_rows = len(df)
    
    # 2. Validate required columns
    required_cols = ['timestamp', 'sensor_id', 'reference_speed', 'current_speed', 'congestion_score', 'congestion_class']
    for col in required_cols:
        if col not in df.columns:
            print(f"Error: Missing required column {col}")
            sys.exit(1)

    # 3. Parse timestamp
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='%Y-%m-%d %H')

    # 4. Validate sensor IDs
    num_sensors = df['sensor_id'].nunique()
    
    # 5. Sort data by sensor_id and timestamp
    df = df.sort_values(['sensor_id', 'timestamp']).reset_index(drop=True)

    # 6-8. Generate temporal features
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)

    # 9. Generate previous_speed per sensor
    # Shift by 1 within each sensor group
    df['previous_speed'] = df.groupby('sensor_id')['current_speed'].shift(1)

    # 10. Generate rolling_average per sensor
    # 3-hour rolling window of current and past observations
    df['rolling_average'] = df.groupby('sensor_id')['current_speed'].transform(
        lambda x: x.rolling(window=3, min_periods=1).mean()
    )

    # 11-12. congestion_score and congestion_class are already preserved.

    # 13. Missing value handling
    # previous_speed will be NaN for the first observation of each sensor.
    # We choose to drop these rows since we cannot fabricate a previous speed,
    # and sklearn's Random Forest cannot handle NaNs.
    missing_prev = df['previous_speed'].isna().sum()
    df = df.dropna(subset=['previous_speed']).reset_index(drop=True)
    
    missing_rolling = df['rolling_average'].isna().sum()

    # Save output
    output_cols = [
        'timestamp', 'sensor_id', 'hour', 'day_of_week', 'is_weekend',
        'current_speed', 'previous_speed', 'rolling_average',
        'congestion_score', 'congestion_class'
    ]
    df_out = df[output_cols]
    
    print(f"Saving feature data to {output_path}...")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_out.to_csv(output_path, index=False)
    
    # Validation and Statistics
    print("\n" + "="*40)
    print("ACTUAL DATA STATISTICS")
    print("="*40)
    print(f"Input row count:           {initial_rows:,}")
    print(f"Output row count:          {len(df_out):,}")
    print(f"Number of sensors:         {num_sensors:,}")
    print(f"Timestamp range:           {df_out['timestamp'].min()} to {df_out['timestamp'].max()}")
    print(f"Rows w/ missing prev_speed (removed): {missing_prev:,}")
    print(f"Rows w/ missing rolling_avg (removed): {missing_rolling:,}")
    print("\ncurrent_speed statistics:")
    print(df_out['current_speed'].describe())
    print("\nprevious_speed statistics:")
    print(df_out['previous_speed'].describe())
    print("\nrolling_average statistics:")
    print(df_out['rolling_average'].describe())
    print("\ncongestion_score statistics:")
    print(df_out['congestion_score'].describe())
    print("\nClass distribution:")
    print(df_out['congestion_class'].value_counts())
    
    # Duplicates check
    dups = df_out.duplicated(subset=['sensor_id', 'timestamp']).sum()
    print(f"\nDuplicate records:         {dups}")

    # Spot check for first sensor
    first_sensor = df_out['sensor_id'].iloc[0]
    print(f"\nSpot check temporal features for sensor {first_sensor} (first 5 records):")
    spot_check = df_out[df_out['sensor_id'] == first_sensor].head(5)
    print(spot_check[['timestamp', 'current_speed', 'previous_speed', 'rolling_average']].to_string(index=False))

    print("\nS2-2 pipeline completed successfully.")

if __name__ == "__main__":
    main()
