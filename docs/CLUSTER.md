# CLUSTER.md

## Layout
```text
Docker network: bignet
master : NameNode, ResourceManager, Spark client, Spark History Server
worker1: DataNode, NodeManager
worker2: DataNode, NodeManager
```
One Dockerfile (Hadoop 3.3.x + Spark 3.5.x + Python 3 + JDK), started three times with a role env var (`ROLE=master|worker`). Compose file: `docker/docker-compose.yml`. Mongo runs separately (`docker/mongo-compose.yml`), Streamlit on the host.
Ports (master): NameNode UI 9870, ResourceManager UI 8088, History Server 18080, Spark app UI 4040. Publish them to the host.

## Hadoop configuration (files in `config/hadoop/`, mounted or copied into all containers)
| File | Property | Value |
|---|---|---|
| core-site.xml | fs.defaultFS | hdfs://master:9000 |
| hdfs-site.xml | dfs.replication | 2 |
| hdfs-site.xml | dfs.blocksize | 33554432 (32 MB) |
| hdfs-site.xml | dfs.namenode.name.dir / dfs.datanode.data.dir | container-local dirs on named volumes |
| hdfs-site.xml | dfs.namenode.heartbeat.recheck-interval | 10000 (ms; makes dead-node detection ≈ 50 s for the demo. Default ≈ 10.5 min) |
| yarn-site.xml | yarn.resourcemanager.hostname | master |
| yarn-site.xml | yarn.nodemanager.resource.memory-mb | 2560 (per worker) |
| yarn-site.xml | yarn.scheduler.maximum-allocation-mb | 2048 |
| yarn-site.xml | yarn.nodemanager.aux-services | mapreduce_shuffle |
| yarn-site.xml | yarn.nodemanager.vmem-check-enabled | false (avoids false kills in Docker) |
| mapred-site.xml | mapreduce.framework.name | yarn |
| workers | | worker1, worker2 |
Tune memory if containers are killed; record final values in DECISIONS/EXPERIMENTS.

## Spark configuration (`config/spark/spark-defaults.conf`)
```text
spark.master                       yarn
spark.submit.deployMode            client
spark.executor.instances           2
spark.executor.memory              1g
spark.executor.cores               1
spark.driver.memory                1g
spark.sql.session.timeZone         America/Los_Angeles
spark.sql.shuffle.partitions       (start 200 for experiment baseline; set 8 as production default only after Experiment 3)
spark.eventLog.enabled             true
spark.eventLog.dir                 hdfs://master:9000/spark-logs
spark.history.fs.logDirectory      hdfs://master:9000/spark-logs
```
Memory budget check: executor 1g + overhead (~384m) ≈ 1.4g; worker offers 2560m ⇒ 1 executor per worker fits, 2 do not. Expect 2 executors total, one per worker.

## Bring-up order
1. `docker compose up -d --build`; 2. format NameNode once; 3. start HDFS, then YARN, then History Server; 4. create HDFS dirs `/trafficlens/*`, `/spark-logs`; 5. run the gate checks below.

## Gates
- **Day 1:** 2 live DataNodes.
- **Day 2 (end):** `spark-submit --master yarn` finishes with executors on both workers. Otherwise switch to the fallback.

## Fallback: Spark standalone (only if YARN fails by end of Day 2)
Spark master on `master`, 2 Spark workers on worker1/worker2 (`--master spark://master:7077`). HDFS keeps 2 DataNodes. Log it in DECISIONS as an approved deviation and say so in the demo. Hadoop Streaming then needs YARN or local runner: state honestly what ran.

## Evidence commands (run from host; `exec` into master)
```bash
docker compose -f docker/docker-compose.yml ps
docker exec master cat /opt/hadoop/etc/hadoop/{core,hdfs,yarn}-site.xml
docker exec master hdfs dfsadmin -report
docker exec master yarn node -list
docker exec master hdfs dfs -ls -h /trafficlens/raw/traffic
docker exec master hdfs fsck /trafficlens/raw/traffic/pems04_long.csv -files -blocks -locations
docker exec master spark-submit --master yarn --deploy-mode client --num-executors 2 --executor-memory 1g <job.py> <args>
docker exec master yarn application -list -appStates ALL
```
Also screenshot: NameNode UI (:9870 Datanodes tab, file browser block info), RM UI (:8088 Nodes + Applications), Spark UI/History Server (Executors tab shows both workers). Save to `screenshots/` named `NN_topic.png`; index them in `screenshots/README.md`.

## Honest limits
Three containers on one laptop share CPU/RAM/disk: this demonstrates the architecture and fault handling, not real network-scale speedups. Never claim otherwise.
