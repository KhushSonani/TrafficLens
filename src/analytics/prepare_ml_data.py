#!/usr/bin/env python3
"""
TrafficLens — S2-1: ML Data Preparation Pipeline
Student 2 (ML / Data Analytics Engineer)

Purpose:
    Reads the Student 1 (S1-6) congestion_hotspots HDFS output, which is the
    authoritative merged source containing:
      - per-sensor, per-hour timestamps          (from S1-5 hourly_traffic)
      - current hourly average speed             (from S1-5)
      - per-sensor reference (historical) speed  (from S1-4)
      - congestion_score and congestion_class    (computed by S1-6)

    Materialises the data locally via docker exec, validates it, cleans it,
    and writes a clean CSV ready for S2-2 feature engineering.

Source HDFS path:
    /trafficlens/analytics/congestion_hotspots/part-00000

Output:
    output/ml_prepared_traffic.csv

Usage:
    python src/analytics/prepare_ml_data.py

    The script is self-contained and requires no arguments.
    Docker must be running with the Hadoop cluster healthy (namenode container).

Dependencies:
    pandas >= 2.0.0
    numpy  >= 1.24.0
    (scikit-learn not required at this stage; reserved for S2-2 onwards)
"""

import subprocess
import sys
import io
import os
import logging
from datetime import datetime

import pandas as pd
import numpy as np

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

HDFS_SOURCE_PATH = "/trafficlens/analytics/congestion_hotspots/part-00000"
NAMENODE_CONTAINER = "namenode"
OUTPUT_DIR = "output"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "ml_prepared_traffic.csv")

# Expected column names after parsing the congestion_hotspots output.
# S1-6 reducer emits (comma-separated, possibly with a trailing tab):
#   hour,sensor_id,reference_speed,current_speed,congestion_score,congestion_class
RAW_COLUMNS = [
    "hour",
    "sensor_id",
    "reference_speed",
    "current_speed",
    "congestion_score",
    "congestion_class",
]

# Final output columns preserved for S2-2 feature engineering.
# All source fields are retained because every one has documented downstream use.
OUTPUT_COLUMNS = [
    "timestamp",           # renamed from 'hour'; format: YYYY-MM-DD HH (string kept parseable)
    "sensor_id",           # integer sensor identifier; must not be merged/renumbered
    "reference_speed",     # per-sensor historical mean speed (mph) — from S1-4
    "current_speed",       # hourly mean speed for this time bucket (mph) — from S1-5
    "congestion_score",    # 1 - (current_speed / reference_speed) — from S1-6
    "congestion_class",    # LOW / MEDIUM / HIGH — from S1-6
]

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Step 1 — Materialise HDFS output locally
# ---------------------------------------------------------------------------

def fetch_hdfs_data(container: str, hdfs_path: str) -> pd.DataFrame:
    """
    Stream the HDFS file from the namenode container via docker exec.
    Returns a raw DataFrame with RAW_COLUMNS.

    No data is altered here; this is a pure read step.
    """
    log.info("Fetching HDFS data from %s:%s", container, hdfs_path)
    cmd = ["docker", "exec", container, "hdfs", "dfs", "-cat", hdfs_path]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError:
        log.error("'docker' command not found. Ensure Docker is installed and on PATH.")
        sys.exit(1)

    if result.returncode != 0:
        # hdfs dfs -cat emits SASL INFO lines on stderr; check stdout for real errors.
        log.error("docker exec failed (returncode=%d). stderr:\n%s", result.returncode, result.stderr)
        sys.exit(1)

    stdout = result.stdout
    if not stdout.strip():
        log.error("HDFS returned empty output for path: %s", hdfs_path)
        sys.exit(1)

    log.info("HDFS fetch complete. Parsing CSV content.")

    # The S1-6 reducer emits lines with a trailing tab character after the last field.
    # We strip trailing whitespace from each line before parsing.
    cleaned_lines = "\n".join(line.rstrip() for line in stdout.splitlines())

    df = pd.read_csv(
        io.StringIO(cleaned_lines),
        header=None,
        names=RAW_COLUMNS,
        dtype=str,            # read everything as string first; typed conversion follows
        skipinitialspace=True,
    )

    log.info("Raw records fetched: %d", len(df))
    return df


# ---------------------------------------------------------------------------
# Step 2 — Schema validation and type conversion
# ---------------------------------------------------------------------------

def validate_and_convert(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Validates column presence and converts each field to its expected type.

    Cleaning decisions are documented inline and accumulated in `report`.
    Records that cannot be parsed into valid types are moved to a reject log;
    they are NOT silently dropped — the count is always reported.

    Returns (clean_df, report_dict).
    """
    report = {
        "input_records": len(df),
        "removed_missing_hour": 0,
        "removed_invalid_hour_format": 0,
        "removed_missing_sensor_id": 0,
        "removed_invalid_sensor_id": 0,
        "removed_missing_reference_speed": 0,
        "removed_invalid_reference_speed": 0,
        "removed_missing_current_speed": 0,
        "removed_invalid_current_speed": 0,
        "removed_missing_congestion_score": 0,
        "removed_invalid_congestion_score": 0,
        "removed_missing_congestion_class": 0,
        "removed_invalid_congestion_class": 0,
        "removed_duplicates": 0,
    }

    # -- Column presence -------------------------------------------------------
    missing_cols = [c for c in RAW_COLUMNS if c not in df.columns]
    if missing_cols:
        log.error("Required columns missing from source data: %s", missing_cols)
        sys.exit(1)
    log.info("All required columns present: %s", RAW_COLUMNS)

    # -- Strip whitespace from all string fields -------------------------------
    for col in df.columns:
        df[col] = df[col].str.strip()

    # ==========================================================================
    # FIELD: hour (→ renamed 'timestamp')
    # Expected format: YYYY-MM-DD HH  (14-character string, space-separated)
    # Rule: records with empty or unparseable hour are removed.
    # Reason: timestamp is mandatory for all downstream feature engineering
    #         (hour-of-day, day-of-week, lag features, temporal ordering).
    # ==========================================================================

    # Missing hour
    mask_missing_hour = df["hour"].isna() | (df["hour"] == "")
    n_missing_hour = int(mask_missing_hour.sum())
    report["removed_missing_hour"] = n_missing_hour
    if n_missing_hour > 0:
        log.warning("Removed %d records with missing hour.", n_missing_hour)
        df = df[~mask_missing_hour].copy()

    # Validate format YYYY-MM-DD HH using pandas to_datetime
    def _parse_hour(val):
        try:
            dt = datetime.strptime(val, "%Y-%m-%d %H")
            return pd.Timestamp(dt)
        except (ValueError, TypeError):
            return pd.NaT

    parsed_ts = df["hour"].apply(_parse_hour)
    mask_bad_hour = parsed_ts.isna()
    n_bad_hour = int(mask_bad_hour.sum())
    report["removed_invalid_hour_format"] = n_bad_hour
    if n_bad_hour > 0:
        log.warning("Removed %d records with unparseable hour format.", n_bad_hour)
        df = df[~mask_bad_hour].copy()
        parsed_ts = parsed_ts[~mask_bad_hour]

    # Rename 'hour' → 'timestamp' (keep as string in YYYY-MM-DD HH format for readability
    # and full reversibility; downstream S2-2 can re-parse to datetime as needed)
    df = df.rename(columns={"hour": "timestamp"})

    # ==========================================================================
    # FIELD: sensor_id
    # Expected: non-empty integer string (e.g., "716328")
    # Rule: records with missing or non-integer sensor_id are removed.
    # Reason: sensor_id is the observation identifier; merging different sensors
    #         or renaming them would corrupt the spatial meaning of each record.
    # ==========================================================================

    mask_missing_sid = df["sensor_id"].isna() | (df["sensor_id"] == "")
    n_missing_sid = int(mask_missing_sid.sum())
    report["removed_missing_sensor_id"] = n_missing_sid
    if n_missing_sid > 0:
        log.warning("Removed %d records with missing sensor_id.", n_missing_sid)
        df = df[~mask_missing_sid].copy()

    def _to_int(val):
        try:
            v = int(val)
            return v if v > 0 else np.nan
        except (ValueError, TypeError):
            return np.nan

    df["sensor_id"] = df["sensor_id"].apply(_to_int)
    mask_bad_sid = df["sensor_id"].isna()
    n_bad_sid = int(mask_bad_sid.sum())
    report["removed_invalid_sensor_id"] = n_bad_sid
    if n_bad_sid > 0:
        log.warning("Removed %d records with non-integer or non-positive sensor_id.", n_bad_sid)
        df = df[~mask_bad_sid].copy()

    df["sensor_id"] = df["sensor_id"].astype(int)

    # ==========================================================================
    # FIELD: reference_speed
    # Expected: non-empty positive float (mph); sourced from S1-4 historical mean.
    # Rule: records with missing or non-numeric reference_speed are removed.
    # Reason: reference_speed was used to compute congestion_score by S1-6.
    #         A missing reference_speed means congestion_score is also untrustworthy
    #         for that record. The S1-6 reducer already skips sensors without a
    #         reference speed, so any remaining invalids are true data corruption.
    # ==========================================================================

    mask_missing_ref = df["reference_speed"].isna() | (df["reference_speed"] == "")
    n_missing_ref = int(mask_missing_ref.sum())
    report["removed_missing_reference_speed"] = n_missing_ref
    if n_missing_ref > 0:
        log.warning("Removed %d records with missing reference_speed.", n_missing_ref)
        df = df[~mask_missing_ref].copy()

    df["reference_speed"] = pd.to_numeric(df["reference_speed"], errors="coerce")
    mask_bad_ref = df["reference_speed"].isna() | (df["reference_speed"] <= 0)
    n_bad_ref = int(mask_bad_ref.sum())
    report["removed_invalid_reference_speed"] = n_bad_ref
    if n_bad_ref > 0:
        log.warning("Removed %d records with non-numeric or zero/negative reference_speed.", n_bad_ref)
        df = df[~mask_bad_ref].copy()

    # ==========================================================================
    # FIELD: current_speed
    # Expected: non-empty float >= 0 (mph); sourced from S1-5 hourly aggregation.
    # Rule: records with missing or non-numeric current_speed are removed.
    #       Records with current_speed == 0.0 are RETAINED (not treated as invalid).
    # Reason for retaining zero-speed: The S1-6 documentation explicitly states
    #   "Sensor readings of 0.0 mph yield congestion_score = 1.0 → classified HIGH.
    #    This is correct behaviour (complete stoppage)."
    #   Zero-speed records represent real traffic events (gridlock). Removing them
    #   would bias the ML dataset by eliminating the highest-congestion observations.
    # Reason for no imputation: No project specification mandates imputation of
    #   missing speed values. Imputing with an arbitrary constant would fabricate
    #   data. Records where speed cannot be determined are instead removed.
    # ==========================================================================

    mask_missing_cs = df["current_speed"].isna() | (df["current_speed"] == "")
    n_missing_cs = int(mask_missing_cs.sum())
    report["removed_missing_current_speed"] = n_missing_cs
    if n_missing_cs > 0:
        log.warning("Removed %d records with missing current_speed.", n_missing_cs)
        df = df[~mask_missing_cs].copy()

    df["current_speed"] = pd.to_numeric(df["current_speed"], errors="coerce")
    # Only remove truly non-numeric (NaN); negative floats are also invalid
    mask_bad_cs = df["current_speed"].isna() | (df["current_speed"] < 0)
    n_bad_cs = int(mask_bad_cs.sum())
    report["removed_invalid_current_speed"] = n_bad_cs
    if n_bad_cs > 0:
        log.warning("Removed %d records with non-numeric or negative current_speed.", n_bad_cs)
        df = df[~mask_bad_cs].copy()

    # ==========================================================================
    # FIELD: congestion_score
    # Expected: float (can be negative — see S1-6 docs re. free-flow conditions).
    # Rule: missing or non-numeric values are removed.
    # Reason: congestion_score is a derived S1-6 field used as a potential ML
    #         feature (S2-2) and as the regression target proxy.
    #         Student 2 must NOT recalculate it; only validate and preserve it.
    # ==========================================================================

    mask_missing_score = df["congestion_score"].isna() | (df["congestion_score"] == "")
    n_missing_score = int(mask_missing_score.sum())
    report["removed_missing_congestion_score"] = n_missing_score
    if n_missing_score > 0:
        log.warning("Removed %d records with missing congestion_score.", n_missing_score)
        df = df[~mask_missing_score].copy()

    df["congestion_score"] = pd.to_numeric(df["congestion_score"], errors="coerce")
    mask_bad_score = df["congestion_score"].isna()
    n_bad_score = int(mask_bad_score.sum())
    report["removed_invalid_congestion_score"] = n_bad_score
    if n_bad_score > 0:
        log.warning("Removed %d records with non-numeric congestion_score.", n_bad_score)
        df = df[~mask_bad_score].copy()

    # ==========================================================================
    # FIELD: congestion_class
    # Expected: one of {"LOW", "MEDIUM", "HIGH"} (string).
    # Rule: missing or out-of-vocabulary values are removed.
    # Reason: congestion_class is the categorical label produced by S1-6 and
    #         will be used as the classification target in later ML stages.
    #         Student 2 must not re-derive or modify this classification.
    # ==========================================================================

    valid_classes = {"LOW", "MEDIUM", "HIGH"}

    mask_missing_class = df["congestion_class"].isna() | (df["congestion_class"] == "")
    n_missing_class = int(mask_missing_class.sum())
    report["removed_missing_congestion_class"] = n_missing_class
    if n_missing_class > 0:
        log.warning("Removed %d records with missing congestion_class.", n_missing_class)
        df = df[~mask_missing_class].copy()

    mask_bad_class = ~df["congestion_class"].isin(valid_classes)
    n_bad_class = int(mask_bad_class.sum())
    report["removed_invalid_congestion_class"] = n_bad_class
    if n_bad_class > 0:
        log.warning(
            "Removed %d records with invalid congestion_class (not in %s).", n_bad_class, valid_classes
        )
        df = df[~mask_bad_class].copy()

    # ==========================================================================
    # DUPLICATE DETECTION
    # Definition: a record is a duplicate if (timestamp, sensor_id) is identical
    #             to another record. Each (hour, sensor) pair is unique in the
    #             S1-6 output (one row per sensor per hour), so duplicates would
    #             indicate a pipeline or HDFS replication artefact.
    # Rule: keep the first occurrence; remove subsequent duplicates.
    # Reason: retaining duplicates would double-count congestion events for that
    #         (sensor, hour), distorting any temporal or aggregate feature.
    # ==========================================================================

    n_before_dedup = len(df)
    df = df.drop_duplicates(subset=["timestamp", "sensor_id"], keep="first")
    n_removed_dup = n_before_dedup - len(df)
    report["removed_duplicates"] = n_removed_dup
    if n_removed_dup > 0:
        log.warning("Removed %d duplicate (timestamp, sensor_id) records.", n_removed_dup)
    else:
        log.info("No duplicate (timestamp, sensor_id) records found.")

    return df[OUTPUT_COLUMNS], report


# ---------------------------------------------------------------------------
# Step 3 — Write output
# ---------------------------------------------------------------------------

def write_output(df: pd.DataFrame, path: str) -> None:
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    df.to_csv(path, index=False)
    size_bytes = os.path.getsize(path)
    log.info("Output written: %s  (%d bytes)", path, size_bytes)


# ---------------------------------------------------------------------------
# Step 4 — Data quality report
# ---------------------------------------------------------------------------

def print_report(df: pd.DataFrame, report: dict) -> None:
    total_removed = sum(
        v for k, v in report.items() if k.startswith("removed_")
    )
    unique_sensors = df["sensor_id"].nunique()
    ts_min = df["timestamp"].min()
    ts_max = df["timestamp"].max()
    class_dist = df["congestion_class"].value_counts().to_dict()

    print("\n" + "=" * 65)
    print("  TrafficLens S2-1 - ML Data Preparation Report")
    print("=" * 65)
    print(f"  Input records (from HDFS):            {report['input_records']:>10,}")
    print(f"  Records removed - missing hour:       {report['removed_missing_hour']:>10,}")
    print(f"  Records removed - invalid hour fmt:   {report['removed_invalid_hour_format']:>10,}")
    print(f"  Records removed - missing sensor_id:  {report['removed_missing_sensor_id']:>10,}")
    print(f"  Records removed - invalid sensor_id:  {report['removed_invalid_sensor_id']:>10,}")
    print(f"  Records removed - missing ref_speed:  {report['removed_missing_reference_speed']:>10,}")
    print(f"  Records removed - invalid ref_speed:  {report['removed_invalid_reference_speed']:>10,}")
    print(f"  Records removed - missing cur_speed:  {report['removed_missing_current_speed']:>10,}")
    print(f"  Records removed - invalid cur_speed:  {report['removed_invalid_current_speed']:>10,}")
    print(f"  Records removed - missing cong_score: {report['removed_missing_congestion_score']:>10,}")
    print(f"  Records removed - invalid cong_score: {report['removed_invalid_congestion_score']:>10,}")
    print(f"  Records removed - missing cong_class: {report['removed_missing_congestion_class']:>10,}")
    print(f"  Records removed - invalid cong_class: {report['removed_invalid_congestion_class']:>10,}")
    print(f"  Records removed - duplicates:         {report['removed_duplicates']:>10,}")
    print(f"  Total records removed:                {total_removed:>10,}")
    print("-" * 65)
    print(f"  Output records (clean):               {len(df):>10,}")
    print(f"  Unique sensors:                       {unique_sensors:>10,}")
    print(f"  Timestamp range:                      {ts_min}  ->  {ts_max}")
    print(f"  Congestion class distribution:")
    for cls in ["LOW", "MEDIUM", "HIGH"]:
        count = class_dist.get(cls, 0)
        pct = 100.0 * count / len(df) if len(df) > 0 else 0
        print(f"    {cls:<8}: {count:>10,}  ({pct:.2f}%)")
    print(f"  Output file:                          {OUTPUT_FILE}")
    print("=" * 65 + "\n")

    # Speed statistics
    print("  current_speed statistics (mph):")
    print(f"    min:    {df['current_speed'].min():.4f}")
    print(f"    max:    {df['current_speed'].max():.4f}")
    print(f"    mean:   {df['current_speed'].mean():.4f}")
    print(f"    median: {df['current_speed'].median():.4f}")
    print(f"    std:    {df['current_speed'].std():.4f}")
    print(f"    zero-speed records: {int((df['current_speed'] == 0.0).sum())}")
    print()
    print("  congestion_score statistics:")
    print(f"    min:    {df['congestion_score'].min():.4f}")
    print(f"    max:    {df['congestion_score'].max():.4f}")
    print(f"    mean:   {df['congestion_score'].mean():.4f}")
    print(f"    median: {df['congestion_score'].median():.4f}")
    print(f"    std:    {df['congestion_score'].std():.4f}")
    print()
    print("  Output schema:")
    print(f"    {OUTPUT_COLUMNS}")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Ensure UTF-8 output on Windows consoles (avoids cp1252 UnicodeEncodeError)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    log.info("=" * 60)
    log.info("TrafficLens S2-1 - ML Data Preparation Pipeline")
    log.info("=" * 60)
    log.info("Source HDFS path: %s", HDFS_SOURCE_PATH)
    log.info("Output path:      %s", OUTPUT_FILE)

    # Step 1: fetch from HDFS
    raw_df = fetch_hdfs_data(NAMENODE_CONTAINER, HDFS_SOURCE_PATH)

    # Step 2: validate, clean, convert
    clean_df, report = validate_and_convert(raw_df)

    # Step 3: write output
    write_output(clean_df, OUTPUT_FILE)

    # Step 4: report
    print_report(clean_df, report)

    # Step 5: quick schema verification
    log.info("Schema verification:")
    for col in OUTPUT_COLUMNS:
        log.info("  %-20s  dtype=%s  nulls=%d", col, clean_df[col].dtype, int(clean_df[col].isna().sum()))

    # Step 6: spot-check first 5 rows
    log.info("First 5 output records:")
    log.info("\n%s", clean_df.head(5).to_string(index=False))

    log.info("S2-1 pipeline completed successfully.")


if __name__ == "__main__":
    main()
