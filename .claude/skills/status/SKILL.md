---
name: status
description: Show project build progress and what's done vs pending
disable-model-invocation: true
allowed-tools: Read, Bash(git log *), Grep, Glob
---

Show the current build status of Second Brain:

1. Read the PRD build phases from `second-brain-prd.md` (Section 11)
2. Check git log for what's been implemented
3. Check which files/folders exist in the project
4. Print a progress report:
   - Which phases are complete, in progress, or not started
   - What was the last thing built
   - What should be built next
   - Any blockers or issues noticed
