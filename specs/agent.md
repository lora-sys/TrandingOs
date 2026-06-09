# Agent Development Specification (agent.md)

## 1. 核心开发原则
1. **AI First** - 所有智能功能必须通过 AI 模块实现，禁止硬编码逻辑。
2. **阶段化开发** - 每个功能分阶段执行：需求 & Spec → Checklist → 开发 → Code Review → 测试 & 验收 → Demo/End-to-End 测试。
3. **分支管理** - 每个新功能必须创建新分支开发，分支命名：feature/<功能名>。
4. **目录规范** - specs/存放阶段产出，checklists/存放开发任务列表。

## 2. 开发阶段流程
| 阶段 | 输出物 | 验收标准 |
|-------|--------|-----------|
| 设计 & Spec | specs/<feature>.md | 明确功能、输入输出、依赖、AI Skill 使用方式 |
| Checklist | checklists/<feature>.md | 子任务分解清晰、可量化完成 |
| 开发 | 功能实现 | 所有任务完成、覆盖单元测试、AI Skill 实现核心逻辑 |
| Code Review | Review 注释 | Review 合格、代码风格规范、注释完整 |
| 测试 & QA | 测试报告 | 包含浏览器端到端测试截图或 Demo 视频 |
| Demo | Demo 视频 | 展示功能运行效果，符合 Spec 输出 |

## 3. 开发规则
1. **功能隔离** - 新功能独立分支，避免影响主分支稳定性。
2. **AI Skill 使用** - 核心逻辑必须通过 AI Skill 调用，禁止硬编码决策。
3. **测试与验证** - 开发完成后进行端到端验证，使用浏览器或模拟环境录制 Demo。
4. **验收标准** - Spec 与输出一致，功能完整运行，AI 调用可追踪。

## 4. 推荐文件结构
/specs
    <feature>.md
/checklists
    <feature>.md
/src
    /skills
    /extensions
/tests
    /unit
    /e2e
/demos
    <feature>_demo.mp4
/branches
    feature/<feature-name>
