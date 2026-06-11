---
name: skill-miner
description: 从重复流程、稳定修复路径、成功验证方式中提炼可复用 Skill。
---

## Inputs

- evolution report
- procedures memory
- development log
- verification log
- existing skills

## Create Skill When

满足任一条件：

- 同类任务未来会重复
- 本轮形成稳定步骤
- 某个验证流程可以复用
- 某个修复路径出现 2 次以上
- 用户明确要求沉淀为 skill
- Playwright E2E 形成稳定业务路径

## Do Not Create Skill When

- 只是一次性需求
- 流程没有验证通过
- 信息来源不可信
- 会扩大权限或降低安全标准
- 只是泛泛经验，没有项目特异性

## Workflow

1. 读取 evolution report 的 Skill Candidates
2. 对比已有 skills，判断创建还是更新
3. 若创建新 skill：
   - 生成 `.codex/skills/{skill-name}/SKILL.md`
4. 若更新旧 skill：
   - 追加新触发条件、命令、注意事项
5. 更新 `.codex/state/evolution.state.yaml`

## State Relay

### Before

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

### After

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
skills:
  created: []
  updated: []
```

## Skill Template

```md
---
name: skill-name
description: 什么时候应该调用这个 skill。
---

# Trigger

-

# Inputs

-

# Workflow

1.
2.
3.

# Commands

```bash

```

# Validation

-

# Artifacts

-

# Memory Links

-

# Notes

-
```

## Hard Rules

- 不创建没有实际验证的 skill
- 不创建会降低安全标准的 skill
- 不删除旧 skill，只标记 deprecated