#!/usr/bin/env python3

"""
Build a graph-friendly overlap graph between the GreenPill podcast layer and
the current Greenpill network graph.

Output:
- artifacts/greenpill-graph/podcast/greenpill-podcast-network-overlap.graph.json

This dataset is intentionally narrower than the full merged graph. It focuses
on the question:

"How well does the podcast map to the live Greenpill network of chapters,
guilds, active people, and shared operating infrastructure?"
"""

from __future__ import annotations

import json
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path


HUB_ROOT = Path(__file__).resolve().parents[2]
GRAPH_ROOT = HUB_ROOT / "artifacts" / "greenpill-graph"
MAIN_GRAPH_PATH = GRAPH_ROOT / "greenpill-network.graph.json"
PODCAST_GRAPH_PATH = GRAPH_ROOT / "podcast" / "greenpill-podcast.graph.json"
FEED_PATH = GRAPH_ROOT / "podcast" / "greenpill-podcast-feed.json"
OUT_PATH = GRAPH_ROOT / "podcast" / "greenpill-podcast-network-overlap.graph.json"


SELECTED_MAIN_NODE_IDS = [
    "greenpill-network",
    "greenpill-podcast",
    "network-stewards",
    "chapter-stewards",
    "greenpill-chapters",
    "greenpill-dev-guild",
    "greenpill-writers-guild",
    "greenpill-garden",
    "taking-the-greenpill",
    "gitcoin",
    "allo-capital",
    "gardens",
    "karma-gap",
    "kevin-owocki",
    "afolabi-aiyeloja",
    "matt-strachman",
]

SELECTED_PODCAST_NODE_IDS = [
    "partner-gitcoin",
    "partner-allo-capital",
    "platform-gardens",
    "platform-karma-gap",
    "partner-journodao",
    "project-ethereum-localism",
    "person-kevin-owocki",
    "person-lana-dingwall",
    "person-elliot-bayev",
    "pod_ep_8a8ab9f9-f9dc-436a-9323-705a02b23be3",
    "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
    "pod_ep_d19b4ad0-d4af-420d-a6f7-0e3ed460273b",
    "pod_ep_354aea25-11d4-4f48-801d-dae15eeb3545",
    "pod_ep_5243b46a-b978-4133-ab38-682e0ad1eb7b",
    "pod_ep_5908291c-ffb2-4451-84f4-d49f44e40764",
    "pod_ep_f4be2b9c-28f3-4de6-924d-2977d75cc09b",
    "pod_ep_5547cde2-c677-4953-b16e-10863d8e4491",
    "pod_ep_5501b9e4-ddb9-4aaf-935f-e0a8245ec8ff",
    "pod_ep_a0a5a322-f787-4443-8fc0-8e5c51c7a518",
    "pod_ep_8f7ae2db-6ee4-4b87-9e4a-e87ecad9ff9b",
    "pod_ep_52d2c85b-5a8c-4c54-9a04-a2b468d8c30a",
]

CUSTOM_SOURCES = [
    {
        "id": "src_hub_network_onboarding_revamp_2024",
        "title": "Network Onboarding Revamp",
        "url": "https://hub.regencoordination.xyz/t/network-onboarding-revamp/87",
        "type": "forum_post",
        "date_accessed": "2026-03-09",
        "note": "Crucial bridge source showing the podcast folded into onboarding and chapter/guild orientation.",
    },
    {
        "id": "src_hub_dev_guild_recap_2024",
        "title": "Greenpill Dev Guild 2024 Recap",
        "url": "https://hub.regencoordination.xyz/t/greenpill-dev-guild-2024-recap/162",
        "type": "forum_post",
        "date_accessed": "2026-03-09",
        "note": "Public recap of Dev Guild products, workshops, rounds, and community growth.",
    },
    {
        "id": "src_luma_monthly_call_april_2025",
        "title": "Greenpill Network Community Call - April 2025",
        "url": "https://lu.ma/a4ryjiuf",
        "type": "event_page",
        "date_accessed": "2026-03-09",
        "note": "Useful source for Writers Guild, Dev Guild, onboarding, Karma GAP, and Gitcoin Garden activity.",
    },
]

CUSTOM_NODES = [
    {
        "id": "person-sejal",
        "label": "Sejal",
        "node_type": "person",
        "status": "active",
        "source_scope": "public_web",
        "cluster": "active-people",
        "visual_group": "person",
        "color": "#F472B6",
        "importance": 3,
        "description": "Current or recent Greenpill contributor who appears in internal-facing podcast episodes and Greenpill experimentation.",
        "url": None,
        "tags": ["active-person", "podcast-overlap"],
        "source_ids": [
            "src_greenpill_podcast_feed_catalog_2026",
            "src_hub_network_onboarding_revamp_2024",
        ],
        "confidence": 0.78,
    },
    {
        "id": "person-izzy",
        "label": "Izzy",
        "node_type": "person",
        "status": "active",
        "source_scope": "public_web",
        "cluster": "active-people",
        "visual_group": "person",
        "color": "#F472B6",
        "importance": 2,
        "description": "Active internal contributor referenced in network onboarding and the Greenpill.Network in 2024 episode.",
        "url": None,
        "tags": ["active-person", "podcast-overlap"],
        "source_ids": [
            "src_greenpill_podcast_feed_catalog_2026",
            "src_hub_network_onboarding_revamp_2024",
        ],
        "confidence": 0.74,
    },
    {
        "id": "person-caue-tomaz",
        "label": "Caue Tomaz",
        "node_type": "person",
        "status": "active",
        "source_scope": "public_web",
        "cluster": "active-people",
        "visual_group": "person",
        "color": "#F472B6",
        "importance": 3,
        "description": "Network steward, Greenpill Brasil steward, and Dev Guild lead surfaced in Greenpill Garden.",
        "url": None,
        "tags": ["active-person", "chapter-steward", "dev-guild"],
        "source_ids": [
            "src_hub_greenpill_garden_2025",
            "src_luma_monthly_call_june_2025",
        ],
        "confidence": 0.86,
    },
    {
        "id": "project-hypercerts",
        "label": "Hypercerts",
        "node_type": "project",
        "status": "active",
        "source_scope": "public_web",
        "cluster": "shared-stack",
        "visual_group": "project",
        "color": "#22C55E",
        "importance": 3,
        "description": "Shared reputation and impact-attestation primitive that appears in both the podcast and recent Greenpill builder education.",
        "url": "https://hypercerts.org/",
        "tags": ["shared-stack", "reputation", "impact"],
        "source_ids": [
            "src_greenpill_podcast_feed_catalog_2026",
            "src_hub_dev_guild_recap_2024",
            "src_paragraph_year_in_review_2024",
        ],
        "confidence": 0.88,
    },
]

CUSTOM_RELATIONSHIPS = [
    {
        "id": "rel_network_publishes_podcast",
        "relation": "publishes",
        "source": "greenpill-network",
        "target": "greenpill-podcast",
        "status": "active",
        "source_ids": ["src_live_site_2026", "src_apple_podcast_2026"],
        "confidence": 0.95,
        "notes": "Core network-to-podcast relationship from the main graph.",
    },
    {
        "id": "rel_network_has_chapters",
        "relation": "has_group",
        "source": "greenpill-network",
        "target": "greenpill-chapters",
        "status": "active",
        "source_ids": ["src_paragraph_year_in_review_2024"],
        "confidence": 0.94,
        "notes": "The chapter layer remains part of the network even when the podcast does not name individual chapters directly.",
    },
    {
        "id": "rel_network_has_dev_guild",
        "relation": "has_guild",
        "source": "greenpill-network",
        "target": "greenpill-dev-guild",
        "status": "active",
        "source_ids": ["src_hub_onchain_revenue_2025", "src_hub_dev_guild_recap_2024"],
        "confidence": 0.95,
        "notes": "Core structural relationship from current public network materials.",
    },
    {
        "id": "rel_network_has_writers_guild",
        "relation": "has_guild",
        "source": "greenpill-network",
        "target": "greenpill-writers-guild",
        "status": "active",
        "source_ids": ["src_paragraph_year_in_review_2024", "src_luma_monthly_call_april_2025"],
        "confidence": 0.94,
        "notes": "Core structural relationship from current public network materials.",
    },
    {
        "id": "rel_network_runs_garden",
        "relation": "runs_program",
        "source": "greenpill-network",
        "target": "greenpill-garden",
        "status": "active",
        "source_ids": ["src_hub_greenpill_garden_2025"],
        "confidence": 0.96,
        "notes": "Greenpill Garden is a major program bridge across the network.",
    },
    {
        "id": "rel_podcast_supports_onboarding",
        "relation": "supports",
        "source": "greenpill-podcast",
        "target": "taking-the-greenpill",
        "status": "active",
        "source_ids": ["src_hub_network_onboarding_revamp_2024"],
        "confidence": 0.97,
        "notes": "Taking The Greenpill explicitly uses the history of the podcast and notable episodes inside onboarding.",
    },
    {
        "id": "rel_2024_episode_aligns_network",
        "relation": "aligned_with",
        "source": "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
        "target": "greenpill-network",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.98,
        "notes": "This is the clearest direct internal network episode in the public feed.",
    },
    {
        "id": "rel_2024_episode_aligns_chapters",
        "relation": "aligned_with",
        "source": "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
        "target": "greenpill-chapters",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.9,
        "notes": "Episode notes explicitly include Lana pivoting to chapters.",
    },
    {
        "id": "rel_2024_episode_features_kevin_main",
        "relation": "features_guest",
        "source": "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
        "target": "kevin-owocki",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.96,
        "notes": "Kevin is explicitly part of the Greenpill.Network in 2024 episode.",
    },
    {
        "id": "rel_2024_episode_features_lana",
        "relation": "features_guest",
        "source": "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
        "target": "person-lana-dingwall",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.94,
        "notes": "Lana is named in the episode notes and appears in current onboarding materials.",
    },
    {
        "id": "rel_2024_episode_features_sejal",
        "relation": "features_guest",
        "source": "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
        "target": "person-sejal",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.9,
        "notes": "Sejal is named in the episode notes and in Greenpill experimentation episodes.",
    },
    {
        "id": "rel_2024_episode_features_izzy",
        "relation": "features_guest",
        "source": "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
        "target": "person-izzy",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.86,
        "notes": "The feed notes explicitly mention onboarding with Izzy.",
    },
    {
        "id": "rel_2024_episode_features_elliot",
        "relation": "features_guest",
        "source": "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
        "target": "person-elliot-bayev",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.88,
        "notes": "Elliot Bayev is named in the episode metadata.",
    },
    {
        "id": "rel_lana_supports_onboarding",
        "relation": "participates_in",
        "source": "person-lana-dingwall",
        "target": "taking-the-greenpill",
        "status": "active",
        "source_ids": ["src_hub_network_onboarding_revamp_2024"],
        "confidence": 0.82,
        "notes": "Lana is listed among contributors to the onboarding revamp.",
    },
    {
        "id": "rel_izzy_supports_onboarding",
        "relation": "participates_in",
        "source": "person-izzy",
        "target": "taking-the-greenpill",
        "status": "active",
        "source_ids": ["src_hub_network_onboarding_revamp_2024"],
        "confidence": 0.81,
        "notes": "Izzy is listed among contributors to the onboarding revamp.",
    },
    {
        "id": "rel_afo_stewards_dev_guild",
        "relation": "stewards",
        "source": "afolabi-aiyeloja",
        "target": "greenpill-dev-guild",
        "status": "active",
        "source_ids": ["src_hub_greenpill_garden_2025", "src_hub_dev_guild_recap_2024"],
        "confidence": 0.94,
        "notes": "Afolabi is publicly positioned as a Dev Guild and network steward.",
    },
    {
        "id": "rel_matt_stewards_writers_guild",
        "relation": "stewards",
        "source": "matt-strachman",
        "target": "greenpill-writers-guild",
        "status": "active",
        "source_ids": ["src_hub_greenpill_garden_2025"],
        "confidence": 0.94,
        "notes": "Matt Strachman is publicly identified as Writers Guild steward.",
    },
    {
        "id": "rel_caue_stewards_dev_guild",
        "relation": "stewards",
        "source": "person-caue-tomaz",
        "target": "greenpill-dev-guild",
        "status": "active",
        "source_ids": ["src_hub_greenpill_garden_2025"],
        "confidence": 0.9,
        "notes": "Caue Tomaz is identified as a Dev Guild lead in Greenpill Garden.",
    },
    {
        "id": "rel_gg24_features_afo",
        "relation": "features_guest",
        "source": "pod_ep_f4be2b9c-28f3-4de6-924d-2977d75cc09b",
        "target": "afolabi-aiyeloja",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.91,
        "notes": "GG24 episode metadata explicitly names Afo among the featured contributors.",
    },
    {
        "id": "rel_next_chapter_aligns_network",
        "relation": "aligned_with",
        "source": "pod_ep_8a8ab9f9-f9dc-436a-9323-705a02b23be3",
        "target": "greenpill-network",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.9,
        "notes": "Green Pill V3: The Next Chapter is a direct internal framing episode about the next network phase.",
    },
    {
        "id": "rel_cap_alloc_book_aligns_chapters",
        "relation": "aligned_with",
        "source": "pod_ep_5243b46a-b978-4133-ab38-682e0ad1eb7b",
        "target": "greenpill-chapters",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.76,
        "notes": "Episode notes explicitly reference a chapters intro inside the Onchain Capital Allocation Book episode.",
    },
    {
        "id": "rel_sejal_hypercerts_experiment",
        "relation": "features_guest",
        "source": "pod_ep_d19b4ad0-d4af-420d-a6f7-0e3ed460273b",
        "target": "person-sejal",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.94,
        "notes": "Sejal is explicitly named in the GreenPill Hypercerts Experiment episode.",
    },
    {
        "id": "rel_hypercerts_supports_dev_guild",
        "relation": "supports",
        "source": "project-hypercerts",
        "target": "greenpill-dev-guild",
        "status": "active",
        "source_ids": ["src_hub_dev_guild_recap_2024", "src_paragraph_year_in_review_2024"],
        "confidence": 0.88,
        "notes": "Hypercerts appears as a recurring workshop and educational component in recent Greenpill builder materials.",
    },
    {
        "id": "rel_hypercerts_episode_references_hypercerts",
        "relation": "references_entity",
        "source": "pod_ep_d19b4ad0-d4af-420d-a6f7-0e3ed460273b",
        "target": "project-hypercerts",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.97,
        "notes": "The episode is explicitly about a Greenpill Hypercerts experiment.",
    },
    {
        "id": "rel_sejal_gitcoin20_episode",
        "relation": "features_guest",
        "source": "pod_ep_354aea25-11d4-4f48-801d-dae15eeb3545",
        "target": "person-sejal",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.96,
        "notes": "Sejal is explicitly named in the Gitcoin Grants 20 episode.",
    },
    {
        "id": "rel_gitcoin_podcast_to_main_identity",
        "relation": "same_entity",
        "source": "partner-gitcoin",
        "target": "gitcoin",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026", "src_hub_onchain_revenue_2025"],
        "confidence": 0.99,
        "notes": "Gitcoin appears in both graph layers under different node ids and should be canonicalized.",
    },
    {
        "id": "rel_allo_podcast_to_main_identity",
        "relation": "same_entity",
        "source": "partner-allo-capital",
        "target": "allo-capital",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026", "src_hub_onchain_revenue_2025"],
        "confidence": 0.99,
        "notes": "Allo Capital appears in both graph layers under different node ids and should be canonicalized.",
    },
    {
        "id": "rel_gardens_podcast_to_main_identity",
        "relation": "same_entity",
        "source": "platform-gardens",
        "target": "gardens",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026", "src_hub_greenpill_garden_2025"],
        "confidence": 0.99,
        "notes": "Gardens appears in both graph layers under different node ids and should be canonicalized.",
    },
    {
        "id": "rel_karma_gap_podcast_to_main_identity",
        "relation": "same_entity",
        "source": "platform-karma-gap",
        "target": "karma-gap",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026", "src_hub_greenpill_garden_2025"],
        "confidence": 0.99,
        "notes": "Karma GAP appears in both graph layers under different node ids and should be canonicalized.",
    },
    {
        "id": "rel_kevin_podcast_to_main_identity",
        "relation": "same_entity",
        "source": "person-kevin-owocki",
        "target": "kevin-owocki",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026", "src_hub_onchain_revenue_2025"],
        "confidence": 0.99,
        "notes": "Kevin Owocki appears in both graph layers under different node ids and should be canonicalized.",
    },
    {
        "id": "rel_gg24_references_gitcoin",
        "relation": "references_entity",
        "source": "pod_ep_f4be2b9c-28f3-4de6-924d-2977d75cc09b",
        "target": "partner-gitcoin",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.98,
        "notes": "GG24 is directly about Gitcoin 3.0 and funding what matters.",
    },
    {
        "id": "rel_allo_builders_references_allo",
        "relation": "references_entity",
        "source": "pod_ep_5908291c-ffb2-4451-84f4-d49f44e40764",
        "target": "partner-allo-capital",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.98,
        "notes": "The Allo Builders Show & Tell is explicitly framed through Allo Capital.",
    },
    {
        "id": "rel_allo_builders_references_gardens",
        "relation": "references_entity",
        "source": "pod_ep_5908291c-ffb2-4451-84f4-d49f44e40764",
        "target": "platform-gardens",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.97,
        "notes": "The episode directly references the Gardens Allo Builders Fund.",
    },
    {
        "id": "rel_karma_gap_episode_references_karma_gap",
        "relation": "references_entity",
        "source": "pod_ep_8f7ae2db-6ee4-4b87-9e4a-e87ecad9ff9b",
        "target": "platform-karma-gap",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.98,
        "notes": "The episode is explicitly about Karma GAP.",
    },
    {
        "id": "rel_localism_episode_references_localism",
        "relation": "references_entity",
        "source": "pod_ep_5547cde2-c677-4953-b16e-10863d8e4491",
        "target": "project-ethereum-localism",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.98,
        "notes": "The episode is the start of a localism mini-lane in the feed.",
    },
    {
        "id": "rel_building_community_references_localism",
        "relation": "references_entity",
        "source": "pod_ep_5501b9e4-ddb9-4aaf-935f-e0a8245ec8ff",
        "target": "project-ethereum-localism",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.93,
        "notes": "The JournoDAO episode explicitly includes Ethereum Localism in the notes.",
    },
    {
        "id": "rel_knowledge_gardens_references_journodao",
        "relation": "references_entity",
        "source": "pod_ep_a0a5a322-f787-4443-8fc0-8e5c51c7a518",
        "target": "partner-journodao",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.97,
        "notes": "The episode directly links JournoDAO and knowledge gardens.",
    },
    {
        "id": "rel_building_community_references_journodao",
        "relation": "references_entity",
        "source": "pod_ep_5501b9e4-ddb9-4aaf-935f-e0a8245ec8ff",
        "target": "partner-journodao",
        "status": "active",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.97,
        "notes": "The episode is a JournoDAO conversation about community and transition.",
    },
    {
        "id": "rel_journodao_aligns_writers_guild",
        "relation": "aligned_with",
        "source": "partner-journodao",
        "target": "greenpill-writers-guild",
        "status": "active",
        "source_ids": ["src_paragraph_year_in_review_2024", "src_luma_monthly_call_april_2025"],
        "confidence": 0.69,
        "notes": "Writers Guild does not appear directly in the podcast feed, but JournoDAO is a strong media and writing-adjacent analog for that layer.",
    },
    {
        "id": "rel_localism_aligns_chapters",
        "relation": "aligned_with",
        "source": "project-ethereum-localism",
        "target": "greenpill-chapters",
        "status": "active",
        "source_ids": ["src_luma_monthly_call_june_2025", "src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.74,
        "notes": "Chapter names are rarely spoken in the feed, but localism is a strong narrative lane supporting chapter-level organizing.",
    },
    {
        "id": "rel_gardens_supports_garden_program",
        "relation": "supports",
        "source": "platform-gardens",
        "target": "greenpill-garden",
        "status": "active",
        "source_ids": ["src_hub_greenpill_garden_2025", "src_luma_monthly_call_march_2025"],
        "confidence": 0.95,
        "notes": "Gardens shows up in the podcast and in the network's Garden program work.",
    },
    {
        "id": "rel_karma_gap_supports_garden_program",
        "relation": "supports",
        "source": "platform-karma-gap",
        "target": "greenpill-garden",
        "status": "active",
        "source_ids": ["src_hub_greenpill_garden_2025", "src_luma_monthly_call_april_2025"],
        "confidence": 0.94,
        "notes": "Karma GAP is a shared reporting and impact infrastructure component.",
    },
    {
        "id": "rel_gitcoin_aligns_network",
        "relation": "aligned_with",
        "source": "partner-gitcoin",
        "target": "greenpill-network",
        "status": "active",
        "source_ids": ["src_hub_onchain_revenue_2025", "src_luma_monthly_call_april_2025"],
        "confidence": 0.95,
        "notes": "Gitcoin remains one of the strongest podcast-to-network operating bridges.",
    },
    {
        "id": "rel_allo_aligns_network",
        "relation": "aligned_with",
        "source": "partner-allo-capital",
        "target": "greenpill-network",
        "status": "active",
        "source_ids": ["src_hub_onchain_revenue_2025", "src_luma_monthly_call_march_2025"],
        "confidence": 0.95,
        "notes": "Allo Capital is repeatedly present in both the podcast and recent network strategy work.",
    },
]

CUSTOM_CAPITAL_FLOWS = [
    {
        "id": "cap_podcast_to_onboarding",
        "source": "greenpill-podcast",
        "target": "taking-the-greenpill",
        "capital_forms": ["knowledge", "cultural", "reputational"],
        "mechanism": "Podcast history and notable episodes are used directly inside onboarding.",
        "status": "live",
        "evidence_type": "direct_from_sources",
        "source_ids": ["src_hub_network_onboarding_revamp_2024"],
        "confidence": 0.97,
        "notes": "The podcast acts as a gateway into Greenpill identity formation.",
    },
    {
        "id": "cap_2024_episode_to_network",
        "source": "pod_ep_30a98022-bcf0-40b1-806a-b9d5bb8d7f12",
        "target": "greenpill-network",
        "capital_forms": ["knowledge", "coordination", "cultural"],
        "mechanism": "Internal state-of-network episode covering mission, onboarding, tools, and chapters.",
        "status": "live",
        "evidence_type": "direct_from_sources",
        "source_ids": ["src_greenpill_podcast_feed_catalog_2026"],
        "confidence": 0.98,
        "notes": "This is the strongest direct podcast-to-network bridge in the public feed.",
    },
    {
        "id": "cap_gg24_to_network",
        "source": "pod_ep_f4be2b9c-28f3-4de6-924d-2977d75cc09b",
        "target": "greenpill-network",
        "capital_forms": ["knowledge", "coordination", "reputational"],
        "mechanism": "GG24 carries ecosystem funding knowledge and active Greenpill contributors back into the network.",
        "status": "live",
        "evidence_type": "inferred_from_sources",
        "source_ids": [
            "src_greenpill_podcast_feed_catalog_2026",
            "src_luma_monthly_call_april_2025",
        ],
        "confidence": 0.84,
        "notes": "Afo appears directly in the episode metadata while Gitcoin is central to current network activity.",
    },
    {
        "id": "cap_gitcoin_to_network",
        "source": "partner-gitcoin",
        "target": "greenpill-network",
        "capital_forms": ["financial", "coordination", "reputational"],
        "mechanism": "Gitcoin rounds, public goods funding, and partnership strategy recur in both the podcast and network operations.",
        "status": "live",
        "evidence_type": "direct_from_sources",
        "source_ids": [
            "src_hub_onchain_revenue_2025",
            "src_luma_monthly_call_april_2025",
            "src_greenpill_podcast_feed_catalog_2026",
        ],
        "confidence": 0.95,
        "notes": "Gitcoin is the strongest ecosystem bridge by frequency and strategic centrality.",
    },
    {
        "id": "cap_allo_to_network",
        "source": "partner-allo-capital",
        "target": "greenpill-network",
        "capital_forms": ["financial", "governance", "coordination"],
        "mechanism": "Allo Capital and related governance experiments feed directly into Greenpill strategy and podcast discourse.",
        "status": "live",
        "evidence_type": "direct_from_sources",
        "source_ids": [
            "src_hub_onchain_revenue_2025",
            "src_luma_monthly_call_march_2025",
            "src_greenpill_podcast_feed_catalog_2026",
        ],
        "confidence": 0.95,
        "notes": "Allo is one of the cleanest shared operating stack nodes across both surfaces.",
    },
    {
        "id": "cap_gardens_to_garden_program",
        "source": "platform-gardens",
        "target": "greenpill-garden",
        "capital_forms": ["governance", "coordination", "operational"],
        "mechanism": "Gardens is used for funding pools and signaling across the network and appears in the podcast feed.",
        "status": "live",
        "evidence_type": "direct_from_sources",
        "source_ids": [
            "src_hub_greenpill_garden_2025",
            "src_luma_monthly_call_march_2025",
            "src_greenpill_podcast_feed_catalog_2026",
        ],
        "confidence": 0.95,
        "notes": "The overlap is programmatic rather than brand-level.",
    },
    {
        "id": "cap_karma_gap_to_garden_program",
        "source": "platform-karma-gap",
        "target": "greenpill-garden",
        "capital_forms": ["operational", "knowledge", "reputational"],
        "mechanism": "Karma GAP powers impact reporting in the network and is surfaced in the podcast.",
        "status": "live",
        "evidence_type": "direct_from_sources",
        "source_ids": [
            "src_hub_greenpill_garden_2025",
            "src_luma_monthly_call_april_2025",
            "src_greenpill_podcast_feed_catalog_2026",
        ],
        "confidence": 0.94,
        "notes": "This is one of the clearest examples of shared operating infrastructure.",
    },
    {
        "id": "cap_localism_to_chapters",
        "source": "project-ethereum-localism",
        "target": "greenpill-chapters",
        "capital_forms": ["social", "ecological", "cultural"],
        "mechanism": "Localism episodes and community calls reinforce chapter-level organizing even without naming many chapters directly.",
        "status": "live",
        "evidence_type": "inferred_from_sources",
        "source_ids": [
            "src_greenpill_podcast_feed_catalog_2026",
            "src_luma_monthly_call_june_2025",
        ],
        "confidence": 0.74,
        "notes": "This is a narrative-support flow rather than a direct org-chart link.",
    },
    {
        "id": "cap_journodao_to_writers_guild",
        "source": "partner-journodao",
        "target": "greenpill-writers-guild",
        "capital_forms": ["knowledge", "cultural", "social"],
        "mechanism": "JournoDAO episodes bring writing, journalism, and knowledge-garden themes into a lane adjacent to the Writers Guild.",
        "status": "live",
        "evidence_type": "inferred_from_sources",
        "source_ids": [
            "src_greenpill_podcast_feed_catalog_2026",
            "src_luma_monthly_call_april_2025",
            "src_paragraph_year_in_review_2024",
        ],
        "confidence": 0.68,
        "notes": "This is an indirect guild overlap and should be rendered as lower-confidence.",
    },
    {
        "id": "cap_hypercerts_to_dev_guild",
        "source": "project-hypercerts",
        "target": "greenpill-dev-guild",
        "capital_forms": ["technical", "knowledge", "reputational"],
        "mechanism": "Hypercerts operate as both a podcast topic and a Dev Guild workshop/experiment area.",
        "status": "live",
        "evidence_type": "direct_from_sources",
        "source_ids": [
            "src_greenpill_podcast_feed_catalog_2026",
            "src_hub_dev_guild_recap_2024",
            "src_paragraph_year_in_review_2024",
        ],
        "confidence": 0.88,
        "notes": "This is a stronger guild overlap than direct guild naming in episode metadata.",
    },
]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def build_index(items: list[dict]) -> dict[str, dict]:
    return {item["id"]: item for item in items}


def copy_nodes(index: dict[str, dict], node_ids: list[str]) -> list[dict]:
    missing = [node_id for node_id in node_ids if node_id not in index]
    if missing:
        raise KeyError(f"Missing node ids: {missing}")
    return [deepcopy(index[node_id]) for node_id in node_ids]


def count_episode_hits(feed: dict, term: str) -> list[str]:
    matches = []
    for episode in feed["episodes"]:
        text = " ".join(
            [
                episode.get("title", ""),
                episode.get("summary", ""),
                episode.get("description", ""),
            ]
        ).lower()
        if term.lower() in text:
            matches.append(episode["title"])
    return matches


def main() -> None:
    main_graph = load_json(MAIN_GRAPH_PATH)
    podcast_graph = load_json(PODCAST_GRAPH_PATH)
    feed = load_json(FEED_PATH)

    main_nodes = build_index(main_graph["nodes"])
    podcast_nodes = build_index(podcast_graph["nodes"])
    main_sources = build_index(main_graph["sources"])
    podcast_sources = build_index(podcast_graph["sources"])
    custom_sources = build_index(CUSTOM_SOURCES)

    nodes = (
        copy_nodes(main_nodes, SELECTED_MAIN_NODE_IDS)
        + copy_nodes(podcast_nodes, SELECTED_PODCAST_NODE_IDS)
        + deepcopy(CUSTOM_NODES)
    )

    node_ids = {node["id"] for node in nodes}
    required_source_ids = set()

    for node in nodes:
        required_source_ids.update(node.get("source_ids", []))

    for relationship in CUSTOM_RELATIONSHIPS:
        if relationship["source"] not in node_ids or relationship["target"] not in node_ids:
            raise KeyError(f"Relationship has missing node: {relationship['id']}")
        required_source_ids.update(relationship["source_ids"])

    for flow in CUSTOM_CAPITAL_FLOWS:
        if flow["source"] not in node_ids or flow["target"] not in node_ids:
            raise KeyError(f"Capital flow has missing node: {flow['id']}")
        required_source_ids.update(flow["source_ids"])

    sources = []
    for source_id in sorted(required_source_ids):
        if source_id in main_sources:
            sources.append(deepcopy(main_sources[source_id]))
        elif source_id in podcast_sources:
            sources.append(deepcopy(podcast_sources[source_id]))
        elif source_id in custom_sources:
            sources.append(deepcopy(custom_sources[source_id]))
        else:
            raise KeyError(f"Missing source id: {source_id}")

    chapter_labels = [
        main_nodes[node_id]["label"]
        for node_id in main_nodes
        if main_nodes[node_id]["node_type"] == "chapter"
    ]
    guild_labels = [
        main_nodes[node_id]["label"]
        for node_id in main_nodes
        if main_nodes[node_id]["node_type"] == "guild"
    ]
    chapter_name_hits = {
        label: count_episode_hits(feed, label) for label in sorted(chapter_labels)
    }
    guild_name_hits = {label: count_episode_hits(feed, label) for label in sorted(guild_labels)}

    shared_ids = sorted(set(main_nodes) & set(podcast_nodes))
    main_labels = {node["label"]: node["id"] for node in main_graph["nodes"]}
    podcast_labels = {node["label"]: node["id"] for node in podcast_graph["nodes"]}
    shared_labels = sorted(set(main_labels) & set(podcast_labels))
    duplicate_labels = sorted(
        label
        for label in shared_labels
        if main_labels[label] != podcast_labels[label]
    )

    raw_chapter_mentions = count_episode_hits(feed, "chapter")
    raw_guild_mentions = count_episode_hits(feed, "guild")

    active_people_overlap = [
        {
            "person": "Kevin Owocki",
            "network_node_id": "kevin-owocki",
            "podcast_node_id": "person-kevin-owocki",
            "episode_hits": 10,
            "evidence": "Core host and central network figure.",
        },
        {
            "person": "Afolabi Aiyeloja",
            "network_node_id": "afolabi-aiyeloja",
            "podcast_node_id": None,
            "episode_hits": 1,
            "evidence": "Named in the GG24 episode metadata and publicly stewarding network and Dev Guild work.",
        },
        {
            "person": "Lana Dingwall",
            "network_node_id": None,
            "podcast_node_id": "person-lana-dingwall",
            "episode_hits": 2,
            "evidence": "Shows up in Greenpill.Network in 2024 and Onchain Impact Networks; also listed in onboarding revamp contributors.",
        },
        {
            "person": "Sejal",
            "network_node_id": "person-sejal",
            "podcast_node_id": None,
            "episode_hits": 5,
            "evidence": "Appears across Greenpill Hypercerts, Gitcoin Grants, and Greenpill.Network in 2024.",
        },
        {
            "person": "Izzy",
            "network_node_id": "person-izzy",
            "podcast_node_id": None,
            "episode_hits": 1,
            "evidence": "Named in the Greenpill.Network in 2024 episode and in onboarding materials.",
        },
        {
            "person": "Elliot Bayev",
            "network_node_id": None,
            "podcast_node_id": "person-elliot-bayev",
            "episode_hits": 2,
            "evidence": "Named in Greenpill.Network in 2024 and Impact Mastermind.",
        },
        {
            "person": "Matt Strachman",
            "network_node_id": "matt-strachman",
            "podcast_node_id": None,
            "episode_hits": 0,
            "evidence": "Active network steward in public docs, but not cleanly surfaced in current podcast metadata.",
        },
        {
            "person": "Caue Tomaz",
            "network_node_id": "person-caue-tomaz",
            "podcast_node_id": None,
            "episode_hits": 0,
            "evidence": "Active network and Dev Guild steward in public docs, but not cleanly surfaced in current podcast metadata.",
        },
    ]

    segment_scores = [
        {
            "segment": "chapters",
            "score": 0.34,
            "assessment": "weak_direct_moderate_indirect",
            "rationale": "No current chapter names were found in episode metadata, but chapter-level ideas are reinforced by localism episodes, onboarding, and the Greenpill.Network in 2024 roundtable.",
        },
        {
            "segment": "guilds",
            "score": 0.27,
            "assessment": "weak_direct",
            "rationale": "Named guild overlap is effectively zero in feed metadata, and most raw 'guild' hits are false positives like Protocol Guild or BuildGuild.",
        },
        {
            "segment": "active_people",
            "score": 0.58,
            "assessment": "moderate",
            "rationale": "The podcast does surface active network people, but outside Kevin the overlap is concentrated in a small set of internal-facing episodes.",
        },
        {
            "segment": "shared_operating_stack",
            "score": 0.84,
            "assessment": "strong",
            "rationale": "Gitcoin, Allo, Gardens, Karma GAP, Hypercerts, Ethereum Localism, and JournoDAO form a strong bridge between the podcast and the network's current operating reality.",
        },
    ]

    out = {
        "meta": {
            "title": "GreenPill Podcast <-> Greenpill Network Overlap Graph",
            "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "question": "How well does the GreenPill podcast map to the current Greenpill network of chapters, guilds, active individuals, and shared operating infrastructure?",
            "summary": "The podcast maps weakly to the current chapter and guild roster if measured by direct naming, but it maps strongly to the network's operating stack and moderately to a smaller set of active internal people.",
            "overall_assessment": "moderate_indirect_fit",
            "segment_scores": segment_scores,
            "metrics": {
                "node_count": len(nodes),
                "relationship_count": len(CUSTOM_RELATIONSHIPS),
                "capital_flow_count": len(CUSTOM_CAPITAL_FLOWS),
                "shared_ids_between_main_and_podcast_graphs": shared_ids,
                "shared_label_count_between_main_and_podcast_graphs": len(shared_labels),
                "duplicate_labels_requiring_canonicalization": duplicate_labels,
                "named_chapter_labels_matched": {
                    label: hits for label, hits in chapter_name_hits.items() if hits
                },
                "named_guild_labels_matched": {
                    label: hits for label, hits in guild_name_hits.items() if hits
                },
                "raw_chapter_term_episode_hits": len(raw_chapter_mentions),
                "raw_guild_term_episode_hits": len(raw_guild_mentions),
                "raw_guild_term_false_positive_examples": raw_guild_mentions[:4],
                "substantive_internal_episode_titles": [
                    "162 - Green Pill V3: The Next Chapter",
                    "Season 3 - Ep. 10 - Greenpill.Network in 2024",
                    "Season 3 - Ep. 5 - GreenPill Hypercerts Experiment w/ Sejal + Bitbeckers",
                    "Season 4. Ep. - 26 - Onchain Capital Allocation Book W/ Kevin Owocki",
                    "GG24: Inside the First Funding Round of Gitcoin 3.0 — Funding What Matters",
                ],
                "shared_stack_term_counts": {
                    "Gitcoin": len(count_episode_hits(feed, "Gitcoin")),
                    "Allo Capital": len(count_episode_hits(feed, "Allo Capital")),
                    "Ethereum Localism": len(count_episode_hits(feed, "Ethereum Localism")),
                    "Hypercerts": len(count_episode_hits(feed, "Hypercerts")),
                    "JournoDAO": len(count_episode_hits(feed, "JournoDAO")),
                    "Gardens": len(count_episode_hits(feed, "Gardens")),
                    "Karma GAP": len(count_episode_hits(feed, "Karma GAP")),
                },
            },
            "active_people_overlap": active_people_overlap,
        },
        "capital_taxonomy": deepcopy(main_graph["capital_taxonomy"]),
        "sources": sources,
        "nodes": nodes,
        "relationships": deepcopy(CUSTOM_RELATIONSHIPS),
        "capital_flows": deepcopy(CUSTOM_CAPITAL_FLOWS),
    }

    OUT_PATH.write_text(json.dumps(out, indent=2) + "\n")


if __name__ == "__main__":
    main()
