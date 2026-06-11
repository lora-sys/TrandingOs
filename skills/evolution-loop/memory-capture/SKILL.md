---
name: memory-capture
description: 从本轮任务中抽取事实记忆、程序化记忆和决策记忆。
---

## Inputs

- task spec
- code diff
- verification report
- e2e report
- review report
- evolution report

## Memory Types

### Facts Memory
记录稳定事实：
- 技术栈
- 路由
- API 行为
- 测试命令
- 部署约束
- 已验证的业务规则

### Procedural Memory
记录做事方法：
- 某类任务的实现步骤
- 某类 bug 的排查方式
- 某类 E2E 的写法
- 项目专属工作流

### Decision Memory
记录为什么：
- 为什么选择某方案
- 为什么拒绝某方案
- 为什么降低/提高某约束
- 为什么进入下一轮 loop

## Workflow

1. 从本轮 artifacts 中提取可复用内容
2. 给每条 memory 标记来源：
   - source file
   - task id
   - verification status
   - date
3. 给每条 memory 标记 trust：
   - 5 = 代码/测试验证
   - 4 = 用户确认
   - 3 = review 确认
   - 2 = 推断
   - 1 = 未验证
4. 更新：
   - `.codex/memory/facts.md`
   - `.codex/memory/procedures.md`
   - `.codex/memory/decisions.md`

## State Relay

### Before

```yaml
# .codex/state/evolution.state.yaml
current_step: evolution-analyzer
completed_steps:
  - evolution-analyzer
pending_steps:
  - memory-capture
  - skill-miner
  - drift-evaluator
  - iteration-handoff
```

### After

```yaml
# .codex/state/evolution.state.yaml
current_step: memory-capture
completed_steps:
  - evolution-analyzer
  - memory-capture
pending_steps:
  - skill-miner
  - drift-evaluator
  - iteration-handoff
```

## Memory Entry Template

```md
## [task-id] Title

Type: fact/procedure/decision
Trust: 5
Source: `.codex/tasks/{task_id}/e2e-report.md`
Status: verified

Content:
-

Supersedes:
- none
```

## Hard Rules

- 不记录 token、密码、密钥
- 不记录不确定事实为高 trust
- 不把失败经验当成成功流程
- 不覆盖旧 memory，除非明确标记 superseded