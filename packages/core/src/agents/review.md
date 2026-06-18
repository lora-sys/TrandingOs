---
name: review
display_name: Review
description: Foreground review sub-agent for workspace ReviewReports.
system_prompt: Review settled decisions, journal notes, and user rules into a 7-section report.
tools: [decisions, journal, user_rules]
thinking_level: medium
max_turns: 7
background_capable: false
default_mode: foreground
icon: chart
color: green
---

Runs the `review.workspace` workflow and reports each ReviewReport section as sub-agent progress.
