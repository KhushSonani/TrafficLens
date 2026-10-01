# ARCHITECTURE.md

## 1. System architecture
```text
                    Laptop (Docker network: bignet)
 ┌────────────────────────────────────────────────────────────────┐
 │  master                 worker1              worker2           │
 │  NameNode               DataNode             DataNode          │
 │  ResourceManager        NodeManager          NodeManager       │
 │  Spark client (submit)                                         │
 │  Spark History Server                                          │
 └────────────────────────────────────────────────────────────────┘
        │ hdfs get (jsonl)
        ▼
 MongoDB (outside cluster) ◄── pymongo loader          Streamlit (outside cluster) ──reads──► MongoDB
```

## 2. Data flow
```text
PEMS04 npz → long CSV ─┐
Weather CSV ───────────┴─ hdfs dfs -put → /trafficlens/raw
  → validate → quarantine (bad rows) / clean
  → weather broadcast join + 15-min aggregate → curated/traffic_15min_base
  → score job (M2) → curated/traffic_15min
  → Spark SQL analytics, K-Means, hotspots, weather impact, RF → analytics/ ml/
  → JSONL → export/ → hdfs get → pymongo upsert → MongoDB → Streamlit
```

## 3. Hadoop/YARN cluster
```text
Client (master) ──submit──► ResourceManager (master)
                                 │ allocates containers
                     ┌───────────┴───────────┐
                NodeManager w1           NodeManager w2
                 [executor 1g]            [executor 1g]
HDFS: NameNode (master) holds metadata; blocks (32 MB, replication 2) live on DataNodes w1, w2.
```

## 4. Spark processing
```text
read Parquet/CSV (explicit schema) → transformations (lazy) → shuffle boundary (groupBy/join/window)
→ action (write) → stages/tasks on executors → output overwrite (idempotent)
```
Every job builds its `SparkSession` from `src/analytics/spark_utils.py` (timezone set, app name set) and takes HDFS input/output paths as arguments.

## 5. Serving pipeline
```text
Spark job → /trafficlens/export/<collection>/*.jsonl → hdfs dfs -get → output/export/
→ src/serving/load_mongo.py (bulk upsert on natural keys) → 6 collections → Streamlit (pymongo reads)
```

## Component responsibilities
| Component | Responsibility | Does NOT do |
|---|---|---|
| HDFS | Distributed, replicated storage of all data layers | Compute |
| YARN | Resource allocation; runs Spark executors and MapReduce/Streaming tasks | Storage |
| Spark | All large-scale transforms, SQL, MLlib | Serve the dashboard |
| MongoDB | Low-latency store of precomputed aggregates | Raw/15-min data, compute |
| Streamlit | Visualization; reads MongoDB only | Call Spark, read HDFS |
