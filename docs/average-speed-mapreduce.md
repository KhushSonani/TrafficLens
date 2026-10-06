# Average Speed by Sensor (MapReduce)

## Overview
This document details the MapReduce processing job implemented by Student 1 to calculate the average traffic speed per sensor from the METR-LA dataset.

## 1. Input Format & Preprocessing
The original dataset, located at `/trafficlens/raw/metr-la.h5`, is a binary HDF5 file containing a Pandas DataFrame structure (34,272 rows of timestamps × 207 columns of sensors). Because Hadoop Streaming strictly requires structured text inputs to pass logical records cleanly to mappers, a local preprocessing step is required. 

**Preprocessing Step:**
A Python script (`pandas.melt`) flattened the raw data into a continuous sequence of CSV records in the format: `timestamp,sensor_id,speed`.
- **HDFS Input Location**: The preprocessed CSV was then placed directly into HDFS at `/trafficlens/clean/metr-la-flat.csv`.

## 2. MapReduce Logic
Since the NodeManager containers running in our Docker environment are lightweight and do not come with Python installed, the mapper and reducer are written natively in `bash` / `awk`.

### Mapper (`average_speed_mapper.sh`)
- Iterates over the comma-separated records.
- Ignores the header row (`timestamp`).
- Validates the presence of exactly 3 fields.
- **Emits**: `sensor_id \t speed`

### Reducer (`average_speed_reducer.sh`)
- Assumes sorted input automatically provided by the MapReduce framework.
- Aggregates speeds per unique `sensor_id` tracking both `sum` and `count`.
- **Emits**: `sensor_id \t average_speed`

## 3. Execution & Verification

### Hadoop Streaming Command
A shell script (`src/processing/mapreduce/run_average_speed.sh`) fully automates the execution. It runs:
```bash
docker exec resourcemanager hadoop jar /opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar \
    -files /tmp/average_speed_mapper.sh,/tmp/average_speed_reducer.sh \
    -mapper "/tmp/average_speed_mapper.sh" \
    -reducer "/tmp/average_speed_reducer.sh" \
    -input /trafficlens/clean/metr-la-flat.csv \
    -output /trafficlens/analytics/average_speed_by_sensor
```

### Locations
- **Input Location**: `/trafficlens/clean/metr-la-flat.csv`
- **Output Location**: `/trafficlens/analytics/average_speed_by_sensor`

### Actual Execution
The MapReduce job successfully executed and processed exactly **7,094,304** logical records, grouping them into **207** unique sensor groups. The job took roughly 1 minute to complete.

### Actual Verification
```bash
docker exec namenode bash -c "hdfs dfs -cat /trafficlens/analytics/average_speed_by_sensor/part-00000 | head -n 10"
```

**Output Sample:**
```
716328  54.956
716331  46.4814
716337  53.2158
716339  37.7804
716554  49.9756
716571  61.8362
716939  42.7141
716941  49.7921
716942  50.1356
716943  47.4776
```

## Assumptions
- It is assumed that the environment strictly lacks Python on execution nodes, enforcing the usage of robust shell/awk scripts for standard text processing.
- The binary HDF5 representation is considered "raw", while the `metr-la-flat.csv` is considered "clean/preprocessed" intermediate data suitable for Hadoop pipelines.
