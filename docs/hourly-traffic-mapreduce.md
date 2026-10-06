# Hourly Traffic Aggregation (MapReduce)

## 1. Purpose
This job aggregates METR-LA traffic readings by hour-and-sensor using Hadoop Streaming MapReduce. For every unique `(hour, sensor_id)` combination in the dataset, it calculates the reading count and average speed during that hour.

## 2. Actual Input Dataset
The original raw dataset (`/trafficlens/raw/metr-la.h5`) is a binary HDF5 file. As established in S1-4, Hadoop Streaming requires line-oriented text input. The preprocessed flat CSV generated during S1-4 is reused directly — no additional conversion was needed.

- **Local origin**: `dataset/metr-la.h5` (57,038,056 bytes, untouched)
- **HDFS input path**: `/trafficlens/clean/metr-la-flat.csv`

## 3. Input Schema
```
timestamp,sensor_id,speed
2012-03-01 00:00:00,716328,64.375
...
```
- **timestamp**: ISO-style datetime with space separator (`YYYY-MM-DD HH:MM:SS`)
- **sensor_id**: integer sensor identifier (207 unique sensors)
- **speed**: floating-point traffic speed value (mph)
- **Total records**: 7,094,304 (34,272 timestamps × 207 sensors)

## 4. Hour-Extraction Methodology
The mapper uses `substr($1, 1, 13)` on the comma-separated timestamp field. This extracts characters 1–13 of a `YYYY-MM-DD HH:MM:SS` timestamp, yielding `YYYY-MM-DD HH` — the exact hour bucket.

Example: `2012-03-01 14:35:00` → `2012-03-01 14`

The full compound key emitted is: `YYYY-MM-DD HH,sensor_id`

## 5. Mapper Logic (`hourly_traffic_mapper.sh`)
Written in `awk` (available in all Docker containers without Python).

```bash
awk -F',' '$1 != "timestamp" && NF==3 && $3 != "" {
    hour = substr($1, 1, 13)
    print hour "," $2 "\t" $3
}'
```
- Skips the header row (`timestamp`)
- Validates exactly 3 comma-separated fields and non-empty speed
- Extracts the hour prefix from the timestamp
- **Emits**: `YYYY-MM-DD HH,sensor_id \t speed`

## 6. Reducer Logic (`hourly_traffic_reducer.sh`)
Written in `awk`, reading tab-separated `key \t speed` pairs. Hadoop guarantees sorted input, so consecutive identical keys are contiguous.

```bash
awk -F'\t' '
{
    key = $1; speed = $2
    if (key != prev_key && prev_key != "") {
        print prev_key "," count "," (sum / count)
        sum = 0; count = 0
    }
    prev_key = key; sum += speed; count++
}
END {
    if (prev_key != "") print prev_key "," count "," (sum / count)
}'
```
- Accumulates `sum` and `count` per key block
- **Emits**: `YYYY-MM-DD HH,sensor_id,reading_count,average_speed`

## 7. Output Schema
```
hour,sensor_id,reading_count,average_speed
2012-03-01 00,716328,12,53.8345
```
- **hour**: `YYYY-MM-DD HH` (e.g. `2012-03-01 00` = midnight on March 1, 2012)
- **sensor_id**: integer sensor identifier
- **reading_count**: number of 5-minute readings in that hour (typically 12 per full hour)
- **average_speed**: mean speed across all readings in the hour

## 8. Hadoop Streaming Command
```bash
docker exec resourcemanager hadoop jar \
  /opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar \
  -files /tmp/hourly_traffic_mapper.sh,/tmp/hourly_traffic_reducer.sh \
  -mapper "/tmp/hourly_traffic_mapper.sh" \
  -reducer "/tmp/hourly_traffic_reducer.sh" \
  -input /trafficlens/clean/metr-la-flat.csv \
  -output /trafficlens/analytics/hourly_traffic
```

## 9. HDFS Output Location
`/trafficlens/analytics/hourly_traffic`

## 10. Actual Execution Result
- **Job**: `job_local619055549_0001` — completed successfully (`map 100% reduce 100%`)
- **Map input records**: 7,094,305 (includes header row)
- **Map output records**: 7,094,304 (header filtered out)
- **Reduce input groups**: 591,192
- **Reduce output records**: 591,192
- **HDFS bytes written**: 19,220,679 bytes (~18.3 MB, replicated to 36.7 MB across 2 DataNodes)
- **Failed Shuffles**: 0 | **Corrupt blocks**: 0 | **Missing blocks**: 0

## 11. Actual Validation

### HDFS output listing
```bash
docker exec namenode hdfs dfs -ls -h /trafficlens/analytics/hourly_traffic
```
```
Found 2 items
-rw-r--r--   2 root supergroup     0     2026-10-06 09:38  /trafficlens/analytics/hourly_traffic/_SUCCESS
-rw-r--r--   2 root supergroup  18.3 M   2026-10-06 09:38  /trafficlens/analytics/hourly_traffic/part-00000
```

### Output size
```bash
docker exec namenode hdfs dfs -du -h /trafficlens/analytics/hourly_traffic
```
```
0       0       /trafficlens/analytics/hourly_traffic/_SUCCESS
18.3 M  36.7 M  /trafficlens/analytics/hourly_traffic/part-00000
```

### Record count
```
591192
```
(= 207 sensors × number of distinct hours in the METR-LA dataset — exactly matching Reduce input groups from YARN counters)

### Output sample (first 20 lines)
```bash
docker exec namenode bash -c "hdfs dfs -cat /trafficlens/analytics/hourly_traffic/part-00000 | head -n 20"
```
```
2012-03-01 00,716328,12,53.8345
2012-03-01 00,716331,12,55.5585
2012-03-01 00,716337,12,52.8715
2012-03-01 00,716339,12,52.5532
2012-03-01 00,716554,12,47.0625
2012-03-01 00,716571,12,52.2164
2012-03-01 00,716939,12,48.4433
2012-03-01 00,716941,12,48.6007
2012-03-01 00,716942,12,48.7315
2012-03-01 00,716943,12,44.9317
2012-03-01 00,716949,12,48.0197
2012-03-01 00,716951,12,54.3576
2012-03-01 00,716953,12,50.6571
2012-03-01 00,716955,12,41.7946
2012-03-01 00,716956,12,50.7002
2012-03-01 00,716958,12,52.4155
2012-03-01 00,716960,12,52.1354
2012-03-01 00,716968,12,49.7245
2012-03-01 00,717099,12,54.338
2012-03-01 00,717445,12,55.9173
```

### Verification notes
- Hour bucket `2012-03-01 00` correctly corresponds to midnight on the first date in METR-LA
- `reading_count = 12` confirms 12 × 5-minute intervals = 1 full hour of data
- All 207 sensor IDs are present
- Average speeds are numeric and within expected range
- `/trafficlens/raw/metr-la.h5` and `/trafficlens/analytics/average_speed_by_sensor` remain untouched
