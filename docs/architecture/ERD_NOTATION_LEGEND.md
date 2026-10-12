# ERD Notation Legend

**Purpose:** Defines the crow's-foot notation used in all KilosUnlad ERD
diagrams (Styles A and B).

**Applies to:**
- `docs/architecture/ERD.md` — Physical model (Style A)
- `docs/architecture/ERD.md` — Conceptual model (Style B)

**Placement in paper:** Immediately after the first ERD diagram, or in the
"List of Figures" section as a standalone legend.

---

## Cardinality Symbols

| Symbol      | Cardinality                    | Example Use |
|-------------|--------------------------------|-------------|
| `||--||`    | One-to-one (exactly one on both sides) | `users` — `user_jurisdictions` |
| `||--o|`    | One-to-zero-or-one (optional on right side) | `beneficiaries` — `external_records` |
| `||--|{`    | One-to-one-or-more | (not used in KilosUnlad) |
| `||--o{`    | One-to-zero-or-more (one-to-many) | `beneficiaries` — `verification_tasks` |
| `}o--o{`    | Zero-or-more to zero-or-more | (not used in KilosUnlad) |

## Key Markers

| Marker | Meaning |
|--------|---------|
| `PK`   | Primary key — unique identifier for the entity or sub-entity |
| `UK`   | Unique key — enforced by a MongoDB unique index |
| `FK`   | Foreign key — declared as a Mongoose `ref` to another collection |

## Notes on Rendering

KilosUnlad ERDs are authored in Mermaid and rendered in GitHub, VS Code,
and standard Markdown viewers. Mermaid uses crow's-foot notation for
entity relationships.

Mermaid does not visually distinguish between a Mongoose-enforced
`ref` and an application-level string reference. Both are rendered as
identifying relationships. The semantic difference is documented in
the "Cross-Collection Reference Types" table
(`docs/architecture/ERD_REFERENCE_TYPES.md`).

---

**End of Legend**