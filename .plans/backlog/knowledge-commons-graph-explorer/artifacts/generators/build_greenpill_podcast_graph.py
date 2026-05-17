#!/usr/bin/env python3

"""
Build graph-friendly podcast datasets from the GreenPill feed catalog.

Outputs:
- artifacts/greenpill-graph/podcast/greenpill-podcast.graph.json
- artifacts/greenpill-graph/podcast/greenpill-podcast-entity-index.json
- artifacts/greenpill-graph/greenpill-network-expanded.graph.json

The generator is intentionally hybrid:
- episode/theme/series layers are automated from the feed catalog
- guest extraction uses title/summary heuristics
- org/project extraction uses a curated matcher so the graph stays usable
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from pathlib import Path


HUB_ROOT = Path(__file__).resolve().parents[2]
GRAPH_ROOT = HUB_ROOT / "artifacts" / "greenpill-graph"
MAIN_GRAPH_PATH = GRAPH_ROOT / "greenpill-network.graph.json"
FEED_PATH = GRAPH_ROOT / "podcast" / "greenpill-podcast-feed.json"
OUT_GRAPH_PATH = GRAPH_ROOT / "podcast" / "greenpill-podcast.graph.json"
OUT_INDEX_PATH = GRAPH_ROOT / "podcast" / "greenpill-podcast-entity-index.json"
OUT_COMBINED_PATH = GRAPH_ROOT / "greenpill-network-expanded.graph.json"


HOSTS = {
    "Kevin": {
        "id": "person-kevin-owocki",
        "label": "Kevin Owocki",
        "description": "GreenPill founder and primary podcast host.",
        "url": "https://x.com/owocki",
    },
    "Kevin Owocki": {
        "id": "person-kevin-owocki",
        "label": "Kevin Owocki",
        "description": "GreenPill founder and primary podcast host.",
        "url": "https://x.com/owocki",
    },
    "Owocki": {
        "id": "person-kevin-owocki",
        "label": "Kevin Owocki",
        "description": "GreenPill founder and primary podcast host.",
        "url": "https://x.com/owocki",
    },
    "Kevin Owocki & Rena": {
        "id": "person-kevin-owocki",
        "label": "Kevin Owocki",
        "description": "GreenPill founder and primary podcast host.",
        "url": "https://x.com/owocki",
    },
    "Kevin & Rena": {
        "id": "person-kevin-owocki",
        "label": "Kevin Owocki",
        "description": "GreenPill founder and primary podcast host.",
        "url": "https://x.com/owocki",
    },
    "Primavera De Filippi": {
        "id": "person-primavera-de-filippi",
        "label": "Primavera De Filippi",
        "description": "Host of the Network Nations mini-series.",
        "url": "https://blockchaingov.eu/author/primavera-de-filippi/",
    },
    "Primavera De Filippi and Felix Beer": {
        "id": "person-primavera-de-filippi",
        "label": "Primavera De Filippi",
        "description": "Host of the Network Nations mini-series.",
        "url": "https://blockchaingov.eu/author/primavera-de-filippi/",
    },
    "Felix Beer": {
        "id": "person-felix-beer",
        "label": "Felix Beer",
        "description": "Host and collaborator on Network Nations episodes.",
        "url": "https://networknations.network",
    },
    "Kris": {
        "id": "person-kris-miller",
        "label": "Kris Miller",
        "description": "Host of the VDAO x Greenpill anti-fragility mini-series.",
        "url": None,
    },
    "Marc & Kris": {
        "id": "person-kris-miller",
        "label": "Kris Miller",
        "description": "Host of the VDAO x Greenpill anti-fragility mini-series.",
        "url": None,
    },
    "Kris Miller": {
        "id": "person-kris-miller",
        "label": "Kris Miller",
        "description": "Host of the VDAO x Greenpill anti-fragility mini-series.",
        "url": None,
    },
}

HOST_NAME_SET = {value["label"].lower() for value in HOSTS.values()}
HOST_NAME_SET.update({"kevin", "primavera", "kris"})

KNOWN_MONONYMS = {"Gardner", "Shaw"}

PERSON_BLOCKLIST_WORDS = {
    "dao",
    "protocol",
    "project",
    "observer",
    "network",
    "earth",
    "capital",
    "economy",
    "humanity",
    "book",
    "funding",
    "goods",
    "podcast",
    "greenpill",
    "nation",
    "launch",
    "software engineer",
    "technology",
}

SERIES = {
    "greenpill_mainline": {
        "id": "podcast-series-greenpill-mainline",
        "label": "GreenPill Mainline",
        "description": "Core GreenPill interviews across public goods, Ethereum, coordination, governance, and adjacent ideas.",
        "tags": ["podcast", "mainline"],
        "color": "#60A5FA",
    },
    "network_nations": {
        "id": "podcast-series-network-nations",
        "label": "Network Nations",
        "description": "Mini-series exploring network states, digital political communities, and new institutional forms.",
        "tags": ["podcast", "network-nations"],
        "color": "#A78BFA",
    },
    "vdao_antifragile": {
        "id": "podcast-series-vdao-antifragile",
        "label": "VDAO x Greenpill Anti-Fragile Network States",
        "description": "Mini-series on resilience, local living systems, regenerative communities, and anti-fragile infrastructure.",
        "tags": ["podcast", "resilience", "anti-fragility"],
        "color": "#34D399",
    },
    "other_or_special": {
        "id": "podcast-series-specials",
        "label": "Specials and Experiments",
        "description": "Standalone episodes, crossovers, book launches, and experimental formats in the GreenPill feed.",
        "tags": ["podcast", "special"],
        "color": "#F59E0B",
    },
}

THEMES = {
    "ai_agents": {
        "label": "AI Agents",
        "description": "Agentic systems, autonomous coordination, and machine-mediated collaboration.",
        "capital_forms": ["technical", "coordination", "operational"],
        "color": "#FB7185",
    },
    "public_goods_funding": {
        "label": "Public Goods Funding",
        "description": "Grants, retrofunding, capital allocation, and public-goods finance design.",
        "capital_forms": ["financial", "governance", "coordination"],
        "color": "#F59E0B",
    },
    "open_source": {
        "label": "Open Source",
        "description": "Open-source software, digital commons, shared tooling, and builder ecosystems.",
        "capital_forms": ["technical", "knowledge", "reputational"],
        "color": "#38BDF8",
    },
    "reputation_identity": {
        "label": "Reputation and Identity",
        "description": "Identity layers, proof systems, attestations, and credibility primitives.",
        "capital_forms": ["reputational", "governance", "social"],
        "color": "#22C55E",
    },
    "localism_bioregion": {
        "label": "Localism and Bioregion",
        "description": "Place-based coordination, local economies, land, food, and bioregional thinking.",
        "capital_forms": ["ecological", "social", "cultural"],
        "color": "#14B8A6",
    },
    "coordination_mechanisms": {
        "label": "Coordination Mechanisms",
        "description": "Mechanism design, collective intelligence, and new ways to align actors at scale.",
        "capital_forms": ["coordination", "governance", "technical"],
        "color": "#8B5CF6",
    },
    "network_nations": {
        "label": "Network Nations",
        "description": "Digital political communities, network states, and translocal social organization.",
        "capital_forms": ["governance", "coordination", "cultural"],
        "color": "#C084FC",
    },
    "governance": {
        "label": "Governance",
        "description": "Institutions, legitimacy, roles, permissions, and collective decision-making.",
        "capital_forms": ["governance", "coordination", "reputational"],
        "color": "#F472B6",
    },
    "community_building": {
        "label": "Community Building",
        "description": "Belonging, rituals, participation, culture, and social infrastructure.",
        "capital_forms": ["social", "coordination", "cultural"],
        "color": "#10B981",
    },
    "resilience_regeneration": {
        "label": "Resilience and Regeneration",
        "description": "Living systems, ecological repair, anti-fragility, and regenerative practice.",
        "capital_forms": ["ecological", "social", "operational"],
        "color": "#84CC16",
    },
}

THEME_KEYWORDS = {
    "ai_agents": [
        "ai agent",
        "agentic",
        "elizaos",
        "llm",
        "alignment",
        "openclaw",
        "fossrpg",
    ],
    "public_goods_funding": [
        "public goods funding",
        "retrofund",
        "retro funding",
        "funding",
        "grants",
        "grant",
        "capital allocation",
        "gitcoin",
        "allo",
        "giveth",
        "fund",
        "pgf",
        "hypercert",
        "impact cert",
    ],
    "open_source": [
        "open source",
        "open-source",
        "oss",
        "foss",
        "protocol labs",
        "builder",
        "github",
    ],
    "reputation_identity": [
        "identity",
        "reputation",
        "attestation",
        "attestations",
        "proof of humanity",
        "circles ubi",
        "credential",
        "credentials",
        "hypercert",
        "eas",
    ],
    "localism_bioregion": [
        "localism",
        "bioregion",
        "bioregional",
        "local commons",
        "community currency",
        "local economy",
        "food",
        "soil",
        "permaculture",
        "sarafu",
        "grassroots economics",
        "local ",
    ],
    "coordination_mechanisms": [
        "coordination",
        "mechanism",
        "collective intelligence",
        "quadratic",
        "qf",
        "protocol",
        "schelling",
        "swarms",
        "game",
        "allo",
    ],
    "network_nations": [
        "network nation",
        "network state",
        "zuzalu",
        "liberland",
        "seedao",
        "embassy network",
        "new jurisdictions",
        "intentional communities",
        "burning man",
        "proto network nation",
    ],
    "governance": [
        "governance",
        "voting",
        "democracy",
        "legitimacy",
        "institution",
        "institutional",
        "dao",
        "protocol politics",
        "op gc",
    ],
    "community_building": [
        "community",
        "communities",
        "movement",
        "belonging",
        "culture",
        "narrative",
        "ritual",
        "collective agency",
        "scenius",
    ],
    "resilience_regeneration": [
        "resilience",
        "regeneration",
        "regenerative",
        "anti-fragile",
        "antifragile",
        "ecology",
        "ecological",
        "living systems",
        "nature",
        "regen",
        "soil",
        "commons",
    ],
}

ENTITY_DEFS = [
    {
        "id": "project-openclaw",
        "label": "OpenClaw",
        "node_type": "project",
        "cluster": "ai-agents",
        "visual_group": "project",
        "color": "#FB7185",
        "description": "AI agent coordination project discussed in the 2026 agentic economy episode.",
        "url": None,
        "tags": ["ai-agents", "ethereum"],
        "patterns": [r"\bopenclaw\b"],
    },
    {
        "id": "partner-elizaos",
        "label": "ElizaOS",
        "node_type": "partner_org",
        "cluster": "ai-agents",
        "visual_group": "partner",
        "color": "#FB7185",
        "description": "Open-source AI agent ecosystem referenced across GreenPill AI episodes.",
        "url": "https://elizaos.ai",
        "tags": ["ai-agents", "open-source"],
        "patterns": [r"\belizaos\b"],
    },
    {
        "id": "project-fossrpg",
        "label": "FOSSRPG",
        "node_type": "project",
        "cluster": "ai-agents",
        "visual_group": "project",
        "color": "#FB7185",
        "description": "Agent-native game project surfaced in recent AI episodes.",
        "url": None,
        "tags": ["ai-agents", "games"],
        "patterns": [r"\bfossrpg\b"],
    },
    {
        "id": "project-opencivics",
        "label": "OpenCivics Project",
        "node_type": "project",
        "cluster": "governance",
        "visual_group": "project",
        "color": "#A78BFA",
        "description": "Community-building and civic organizing project referenced in Network Nations.",
        "url": None,
        "tags": ["network-nations", "movement-building"],
        "patterns": [r"\bopencivics\b"],
    },
    {
        "id": "partner-seedao",
        "label": "SeeDAO",
        "node_type": "partner_org",
        "cluster": "network-nations",
        "visual_group": "partner",
        "color": "#A78BFA",
        "description": "Diasporic web3 community discussed as a proto network nation.",
        "url": "https://seedao.xyz",
        "tags": ["network-nations", "diaspora"],
        "patterns": [r"\bseedao\b"],
    },
    {
        "id": "partner-embassy-network",
        "label": "Embassy Network",
        "node_type": "partner_org",
        "cluster": "network-nations",
        "visual_group": "partner",
        "color": "#A78BFA",
        "description": "Intentional community network referenced in discussions of new jurisdictions.",
        "url": "https://www.embassynetwork.com",
        "tags": ["network-nations", "intentional-community"],
        "patterns": [r"\bembassy network\b"],
    },
    {
        "id": "partner-democracy-earth",
        "label": "Democracy Earth",
        "node_type": "partner_org",
        "cluster": "governance",
        "visual_group": "partner",
        "color": "#F472B6",
        "description": "Digital democracy project connected to protocol politics and legitimacy.",
        "url": "https://democracy.earth",
        "tags": ["governance", "civic-tech"],
        "patterns": [r"\bdemocracy earth\b"],
    },
    {
        "id": "project-democracyos",
        "label": "DemocracyOS",
        "node_type": "project",
        "cluster": "governance",
        "visual_group": "project",
        "color": "#F472B6",
        "description": "Open-source governance interface surfaced through Santiago Siri episodes.",
        "url": None,
        "tags": ["governance", "civic-tech"],
        "patterns": [r"\bdemocracyos\b"],
    },
    {
        "id": "project-proof-of-humanity",
        "label": "Proof of Humanity",
        "node_type": "project",
        "cluster": "identity",
        "visual_group": "project",
        "color": "#22C55E",
        "description": "Identity protocol referenced in episodes on digital personhood and legitimacy.",
        "url": "https://www.proofofhumanity.id",
        "tags": ["identity", "reputation"],
        "patterns": [r"\bproof of humanity\b"],
    },
    {
        "id": "project-zuzalu",
        "label": "Zuzalu",
        "node_type": "project",
        "cluster": "network-nations",
        "visual_group": "project",
        "color": "#A78BFA",
        "description": "Pop-up network society frequently used as a reference point for network nations.",
        "url": "https://zuzalu.city",
        "tags": ["network-nations", "popup-city"],
        "patterns": [r"\bzuzalu\b"],
    },
    {
        "id": "partner-burning-man",
        "label": "Burning Man",
        "node_type": "partner_org",
        "cluster": "network-nations",
        "visual_group": "partner",
        "color": "#A78BFA",
        "description": "Referenced as a living example of culture, ritual, and temporary institutions.",
        "url": "https://burningman.org",
        "tags": ["network-nations", "culture"],
        "patterns": [r"\bburning man\b"],
    },
    {
        "id": "project-enova",
        "label": "ENOVA",
        "node_type": "project",
        "cluster": "community",
        "visual_group": "project",
        "color": "#10B981",
        "description": "Project mentioned in recent episodes on hyperstitions and networked belief systems.",
        "url": "https://en0va.xyz",
        "tags": ["community-building", "narratives"],
        "patterns": [r"\benova\b"],
    },
    {
        "id": "partner-open-source-observer",
        "label": "Open Source Observer",
        "node_type": "partner_org",
        "cluster": "open-source",
        "visual_group": "partner",
        "color": "#38BDF8",
        "description": "Open-source impact and ecosystem intelligence project featured across funding episodes.",
        "url": "https://www.opensource.observer",
        "tags": ["open-source", "metrics"],
        "patterns": [r"\bopen source observer\b", r"\bopensource observer\b"],
    },
    {
        "id": "project-allo-protocol",
        "label": "Allo Protocol",
        "node_type": "project",
        "cluster": "funding",
        "visual_group": "project",
        "color": "#F59E0B",
        "description": "Capital allocation protocol featured in funding and governance episodes.",
        "url": "https://www.allo.capital",
        "tags": ["public-goods-funding", "capital-allocation"],
        "patterns": [r"\ballo protocol\b"],
    },
    {
        "id": "partner-allo-capital",
        "label": "Allo Capital",
        "node_type": "partner_org",
        "cluster": "funding",
        "visual_group": "partner",
        "color": "#F59E0B",
        "description": "Funding mechanism design partner and research surface referenced in multiple episodes.",
        "url": "https://www.allo.capital",
        "tags": ["public-goods-funding", "capital-allocation"],
        "patterns": [r"\ballo\.capital\b", r"\ballo capital\b"],
    },
    {
        "id": "platform-gardens",
        "label": "Gardens",
        "node_type": "platform",
        "cluster": "funding",
        "visual_group": "platform",
        "color": "#F59E0B",
        "description": "Gardens funding platform referenced in builder and capital allocation episodes.",
        "url": "https://app.gardens.fund",
        "tags": ["public-goods-funding", "platform"],
        "patterns": [r"\bgardens\b"],
    },
    {
        "id": "partner-ethereum-foundation",
        "label": "Ethereum Foundation",
        "node_type": "partner_org",
        "cluster": "ethereum",
        "visual_group": "partner",
        "color": "#60A5FA",
        "description": "Ethereum institutional layer referenced in governance and ecosystem strategy episodes.",
        "url": "https://ethereum.foundation",
        "tags": ["ethereum", "governance"],
        "patterns": [r"\bethereum foundation\b"],
    },
    {
        "id": "project-ethereum-localism",
        "label": "Ethereum Localism",
        "node_type": "project",
        "cluster": "localism",
        "visual_group": "project",
        "color": "#14B8A6",
        "description": "Localism project and discourse stream connecting Ethereum with place-based coordination.",
        "url": "https://ethereumlocalism.xyz",
        "tags": ["localism", "bioregion"],
        "patterns": [r"\bethereum localism\b"],
    },
    {
        "id": "partner-eigenlayer",
        "label": "EigenLayer",
        "node_type": "partner_org",
        "cluster": "coordination",
        "visual_group": "partner",
        "color": "#8B5CF6",
        "description": "Shared security and coordination infrastructure referenced in governance episodes.",
        "url": "https://www.eigenlayer.xyz",
        "tags": ["governance", "coordination"],
        "patterns": [r"\beigenlayer\b"],
    },
    {
        "id": "project-eigengov",
        "label": "EigenGov",
        "node_type": "project",
        "cluster": "governance",
        "visual_group": "project",
        "color": "#8B5CF6",
        "description": "Governance layer explored through EigenLayer-related conversations.",
        "url": None,
        "tags": ["governance", "coordination"],
        "patterns": [r"\beigengov\b"],
    },
    {
        "id": "project-potlock",
        "label": "Potlock",
        "node_type": "project",
        "cluster": "funding",
        "visual_group": "project",
        "color": "#F59E0B",
        "description": "Public-goods funding project mentioned in AI-assisted grant allocation episodes.",
        "url": "https://potlock.org",
        "tags": ["public-goods-funding", "ai"],
        "patterns": [r"\bpotlock\b"],
    },
    {
        "id": "project-ai-pgf",
        "label": "AI-PGF",
        "node_type": "project",
        "cluster": "funding",
        "visual_group": "project",
        "color": "#F59E0B",
        "description": "AI-assisted public-goods funding initiative referenced in grants episodes.",
        "url": "https://aipgf.com",
        "tags": ["public-goods-funding", "ai"],
        "patterns": [r"\bai-?pgf\b"],
    },
    {
        "id": "project-sunny-awards",
        "label": "SUNNY Awards",
        "node_type": "project",
        "cluster": "funding",
        "visual_group": "project",
        "color": "#F59E0B",
        "description": "Metrics-driven incentives and recognition layer referenced in Optimism-related episodes.",
        "url": "https://thesunnyawards.fun",
        "tags": ["public-goods-funding", "metrics"],
        "patterns": [r"\bsunnys?\b"],
    },
    {
        "id": "project-grants-program-registry",
        "label": "Grants Program Registry",
        "node_type": "project",
        "cluster": "funding",
        "visual_group": "project",
        "color": "#F59E0B",
        "description": "Registry and coordination effort for mapping grant programs.",
        "url": None,
        "tags": ["public-goods-funding", "registry"],
        "patterns": [r"\bgrants program registry\b"],
    },
    {
        "id": "platform-karma-gap",
        "label": "Karma GAP",
        "node_type": "platform",
        "cluster": "funding",
        "visual_group": "platform",
        "color": "#F59E0B",
        "description": "Impact reporting platform surfaced in grant registry and reporting episodes.",
        "url": "https://gap.karmahq.xyz",
        "tags": ["public-goods-funding", "impact-reporting"],
        "patterns": [r"\bkarma gap\b", r"\bgap\.karmahq\.xyz\b"],
    },
    {
        "id": "project-grant-ships",
        "label": "Grant Ships",
        "node_type": "project",
        "cluster": "funding",
        "visual_group": "project",
        "color": "#F59E0B",
        "description": "Grant allocation game and experiment surfaced in older GreenPill episodes.",
        "url": None,
        "tags": ["public-goods-funding", "game"],
        "patterns": [r"\bgrant ships\b"],
    },
    {
        "id": "publication-plurality-book",
        "label": "Plurality Book",
        "node_type": "publication",
        "cluster": "community",
        "visual_group": "media",
        "color": "#60A5FA",
        "description": "Plurality discourse node referenced in governance, civic, and community episodes.",
        "url": "https://www.plurality.net",
        "tags": ["plurality", "governance"],
        "patterns": [r"\bplurality book\b", r"\bplurality\b"],
    },
    {
        "id": "partner-giveth",
        "label": "Giveth",
        "node_type": "partner_org",
        "cluster": "funding",
        "visual_group": "partner",
        "color": "#F59E0B",
        "description": "Public-goods funding and impact project featured in multiple episodes.",
        "url": "https://giveth.io",
        "tags": ["public-goods-funding", "grants"],
        "patterns": [r"\bgiveth\b"],
    },
    {
        "id": "partner-artizen",
        "label": "Artizen",
        "node_type": "partner_org",
        "cluster": "funding",
        "visual_group": "partner",
        "color": "#F59E0B",
        "description": "Artizen Fund public-goods funding surface referenced in podcast episodes.",
        "url": "https://artizen.fund",
        "tags": ["public-goods-funding", "creators"],
        "patterns": [r"\bartizen\b"],
    },
    {
        "id": "project-honour",
        "label": "Honour",
        "node_type": "project",
        "cluster": "community",
        "visual_group": "project",
        "color": "#10B981",
        "description": "Project framed around wholesome money and values-aligned coordination.",
        "url": "https://honour.community",
        "tags": ["community-building", "values"],
        "patterns": [r"\bhonour\b"],
    },
    {
        "id": "partner-grassroots-economics",
        "label": "Grassroots Economics",
        "node_type": "partner_org",
        "cluster": "localism",
        "visual_group": "partner",
        "color": "#14B8A6",
        "description": "Community currency and local economics organization featured in podcast episodes.",
        "url": "https://www.grassecon.org",
        "tags": ["localism", "community-currency"],
        "patterns": [r"\bgrassroots economics\b"],
    },
    {
        "id": "project-sarafu-network",
        "label": "Sarafu Network",
        "node_type": "project",
        "cluster": "localism",
        "visual_group": "project",
        "color": "#14B8A6",
        "description": "Community currency network surfaced through Grassroots Economics episodes.",
        "url": "https://sarafu.network",
        "tags": ["localism", "community-currency"],
        "patterns": [r"\bsarafu\b"],
    },
    {
        "id": "partner-obol",
        "label": "Obol",
        "node_type": "partner_org",
        "cluster": "ethereum",
        "visual_group": "partner",
        "color": "#60A5FA",
        "description": "Ethereum infrastructure team referenced in public goods support conversations.",
        "url": "https://obol.tech",
        "tags": ["ethereum", "public-goods-funding"],
        "patterns": [r"\bobol\b"],
    },
    {
        "id": "project-hypercerts",
        "label": "Hypercerts",
        "node_type": "project",
        "cluster": "identity",
        "visual_group": "project",
        "color": "#22C55E",
        "description": "Impact attestation and funding primitive surfaced repeatedly in the feed.",
        "url": "https://hypercerts.org",
        "tags": ["identity", "impact"],
        "patterns": [r"\bhypercerts\b"],
    },
    {
        "id": "partner-regen-network",
        "label": "Regen Network",
        "node_type": "partner_org",
        "cluster": "regeneration",
        "visual_group": "partner",
        "color": "#84CC16",
        "description": "Regenerative ecosystem project repeatedly referenced in GreenPill conversations.",
        "url": "https://www.regen.network",
        "tags": ["regeneration", "ecology"],
        "patterns": [r"\bregen network\b"],
    },
    {
        "id": "project-circles-ubi",
        "label": "Circles UBI",
        "node_type": "project",
        "cluster": "identity",
        "visual_group": "project",
        "color": "#22C55E",
        "description": "Identity and community currency primitive surfaced in multiple episodes.",
        "url": "https://joincircles.net",
        "tags": ["identity", "ubi"],
        "patterns": [r"\bcircles ubi\b"],
    },
    {
        "id": "resource-speed-run-ethereum",
        "label": "Speed Run Ethereum",
        "node_type": "resource",
        "cluster": "ethereum",
        "visual_group": "resource",
        "color": "#60A5FA",
        "description": "Ethereum builder resource referenced through Austin Griffith episodes.",
        "url": "https://speedrunethereum.com",
        "tags": ["ethereum", "builders"],
        "patterns": [r"\bspeed run ethereum\b"],
    },
    {
        "id": "partner-protocol-labs",
        "label": "Protocol Labs",
        "node_type": "partner_org",
        "cluster": "open-source",
        "visual_group": "partner",
        "color": "#38BDF8",
        "description": "Research and open-source ecosystem partner referenced in multiple episodes.",
        "url": "https://protocol.ai",
        "tags": ["open-source", "research"],
        "patterns": [r"\bprotocol labs\b"],
    },
    {
        "id": "partner-gitcoin",
        "label": "Gitcoin",
        "node_type": "partner_org",
        "cluster": "funding",
        "visual_group": "partner",
        "color": "#F59E0B",
        "description": "Major public-goods funding ecosystem repeatedly referenced throughout the feed.",
        "url": "https://gitcoin.co",
        "tags": ["public-goods-funding", "ethereum"],
        "patterns": [r"\bgitcoin\b"],
    },
    {
        "id": "partner-optimism",
        "label": "Optimism",
        "node_type": "partner_org",
        "cluster": "funding",
        "visual_group": "partner",
        "color": "#F59E0B",
        "description": "Ethereum ecosystem partner recurring in retrofunding and governance episodes.",
        "url": "https://optimism.io",
        "tags": ["public-goods-funding", "ethereum"],
        "patterns": [r"\boptimism\b"],
    },
    {
        "id": "partner-journodao",
        "label": "JournoDAO",
        "node_type": "partner_org",
        "cluster": "media",
        "visual_group": "partner",
        "color": "#60A5FA",
        "description": "Media and journalism community referenced in Season 9 and related episodes.",
        "url": "https://journodao.xyz",
        "tags": ["media", "community-building"],
        "patterns": [r"\bjournodao\b"],
    },
]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse_date(value: str) -> datetime:
    dt = parsedate_to_datetime(value)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def sentence_excerpt(text: str, limit: int = 220) -> str:
    text = " ".join((text or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def unique_strings(values: list[str]) -> list[str]:
    seen = set()
    ordered = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered


def compact_counter(counter: Counter) -> dict[str, int]:
    return dict(sorted(counter.items(), key=lambda item: (-item[1], item[0])))


def add_node(registry: dict[str, dict], node: dict) -> None:
    existing = registry.get(node["id"])
    if existing is None:
        registry[node["id"]] = node
        return

    existing["source_ids"] = unique_strings(
        existing.get("source_ids", []) + node.get("source_ids", [])
    )
    existing["tags"] = unique_strings(existing.get("tags", []) + node.get("tags", []))
    existing["confidence"] = max(existing.get("confidence", 0.0), node.get("confidence", 0.0))
    existing["importance"] = max(existing.get("importance", 1), node.get("importance", 1))
    if not existing.get("description") and node.get("description"):
        existing["description"] = node["description"]
    if not existing.get("url") and node.get("url"):
        existing["url"] = node["url"]


def add_edge(registry: dict[str, dict], edge: dict) -> None:
    existing = registry.get(edge["id"])
    if existing is None:
        registry[edge["id"]] = edge
        return

    existing["source_ids"] = unique_strings(
        existing.get("source_ids", []) + edge.get("source_ids", [])
    )
    existing["confidence"] = max(existing.get("confidence", 0.0), edge.get("confidence", 0.0))
    if "notes" in edge and edge["notes"]:
        existing["notes"] = edge["notes"]


def clean_person_fragment(fragment: str) -> str | None:
    fragment = fragment.strip(" .:-|")
    fragment = re.sub(r"^[A-Za-z]+['’]s\s+", "", fragment)
    fragment = re.sub(r"\b(?:w/|with|feat\.?|featuring)\b", "", fragment, flags=re.I)
    if "," in fragment:
        fragment = fragment.split(",", 1)[0].strip()
    fragment = " ".join(fragment.split())
    if not fragment or not re.search(r"[A-Za-z]", fragment):
        return None

    if fragment.lower() in HOST_NAME_SET:
        return None

    lowered = fragment.lower()
    if any(word in lowered for word in PERSON_BLOCKLIST_WORDS):
        return None

    parts = fragment.split()
    if len(parts) == 1:
        return fragment if fragment in KNOWN_MONONYMS else None
    if len(parts) > 5:
        return None

    for part in parts:
        if not re.match(r"^[A-Z0-9][A-Za-zÀ-ÿ'’.-]*$", part):
            return None

    return fragment


def split_people(value: str) -> list[str]:
    normalized = (
        value.replace(" & ", ", ")
        .replace(" and ", ", ")
        .replace(" / ", ", ")
        .replace(" w/ ", ", ")
    )
    names = []
    for piece in normalized.split(","):
        cleaned = clean_person_fragment(piece)
        if cleaned is not None:
            names.append(cleaned)
    return unique_strings(names)


TITLE_PATTERNS = [
    re.compile(r"\bwith\s+(.+)$", re.I),
    re.compile(r"\bw/\s+(.+)$", re.I),
]

SUMMARY_PATTERNS = [
    re.compile(r"is joined by ([^.]+?) to ", re.I),
    re.compile(r"host [^,.]+ is joined by ([^.]+?) to ", re.I),
    re.compile(r"sits down with ([^.]+?) to ", re.I),
    re.compile(r"speaks with ([^.]+?) to ", re.I),
    re.compile(r"talks with ([^.]+?) to ", re.I),
    re.compile(r"joined by ([^.]+?) to ", re.I),
    re.compile(r"joined by ([^.]+?) for ", re.I),
]

TITLE_PREFIX_RE = re.compile(
    r"^(?:Season\s*\d+[\.\-]?\s*Ep\.?\s*[-:]?\s*\d+\s*[-:]?\s*|"
    r"Season\s*\d+\s*[-.]\s*Episode\s*\d+:\s*|"
    r"S\.\d+\s*Ep\.?\d*:?\s*|"
    r"NN\s*Ep:?\s*\d+\s*[-:]?\s*|"
    r"Network Nations\s*Ep:?\s*\d+\s*[-:]?\s*|"
    r"VDAO\s*Ep\.?\s*\d+\s*:?|"
    r"\d+\s*[-#]\s*)",
    re.I,
)


def extract_guests(episode: dict) -> tuple[list[str], str | None]:
    title = episode["title"]
    summary = episode.get("summary") or ""

    for pattern in TITLE_PATTERNS:
        match = pattern.search(title)
        if match:
            guests = split_people(match.group(1))
            if guests:
                return guests, "title"

    stripped = TITLE_PREFIX_RE.sub("", title).strip()
    fallback = clean_person_fragment(stripped)
    if fallback is not None:
        return [fallback], "title_fallback"

    for pattern in SUMMARY_PATTERNS:
        match = pattern.search(summary)
        if match:
            guests = split_people(match.group(1))
            if guests:
                return guests, "summary"

    return [], None


def guest_confidence(name: str, method: str | None) -> float:
    if method == "title":
        return 0.93 if len(name.split()) > 1 else 0.72
    if method == "title_fallback":
        return 0.88 if len(name.split()) > 1 else 0.68
    if method == "summary":
        return 0.84 if len(name.split()) > 1 else 0.64
    return 0.6


def guest_notes(name: str, method: str | None) -> str:
    if len(name.split()) == 1:
        return "Guest label is directly visible in episode metadata but remains partially unresolved."
    if method == "summary":
        return "Guest resolved from summary language because title did not carry the full name."
    return "Guest resolved directly from episode title."


def guest_id(name: str) -> str:
    return f"person-{slugify(name)}"


def extract_entities(episode: dict) -> list[dict]:
    haystack = f"{episode['title']} {episode.get('summary', '')}".lower()
    matches = []
    for entity in ENTITY_DEFS:
        if any(re.search(pattern, haystack, re.I) for pattern in entity["patterns"]):
            matches.append(entity)
    return matches


def derive_themes(episode: dict) -> list[str]:
    derived = list(episode.get("themes", []))
    haystack = f"{episode['title']} {episode.get('summary', '')}".lower()
    for theme_id, keywords in THEME_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            derived.append(theme_id)
    return unique_strings(derived)


def capital_forms_for_themes(theme_ids: list[str]) -> list[str]:
    forms = []
    for theme_id in theme_ids:
        forms.extend(THEMES[theme_id]["capital_forms"])
    return unique_strings(forms)


def dominant_themes(counter: Counter, limit: int = 3) -> list[str]:
    return [theme for theme, _ in counter.most_common(limit)]


def make_episode_node(episode: dict) -> dict:
    published_at = parse_date(episode["pub_date"]).date().isoformat()
    return {
        "id": episode["id"],
        "label": episode["title"],
        "node_type": "episode",
        "status": "published",
        "source_scope": "public_web",
        "cluster": "podcast-episodes",
        "visual_group": "episode",
        "color": "#93C5FD",
        "importance": 1,
        "description": sentence_excerpt(episode.get("summary") or "", 180),
        "url": episode.get("link"),
        "tags": unique_strings(
            [
                "podcast",
                "episode",
                episode["series"],
                f"year-{episode['year']}",
            ]
            + list(episode.get("themes", []))
        ),
        "source_ids": ["src_greenpill_podcast_rss_2026"],
        "confidence": 0.99,
        "published_at": published_at,
        "season": episode.get("season"),
        "episode_number": episode.get("episode_number"),
        "duration_seconds": episode.get("duration_seconds"),
        "series_key": episode.get("series"),
        "theme_ids": list(episode.get("themes", [])),
    }


def build_overlay(main_graph: dict, feed: dict) -> tuple[dict, dict, dict]:
    node_registry: dict[str, dict] = {}
    relationship_registry: dict[str, dict] = {}
    capital_registry: dict[str, dict] = {}

    add_node(
        node_registry,
        {
            "id": "greenpill-network",
            "label": "Greenpill Network",
            "node_type": "network",
            "status": "active",
            "source_scope": "public_web",
            "cluster": "core",
            "visual_group": "core",
            "color": "#6EE7B7",
            "importance": 5,
            "description": "Global regenerative network connecting chapters, guilds, programs, media, and tooling.",
            "url": "https://greenpill.network",
            "tags": ["regen", "public-goods", "ethereum"],
            "source_ids": ["src_greenpill_site_2026"],
            "confidence": 0.99,
        },
    )
    add_node(
        node_registry,
        {
            "id": "greenpill-podcast",
            "label": "GreenPill Podcast",
            "node_type": "publication",
            "status": "active",
            "source_scope": "public_web",
            "cluster": "media",
            "visual_group": "media",
            "color": "#60A5FA",
            "importance": 5,
            "description": "Podcast surface for Greenpill's public-facing knowledge graph, guests, and adjacent ecosystem discovery.",
            "url": "https://greenpill.party/",
            "tags": ["podcast", "media", "education"],
            "source_ids": ["src_greenpill_podcast_rss_2026", "src_greenpill_podcast_home_2026"],
            "confidence": 0.99,
        },
    )

    series_episode_counts = Counter()
    series_theme_counts: dict[str, Counter] = defaultdict(Counter)
    people_stats: dict[str, dict] = {}
    entity_stats: dict[str, dict] = {}
    host_stats: dict[str, dict] = {}

    for theme_id, theme in THEMES.items():
        add_node(
            node_registry,
            {
                "id": f"theme-{theme_id}",
                "label": theme["label"],
                "node_type": "topic_pod",
                "status": "active",
                "source_scope": "repo",
                "cluster": "podcast-themes",
                "visual_group": "theme",
                "color": theme["color"],
                "importance": 3,
                "description": theme["description"],
                "tags": ["theme", "podcast", theme_id],
                "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
                "confidence": 0.94,
            },
        )

    for series_key, series in SERIES.items():
        add_node(
            node_registry,
            {
                "id": series["id"],
                "label": series["label"],
                "node_type": "media_series",
                "status": "active",
                "source_scope": "public_web",
                "cluster": "media",
                "visual_group": "media",
                "color": series["color"],
                "importance": 4,
                "description": series["description"],
                "tags": series["tags"],
                "source_ids": ["src_greenpill_podcast_rss_2026"],
                "confidence": 0.97,
            },
        )
        add_edge(
            relationship_registry,
            {
                "id": f"rel_greenpill_podcast_publishes_{series['id']}",
                "relation": "publishes",
                "source": "greenpill-podcast",
                "target": series["id"],
                "status": "active",
                "source_ids": ["src_greenpill_podcast_rss_2026"],
                "confidence": 0.97,
                "notes": "Series derived from the podcast feed metadata.",
            },
        )

    for episode in feed["episodes"]:
        series_key = episode["series"]
        series_id = SERIES[series_key]["id"]
        episode_id = episode["id"]
        episode_themes = derive_themes(episode)
        series_episode_counts[series_key] += 1
        series_theme_counts[series_key].update(episode_themes)

        add_node(node_registry, make_episode_node(episode))

        add_edge(
            relationship_registry,
            {
                "id": f"rel_{series_id}_publishes_{episode_id}",
                "relation": "publishes",
                "source": series_id,
                "target": episode_id,
                "status": "published",
                "source_ids": ["src_greenpill_podcast_rss_2026"],
                "confidence": 0.99,
                "notes": "Episode is part of this series according to feed metadata.",
            },
        )

        host_key = episode.get("author") or "Kevin"
        host_meta = HOSTS.get(host_key)
        if host_meta is not None:
            host_stats.setdefault(
                host_meta["id"],
                {
                    "label": host_meta["label"],
                    "description": host_meta["description"],
                    "url": host_meta["url"],
                    "episodes": [],
                    "series": Counter(),
                },
            )
            host_stats[host_meta["id"]]["episodes"].append(episode_id)
            host_stats[host_meta["id"]]["series"][series_key] += 1
            add_node(
                node_registry,
                {
                    "id": host_meta["id"],
                    "label": host_meta["label"],
                    "node_type": "person",
                    "status": "active",
                    "source_scope": "public_web",
                    "cluster": "media",
                    "visual_group": "person",
                    "color": "#FCA5A5",
                    "importance": 3,
                    "description": host_meta["description"],
                    "url": host_meta["url"],
                    "tags": ["person", "host", "podcast"],
                    "source_ids": ["src_greenpill_podcast_rss_2026"],
                    "confidence": 0.98,
                },
            )
            add_edge(
                relationship_registry,
                {
                    "id": f"rel_{host_meta['id']}_hosts_{episode_id}",
                    "relation": "hosts",
                    "source": host_meta["id"],
                    "target": episode_id,
                    "status": "published",
                    "source_ids": ["src_greenpill_podcast_rss_2026"],
                    "confidence": 0.98,
                    "notes": "Host attribution comes from the feed author field.",
                },
            )

        for theme_id in episode_themes:
            add_edge(
                relationship_registry,
                {
                    "id": f"rel_{episode_id}_explores_theme_{theme_id}",
                    "relation": "explores_theme",
                    "source": episode_id,
                    "target": f"theme-{theme_id}",
                    "status": "published",
                    "source_ids": [
                        "src_greenpill_podcast_feed_catalog_2026",
                        "src_greenpill_podcast_graph_generator_2026",
                    ],
                    "confidence": 0.9,
                    "notes": "Theme comes from the feed catalog and keyword augmentation in the graph generator.",
                },
            )

        guests, method = extract_guests(episode)
        for name in guests:
            pid = guest_id(name)
            people_stats.setdefault(
                pid,
                {
                    "label": name,
                    "episodes": [],
                    "titles": [],
                    "series": Counter(),
                    "themes": Counter(),
                    "methods": set(),
                    "confidence": 0.0,
                },
            )
            stats = people_stats[pid]
            stats["episodes"].append(episode_id)
            stats["titles"].append(episode["title"])
            stats["series"][series_key] += 1
            stats["themes"].update(episode_themes)
            stats["methods"].add(method or "unknown")
            stats["confidence"] = max(stats["confidence"], guest_confidence(name, method))

            add_edge(
                relationship_registry,
                {
                    "id": f"rel_{episode_id}_features_{pid}",
                    "relation": "features_guest",
                    "source": episode_id,
                    "target": pid,
                    "status": "published",
                    "source_ids": ["src_greenpill_podcast_rss_2026"],
                    "confidence": guest_confidence(name, method),
                    "notes": guest_notes(name, method),
                },
            )

        for entity in extract_entities(episode):
            eid = entity["id"]
            entity_stats.setdefault(
                eid,
                {
                    "label": entity["label"],
                    "node_type": entity["node_type"],
                    "description": entity["description"],
                    "url": entity["url"],
                    "cluster": entity["cluster"],
                    "visual_group": entity["visual_group"],
                    "color": entity["color"],
                    "tags": list(entity["tags"]),
                    "episodes": [],
                    "titles": [],
                    "series": Counter(),
                    "themes": Counter(),
                },
            )
            stats = entity_stats[eid]
            stats["episodes"].append(episode_id)
            stats["titles"].append(episode["title"])
            stats["series"][series_key] += 1
            stats["themes"].update(episode_themes)

            add_edge(
                relationship_registry,
                {
                    "id": f"rel_{episode_id}_references_{eid}",
                    "relation": "references_entity",
                    "source": episode_id,
                    "target": eid,
                    "status": "published",
                    "source_ids": [
                        "src_greenpill_podcast_rss_2026",
                        "src_greenpill_podcast_graph_generator_2026",
                    ],
                    "confidence": 0.86,
                    "notes": "Entity matched through curated keyword patterns over title and summary.",
                },
            )

    for pid, stats in people_stats.items():
        label = stats["label"]
        dominant = dominant_themes(stats["themes"])
        add_node(
            node_registry,
            {
                "id": pid,
                "label": label,
                "node_type": "person",
                "status": "active",
                "source_scope": "public_web",
                "cluster": "podcast-guests",
                "visual_group": "person",
                "color": "#FCA5A5",
                "importance": min(4, 1 + len(stats["episodes"])),
                "description": f"Podcast guest appearing in {len(stats['episodes'])} episode(s).",
                "tags": unique_strings(
                    ["person", "guest", "podcast"] + dominant + list(stats["series"].keys())
                ),
                "source_ids": ["src_greenpill_podcast_rss_2026"],
                "confidence": round(stats["confidence"], 2),
                "episode_count": len(stats["episodes"]),
                "dominant_theme_ids": dominant,
                "series_counts": compact_counter(stats["series"]),
                "theme_counts": compact_counter(stats["themes"]),
                "name_resolution": "mononym" if len(label.split()) == 1 else "full_name",
            },
        )

        capital_forms = capital_forms_for_themes(list(stats["themes"].keys()))
        add_edge(
            capital_registry,
            {
                "id": f"cap_{pid}_to_greenpill_podcast",
                "source": pid,
                "target": "greenpill-podcast",
                "capital_forms": capital_forms,
                "mechanism": f"Guest contribution across {len(stats['episodes'])} episode(s): "
                + "; ".join(stats["titles"][:3]),
                "status": "live",
                "evidence_type": "inferred_from_sources",
                "source_ids": ["src_greenpill_podcast_rss_2026", "src_greenpill_podcast_feed_catalog_2026"],
                "confidence": round(min(0.9, stats["confidence"]), 2),
                "notes": "Capital profile inferred from the themes attached to the guest's episodes.",
            },
        )

    for eid, stats in entity_stats.items():
        dominant = dominant_themes(stats["themes"])
        add_node(
            node_registry,
            {
                "id": eid,
                "label": stats["label"],
                "node_type": stats["node_type"],
                "status": "active",
                "source_scope": "public_web",
                "cluster": stats["cluster"],
                "visual_group": stats["visual_group"],
                "color": stats["color"],
                "importance": min(4, 1 + len(stats["episodes"])),
                "description": stats["description"],
                "url": stats["url"],
                "tags": unique_strings(stats["tags"] + dominant),
                "source_ids": ["src_greenpill_podcast_rss_2026"],
                "confidence": 0.86,
                "episode_count": len(stats["episodes"]),
                "dominant_theme_ids": dominant,
                "series_counts": compact_counter(stats["series"]),
                "theme_counts": compact_counter(stats["themes"]),
            },
        )

        add_edge(
            capital_registry,
            {
                "id": f"cap_{eid}_to_greenpill_podcast",
                "source": eid,
                "target": "greenpill-podcast",
                "capital_forms": capital_forms_for_themes(list(stats["themes"].keys())),
                "mechanism": f"Referenced across {len(stats['episodes'])} episode(s): "
                + "; ".join(stats["titles"][:3]),
                "status": "live",
                "evidence_type": "inferred_from_sources",
                "source_ids": ["src_greenpill_podcast_rss_2026"],
                "confidence": 0.82,
                "notes": "Entity contributes topic, ecosystem, or project context into the GreenPill media surface.",
            },
        )

    for series_key, series in SERIES.items():
        series_id = series["id"]
        theme_counter = series_theme_counts[series_key]
        for theme_id, count in theme_counter.items():
            if count < 2:
                continue
            add_edge(
                relationship_registry,
                {
                    "id": f"rel_{series_id}_explores_theme_{theme_id}",
                    "relation": "explores_theme",
                    "source": series_id,
                    "target": f"theme-{theme_id}",
                    "status": "active",
                    "source_ids": [
                        "src_greenpill_podcast_feed_catalog_2026",
                        "src_greenpill_podcast_graph_generator_2026",
                    ],
                    "confidence": 0.84,
                    "notes": f"Theme appears in {count} episode(s) within this series.",
                },
            )

        capital_forms = capital_forms_for_themes(list(theme_counter.keys()))
        add_edge(
            capital_registry,
            {
                "id": f"cap_{series_id}_to_greenpill_network",
                "source": series_id,
                "target": "greenpill-network",
                "capital_forms": capital_forms,
                "mechanism": f"{SERIES[series_key]['label']} contributes a distinct narrative lane into the network.",
                "status": "live",
                "evidence_type": "inferred_from_sources",
                "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
                "confidence": 0.85,
                "notes": f"Based on {series_episode_counts[series_key]} episode(s) and their dominant themes.",
            },
        )

        add_node(
            node_registry,
            {
                "id": series_id,
                "label": series["label"],
                "node_type": "media_series",
                "status": "active",
                "source_scope": "public_web",
                "cluster": "media",
                "visual_group": "media",
                "color": series["color"],
                "importance": 4,
                "description": series["description"],
                "tags": unique_strings(series["tags"] + dominant_themes(theme_counter)),
                "source_ids": ["src_greenpill_podcast_rss_2026"],
                "confidence": 0.97,
                "episode_count": series_episode_counts[series_key],
                "theme_counts": compact_counter(theme_counter),
            },
        )

    podcast_graph = {
        "meta": {
            "title": "GreenPill Podcast Graph Overlay",
            "version": "0.1.0",
            "generated_at": datetime.now(UTC).date().isoformat(),
            "description": "Graph-friendly podcast overlay with series, episodes, guests, curated ecosystem entities, and inferred capital flows.",
            "source_feed": feed["meta"]["source_feed"],
            "episode_count": len(feed["episodes"]),
            "intended_consumers": [
                "Cytoscape.js",
                "Sigma.js",
                "Graphology",
                "D3 force graph",
                "Neo4j import pipeline",
            ],
            "notes": [
                "Episode and series layers are directly derived from the feed catalog.",
                "Guest identities use heuristic extraction from titles and summaries.",
                "Organization and project references use curated keyword matching for better graph quality.",
            ],
        },
        "capital_taxonomy": main_graph["capital_taxonomy"],
        "sources": [
            {
                "id": "src_greenpill_podcast_rss_2026",
                "title": "GreenPill podcast RSS feed",
                "type": "rss_feed",
                "url": feed["meta"]["source_feed"],
                "date": datetime.now(UTC).date().isoformat(),
                "note": "Canonical feed source for episode titles, dates, links, authors, and summaries.",
            },
            {
                "id": "src_greenpill_podcast_home_2026",
                "title": "GreenPill podcast home",
                "type": "website",
                "url": "https://greenpill.party/",
                "date": datetime.now(UTC).date().isoformat(),
                "note": "Homepage referenced by the feed itself.",
            },
            {
                "id": "src_greenpill_podcast_feed_catalog_2026",
                "title": "GreenPill feed catalog",
                "type": "repo_file",
                "path": ".plans/backlog/knowledge-commons-graph-explorer/artifacts/greenpill-graph/podcast/greenpill-podcast-feed.json",
                "date": datetime.now(UTC).date().isoformat(),
                "note": "Structured repo copy of the feed used for graph generation and theme tagging.",
            },
            {
                "id": "src_greenpill_podcast_graph_generator_2026",
                "title": "GreenPill podcast graph generator",
                "type": "repo_file",
                "path": ".plans/backlog/knowledge-commons-graph-explorer/artifacts/generators/build_greenpill_podcast_graph.py",
                "date": datetime.now(UTC).date().isoformat(),
                "note": "Generator that augments themes and resolves curated entities for graph use.",
            },
        ],
        "nodes": sorted(
            node_registry.values(),
            key=lambda node: (node["node_type"], node["label"].lower()),
        ),
        "relationships": sorted(relationship_registry.values(), key=lambda edge: edge["id"]),
        "capital_flows": sorted(capital_registry.values(), key=lambda edge: edge["id"]),
    }

    entity_index = {
        "meta": {
            "title": "GreenPill Podcast Entity Index",
            "generated_at": datetime.now(UTC).date().isoformat(),
            "source_feed": feed["meta"]["source_feed"],
            "episode_count": len(feed["episodes"]),
            "notes": [
                "Guests are heuristically extracted from episode metadata.",
                "Entities are curated from repeated or strategically important podcast references.",
            ],
        },
        "hosts": [
            {
                "id": host_id,
                "label": stats["label"],
                "episode_count": len(stats["episodes"]),
                "series_counts": compact_counter(stats["series"]),
            }
            for host_id, stats in sorted(host_stats.items(), key=lambda item: item[1]["label"])
        ],
        "guests": sorted(
            [
                {
                    "id": pid,
                    "label": stats["label"],
                    "episode_count": len(stats["episodes"]),
                    "dominant_theme_ids": dominant_themes(stats["themes"]),
                    "series_counts": compact_counter(stats["series"]),
                    "theme_counts": compact_counter(stats["themes"]),
                    "confidence": round(stats["confidence"], 2),
                    "name_resolution": "mononym"
                    if len(stats["label"].split()) == 1
                    else "full_name",
                }
                for pid, stats in people_stats.items()
            ],
            key=lambda item: (-item["episode_count"], item["label"].lower()),
        ),
        "entities": sorted(
            [
                {
                    "id": eid,
                    "label": stats["label"],
                    "node_type": stats["node_type"],
                    "episode_count": len(stats["episodes"]),
                    "dominant_theme_ids": dominant_themes(stats["themes"]),
                    "series_counts": compact_counter(stats["series"]),
                    "theme_counts": compact_counter(stats["themes"]),
                    "url": stats["url"],
                }
                for eid, stats in entity_stats.items()
            ],
            key=lambda item: (-item["episode_count"], item["label"].lower()),
        ),
        "themes": [
            {
                "id": theme_id,
                "label": theme["label"],
                "capital_forms": theme["capital_forms"],
                "episode_count": sum(
                    1 for episode in feed["episodes"] if theme_id in derive_themes(episode)
                ),
            }
            for theme_id, theme in THEMES.items()
        ],
    }

    seen_node_ids = {node["id"] for node in main_graph["nodes"]}
    seen_relationship_ids = {edge["id"] for edge in main_graph["relationships"]}
    seen_capital_ids = {edge["id"] for edge in main_graph["capital_flows"]}
    seen_source_ids = {source["id"] for source in main_graph["sources"]}

    combined_graph = {
        "meta": {
            **main_graph["meta"],
            "version": "0.3.0",
            "generated_at": datetime.now(UTC).date().isoformat(),
            "description": "Expanded Greenpill network graph with a podcast overlay covering series, episodes, guests, and curated ecosystem entities.",
            "notes": unique_strings(
                main_graph["meta"].get("notes", [])
                + ["Podcast overlay adds episode, guest, series, and entity layers."]
            ),
            "suggested_views": unique_strings(
                main_graph["meta"].get("suggested_views", [])
                + ["podcast", "podcast-to-network", "theme-to-guest"]
            ),
        },
        "capital_taxonomy": main_graph["capital_taxonomy"],
        "sources": main_graph["sources"]
        + [source for source in podcast_graph["sources"] if source["id"] not in seen_source_ids],
        "nodes": main_graph["nodes"]
        + [node for node in podcast_graph["nodes"] if node["id"] not in seen_node_ids],
        "relationships": main_graph["relationships"]
        + [
            edge
            for edge in podcast_graph["relationships"]
            if edge["id"] not in seen_relationship_ids
        ],
        "capital_flows": main_graph["capital_flows"]
        + [
            edge
            for edge in podcast_graph["capital_flows"]
            if edge["id"] not in seen_capital_ids
        ],
    }

    return podcast_graph, entity_index, combined_graph


def main() -> None:
    main_graph = load_json(MAIN_GRAPH_PATH)
    feed = load_json(FEED_PATH)
    podcast_graph, entity_index, combined_graph = build_overlay(main_graph, feed)
    write_json(OUT_GRAPH_PATH, podcast_graph)
    write_json(OUT_INDEX_PATH, entity_index)
    write_json(OUT_COMBINED_PATH, combined_graph)


if __name__ == "__main__":
    main()
