# HDFS Distributed Storage Validation (S1-3)

## Validation Overview
- **Validation Date/Time**: 2026-10-06 08:53 UTC
- **Cluster Architecture**: Docker-based Hadoop cluster containing 1 NameNode, 2 DataNodes, 1 ResourceManager, and 2 NodeManagers.

## 1. Cluster Status Verification
**Command:**
```bash
docker compose ps
```
**Observed Result:**
The cluster is running perfectly. Both `datanode1` and `datanode2` are active and healthy, along with the `namenode`, `resourcemanager`, and both `nodemanager` instances.

## 2. DataNode Verification
**Command:**
```bash
docker exec namenode hdfs dfsadmin -report
```
**Observed Result:**
HDFS confirms **2 Live datanodes**:
- **DataNode 1**: `172.18.0.5:9866` (Hostname: d58eb300c6fa)
- **DataNode 2**: `172.18.0.7:9866` (Hostname: cc6f06a5cdb5)
Total cluster capacity is properly recognized across both nodes.

## 3. HDFS Directory Verification
**Command:**
```bash
docker exec namenode hdfs dfs -ls -h /trafficlens
```
**Observed Result:**
The necessary directory structure exists:
`/trafficlens/analytics`, `/trafficlens/clean`, `/trafficlens/export`, `/trafficlens/ml`, `/trafficlens/quarantine`, and `/trafficlens/raw`.

## 4. Dataset Verification
**Command:**
```bash
docker exec namenode hdfs dfs -ls -h /trafficlens/raw
docker exec namenode hdfs dfs -du -h /trafficlens
```
**Observed Result:**
The `metr-la.h5` dataset is successfully ingested and located at `/trafficlens/raw/metr-la.h5`.
- **Logical Size**: 54.4 MB
- **Physical Size (replicated)**: 108.8 MB

## 5. Block-Location & Replication Verification
**Command:**
```bash
docker exec namenode hdfs fsck /trafficlens/raw/metr-la.h5 -files -blocks -locations
```
**Observed Result:**
- **Status**: `HEALTHY`
- **Total size**: `57038056 B`
- **Total blocks**: `1`
- **Replication factor**: `2`
- **Live replicas**: `2`
- **Missing blocks**: `0`
- **Under-replicated blocks**: `0`
- **Corrupt blocks**: `0`
- **Block locations**: The single block `blk_1073741836_1012` is stored identically on both DataNodes: `[172.18.0.5:9866, 172.18.0.7:9866]`.

## 6. YARN Node Verification
**Command:**
```bash
docker exec resourcemanager yarn node -list
```
**Observed Result:**
YARN confirms 2 NodeManagers are active and in the `RUNNING` state, ready to accept MapReduce jobs.

## Conclusion
The validation definitively proves that the METR-LA dataset is stored in HDFS, fully distributed across multiple DataNodes, properly replicated, and completely healthy with zero corruption or missing blocks.
