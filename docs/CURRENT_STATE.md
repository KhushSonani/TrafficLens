# CURRENT_STATE.md

Update at the end of every task. Keep it compact.

```text
Planning:            Complete
Implementation:      D2-M1 complete; YARN and HDFS evidence captured
Current Day:         Day 2 (Thu 1 Oct 2026)   [Day 7 = Tue 6 Oct; evaluation Wed 7 Oct]
Current Milestone:   M-D2: YARN + raw HDFS ingestion gate
```

## Completed Tasks
| Task | Owner | Branch | Status |
|---|---|---|---|
| D2-M1 | M1 | m1/cluster-ingestion | complete |

## Active Tasks
| Task | Owner | Branch | Status |
|---|---|---|---|
| D1-M1 | M1 | m1/cluster-ingestion | blocked |
| D1-M2 | M2 | m2/analytics | not started |
| D1-M3 | M3 | m3/mongo-dashboard | not started |
| D2-M1 | M1 | m1/cluster-ingestion | complete |

## Blocked Tasks
| Task | Reason |
|---|---|
| D1-M1 | Docker was unavailable during Day 1; resolved for D2-M1. |

## Known Issues
The cluster is running with two YARN NodeManagers; Spark-on-YARN and raw HDFS ingestion are verified. YARN log aggregation is disabled, so executor evidence came from the Spark driver log and YARN node/application commands.

## Current Branches
`main`, `develop`, `m1/cluster-ingestion`

## Latest Merges
(none)

## Integration Status
| Link | Status |
|---|---|
| Cluster up (2 DataNodes) | yes |
| YARN job works | yes: app SUCCEEDED with executors on worker1 and worker2 |
| Raw data in HDFS | yes: 308,550,753 bytes, 10 blocks, replication 2 |
| Clean layer | no |
| Curated base | no |
| Score layer | no |
| JSONL exports | no |
| Mongo loaded (real) | no |
| Dashboard on real data | no |

## Testing Status
(none run)

## Evidence Captured (`screenshots/`)
- [x] docker compose ps  - [x] site xmls  - [x] hdfs dfsadmin -report  - [x] yarn node -list
- [ ] NameNode UI  - [ ] RM UI  - [x] hdfs -ls -h  - [x] fsck blocks/locations
- [x] spark-submit yarn  - [x] yarn application -list  - [x] Spark UI executors on both workers
- [ ] HDFS result  - [ ] Mongo document  - [ ] Dashboard  - [ ] Fault tolerance (before/after)  - [ ] Experiments

## Decisions pending
OPEN-1 … OPEN-5 (see DECISIONS.md)

## Next Tasks
D2-M2/D2-M3 (see tasks/DAY-02.md)
