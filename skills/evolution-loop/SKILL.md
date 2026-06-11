---
name: evolution-loop
description: 在每轮开发和验证结束后，回收经验、更新记忆、提炼技能，并决定下一轮从哪里开始。
---

## Preconditions

- Development Loop 已结束
- Verification State 存在
- Review Report 存在
- 当前任务有 task_id
- 不允许跳过 Memory Capture

## Inputs

- `.codex/state/global.state.yaml`
- `.codex/state/development.state.yaml`
- `.codex/state/verification.state.yaml`
- `.codex/state/alignment.state.yaml`
- `.codex/tasks/{task_id}/current-task-spec.md`
- `.codex/tasks/{task_id}/review.md`
- `.codex/logs/development.log.md`
- `.codex/logs/verification.log.md`
- `.codex/memory/facts.md`
- `.codex/memory/procedures.md`
- `.codex/memory/decisions.md`

## Workflow

1. **evolution-analyzer** — 分析本轮开发、验证、审查结果，生成经验报告
2. **memory-capture** — 从本轮任务中抽取事实记忆、程序化记忆和决策记忆
3. **skill-miner** — 从重复流程、稳定修复路径、成功验证方式中提炼可复用 Skill
4. **drift-evaluator** — 判断本轮结果是否偏离 Alignment 标准层，并决定是否需要重新对齐
5. **iteration-handoff** — 根据 Evolution 结果更新全局状态，并把项目交接给下一轮 Loop

## State Relay

### Before

```yaml
# .codex/state/global.state.yaml
current_phase: verification
current_task: "{task_id}"
task_status: completed
next_agent: null
```

### After

```yaml
# .codex/state/global.state.yaml
current_phase: evolution
current_task: "{task_id}"
task_status: completed

last_development:
  completed_at: "<timestamp>"
  branch: "feature/{task-id}"
  merge_ready: true

routing:
  next_entry: development  # or alignment / done
  reason: "..."
```

## Hard Rules

- 不直接修改业务代码
- 不降低验证标准
- 不偷偷修改 `claude.md` / `AGENTS.md`
- 如果要修改标准层，只能建议进入 Alignment Loop
- 所有新增 memory 必须有来源
- 所有新 skill 必须来自至少一次真实成功或失败经验

## Outputs

- `.codex/state/evolution.state.yaml`
- `.codex/logs/evolution.log.md`
- `.codex/tasks/{task_id}/evolution-report.md`
- `.codex/tasks/{task_id}/drift-report.yaml`
- `.codex/tasks/{task_id}/handoff.md`
- 更新后的 memory (facts.md / procedures.md / decisions.md)
- 新增或更新的 skill

## Automations

- **weekly-evolution-review** — 每周检查最近迭代的 E2E/Review 结果，自动触发 skill-miner 和 drift-evaluator
