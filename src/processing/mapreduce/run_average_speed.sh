#!/bin/bash

# TrafficLens: Average Speed by Sensor (Student 1)
# Uses Hadoop Streaming to calculate average speed from flattened METR-LA dataset.

INPUT_HDFS="/trafficlens/clean/metr-la-flat.csv"
OUTPUT_HDFS="/trafficlens/analytics/average_speed_by_sensor"

echo "Checking if input file exists in HDFS..."
docker exec namenode hdfs dfs -test -e $INPUT_HDFS
if [ $? -ne 0 ]; then
    echo "Error: Input data $INPUT_HDFS not found in HDFS."
    echo "Please ensure the preprocessing step has been completed."
    exit 1
fi

echo "Cleaning up previous output directory if exists..."
docker exec namenode hdfs dfs -rm -r -f $OUTPUT_HDFS

echo "Copying scripts to resourcemanager container..."
docker cp src/processing/mapreduce/average_speed_mapper.sh resourcemanager:/tmp/average_speed_mapper.sh
docker cp src/processing/mapreduce/average_speed_reducer.sh resourcemanager:/tmp/average_speed_reducer.sh

echo "Making scripts executable..."
docker exec resourcemanager chmod +x /tmp/average_speed_mapper.sh
docker exec resourcemanager chmod +x /tmp/average_speed_reducer.sh

echo "Starting Hadoop Streaming job..."
docker exec resourcemanager hadoop jar /opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar \
    -files /tmp/average_speed_mapper.sh,/tmp/average_speed_reducer.sh \
    -mapper "/tmp/average_speed_mapper.sh" \
    -reducer "/tmp/average_speed_reducer.sh" \
    -input $INPUT_HDFS \
    -output $OUTPUT_HDFS

echo "MapReduce job completed."
echo "Output sample:"
docker exec namenode hdfs dfs -cat $OUTPUT_HDFS/part-00000 | head -n 20
