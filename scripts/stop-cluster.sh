#!/bin/bash
# Script to stop the Hadoop cluster

echo "Stopping Hadoop Cluster..."
docker compose down
echo "Cluster stopped."
