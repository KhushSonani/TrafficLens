# PROMPTS.md: copy-paste prompts for Antigravity (or any coding agent)

Use ONE prompt per fresh agent conversation. Each member runs only their own prompts (M1/M2/M3).
The agent reads AGENTS.md and the task file itself, so these prompts stay short.

## Every session: before the task prompt (you run this yourself in the terminal)
```bash
git checkout develop && git pull
git checkout <your-branch> 2>/dev/null || git checkout -b <your-branch>
git merge develop
```
## Every session: after the task prompt (you run this yourself)
```bash
git status && git log --oneline -3     # sanity check what the agent did
git push -u origin <your-branch>       # then open a PR for your reviewer (M1->M2->M3->M1)
```

## Tips
- Use the agent's planning mode for cluster/Spark/ML tasks; fast mode is fine for docs/UI tasks.
- Start a NEW conversation for each task (keeps context small).
- Tell the agent to paste command output; do not accept "it should work". Screenshots/evidence you capture yourself.
- If the agent wants to change a contract, a decision, or another member's files: say no, raise it in the team chat.

## Generic template (fill the <> parts if you need a custom task)
```text
You are working on TrafficLens as Member <M1|M2|M3>. Execute ONLY task <ID> from tasks/DAY-<NN>.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task <ID> in tasks/DAY-<NN>.md (ignore the other tasks in that file).
3. Read only these docs: <list>.
4. Inspect existing files in: <paths> before editing anything.

Rules: follow AGENTS.md strictly. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

---

## D1-M1: M1, DAY-01, branch `m1/cluster-ingestion`
```text
You are working on TrafficLens as Member M1. Execute ONLY task D1-M1 from tasks/DAY-01.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D1-M1 in tasks/DAY-01.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/CLUSTER.md
   - docs/PROJECT_SPEC.md
4. Inspect existing files in: repo skeleton, docker/, config/hadoop/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m1/cluster-ingestion. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D1-M2: M2, DAY-01, branch `m2/analytics`
```text
You are working on TrafficLens as Member M2. Execute ONLY task D1-M2 from tasks/DAY-01.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D1-M2 in tasks/DAY-01.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/DATA_PIPELINE.md (Stage 0 only)
   - docs/PROJECT_SPEC.md (Dataset section only)
   - docs/contracts/curated-schema.md
4. Inspect existing files in: dataset/, src/analytics/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m2/analytics. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D1-M3: M3, DAY-01, branch `m3/mongo-dashboard`
```text
You are working on TrafficLens as Member M3. Execute ONLY task D1-M3 from tasks/DAY-01.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D1-M3 in tasks/DAY-01.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/SERVING_SPEC.md
   - docs/contracts/curated-schema.md, prediction-schema.md, mongo-schema.md
   - docs/DASHBOARD_SPEC.md (Overview section only)
4. Inspect existing files in: src/serving/, tests/, docker/mongo-compose.yml before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m3/mongo-dashboard. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D2-M1: M1, DAY-02, branch `m1/cluster-ingestion`
```text
You are working on TrafficLens as Member M1. Execute ONLY task D2-M1 from tasks/DAY-02.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D2-M1 in tasks/DAY-02.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/CLUSTER.md
   - docs/DATA_PIPELINE.md (Stage 0-1 only)
4. Inspect existing files in: docker/, config/, scripts/, dataset/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m1/cluster-ingestion. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D2-M2: M2, DAY-02, branch `m2/analytics`
```text
You are working on TrafficLens as Member M2. Execute ONLY task D2-M2 from tasks/DAY-02.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D2-M2 in tasks/DAY-02.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/DATA_PIPELINE.md (Stage 4 only)
   - docs/ML_SPEC.md (section 3 only)
   - docs/contracts/curated-schema.md
4. Inspect existing files in: src/analytics/, config/thresholds.yaml, tests/analytics/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m2/analytics. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D2-M3: M3, DAY-02, branch `m3/mongo-dashboard`
```text
You are working on TrafficLens as Member M3. Execute ONLY task D2-M3 from tasks/DAY-02.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D2-M3 in tasks/DAY-02.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/SERVING_SPEC.md
   - docs/contracts/mongo-schema.md
   - docs/DASHBOARD_SPEC.md (section 1 only)
4. Inspect existing files in: src/serving/, tests/serving/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m3/mongo-dashboard. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D3-M1: M1, DAY-03, branch `m1/spark-preprocessing`
```text
You are working on TrafficLens as Member M1. Execute ONLY task D3-M1 from tasks/DAY-03.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D3-M1 in tasks/DAY-03.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/DATA_PIPELINE.md (Stage 2-3 only)
   - docs/CLUSTER.md (spark-submit sections only)
4. Inspect existing files in: src/processing/, config/thresholds.yaml, tests/processing/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m1/spark-preprocessing. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D3-M2: M2, DAY-03, branch `m2/analytics`
```text
You are working on TrafficLens as Member M2. Execute ONLY task D3-M2 from tasks/DAY-03.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D3-M2 in tasks/DAY-03.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/ML_SPEC.md (sections 1-3 only)
   - docs/DATA_PIPELINE.md (Stage 5 only)
   - docs/contracts/curated-schema.md
4. Inspect existing files in: src/analytics/, src/ml/, config/split.yaml, tests/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m2/analytics. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D3-M3: M3, DAY-03, branch `m3/mongo-dashboard`
```text
You are working on TrafficLens as Member M3. Execute ONLY task D3-M3 from tasks/DAY-03.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D3-M3 in tasks/DAY-03.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/DASHBOARD_SPEC.md (sections 2-3 only)
   - docs/SERVING_SPEC.md (Dashboard queries only)
   - docs/contracts/mongo-schema.md
4. Inspect existing files in: src/serving/dashboard/, tests/serving/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m3/mongo-dashboard. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D4-M1: M1, DAY-04, branch `m1/spark-preprocessing`
```text
You are working on TrafficLens as Member M1. Execute ONLY task D4-M1 from tasks/DAY-04.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D4-M1 in tasks/DAY-04.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/DATA_PIPELINE.md (Stage 3-4 only)
   - docs/contracts/curated-schema.md
4. Inspect existing files in: src/processing/, src/analytics/time_features.py (import only, do not edit), scripts/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m1/spark-preprocessing. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D4-M2: M2, DAY-04, branch `m2/analytics`
```text
You are working on TrafficLens as Member M2. Execute ONLY task D4-M2 from tasks/DAY-04.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D4-M2 in tasks/DAY-04.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/ML_SPEC.md (sections 1-3 only)
   - docs/SERVING_SPEC.md
   - docs/contracts/curated-schema.md, mongo-schema.md
4. Inspect existing files in: src/analytics/, src/ml/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m2/analytics. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D4-M3: M3, DAY-04, branch `m3/mongo-dashboard`
```text
You are working on TrafficLens as Member M3. Execute ONLY task D4-M3 from tasks/DAY-04.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D4-M3 in tasks/DAY-04.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/SERVING_SPEC.md
   - docs/DASHBOARD_SPEC.md (section 4 only)
   - docs/contracts/mongo-schema.md
4. Inspect existing files in: src/serving/, pipeline/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m3/mongo-dashboard. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D5-M1: M1, DAY-05, branch `m1/hadoop-streaming (then m1/fault-tolerance)`
```text
You are working on TrafficLens as Member M1. Execute ONLY task D5-M1 from tasks/DAY-05.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D5-M1 in tasks/DAY-05.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/DATA_PIPELINE.md (Hadoop Streaming section only)
   - docs/EXPERIMENTS.md (Experiment 4 only)
   - docs/CLUSTER.md
4. Inspect existing files in: src/mapreduce/, scripts/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m1/hadoop-streaming. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D5-M2: M2, DAY-05, branch `m2/analytics (then m2/ml)`
```text
You are working on TrafficLens as Member M2. Execute ONLY task D5-M2 from tasks/DAY-05.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D5-M2 in tasks/DAY-05.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/ML_SPEC.md (sections 4-5 only)
   - docs/contracts/prediction-schema.md, mongo-schema.md
4. Inspect existing files in: src/analytics/, src/ml/, tests/ml/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m2/analytics. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D5-M3: M3, DAY-05, branch `m3/mongo-dashboard`
```text
You are working on TrafficLens as Member M3. Execute ONLY task D5-M3 from tasks/DAY-05.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D5-M3 in tasks/DAY-05.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/DASHBOARD_SPEC.md (sections 4-5 only)
   - docs/SERVING_SPEC.md
   - docs/contracts/prediction-schema.md
   - docs/CLUSTER.md (spark-submit only)
4. Inspect existing files in: src/serving/dashboard/, pipeline/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m3/mongo-dashboard. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D6-M1: M1, DAY-06, branch `m1/experiments`
```text
You are working on TrafficLens as Member M1. Execute ONLY task D6-M1 from tasks/DAY-06.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D6-M1 in tasks/DAY-06.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/EXPERIMENTS.md
   - docs/CLUSTER.md
4. Inspect existing files in: scripts/, output/experiments/, docs/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m1/experiments. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D6-M2: M2, DAY-06, branch `m2/ml`
```text
You are working on TrafficLens as Member M2. Execute ONLY task D6-M2 from tasks/DAY-06.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D6-M2 in tasks/DAY-06.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/ML_SPEC.md
   - docs/TESTING.md (P0 ML rows only)
4. Inspect existing files in: tests/ml/, tests/analytics/, docs/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m2/ml. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D6-M3: M3, DAY-06, branch `m3/mongo-dashboard`
```text
You are working on TrafficLens as Member M3. Execute ONLY task D6-M3 from tasks/DAY-06.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D6-M3 in tasks/DAY-06.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/TESTING.md
   - docs/PROJECT_SPEC.md (Final demo section only)
4. Inspect existing files in: tests/, pipeline/, README.md, docs/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m3/mongo-dashboard. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D7-M1: M1, DAY-07, branch `m1/final`
```text
You are working on TrafficLens as Member M1. Execute ONLY task D7-M1 from tasks/DAY-07.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D7-M1 in tasks/DAY-07.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/CLUSTER.md
   - docs/EXPERIMENTS.md
   - docs/DEMO_SCRIPT.md
4. Inspect existing files in: docs/DEMO_SCRIPT.md, screenshots/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m1/final. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D7-M2: M2, DAY-07, branch `m2/final`
```text
You are working on TrafficLens as Member M2. Execute ONLY task D7-M2 from tasks/DAY-07.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D7-M2 in tasks/DAY-07.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/ML_SPEC.md
   - docs/DEMO_SCRIPT.md
4. Inspect existing files in: docs/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m2/final. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

## D7-M3: M3, DAY-07, branch `m3/final`
```text
You are working on TrafficLens as Member M3. Execute ONLY task D7-M3 from tasks/DAY-07.md.

Before coding:
1. Read AGENTS.md and docs/CURRENT_STATE.md.
2. Read only task D7-M3 in tasks/DAY-07.md (ignore the other tasks in that file).
3. Read only these docs:
   - docs/TESTING.md
   - docs/DEMO_SCRIPT.md
4. Inspect existing files in: README.md, docs/, tests/ before editing anything.

Rules: follow AGENTS.md strictly. Work on branch m3/final. Do not touch files outside this task's "Files" list. Do not push or merge; I will. Commit locally using the suggested Conventional Commit message(s) once the task works.

Then: give me a short plan, implement only this task, run every Verification command and show the real output, fix task-specific failures, update docs/CURRENT_STATE.md, and stop. Do not start the next task. If anything contradicts the docs or a dependency is missing, stop and tell me instead of assuming.

Final report: changed files, commands run with results, unresolved issues, anything I must tell teammates.
```

---
## Utility prompts

**Fix a failing verification (same conversation)**
```text
The verification for task <ID> failed. Here is the full error output: <paste>. Diagnose the root cause first, explain it in 2-3 sentences, then apply the smallest fix inside this task's files only. Re-run the verification and show the output. Do not refactor.
```

**Review a teammate's PR (rotating reviewer)**
```text
Review the diff of branch <branch> against develop. Read AGENTS.md and only the docs relevant to the changed files. Check: contract compliance, idempotent Spark jobs, timezone set, no pandas in the pipeline, no forbidden technologies, tests present, no unrelated file changes, sensible Conventional Commit messages. Output a list of blocking issues and non-blocking suggestions. Do not edit any files.
```

**Contradiction check before starting a task**
```text
Read AGENTS.md, docs/CURRENT_STATE.md, and task <ID> in tasks/DAY-<NN>.md and the docs it lists. Do NOT write code. List any contradictions, missing dependencies, or unclear requirements, and the smallest question I should ask the team for each.
```

**Day-end state sync**
```text
Update docs/CURRENT_STATE.md to match reality: completed tasks, active/blocked tasks, known issues, branches, integration status table, testing status, evidence captured. Only record things you can verify from the repo or command output. Do not change any other file.
```
