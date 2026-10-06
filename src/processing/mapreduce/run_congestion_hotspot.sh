#!/bin/bash

# TrafficLens: Congestion Hotspot Analytics (Student 1 - S1-6)
# Uses Hadoop Streaming to calculate congestion scores per sensor per hour.
# Input: S1-5 hourly_traffic output in HDFS.
# Reference: S1-4 per-sensor historical mean speed (reference_speeds.tsv).

INPUT_HDFS="/trafficlens/analytics/hourly_traffic"
OUTPUT_HDFS="/trafficlens/analytics/congestion_hotspots"
MAPREDUCE_DIR="src/processing/mapreduce"

echo "Checking if input exists in HDFS..."
docker exec namenode hdfs dfs -test -e $INPUT_HDFS
if [ $? -ne 0 ]; then
    echo "Error: Input $INPUT_HDFS not found. Run S1-5 first."
    exit 1
fi

echo "Cleaning up previous output directory if exists..."
docker exec namenode hdfs dfs -rm -r -f $OUTPUT_HDFS

echo "Copying scripts and reference data to resourcemanager..."
docker cp $MAPREDUCE_DIR/congestion_hotspot_mapper.sh resourcemanager:/tmp/congestion_hotspot_mapper.sh
docker cp $MAPREDUCE_DIR/congestion_hotspot_reducer.sh resourcemanager:/tmp/congestion_hotspot_reducer.sh
docker cp $MAPREDUCE_DIR/reference_speeds.tsv resourcemanager:/tmp/reference_speeds.tsv

echo "Making scripts executable..."
docker exec resourcemanager chmod +x /tmp/congestion_hotspot_mapper.sh
docker exec resourcemanager chmod +x /tmp/congestion_hotspot_reducer.sh

echo "Starting Hadoop Streaming job..."
docker exec resourcemanager hadoop jar /opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar \
    -files /tmp/congestion_hotspot_mapper.sh,/tmp/congestion_hotspot_reducer.sh,/tmp/reference_speeds.tsv \
    -mapper "/tmp/congestion_hotspot_mapper.sh" \
    -reducer "/tmp/congestion_hotspot_reducer.sh" \
    -input $INPUT_HDFS \
    -output $OUTPUT_HDFS

echo "Job complete. Verifying output..."
docker exec namenode hdfs dfs -ls -h $OUTPUT_HDFS
echo "--- Output sample (first 20 lines) ---"
docker exec namenode bash -c "hdfs dfs -cat $OUTPUT_HDFS/part-00000 | head -n 20"
