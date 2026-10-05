# Hadoop Cluster Architecture

This document describes the 3-node Hadoop cluster configuration built using Docker for the TrafficLens Big Data project.

## Cluster Architecture
The cluster is structured as a 3-node logical architecture (1 Master, 2 Workers), implemented using 6 Docker containers (services). 

### Master Node Responsibilities
The Master node manages the distributed file system namespace and coordinates the cluster's compute resources.
- **Hadoop NameNode**: Manages HDFS directory tree and metadata.
- **YARN ResourceManager**: Arbitrates resources among applications in the cluster.

### Worker Node Responsibilities (Worker 1 & Worker 2)
The Worker nodes store actual data blocks and perform computations.
- **Hadoop DataNode**: Stores and retrieves HDFS data blocks.
- **YARN NodeManager**: Launches and manages application containers (tasks).

## Docker Services
The architecture is deployed via `docker-compose.yml` defining the following services:
1. `namenode` (Master)
2. `resourcemanager` (Master)
3. `datanode1` (Worker 1)
4. `nodemanager1` (Worker 1)
5. `datanode2` (Worker 2)
6. `nodemanager2` (Worker 2)

## Important Hadoop Configuration
The configuration is injected via environment variables defined in `config/hadoop.env`.
- `CORE_CONF_fs_defaultFS=hdfs://namenode:9000`: HDFS default file system URI.
- `HDFS_CONF_dfs_replication=2`: Default HDFS replication factor for the 2 DataNodes.
- `YARN_CONF_yarn_nodemanager_resource_memory___mb=2048`: NodeManager memory allocation.
- `YARN_CONF_yarn_nodemanager_resource_cpu___vcores=1`: NodeManager CPU allocation.

## How to Start the Cluster
Run the following command from the root of the repository:
```bash
docker compose up -d
```
Alternatively, use the provided script:
```bash
bash scripts/start-cluster.sh
```

## How to Stop the Cluster
Run the following command from the root of the repository:
```bash
docker compose down
```
Alternatively, use the provided script:
```bash
bash scripts/stop-cluster.sh
```

## How to Verify the Cluster
To verify the cluster infrastructure, check the containers and Hadoop services:
1. **Verify Docker Containers**:
   ```bash
   docker compose ps
   ```
2. **Verify NameNode and DataNodes (HDFS)**:
   ```bash
   docker exec -it namenode hdfs dfsadmin -report
   ```
3. **Verify ResourceManager and NodeManagers (YARN)**:
   ```bash
   docker exec -it resourcemanager yarn node -list
   ```
4. **Verify HDFS Safe Mode Status**:
   ```bash
   docker exec -it namenode hdfs dfsadmin -safemode get
   ```
Alternatively, use the provided script:
```bash
bash scripts/verify-cluster.sh
```

## Troubleshooting Commands
- **Check NameNode Logs**:
  ```bash
  docker logs namenode
  ```
- **Restart a Specific Service (e.g., DataNode1)**:
  ```bash
  docker compose restart datanode1
  ```
- **Format NameNode (Destructive)**:
  ```bash
  docker compose down -v
  # Then start again, the volume will be recreated and formatted
  ```
