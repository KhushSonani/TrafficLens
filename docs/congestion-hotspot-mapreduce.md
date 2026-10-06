# Congestion Hotspot Analytics (MapReduce)

## 1. Purpose
This job implements congestion hotspot analytics over the METR-LA traffic dataset using Hadoop Streaming MapReduce. For every `(hour, sensor_id)` combination, it calculates a congestion score and classifies the traffic state as LOW, MEDIUM, or HIGH using a per-sensor data-derived reference speed.

## 2. Actual Dataset / Input
- **Raw HDF5 dataset (untouched)**: `/trafficlens/raw/metr-la.h5`
- **Hourly aggregation (S1-5 output, used as input)**: `/trafficlens/analytics/hourly_traffic`
- **Per-sensor reference speeds (S1-4 output, distributed as side-input)**: `/trafficlens/analytics/average_speed_by_sensor/part-00000`

### Why hourly_traffic is used as input (not metr-la-flat.csv directly)
The congestion score requires a "current speed" that represents a meaningful time window, not an instantaneous 5-minute reading. The S1-5 hourly aggregation already provides `(hour, sensor_id, reading_count, avg_speed)` — the hourly mean speed is a well-defined and robust current speed measure. Using it avoids duplicating aggregation logic and makes the pipeline composable.

## 3. HDFS Input Path
`/trafficlens/analytics/hourly_traffic`

## 4. Reference-Speed Methodology
The reference speed is the **per-sensor historical mean speed**, calculated by S1-4 across the entire METR-LA dataset (34,272 timestamps × 207 sensors = 7,094,304 records).

The reference speeds are stored in: `src/processing/mapreduce/reference_speeds.tsv`
This file was extracted directly from `/trafficlens/analytics/average_speed_by_sensor/part-00000`.

Format: `sensor_id<TAB>mean_speed_mph`

Example values (actual data):
```
716328  54.956
716331  46.4814
716939  42.7141
771667  28.3101
```

## 5. Why This Methodology Is Non-Arbitrary
- It is **per-sensor** — a freeway sensor running at 65 mph is not penalized against an arterial sensor capped at 35 mph.
- It is **computed from actual METR-LA data** — no constant was chosen by the implementer.
- It is **reproducible** — re-running S1-4 on the same dataset always yields the same reference speeds.
- It is **deterministic** — given the same input, the same output is always produced.
- It is **documented** and traceable to the S1-4 MapReduce job output.

## 6. Congestion Score Formula
```
congestion_score = 1 - (current_speed / reference_speed)
```
Where:
- `current_speed` = hourly average speed for that sensor (from S1-5)
- `reference_speed` = per-sensor historical mean speed (from S1-4)

### Note on Negative Scores
When traffic flows **faster than the historical average** (common at night or off-peak hours), `current_speed > reference_speed` → `congestion_score < 0`. This is correct and expected. A negative score means the road is less congested than baseline. It is classified as `LOW` per the threshold rules.

## 7. Congestion Thresholds
| Score Range     | Classification |
|----------------|---------------|
| score < 0.3    | LOW           |
| 0.3 ≤ score < 0.6 | MEDIUM     |
| score ≥ 0.6    | HIGH          |

## 8. Mapper Logic (`congestion_hotspot_mapper.sh`)
Reads S1-5 hourly_traffic records (comma-separated with trailing tab).

```bash
awk -F',' 'NF>=4 {
    gsub(/[[:space:]]/, "", $4)
    if ($4 != "" && $4+0 == $4) {
        print $2 "\t" $1 "," $4
    }
}'
```
- Validates field count and that avg_speed is numeric
- **Emits**: `sensor_id<TAB>hour,avg_speed`
- Keying by `sensor_id` ensures all records for a sensor arrive at the same reducer, enabling the per-sensor reference lookup

## 9. Reducer Logic (`congestion_hotspot_reducer.sh`)
Loads `reference_speeds.tsv` (distributed via `-files`) into an in-memory awk array at startup. For each input record:

1. Parses `sensor_id`, `hour`, `avg_speed` from the tab-separated input
2. Looks up the reference speed for that sensor
3. Calculates `score = 1 - (avg_speed / ref_speed)`
4. Classifies as `LOW`, `MEDIUM`, or `HIGH`
5. Outputs a fully enriched record

**Emits**: `hour,sensor_id,reference_speed,current_speed,congestion_score,congestion_class`

## 10. Output Schema
```
hour,sensor_id,reference_speed,current_speed,congestion_score,congestion_class
```
- **hour**: `YYYY-MM-DD HH` — the time bucket
- **sensor_id**: integer sensor identifier  
- **reference_speed**: per-sensor historical mean speed (mph, 4 decimal places)
- **current_speed**: hourly mean speed for that time bucket (mph, 4 decimal places)
- **congestion_score**: `1 - (current_speed / reference_speed)` (4 decimal places)
- **congestion_class**: `LOW`, `MEDIUM`, or `HIGH`

## 11. Hadoop Streaming Command
```bash
docker exec resourcemanager hadoop jar \
  /opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar \
  -files /tmp/congestion_hotspot_mapper.sh,/tmp/congestion_hotspot_reducer.sh,/tmp/reference_speeds.tsv \
  -mapper "/tmp/congestion_hotspot_mapper.sh" \
  -reducer "/tmp/congestion_hotspot_reducer.sh" \
  -input /trafficlens/analytics/hourly_traffic \
  -output /trafficlens/analytics/congestion_hotspots
```
The `reference_speeds.tsv` file is distributed to all task containers via `-files` and loaded as a local lookup table in the reducer.

## 12. HDFS Output Path
`/trafficlens/analytics/congestion_hotspots`

## 13. Actual Execution Result
- **Job**: `job_local1091663491_0001` — **completed successfully** (`map 100% reduce 100%`)
- **Map input records**: 591,192
- **Map output records**: 591,192
- **Reduce input groups**: 207 (one group per sensor — all hours for a sensor arrive together)
- **Reduce output records**: 591,192
- **HDFS bytes written**: 29,533,285 bytes (~28.2 MB, replicated to 56.3 MB across 2 DataNodes)
- **Failed Shuffles**: 0 | **Corrupt blocks**: 0 | **Missing blocks**: 0

## 14. Actual Validation

### HDFS output listing
```
Found 2 items
-rw-r--r--  2 root supergroup   0      2026-10-06 09:52  /trafficlens/analytics/congestion_hotspots/_SUCCESS
-rw-r--r--  2 root supergroup  28.2 M  2026-10-06 09:52  /trafficlens/analytics/congestion_hotspots/part-00000
```

### Output size
```
0       0       /trafficlens/analytics/congestion_hotspots/_SUCCESS
28.2 M  56.3 M  /trafficlens/analytics/congestion_hotspots/part-00000
```

### Output sample (actual first 30 lines)
```
2012-03-12 01,716328,54.9560,66.5810,-0.2115,LOW
2012-04-22 12,716328,54.9560,31.9126,0.4193,MEDIUM
2012-03-24 05,716328,54.9560,65.0579,-0.1838,LOW
2012-03-26 16,716328,54.9560,0.0000,1.0000,HIGH
2012-05-02 18,716328,54.9560,65.8183,-0.1977,LOW
2012-06-25 03,716328,54.9560,64.6910,-0.1771,LOW
2012-05-15 19,716328,54.9560,60.5926,-0.1026,LOW
2012-05-15 18,716328,54.9560,50.1804,0.0869,LOW
2012-04-22 13,716328,54.9560,49.6389,0.0968,LOW
2012-05-15 17,716328,54.9560,37.8237,0.3117,MEDIUM
```

## 15. Limitations and Assumptions
- **Negative scores**: Scores below 0 occur when traffic flows faster than the historical mean. This is valid (free-flow conditions at off-peak hours). Classified as `LOW`.
- **Zero-speed records**: Sensor readings of 0.0 mph yield `congestion_score = 1.0` → classified `HIGH`. This is correct behaviour (complete stoppage). These events were present in the actual METR-LA data.
- **Reference speed derived from full dataset**: The mean includes all time periods (congested and free-flow), so it represents the typical operating speed of each sensor location. It is not the free-flow speed cap.
- **Per-sensor reference**: Sensors with inherently lower speed limits (arterial roads like sensor 771667 at 28.3 mph) are compared fairly against their own baselines, not against a uniform freeway threshold.

## 16. Downstream Compatibility
The output schema (`hour,sensor_id,reference_speed,current_speed,congestion_score,congestion_class`) is designed to be directly consumable by Student 2 and Student 3 components.
- Student 2 (ML/feature engineering) can use `congestion_score` as a feature and `congestion_class` as a label.
- Student 3 (visualization/API) can use `hour`, `sensor_id`, and `congestion_class` to render hotspot maps.
