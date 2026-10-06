#!/bin/bash
# Script to start the 3-node Hadoop cluster

echo "Starting Hadoop Cluster..."
docker compose up -d
echo "Cluster started successfully. Use 'docker compose ps' to view services."
