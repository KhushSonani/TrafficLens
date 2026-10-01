# EXPERIMENTS.md

Owner: M1 (run), everyone (understand). **No results are pre-filled: `TBD` until measured.** Use the same job (the curated 15-min aggregation + score, or the cleaning job: pick one, record it) for all experiments. Repeat each configuration 3 times, note run 1 as cold; report median and range. Capture Spark UI / History Server screenshots for each. Record results in `output/experiments/results.csv` and summarise in `docs/EXPERIMENTS.md`.

Metrics to record per run: wall-clock seconds, number of stages/tasks, shuffle read/write bytes, number of executors and hosts, input size/rows, `shuffle.partitions`, output partitions.

## Experiment 1: 1 worker vs 2 workers
- Setup: full data. Run A: both NodeManagers up. Run B: stop only worker2's NodeManager (`docker exec worker2 yarn --daemon stop nodemanager`); HDFS stays intact. Confirm `yarn node -list` shows 1 node. Restart NM afterwards.
- Command: `spark-submit --master yarn --num-executors N ...` (N=2 for A; 1 for B).
- Expected observation: unknown; on one laptop the workers share CPU, so speedup may be small or absent.
- Can conclude: how this setup behaves under this configuration. Cannot conclude: real cluster scaling.

## Experiment 2: data size (1 week vs 1 month vs full)
- Setup: same job with a date filter argument (`--start-date/--end-date`), same cluster (2 workers).
- Metrics: runtime vs rows.
- Expected: runtime grows with size, possibly sub-linearly at small sizes because of fixed job startup overhead.
- Can conclude: startup overhead vs data size behavior. Cannot conclude: "Spark is faster than pandas" (do not claim it; if a pandas comparison is added it must be measured, on the same data, and reported as-is).

## Experiment 3: `spark.sql.shuffle.partitions` 200 vs 8
- Setup: full data, 2 workers; `--conf spark.sql.shuffle.partitions=200` vs `=8`. Turn AQE off for a clean comparison (`spark.sql.adaptive.enabled=false`) or state that AQE was on.
- Metrics: runtime, tasks per shuffle stage, task duration distribution, shuffle bytes.
- Expected: too many tiny tasks on a small dataset add scheduling overhead; but do not assume; measure.
- Can conclude: which setting suits this data volume/hardware. Cannot generalize to other data.

## Experiment 4: fault tolerance
- Setup: a file in HDFS with replication 2 (e.g. `/trafficlens/raw/traffic/pems04_long.csv`), heartbeat recheck configured (CLUSTER.md).
- Steps and evidence:
  1. Before: `hdfs fsck <file> -files -blocks -locations` (blocks on both DataNodes), `hdfs dfsadmin -report` (2 live).
  2. `docker stop worker2`.
  3. Immediately: `hdfs dfs -cat <file> | head` and `hdfs dfs -get` succeed (client falls back to worker1's replica).
  4. After ~1 min: `hdfs dfsadmin -report` shows 1 live / 1 dead; NameNode UI shows dead node; `fsck` reports under-replicated blocks (no third node exists to re-replicate to; this is expected).
  5. Run a small Spark job on YARN with only worker1's NodeManager: it completes.
  6. `docker start worker2`; report returns to 2 live; `fsck` shows blocks fully replicated.
- Metrics: read success, time to dead-node detection, job success.
- Can conclude: replicated data stays readable and HDFS/YARN keep working with one worker lost. Cannot conclude: behavior under multi-node failure, network partitions, or NameNode failure (single NameNode is a single point of failure: say so).
- Cut order position: third.
