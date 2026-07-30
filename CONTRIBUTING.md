# Contributing to llmjudge

Thanks for helping build llmjudge. This document covers the workflow and the
engineering standards every change is held to — code review enforces them, so
reading this once saves you a review round-trip.

Questions or design discussions: open an issue. The maintainer of record is
[abj360](https://github.com/abj360).

## Workflow

1. **Fork** the repository ([abj360/llmjudge](https://github.com/abj360/llmjudge))
   and add it as a remote named after your GitHub username.
2. **Branch** from `main` using `<type>/<short-description>`, e.g.
   `feat/citation-accuracy-metric`, `fix/audit-index`. Types: `feat`, `fix`,
   `perf`, `refactor`, `test`, `chore`, `docs`, `ci`, `style`.
3. **Commit** in small, atomic steps using conventional prefixes
   (`feat(api): add results comparison endpoint`). Each commit does one
   logical thing and could be reverted cleanly on its own. Messages describe
   the change in plain language, not the diff.
4. **Push your branch to your own fork** and open a PR against
   [abj360/llmjudge](https://github.com/abj360/llmjudge) `main`. PRs stay
   small enough to review in one sitting — split large features into a stack.
5. CI must be green (lint, type-check, unit + integration tests, security
   scans, merge-gate). One approving review from a maintainer merges the PR;
   fast-forward only, no merge commits.

## Engineering standards

These apply to every file you touch. The full version lives in the team's
standards doc; this is the enforced summary.

### Code style

- **Python:** Ruff for linting and formatting, `mypy --strict` clean. Line
  length 100, double quotes.
- **TypeScript/JavaScript:** ESLint + Prettier, `tsc --strict`. Line length
  100, double quotes.
- **Everything else** (JSON, YAML, Markdown, CSS): Prettier.
- All of the above run as pre-commit hooks *and* as CI gates — run them
  locally before pushing (`ruff check .`, `ruff format --check .`,
  `mypy --strict …`, `pytest tests/`).

### File headers

Every source file starts with a shebang and a structured module docstring:

```python
#!/usr/bin/env python3
"""
results_store.py --- Postgres-backed store for eval runs and metric scores

Contains:
    ResultsStore: persists runs and scores
    ResultsStore.get_run(): fetches one run with its scores
"""
```

TS/JS files use `#!/usr/bin/env node` (or `ts-node`) with the same `/** … */`
block. Import order: stdlib, blank line, third-party, blank line, local.

### Docstrings

Every function, method, and class gets one — no exceptions. Line 1 starts with
a third-person verb ending in "s" (`Computes`, `Validates`, `Resolves`).
`Args:` / `Returns:` sections are added when there's something to say (omit
them otherwise); classes get `Attributes:` for meaningful state. If a
docstring needs more than a couple of lines per section, split the function.

### Comments

Minimal by policy. Name things well instead. Comment only the genuinely
non-obvious: a business rule, a library workaround, a deliberate deviation, a
magic constant with a real source. No restating-the-code comments, no
commented-out dead code — git history is the archive.

### Design

- One responsibility per function and per class; functions stay under ~30
  lines. Composition over inheritance; small explicit interfaces; dependency
  injection over global state. No god files — split along concern lines.
- Prefer immutable data (`@dataclass(frozen=True)`, readonly TS types).
- Full type hints on every signature; no `Any` without a one-line
  justification. `strict: true` in TS, no unchecked `!` assertions.
- Catch specific exceptions. **Fail closed, not open**: a timeout or
  unexpected state must block/reject, never silently pass (this rule exists
  because of a real incident in this repo's merge gate).
- No secrets in code, ever — `.env` only, and `.env` is gitignored.

### Naming

`snake_case` functions/variables, `PascalCase` classes/components,
`UPPER_SNAKE_CASE` constants; `kebab-case.ts` / `PascalCase.tsx` files.
Booleans read as questions (`is_ready`, `has_citation`). No invented
abbreviations; names say what a thing is or does.

### Testing

- Tests live next to what they test (`tests/unit`, `tests/integration`,
  `tests/golden` mirroring the source tree).
- New logic ships with tests in the same PR — not a follow-up ticket.
- A test must be able to fail: assert on real behavior, never on a mock that
  always succeeds. Use the scripted `StubJudge` for metric tests; no test ever
  talks to a real model or a real database.
- Golden-set tests pin end-to-end scores so refactors can't silently shift
  them — update the gold files deliberately, never to make a red test green.

## Pre-merge checklist

- [ ] Ruff / ESLint clean, formatter applied
- [ ] `mypy --strict` / `tsc --strict` clean
- [ ] Every new function/class has a verb-first docstring
- [ ] No commented-out code, no restating-the-obvious comments
- [ ] Tests added alongside the change, and they can actually fail
- [ ] Commits are atomic, conventional-prefixed, and authored as you
- [ ] `docker compose -f docker/docker-compose.yml up --build` still boots the
      whole stack cleanly

## Reporting issues

Bugs, regressions, and feature requests go through GitHub issues. Include a
minimal reproduction (a failing test case is ideal), the metric or subsystem
involved, and whether it's blocking a merge gate downstream. Security reports
(safety-pack gaps, injection vectors, secret handling) get the `security`
label and priority review.
