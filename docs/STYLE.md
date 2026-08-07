# Documentation style and review guide

Use this guide whenever you add or change Beacon documentation. It keeps pages useful to an operator or maintainer completing a task while preserving the exact contracts human and automated adopters need.

## Choose one Diátaxis purpose

Put each page in the section matching the reader's immediate need:

| Section        | Reader need                           | Page shape                                       |
| -------------- | ------------------------------------- | ------------------------------------------------ |
| `tutorial/`    | Learn by completing a guided path     | Ordered steps with a known starting state        |
| `how-to/`      | Accomplish a specific real-world task | Prerequisites, procedure, verification, recovery |
| `reference/`   | Look up an exact contract             | Inputs, outputs, defaults, invariants, failures  |
| `explanation/` | Understand a design choice            | Context, constraints, tradeoffs, consequences    |

Do not make one page serve multiple purposes. Link to the canonical page in another section when a task needs definitions or design context.

## Open with use and intent

The first paragraph must say when the reader should use the page and why it matters. Prefer a direct opening:

> Use this guide when deploying Beacon behind an HTTPS reverse proxy. Browser sessions become secure only when the proxy and Beacon agree on the public scheme and host.

Avoid openings that only repeat the title or describe the document itself.

## Write complete, reviewable examples

Examples must be copyable from a stated working directory or environment. Include required headers, variables, dependencies, and a way to verify the result. Use placeholders that cannot be mistaken for production credentials.

Format JSON across multiple lines:

```json
{
  "title": "Documentation",
  "slug": "docs"
}
```

When documenting JSONL, pretty-print objects for human review and state that the stored or transmitted representation contains one complete JSON object per physical line:

```jsonl
{
  "event_id": "evt_123",
  "outcome": "redirected"
}
{
  "event_id": "evt_124",
  "outcome": "not_found"
}
```

The display above is intentionally expanded. A real JSONL file stores each object on one physical line; whitespace between objects is not part of the format.

## State the contract explicitly

Reference pages and operational guidance must cover applicable contract dimensions:

- **Inputs:** required and optional values, accepted forms, and validation.
- **Outputs:** response shape, persisted effects, and generated artifacts.
- **Defaults:** behavior when a caller omits a value.
- **Invariants:** rules that remain true across implementations.
- **Failures:** status or exit behavior, partial effects, and recovery.
- **Ownership:** which layer, operator, tenant, or client controls the value.
- **Limitations:** bounds, unsupported operations, and environment constraints.

Use these labels consistently:

- **Guaranteed:** part of Beacon's versioned public or repository contract.
- **Recommended:** operational advice that adopters may deliberately adapt.
- **Adapter-specific:** behavior of the Drift or SQLite integration rather than a portable Beacon contract.

The canonical external contract is [the HTTP API reference](./reference/api.md). `ARCHITECTURE.md` is canonical for workspace ownership and system boundaries. Link to those pages rather than copying a contract into guides.

## Cover operations when relevant

Deployment, credentials, persistence, projection, and release changes must explain rollout prerequisites and verification, rollback and compatibility boundaries, security effects, durable-state backup/restore/deletion behavior, and available health, logs, or metrics signals. Say plainly when Beacon lacks a capability; a health endpoint, backup, or log signal proves only its documented scope.

## Guide automation safely

Write for human readers and automation, including AI-assisted maintenance. Identify safe mechanical transformations, such as formatting JSON or updating an already verified version string.

Do not ask automation to infer redirect intent, tenant ownership, production risk tolerance, credential scope, cache policy, retention policy, release readiness, or rollback timing. An operator or maintainer must supply or approve those decisions.

## Documentation review checklist

Before committing a documentation change, confirm:

- [ ] The page has one Diátaxis purpose and opens with when and why to use it.
- [ ] Procedures use complete, copyable examples and include verification.
- [ ] JSON is readable; JSONL is expanded for review and its physical-line format is stated.
- [ ] Applicable inputs, outputs, defaults, invariants, failures, ownership, and limitations are explicit.
- [ ] Guaranteed, recommended, and adapter-specific behavior are distinguishable.
- [ ] Operational pages cover rollout, rollback, security, persistence, and observability where relevant.
- [ ] Automation guidance separates safe transformations from human decisions.
- [ ] Canonical contracts are linked rather than duplicated.
- [ ] Fenced JSON and internal links pass `npm run docs:check`.
- [ ] Markdown passes `npm run format:check`.
- [ ] The production workspace build passes `npm run build`.
