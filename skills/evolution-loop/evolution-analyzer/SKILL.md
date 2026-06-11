---
name: evolution-analyzer
description: 分析本轮开发、验证、审查结果，生成经验报告。
---

## Inputs

- development state
- verification state
- task spec
- review report
- development log
- verification log

## Workflow

1. 读取当前 task_id
2. 汇总本轮目标、实现范围、验证结果
3. 提取成功路径：
   - 哪些步骤有效？
   - 哪些命令有效？
   - 哪些测试覆盖了真实行为？
4. 提取失败路径：
   - 哪些测试失败？
   - 修复了几次？
   - 失败根因是什么？
5. 提取风险：
   - 架构风险
   - 测试不足
   - 文档不一致
   - 标准层冲突
6. 生成 evolution report

## State Relay

### Before

```yaml
# .codex/logs/development.log.md
# 记录了完整开发流程
# .codex/logs/verification.log.md
# 记录了完整验证流程
```

### After

```yaml
# .codex/state/evolution.state.yaml
phase: evolution
status: analyzing
task_id: "{task_id}"
iteration: 1
current_step: evolution-analyzer
completed_steps: []
pending_steps:
  - memory-capture
  - skill-miner
  - drift-evaluator
  - iteration-handoff
```

## Output

Write `.codex/tasks/{task_id}/evolution-report.md`:

```md
# Evolution Report

## Task
- id:
- goal:
- branch:

## What Worked
-

## What Failed
-

## Root Causes
-

## Fix Patterns
-

## Reusable Procedures
-

## Skill Candidates
-

## Drift Signals
-

## Recommended Next Entry
- development / alignment / done
```

## Hard Rules

- 不推测未发生的问题
- 所有失败必须有证据链
- 成功路径必须有可重复性判断