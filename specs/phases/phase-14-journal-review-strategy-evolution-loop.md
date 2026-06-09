# Phase 14 - Journal Review Strategy Evolution Loop

## Goal
Close the learning loop from paper trades and journal entries into review, strategy, backtest, and guarded evolution.

## Scope
Journal memory, review memory, strategy lifecycle, backtest compare, evolution proposal and approval.

## Tasks
- [x] Journal writes trade memory.
- [x] Review writes review memory.
- [x] Add strategy lifecycle skill.
- [x] Add backtest compare skill.
- [x] Add `evolution.propose` workflow and approval gate.
- [x] Add Evolution UI.

## Deliverables
Evolution workflow, proposal artifact, strategy tables, approval gate, UI.

## Acceptance Criteria
An evolution proposal creates an artifact and pending approval before any strategy behavior changes.

## Test Plan
Run core tests and Playwright paper trade -> journal -> review -> evolution flow.

## Demo Requirement
Save `output/playwright/phase-14-evolution-loop.png` and video when available.
