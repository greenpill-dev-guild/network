# Knowledge Commons Graph Explorer Spec

## Goal

Design the next graph explorer as a Regen Knowledge Commons living artifact, not a standalone visualization. The future implementation should begin with a reviewed, portable data model and only later expose a public interface.

## Current State

- The public explorer route and served graph data have been removed from the Astro site.
- Non-public graph source data remains in `data/greenpill-graph/`.
- Research docs and graph-generation scripts remain available as source material.
- The attached Regen Knowledge Commons Toolkit establishes the required posture: source lineage, maturity states, review states, public-use boundaries, relationship grammar, and stewardship.
- The podcast compass artifact proposes a BKC-aligned living artifact for Greenpill Podcast, Ma Earth, and Crypto Altruists.

## Scope

- Data model v0.1 starts from the Toolkit kernel: Resource, Concept, Option, Deployment, and Signal.
- Greenpill extensions include Episode, Person, Project, Organization, Chapter, Guild, Bioregion, Funding Mechanism, Governance Model, Protocol, Practice, Claim, Evidence, Question, and Source System.
- Required fields include source lineage, steward, maturity state, review state, public-use boundary, relationship type, confidence, and last reviewed date.
- Podcast/living artifact layer models Greenpill Podcast, Ma Earth, and Crypto Altruists as separate but connected source systems.
- Export targets are Markdown/YAML, CSV, and JSON-LD before any graph database.
- Public readiness requires relationship grammar, trust and maturity labels, source attribution, steward ownership, and review paths.

## BKC And Greenpill Ontology Direction

- Episodes should be modeled as `bkc:CaseStudy` where they document a practice, pattern, claim, question, or implementation case.
- Greenpill-specific objects should use a future `gp:` namespace for Episode, Podcast, Guest, FundingMechanism, GovernanceModel, Hypercert, Attestation, ImpactMethod, Chapter, Guild, and Project.
- Each entry should remain human-editable first, with machine-readable export second.
- Indigenous knowledge, local chapter details, people maps, and public relationship graphs are high-review surfaces.

## Future Interface Requirements

- Start with internal steward/research views before public views.
- Show maturity and review state directly in the UI.
- Make source lineage visible from every node and relationship.
- Support filters by source system, entity type, theme, bioregion, capital form, review state, and public-use boundary.
- Preserve the two-layer Greenpill model: live network layer, podcast/media layer, and overlap/bridge views.

## Constraints

- `.plans/active/public-website-design-implementation/artifacts/v2/` remains the canonical product and architecture artifact surface.
- `.plans/` carries execution sequencing, readiness, handoffs, and follow-up truth.
- Do not rebuild the public explorer until the public readiness gate is satisfied.
- Use structured Markdown/JSON/CSV first; graph database work is later-stage.

## Open Questions

- Which steward group owns source review for graph entries?
- Which entries can be public, member-only, or internal-only?
- Which fields belong in Keystatic versus a dedicated knowledge commons source table?
- What is the minimum review process for people, indigenous knowledge, and local chapter relationship data?
