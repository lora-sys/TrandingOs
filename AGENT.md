# Trading Pi Agent Spec

## 1. Purpose
Define the design and responsibilities of the core Trading Pi Agent.

---

## 2. Core Responsibilities
- Receive user messages
- Decide which workflow or skill to execute
- Trigger Skill execution and collect results
- Generate Artifact
- Update Journal and Memory
- Evaluate execution success and identify improvement opportunities
- Support self-evolution through Weakness Mining and Proposal Validation

---

## 3. Input / Output
- Input: User messages, Workflow triggers, Artifact requests
- Output: Execution results, Artifact content, Timeline logs, Evolution proposals

---

## 4. Functional Modules

| Module | Description |
|--------|------------|
| Chat Interface | Receive and interpret user instructions |
| Workflow Engine | Schedule and orchestrate Skill executions |
| Skill Registry | Store available Skills, support Skill creation |
| Artifact Engine | Collect Skill output into artifacts |
| Journal / Memory | Record transactions, Artifact references, execution logs |
| Review Engine | Evaluate execution outcomes, generate insights |
| Evolution Engine | Propose improvements, validate in Sandbox/Paper mode |
| Approval Engine | Manage high-risk actions with human intervention |

---

## 5. Operational Guidelines
- Every new Skill or Workflow must go through test branch
- All outputs must be stored as Artifact with preview support
- High-risk operations require Approval
- Self-evolution loop must be monitored by Evolution Governor
- Agent can only modify Skills / Workflow after proposal validation

---

## 6. Notes
- Integration with Pi Web front-end is required
- Support multi-format Artifact Preview (Markdown, HTML, PDF)
- Must support AIO Sandbox Browser execution for web-related tasks
