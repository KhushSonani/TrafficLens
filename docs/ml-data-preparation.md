# S2-1: ML Data Preparation Pipeline

**Student 2 — ML / Data Analytics Engineer**
**Branch:** `ml-phase`
**Commit:** `feat(ml): add traffic data preparation pipeline`

---

## 1. Purpose

This document describes the S2-1 ML data preparation pipeline for the
TrafficLens project.  The pipeline reads the Student 1 Hadoop analytics
outputs from HDFS, validates every field using documented rules, cleans
the data, and writes a single clean CSV file that is the authoritative
input for all downstream Student 2 ML stages (S2-2 feature engineering
onwards).

No feature engineering, model training, evaluation, or prediction is
performed at this stage.

---

## 2. Source Data

### Primary source — S1-6 congestion_hotspots

**HDFS path:** `/trafficlens/analytics/congestion_hotspots/part-00000`

This is the primary and only source read by the S2-1 pipeline.

**Why this source was selected (and not the others independently):**

| S1 output | HDFS path | Content | Why selected / not selected |
|---|---|---|---|
| S1-4 average_speed_by_sensor | `/trafficlens/analytics/average_speed_by_sensor` | `sensor_id TAB mean_speed` — one row per sensor | **Included indirectly**: the per-sensor reference speed is already embedded in the S1-6 congestion_hotspots output as `reference_speed`. Reading it again separately would duplicate data and risk inconsistency. |
| S1-5 hourly_traffic | `/trafficlens/analytics/hourly_traffic` | `hour,sensor_id,reading_count,avg_speed` — one row per sensor per hour | **Included indirectly**: `current_speed` in S1-6 is exactly the `avg_speed` from S1-5 for that `(hour, sensor_id)`. `reading_count` is not required at the ML preparation stage. Reading S1-5 again separately would require a join with S1-6 to recover congestion fields — redundant and fragile. |
| S1-6 congestion_hotspots | `/trafficlens/analytics/congestion_hotspots` | `hour,sensor_id,reference_speed,current_speed,congestion_score,congestion_class` — one row per sensor per hour | **Primary source**: already merges all required fields from S1-4 and S1-5. Contains `congestion_score` and `congestion_class` computed by Student 1's documented methodology. Student 2 must not recompute these. |

**S1-6 is the correct single source** because it is the composited,
fully enriched output of the entire Student 1 pipeline, and because
the downstream ML stages require congestion_class as a label and
congestion_score as a feature — both of which only exist in S1-6.

---

## 3. HDFS Source Paths

```
/trafficlens/analytics/congestion_hotspots/part-00000   (primary, read)
/trafficlens/analytics/hourly_traffic                   (indirectly included via S1-6)
/trafficlens/analytics/average_speed_by_sensor          (indirectly included via S1-6)
```

The pipeline does NOT modify any HDFS path.

---

## 4. Actual Input Schema

The S1-6 reducer emits comma-separated records with a **trailing tab**
character on each line (artefact of the Hadoop Streaming reducer).  The
pipeline strips trailing whitespace before parsing.

| Field | Raw format | Description |
|---|---|---|
| `hour` | `YYYY-MM-DD HH` (string, 13 chars) | Hour bucket.  Example: `2012-03-01 00` |
| `sensor_id` | integer string | Loop-detector sensor identifier.  Example: `716328` |
| `reference_speed` | float string, 4 d.p. | Per-sensor historical mean speed (mph) from S1-4.  Example: `54.9560` |
| `current_speed` | float string, 4 d.p. | Hourly mean speed for this bucket (mph) from S1-5.  Example: `66.5810` |
| `congestion_score` | float string, 4 d.p. | `1 - (current_speed / reference_speed)`.  Can be negative. Example: `-0.2115` |
| `congestion_class` | string enum | One of `LOW`, `MEDIUM`, `HIGH`.  Computed by S1-6 thresholds. |

**Actual sample lines from HDFS (trailing tab stripped for readability):**
```
2012-03-12 01,716328,54.9560,66.5810,-0.2115,LOW
2012-04-22 12,716328,54.9560,31.9126,0.4193,MEDIUM
2012-03-26 16,716328,54.9560,0.0000,1.0000,HIGH
2012-03-12 01,771667,28.3101,36.1644,-0.2774,LOW
2012-06-05 14,771667,28.3101,7.3833,0.7392,HIGH
```

---

## 5. Data Types

| Column (output) | Python/pandas dtype | Notes |
|---|---|---|
| `timestamp` | `object` (str) | Kept as `YYYY-MM-DD HH` string for reversibility.  S2-2 parses to datetime. |
| `sensor_id` | `int64` | Non-nullable integer. |
| `reference_speed` | `float64` | Always > 0 after cleaning (S1-6 already excludes zero-reference sensors). |
| `current_speed` | `float64` | Can be 0.0 (complete gridlock); cannot be negative. |
| `congestion_score` | `float64` | Range: approximately −1.08 to 1.00 in actual data. |
| `congestion_class` | `object` (str) | Values: `LOW`, `MEDIUM`, `HIGH`. |

---

## 6. Timestamp Handling

- The `hour` field is renamed to `timestamp` in the output.
- It is preserved as a **string in `YYYY-MM-DD HH` format** (not converted
  to an integer or float).
- This format is fully reversible using `datetime.strptime(val, "%Y-%m-%d %H")`.
- S2-2 feature engineering can extract `hour_of_day`, `day_of_week`,
  `is_weekend`, and construct lag/rolling features directly from this string.
- Records with missing or unparseable timestamps are removed (0 such records found).

---

## 7. Sensor ID Handling

- `sensor_id` is preserved as-is from the S1-6 output.
- Sensors are **not merged**, renumbered, or renamed.
- Records with missing or non-integer sensor_id are removed (0 found).
- Records with sensor_id ≤ 0 are removed (0 found).
- Actual sensor_id range in output: 716328 to 774204 (207 unique sensors).

---

## 8. Speed Handling

### current_speed

- Preserved as-is from S1-6 (which sourced it from S1-5).
- **Zero-speed records are retained** (36,942 records with `current_speed == 0.0`).
  Rationale: The S1-6 documentation explicitly documents zero-speed as valid
  (complete stoppage → `congestion_score = 1.0` → `HIGH`).  Removing these
  would bias the dataset against the most congested observations.
- Negative current_speed values would be removed (0 found).
- **No imputation is performed.**  The project specification does not mandate
  imputation, and no missing current_speed values exist in the S1-6 output.
  Inventing speed values would fabricate data.

### reference_speed

- Preserved as-is from S1-6 (sourced from S1-4 `reference_speeds.tsv`).
- All 207 sensors have a positive reference speed.
- Student 2 does NOT recalculate or modify reference speeds.

---

## 9. Missing-Value Handling

| Field | Missing values found | Action | Reason |
|---|---|---|---|
| `timestamp` (hour) | 0 | N/A | No missing values present |
| `sensor_id` | 0 | N/A | No missing values present |
| `reference_speed` | 0 | N/A | No missing values present |
| `current_speed` | 0 | N/A | No missing values present |
| `congestion_score` | 0 | N/A | No missing values present |
| `congestion_class` | 0 | N/A | No missing values present |

**Rule if missing values were found:**
Records with missing values in any mandatory field would be removed and
the count would be reported.  No imputation of missing values is performed
because no justified imputation methodology exists in the project
specification, and fabricating values is prohibited.

---

## 10. Invalid-Record Handling

| Check | Invalid records found | Action |
|---|---|---|
| Unparseable timestamp format | 0 | Would remove |
| sensor_id non-integer or ≤ 0 | 0 | Would remove |
| reference_speed non-numeric or ≤ 0 | 0 | Would remove |
| current_speed non-numeric | 0 | Would remove |
| current_speed < 0 | 0 | Would remove |
| congestion_score non-numeric | 0 | Would remove |
| congestion_class not in {LOW, MEDIUM, HIGH} | 0 | Would remove |

All 591,192 input records passed all validation checks.

---

## 11. Duplicate Handling

- Duplicate definition: two records with the same `(timestamp, sensor_id)` pair.
- Detection: `pandas.DataFrame.drop_duplicates(subset=["timestamp", "sensor_id"])`.
- Action: keep first occurrence; remove subsequent.
- Duplicates found: **0**.
- This is expected: S1-6 processes one record per `(hour, sensor_id)` combination
  because the S1-5 hourly reducer emits exactly one row per unique `(hour, sensor_id)` key.

---

## 12. Output Schema

**File:** `output/ml_prepared_traffic.csv`

| Column | dtype | Description |
|---|---|---|
| `timestamp` | str | Hour bucket: `YYYY-MM-DD HH` |
| `sensor_id` | int64 | Loop-detector sensor identifier |
| `reference_speed` | float64 | Per-sensor historical mean speed (mph) from S1-4 |
| `current_speed` | float64 | Hourly mean speed for this time bucket (mph) from S1-5 |
| `congestion_score` | float64 | `1 - (current_speed / reference_speed)` from S1-6 |
| `congestion_class` | str | `LOW` / `MEDIUM` / `HIGH` from S1-6 |

**First row (CSV header):**
```
timestamp,sensor_id,reference_speed,current_speed,congestion_score,congestion_class
```

---

## 13. Output Location

```
output/ml_prepared_traffic.csv
```

Relative to the TrafficLens project root (`C:\Users\yash\TrafficLens`).

---

## 14. How to Reproduce

### Prerequisites
- Docker must be running with all six Hadoop containers healthy:
  `namenode`, `datanode1`, `datanode2`, `resourcemanager`, `nodemanager1`, `nodemanager2`
- Student 1 S1-6 must have been executed successfully:
  `/trafficlens/analytics/congestion_hotspots/part-00000` must exist in HDFS.
- Python 3.8+ with `pandas >= 2.0.0` and `numpy >= 1.24.0` installed.

### Install dependencies
```bash
pip install -r src/analytics/requirements.txt
```

### Run the pipeline
```bash
python src/analytics/prepare_ml_data.py
```

The script:
1. Fetches `/trafficlens/analytics/congestion_hotspots/part-00000` via `docker exec namenode hdfs dfs -cat`
2. Strips trailing whitespace from each line (handles the S1-6 trailing tab)
3. Parses 6 columns: `hour, sensor_id, reference_speed, current_speed, congestion_score, congestion_class`
4. Validates and type-converts each field with documented rules
5. Detects and removes duplicates (none found)
6. Writes `output/ml_prepared_traffic.csv`
7. Prints a full data quality report to stdout

The pipeline is **deterministic**: given the same HDFS input, it always
produces the same output.

---

## 15. Actual Execution Results

Executed on: 2026-10-06 at 15:52 (IST)

| Metric | Value |
|---|---|
| Input records from HDFS | 591,192 |
| Records removed — missing hour | 0 |
| Records removed — invalid hour format | 0 |
| Records removed — missing sensor_id | 0 |
| Records removed — invalid sensor_id | 0 |
| Records removed — missing reference_speed | 0 |
| Records removed — invalid reference_speed | 0 |
| Records removed — missing current_speed | 0 |
| Records removed — invalid current_speed | 0 |
| Records removed — missing congestion_score | 0 |
| Records removed — invalid congestion_score | 0 |
| Records removed — missing congestion_class | 0 |
| Records removed — invalid congestion_class | 0 |
| Records removed — duplicates | 0 |
| **Total records removed** | **0** |
| **Output records** | **591,192** |
| Unique sensors | 207 |
| Timestamp range | 2012-03-01 00 → 2012-06-27 23 |
| Output file size (bytes) | 29,107,657 |

### Congestion class distribution

| Class | Count | Percentage |
|---|---|---|
| LOW | 502,482 | 84.99% |
| MEDIUM | 34,468 | 5.83% |
| HIGH | 54,242 | 9.18% |

### current_speed statistics (mph)

| Stat | Value |
|---|---|
| min | 0.0000 |
| max | 70.0000 |
| mean | 53.7190 |
| median | 61.8677 |
| std | 19.0642 |
| zero-speed records | 36,942 |

### congestion_score statistics

| Stat | Value |
|---|---|
| min | -1.0803 |
| max | 1.0000 |
| mean | -0.0000 |
| median | -0.1140 |
| std | 0.3453 |

### Schema verification

| Column | dtype | Null count |
|---|---|---|
| timestamp | object | 0 |
| sensor_id | int64 | 0 |
| reference_speed | float64 | 0 |
| current_speed | float64 | 0 |
| congestion_score | float64 | 0 |
| congestion_class | object | 0 |

### sensor_id range

| Stat | Value |
|---|---|
| Minimum sensor_id | 716,328 |
| Maximum sensor_id | 774,204 |
| Unique sensors | 207 |

---

## 16. Limitations and Assumptions

1. **Trailing tab**: The S1-6 Hadoop Streaming reducer appends a trailing
   tab character to each output line. The pipeline strips it during parsing.
   This is a known artefact documented in the S1-6 reducer comments.

2. **Negative congestion_score**: Values below 0 occur when traffic flows
   faster than the historical mean (free-flow, off-peak). These are valid
   and retained as documented by Student 1 in `docs/congestion-hotspot-mapreduce.md`.

3. **Zero current_speed**: 36,942 records have `current_speed == 0.0`.
   These represent complete traffic stoppage and are valid. They yield
   `congestion_score = 1.0` and `congestion_class = HIGH` per S1-6 logic.

4. **timestamp column ordering**: The output CSV preserves the order in
   which S1-6 emitted records (sensor-grouped, not chronological).
   S2-2 feature engineering will sort by `(sensor_id, timestamp)` as needed.

5. **No imputation**: No missing values were found, so no imputation was
   needed. If missing values existed in future re-runs, the documented
   removal rule would apply (not imputation), unless a future project
   specification defines an imputation methodology.

6. **S1-6 is the single authoritative source**: Student 2 does not join
   S1-4 or S1-5 outputs independently. All required fields are present in S1-6.

---

## 17. Files Created by S2-1

| File | Description |
|---|---|
| `src/analytics/prepare_ml_data.py` | Main data preparation pipeline script |
| `src/analytics/requirements.txt` | Python dependencies for the ML phase |
| `src/analytics/validate_output.py` | Post-execution validation helper (dev tool) |
| `output/ml_prepared_traffic.csv` | Clean ML-ready dataset (gitignored — large file) |
| `docs/ml-data-preparation.md` | This documentation file |

---

## 18. Downstream Compatibility (S2-2 onwards)

The output CSV is designed to feed directly into S2-2 feature engineering:

- `timestamp` → parse to datetime → extract `hour_of_day`, `day_of_week`, `is_weekend`
- `sensor_id` → group-by key for lag/rolling features; spatial identifier
- `current_speed` → primary regression target proxy; input to lag features
- `reference_speed` → normalisation baseline for speed ratio features
- `congestion_score` → potential regression target or feature
- `congestion_class` → classification target (LOW / MEDIUM / HIGH)
