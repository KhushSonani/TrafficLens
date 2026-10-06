#!/bin/bash

# TrafficLens: Hourly Traffic Aggregation (Student 1)

INPUT_HDFS="/trafficlens/clean/metr-la-flat.csv"
OUTPUT_HDFS="/trafficlens/analytics/hourly_traffic"

echo "Checking if input file exists in HDFS..."
docker exec namenode hdfs dfs -test -e $INPUT_HDFS
if [ $? -ne 0 ]; then
    echo "Error: Input data $INPUT_HDFS not found in HDFS."
    exit 1
fi

echo "Cleaning up previous output directory if exists..."
docker exec namenode hdfs dfs -rm -r -f $OUTPUT_HDFS

echo "Copying scripts to resourcemanager container..."
docker cp src/processing/mapreduce/hourly_traffic_mapper.sh resourcemanager:/tmp/hourly_traffic_mapper.sh
docker cp src/processing/mapreduce/hourly_traffic_reducer.sh resourcemanager:/tmp/hourly_traffic_reducer.sh

echo "Making scripts executable..."
docker exec resourcemanager chmod +x /tmp/hourly_traffic_mapper.sh
docker exec resourcemanager chmod +x /tmp/hourly_traffic_reducer.sh

echo "Starting Hadoop Streaming job..."
docker exec resourcemanager hadoop jar /opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar \
    -files /tmp/hourly_traffic_mapper.sh,/tmp/hourly_traffic_reducer.sh \
    -mapper "/tmp/hourly_traffic_mapper.sh" \
    -reducer "/tmp/hourly_traffic_reducer.sh" \
    -input $INPUT_HDFS \
    -output $OUTPUT_HDFS

echo "MapReduce job completed."
echo "Output sample:"
docker exec namenode bash -c "hdfs dfs -cat $OUTPUT_HDFS/part-00000 | head -n 20"
