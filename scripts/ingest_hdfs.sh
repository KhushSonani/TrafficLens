#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRAFFIC_FILE="${TRAFFIC_FILE:-$ROOT_DIR/dataset/pems04_long.csv}"
WEATHER_FILE="${WEATHER_FILE:-$ROOT_DIR/dataset/weather_hourly.csv}"

[[ -f "$TRAFFIC_FILE" ]] || { echo "Missing traffic file: $TRAFFIC_FILE" >&2; exit 1; }
[[ -f "$WEATHER_FILE" ]] || { echo "Missing weather file: $WEATHER_FILE" >&2; exit 1; }

docker cp "$TRAFFIC_FILE" master:/tmp/pems04_long.csv
docker cp "$WEATHER_FILE" master:/tmp/weather_hourly.csv

docker exec master hdfs dfs -mkdir -p \
    /trafficlens/raw/traffic /trafficlens/raw/weather /trafficlens/raw/metadata
docker exec master hdfs dfs -put -f /tmp/pems04_long.csv /trafficlens/raw/traffic/pems04_long.csv
docker exec master hdfs dfs -put -f /tmp/weather_hourly.csv /trafficlens/raw/weather/weather_hourly.csv

echo "Ingested raw traffic and weather into HDFS"
docker exec master hdfs dfs -ls -h /trafficlens/raw/traffic /trafficlens/raw/weather