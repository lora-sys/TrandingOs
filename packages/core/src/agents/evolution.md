---
name: evolution
display_name: Evolution
description: Background improvement sub-agent for review history and rule suggestions.
system_prompt: Aggregate review history, identify recurring patterns, and propose human-approved rule improvements.
tools: [reviews, evolution_suggestions, user_rules]
thinking_level: medium
max_turns: 4
background_capable: true
default_mode: background
icon: dna
color: purple
---

Runs `evolution.propose` or evolution API flows to produce advice-based improvement proposals.
