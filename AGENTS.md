# AGENTS.md

Purpose: architecture-specific instructions for coding agents working in vide-component-facsimile.

This file extends and overrides the repository root AGENTS.md for this submodule.

## Scope

Applies to all files under this directory.

## Architecture Overview

Core structure:
- src/index.js: component entry point and custom element registration.
- src/vide-facs.js: top-level container element.
- src/vide-facs-router.js: History API router and route parsing.
- src/viewer-manager.js: OpenSeadragon lifecycle and page rendering orchestration.
- src/filter-controller.js: filter UI interactions and wiring.
- src/filter-state.js: persisted filter model and URL serialization/parsing.
- src/templates.js: HTML template generation.
- src/data-cache.js: shared fetch promise cache.

Tests and tooling:
- tests/filter-state.test.js
- tests/integration.test.js
- vitest.config.mjs (happy-dom environment)

## Change Strategy

When making changes, preserve these boundaries:
- Routing decisions stay in vide-facs-router.js.
- Viewer-specific concerns stay in viewer-manager.js.
- Filter persistence/parsing stays in filter-state.js.
- UI wiring for filters stays in filter-controller.js.
- Avoid introducing cross-module cyclic coupling.

## JavaScript Standard

- StandardJS-compliant code is required.
- Use ESLint Standard configuration for lint checks.
- Keep exported/public APIs documented with JSDoc.

## Local Asset Hosting Policy

- Use locally hosted assets for runtime dependencies.
- Do not add CDN references for JavaScript, CSS, fonts, icons, or image assets.
- Prefer npm-managed dependencies that are bundled with the component build, or vendored static files inside the repository.
- Any temporary external asset URL requires explicit user approval and a documented follow-up to remove it.

## Required Validation Commands

Run in this directory when code changes here:
- npm run test
- npm run test:coverage

When lint script is present, run it as required gate.
If lint script is missing, agents should add/align lint tooling toward StandardJS as part of quality improvements when requested.

## Coverage And Test Rules

- Coverage threshold target: >= 80% lines/functions/branches.
- New features require tests in tests/.
- Behavior changes require updating existing tests.
- Prefer focused unit tests for pure logic and integration tests for router/component interactions.

## Implementation Notes

- Use data-cache.js for network request reuse where possible.
- Keep URL semantics backward-compatible unless change is explicitly requested.
- Preserve SPA behavior with History API and 404 redirect path restoration logic.
- Keep OpenSeadragon integration isolated from routing/filter parsing logic.

## Completion Checklist

Before finalizing changes in this submodule:
- Lint passed.
- Impacted tests passed.
- Full suite passed.
- Coverage checked against threshold.
- Public interfaces documented.
