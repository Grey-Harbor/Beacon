# Engineering Guidance for Coding Agents

## Project philosophy

Prefer simplicity, explicitness, and maintainability over clever abstractions. Keep modules focused, responsibilities well defined, and architectural boundaries visible. Favor composition over inheritance. Do not add speculative features, adapters, dependencies, or abstraction layers without a demonstrated requirement.

Beacon is a focused redirect-management application. Drift owns authoritative persistence and tenant isolation, Compactor owns redirect execution and event production, and Beacon owns management workflows and disposable read projections. Do not move responsibilities across those boundaries for convenience.

## Architecture

The repository must contain a current, detailed `ARCHITECTURE.md`. Update it whenever a decision changes system boundaries, contracts, request lifecycles, data flow, security controls, extension points, or meaningful tradeoffs. Explain why decisions were made, not merely where files live. Documentation is part of the implementation.

Keep the workspace boundaries explicit:

- `packages/shared` owns cross-runtime contracts and transport types.
- `packages/server` owns configuration, authentication, Drift integration, domain rules, Compactor endpoints, and local projections.
- `apps/web` owns browser interaction and presentation; it must not receive Drift or Compactor credentials.

Drift is authoritative. The local SQLite database is disposable and must remain rebuildable. Always commit authoritative writes to Drift before updating a projection. A projection failure must not roll back or obscure a successful Drift mutation.

## External contracts

Compactor owns its HTTP source and event-sink contracts. Preserve the exact field names, status mapping, validation, and failure semantics documented by Compactor 0.2. Contract changes require tests and updates to `docs/reference/api.md` and `ARCHITECTURE.md`.

Drift owns IDs, tenant isolation, optimistic versions, timestamps, and soft deletion. Keep Drift access behind the typed gateway, validate remote responses, preserve pagination, and surface version conflicts instead of silently overwriting records.

Do not infer redirect destinations, HTTP status policy, response headers, cache policy, proxy trust, event retention, tenant mapping, or archival intent. These are operator or product decisions.

## Documentation

Follow Diátaxis under `docs/`: tutorial, how-to, reference, and explanation. Keep the root `README.md` a short landing page. Use `docs/README.md` as the documentation index and `docs/STYLE.md` for page shape, examples, and the documentation review checklist.

Write in the Grey Harbor voice: calm, practical, independent, and technically confident. Make documentation instructional first while preserving precise technical definitions. Update an existing document before creating a new one, preserve the tone and depth of the existing `docs/` tree, and cross-reference canonical material instead of duplicating contracts.

For every documentation change:

- Give each page one Diátaxis purpose, then begin by telling readers when and why to use it.
- Prefer complete, copyable examples over fragments; state working directory, prerequisites, required headers, variables, and verification where relevant.
- Format JSON for human review. When showing JSONL, pretty-print objects and state that stored or transmitted data uses one complete object per physical line.
- Define inputs, outputs, defaults, invariants, failures, ownership, and operational limitations explicitly.
- Label **Guaranteed** repository or versioned contract behavior, **Recommended** operational advice, and **Adapter-specific** implementation behavior so readers do not confuse them.
- Include rollout, rollback, security, persistence, and observability guidance where operationally relevant. Do not imply that health checks, logs, or backups prove more than they do.
- Write for human and AI adopters: identify safe mechanical transformations and decisions automation must not infer, including tenant ownership, redirect intent, production risk tolerance, credential scope, cache policy, retention policy, release readiness, and rollback timing.
- Update `ARCHITECTURE.md`, `docs/reference/api.md`, and relevant ADRs when a behavior changes their canonical boundary or contract.
- Run `npm run docs:check`, `npm run format:check`, and the production build before committing. `npm run docs:check` validates fenced JSON and local Markdown links; keep it aligned with the documentation tree.

## Planning

Use the local-only, Git-ignored `PLAN.md` before significant features or architectural work. Record the goal, assumptions, affected components, implementation strategy, verification, and rollout considerations. Do not commit `PLAN.md`, and do not begin a large undocumented refactor.

## Code quality and testing

- Target Node.js 22 or newer and preserve strict TypeScript settings.
- Write readable code before optimizing; keep functions focused and public APIs small.
- Favor explicit types, runtime validation at trust boundaries, and meaningful error messages.
- Avoid unnecessary dependencies and remove dead or commented-out code.
- Keep browser navigation same-origin and keep authorization decisions on the server.
- Treat password hashes, session secrets, setup tokens, Drift keys, and Compactor bearer tokens as secrets. Never log or return them.
- Use parameterized SQLite statements and indexes derived from real query patterns.
- Add focused tests with every behavior change and preserve observable behavior during refactors.
- Update tests, documentation, and architecture together when a contract changes.
- Run `npm run ci` before committing. Run `npm audit --omit=dev --audit-level=high` when dependencies change.

Docker-based tests and smoke checks must remove every Docker asset they create after completion or failure, including containers, images, networks, volumes, and temporary files. Never remove pre-existing or user-owned Docker assets.

## User experience

Beacon is a productivity application, not a dashboard or marketing site. Preserve search-first navigation, restrained visual hierarchy, keyboard and touch accessibility, progressive disclosure, and one primary action per screen. Statistics belong with assets. Avoid KPI tiles, excessive cards, dark marketing palettes, flashy gradients, and unnecessary animation.

All interactive controls need accessible names, visible focus treatment, and useful empty, loading, error, and conflict states. Respect reduced-motion preferences. Do not make runtime propagation appear immediate: the bundled Compactor cache window is 30 seconds and stale cached definitions may survive a source outage.

## Licensing

Do not infer a license for Beacon. If maintainers select one, add the canonical `LICENSE` file and keep root/workspace package metadata and documentation aligned. Do not add license or copyright headers to individual source files unless a maintainer explicitly requests them.

## Continuous integration

Keep `.github/workflows/ci.yml` aligned with `npm run ci`, the Node.js 22 minimum, the production dependency audit, and the container build. CI must remain read-only. Do not add branch-based publishing, service deployment, or credential-bearing workflows without explicit maintainer authorization.

`RELEASE.md` is the canonical summary and annotated-tag description for the current release. Keep its version aligned with the root and workspace `package.json` files, and update its summary whenever release-facing behavior changes. Create release tags only from the exact merged `main` commit with:

```sh
git tag -a --cleanup=verbatim <version> -F RELEASE.md
git push origin <version>
```

Verbatim cleanup is required so Git preserves Markdown headings in the tag description. Never rewrite a published tag; prepare `RELEASE.md` for the next version instead.

## Git standards

Treat history as an engineering artifact. Develop every update on a working branch; never make new changes directly on `main`. Start from an up-to-date `main`, create a short descriptive branch such as `feat/search-history`, `fix/source-lookup`, or `docs/deployment`, and do not prefix branch names with `codex/` or another agent name.

Use this workflow for every change:

1. Create or switch to the working branch before editing.
2. Make one logical change per commit and validate it locally.
3. Push the working branch to `origin`.
4. Open a pull request targeting `main` with the change summary and verification evidence.
5. Merge only after required CI and review are complete.
6. Update local `main` from the merged remote before starting other work.

Do not bypass the pull request by pushing commits directly to `main`. Avoid mixing refactors with feature work, and never commit generated output, local databases, secrets, `PLAN.md`, or temporary debugging changes.

Every commit uses Conventional Commits:

```text
<type>(<scope>): <description>
```

Use imperative mood and keep the first line under 72 characters. Preferred types are `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `build`, and `perf`. Add a `BREAKING CHANGE` footer when applicable.

## Release tags

Create a release tag only after the release pull request is merged and local `main` is updated to that exact merged commit. Confirm all `package.json` files and `RELEASE.md` name the same version, rerun `npm run ci` and the production dependency audit, then create and push the annotated tag.

Never tag an unmerged working branch, move or recreate a published tag, or publish a release image from a branch. A future release workflow may publish only from stable semantic-version tags after explicit maintainer approval.

## Review mindset

Work as though every change receives peer review, including work on the default branch. Each modification must be intentional, documented, tested, secure at its trust boundaries, and internally consistent. Leave the codebase clearer than you found it, and keep implementation, tests, architecture, API reference, and release documentation synchronized.
