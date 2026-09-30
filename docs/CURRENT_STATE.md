# CURRENT_STATE.md

Update at the end of every task. Keep it compact.

```text
Planning:            Complete
Implementation:      Not Started
Current Day:         Day 1 (Wed 30 Sep 2026)   [Day 7 = Tue 6 Oct; evaluation Wed 7 Oct]
Current Milestone:   M-D1: repo + 3-node cluster with 2 live DataNodes; contracts + mocks; data gate
```

## Completed Tasks
(none)

## Active Tasks
| Task | Owner | Branch | Status |
|---|---|---|---|
| D1-M1 | M1 | m1/cluster-ingestion | blocked |
| D1-M2 | M2 | m2/analytics | not started |
| D1-M3 | M3 | m3/mongo-dashboard | not started |

## Blocked Tasks
| Task | Reason |
|---|---|
| D1-M1 | Docker is not installed or available in PATH on the host OS, cannot start containers. |

## Known Issues
Docker CLI is missing on the host. `docker compose` cannot be executed.

## Current Branches
`main`, `develop`, `m1/cluster-ingestion`

## Latest Merges
(none)

## Integration Status
| Link | Status |
|---|---|
| Cluster up (2 DataNodes) | no |
| YARN job works | no |
| Raw data in HDFS | no |
| Clean layer | no |
| Curated base | no |
| Score layer | no |
| JSONL exports | no |
| Mongo loaded (real) | no |
| Dashboard on real data | no |

## Testing Status
(none run)

## Evidence Captured (`screenshots/`)
- [ ] docker compose ps  - [ ] site xmls  - [ ] hdfs dfsadmin -report  - [ ] yarn node -list
- [ ] NameNode UI  - [ ] RM UI  - [ ] hdfs -ls -h  - [ ] fsck blocks/locations
- [ ] spark-submit yarn  - [ ] yarn application -list  - [ ] Spark UI executors on both workers
- [ ] HDFS result  - [ ] Mongo document  - [ ] Dashboard  - [ ] Fault tolerance (before/after)  - [ ] Experiments

## Decisions pending
OPEN-1 … OPEN-5 (see DECISIONS.md)

## Next Tasks
D1-M1, D1-M2, D1-M3 (see tasks/DAY-01.md)
