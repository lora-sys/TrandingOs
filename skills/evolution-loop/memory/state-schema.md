# Evolution Loop State Schema

Evolution Loop 使用两个状态文件进行 relay，遵循 alignment-loop 和 development-loop 相同的模式。

## File Locations

| File | Format | Role |
|------|--------|------|
| `state/evolution.state.yaml` | YAML | Evolution 自身状态（machine-readable） |
| `.codex/logs/evolution.log.md` | Markdown | 按时间顺序的日志（human-readable） |

## evolution.state.yaml Fields

```yaml
phase: evolution             # 固定值
status: idle|running|analyzing|completed|error
task_id: str|null            # 当前处理的 task
iteration: int               # Evolution Loop 迭代编号

current_step: str|null       # 当前正在执行的子 skill
completed_steps: [str]       # 已完成的子 skill 列表
pending_steps: [str]         # 待执行的子 skill 列表

memory_updates:
  facts:
    added: int
    updated: int
  procedures:
    added: int
  decisions:
    added: int

skills:
  created: [str]             # 新创建的 skill 名称列表
  updated: [str]             # 更新的 skill 名称列表

drift:
  score: int|null            # 0-100
  level: str|null            # none / minor / medium / high
  next_entry: str|null       # development / alignment / done

next_iteration:
  id: int|null               # 下一轮迭代编号
  entry: str|null            # 下一轮入口

blockers: [str]
created_at: str|null
completed_at: str|null
```

## Status Values

| Status | Meaning |
|--------|---------|
| `idle` | 等待触发 |
| `running` | Evolution Loop 执行中 |
| `analyzing` | evolution-analyzer 执行中 |
| `completed` | 全部步骤完成 |
| `error` | 流程中断或出错 |

## Drift Level Mapping

| Score | Level | Action |
|-------|-------|--------|
| 0-10 | none | 直接进入 development 或 done |
| 11-30 | minor | development 继续，记录偏离 |
| 31-60 | medium | 触发 mini_alignment |
| 61-100 | high | 触发 full_alignment |
