#!/bin/bash

# TrafficLens HDFS Ingestion Script (Student 1)
# This script creates the HDFS directory structure and ingests the raw dataset.

echo "Setting up HDFS directory structure for TrafficLens..."
hdfs dfs -mkdir -p /trafficlens/raw /trafficlens/clean /trafficlens/analytics /trafficlens/export /trafficlens/ml /trafficlens/quarantine

echo "HDFS Directory Structure:"
hdfs dfs -ls -h /trafficlens

# Dataset parameters
DATASET_SOURCE="./dataset/metr-la.h5"  # Expected local location
HDFS_DESTINATION="/trafficlens/raw"

if [ -f "$DATASET_SOURCE" ]; then
    echo "Found dataset at $DATASET_SOURCE. Ingesting into HDFS..."
    
    # Check if file already exists in HDFS to prevent duplicate ingestion
    if hdfs dfs -test -e "$HDFS_DESTINATION/metr-la.h5"; then
        echo "Dataset already exists in HDFS at $HDFS_DESTINATION/metr-la.h5. Skipping ingestion."
    else
        echo "Uploading dataset to HDFS..."
        hdfs dfs -put "$DATASET_SOURCE" "$HDFS_DESTINATION/metr-la.h5"
    fi
    
    echo "Ingestion complete. Verifying:"
    hdfs dfs -ls -h $HDFS_DESTINATION
    hdfs dfs -du -h $HDFS_DESTINATION
else
    echo "Error: Actual dataset not found at $DATASET_SOURCE."
    echo "Please ensure the METR-LA dataset is present locally before running this script."
    exit 1
fi
