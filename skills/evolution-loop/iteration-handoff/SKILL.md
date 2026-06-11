---
name: iteration-handoff
description: 根据 Evolution 结果更新全局状态，并把项目交接给下一轮 Loop。
---

## Inputs

- evolution report
- drift report
- memory updates
- skill mining result
- global state

## Workflow

1. 读取 drift-report.yaml
2. 决定下一轮入口：
   - done
   - development
   - mini_alignment
   - full_alignment
3. 更新 `.codex/state/global.state.yaml`
4. 更新 `.codex/state/evolution.state.yaml`
5. 追加 `.codex/logs/evolution.log.md`
6. 生成下一轮摘要

## State Relay

### Before

```yaml
# .codex/state/evolution.state.yaml
current_step: drift-evaluator
completed_steps:
  - evolution-analyzer
  - memory-capture
  - skill-miner
  - drift-evaluator
pending_steps:
  - iteration-handoff
```

### After

```yaml
# .codex/state/global.state.yaml
current_phase: development  # or alignment
current_task: "{next_task_id}"
task_status: pending

iteration:
  current: 2
  previous: 1

routing:
  next_entry: development
  reason: "No standards drift; minor UI changes only."

handoff:
  last_agent: iteration-handoff
  next_agent: dev-planner
  next_required_action: "Create a new task spec."
```

```yaml
# .codex/state/evolution.state.yaml
phase: evolution
status: completed
task_id: "{task_id}"
iteration: 1

memory_updates:
  facts:
    added: 2
    updated: 1
  procedures:
    added: 1
  decisions:
    added: 1

skills:
  created: []
  updated:
    - playwright-e2e-tester

drift:
  score: 12
  level: minor
  next_entry: development

next_iteration:
  id: 2
  entry: development
```

## Output

Write `.codex/tasks/{task_id}/handoff.md`:

```md
# Handoff Summary

## Completed
-

## Verification
- lint:
- unit:
- e2e:

## Memory Updated
-

## Skills Updated
-

## Drift
-

## Next Entry
-

## Next Required Action
-
```

## Hard Rules

- 不跳过状态文件更新
- 不修改 business logic
- 不覆盖已有日志条目
- 下一轮入口必须匹配 drift_score 路由规则