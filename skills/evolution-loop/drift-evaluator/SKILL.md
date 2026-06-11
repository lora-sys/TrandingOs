---
name: drift-evaluator
description: 判断本轮结果是否偏离 Alignment 标准层，并决定是否需要重新对齐。
---

## Inputs

- `claude.md`
- `AGENTS.md`
- `validators.md`
- alignment state
- development state
- verification state
- review report
- evolution report

## Drift Types

### Standards Drift
开发行为和 claude.md 不一致

### Validator Drift
实际验证没有满足 validators.md

### Spec Drift
实现超出或偏离 current-task-spec

### User Preference Drift
用户反馈和现有标准发生冲突

### Documentation Drift
代码事实和文档事实冲突

## Workflow

1. 检查是否跳过任何必需验证
2. 检查 Playwright E2E 是否真实运行
3. 检查实现是否超出 spec
4. 检查 review 是否有未解决问题
5. 检查是否有新事实冲突旧标准
6. 计算 drift_score
7. 给出 next_entry

## State Relay

### Before

```yaml
# .codex/state/evolution.state.yaml
current_step: skill-miner
completed_steps:
  - evolution-analyzer
  - memory-capture
  - skill-miner
pending_steps:
  - drift-evaluator
  - iteration-handoff
```

### After

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
drift:
  score: 12
  level: minor
  next_entry: development
```

## Scoring

```yaml
drift_score:
  0-10: no meaningful drift
  11-30: minor drift
  31-60: medium drift
  61-100: high drift
```

### Routing

| Score | next_entry |
|-------|------------|
| 0-30 | development or done |
| 31-60 | mini_alignment |
| 61-100 | full_alignment |

## Output

Write `.codex/tasks/{task_id}/drift-report.yaml`:

```yaml
task_id:
drift_score:
drift_level:
violations:
  - type:
    standard:
    evidence:
    severity:
next_entry:
reason:
```

## Hard Rules

- 不人为降低 drift_score 来跳过 Alignment
- 所有 violation 必须有可验证证据
- 不修改标准层，只报告偏离