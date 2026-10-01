# D2-M1 evidence

Capture these screenshots after the cluster is running. Use the exact names below so the evidence remains easy to audit.

| File | Evidence |
|---|---|
| `01-node-config.png` | `docker exec master cat /opt/hadoop/etc/hadoop/{core,hdfs,yarn}-site.xml` |
| `02-yarn-nodes.png` | ResourceManager UI Nodes tab showing `worker1` and `worker2` as RUNNING |
| `03-hdfs-distribution.png` | `docker exec master hdfs dfsadmin -report` and raw traffic listing |
| `04-fsck-blocks.png` | `docker exec master hdfs fsck /trafficlens/raw/traffic/pems04_long.csv -files -blocks -locations` |
| `05-spark-yarn.png` | Spark History/UI showing the completed YARN application and both executors |

The command output is the source of truth for node, block, and application counts; do not infer counts from a screenshot.