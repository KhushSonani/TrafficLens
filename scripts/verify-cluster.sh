#!/bin/bash
# Script to verify the Hadoop cluster

echo "=== Verifying Docker Containers ==="
docker compose ps
echo ""

echo "=== Verifying HDFS (NameNode & DataNodes) ==="
docker exec -it namenode hdfs dfsadmin -report
echo ""

echo "=== Verifying YARN (ResourceManager & NodeManagers) ==="
docker exec -it resourcemanager yarn node -list
echo ""

echo "=== Verifying HDFS Safe Mode ==="
docker exec -it namenode hdfs dfsadmin -safemode get
echo ""

echo "Verification Complete."
