# tech-brief-workflow

An agentic workflow for Claude Code that turns a technology question into a cited
**Tech Decision Brief** (Markdown + HTML). Run `/tech-brief <question + constraints>`
and a coordinator gathers missing requirements, picks research subagents for the
question type, runs them in parallel, checks the results against quality gates (with
targeted retries), drafts the brief, and asks for your approval before writing the
final output. Interrupted runs can be resumed.

> Status: under construction. Setup, run and resume sections are filled in as the
> workflow lands.

## Prerequisites

- [Claude Code](https://code.claude.com) 2.1.270 or later, signed in
- Node.js 20 or later (hooks and scripts are dependency-free `.mjs`)
- Git; on Windows, Git for Windows (Claude Code runs hooks through Git Bash)

No API keys or secrets are required: see [.env.example](.env.example). Both MCP servers
(Microsoft Learn, Context7) are remote and keyless.

## Setup

TODO

## Run

TODO

## Resume

TODO

## Sample runs

TODO
