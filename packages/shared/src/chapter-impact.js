export const CHAPTER_IMPACT_AGENT_BASE = 'https://agent.greenpill.network';
export const CHAPTER_IMPACT_SOURCES_VERSION = 1;
export const CHAPTER_IMPACT_UI_ENABLED = false;

export const PRIVATE_CHAPTER_IMPACT_FIELDS = Object.freeze([
  'email',
  'privateEmail',
  'private_email',
  'rawNote',
  'raw_note',
  'reviewNotes',
  'review_notes',
  'rawReviewNotes',
  'raw_review_notes',
  'ipAddress',
  'ip_address',
  'rateLimitKey',
  'rate_limit_key',
  'spamScore',
  'spamSignals',
  'userAgent',
  'user_agent',
  'decodedDataJson',
  'decoded_data_json',
  'rawEasFeedback',
  'raw_eas_feedback',
  'rawEasMedia',
  'raw_eas_media',
  'rawMedia',
  'raw_media',
  'workFeedback',
  'work_feedback',
  'workMedia',
  'work_media',
  'reviewNotesCID',
  'review_notes_cid',
  'media',
  'mediaUrls',
  'media_urls',
  'works',
  'rawWorks',
  'raw_works',
]);

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeFieldKey = (key) => cleanString(key).toLowerCase().replace(/[^a-z0-9]/g, '');
const PRIVATE_CHAPTER_IMPACT_FIELD_KEYS = new Set(
  PRIVATE_CHAPTER_IMPACT_FIELDS.map(normalizeFieldKey)
);
const PRIVATE_CHAPTER_IMPACT_FIELD_PATTERNS = Object.freeze([
  'email',
  'ipaddress',
  'ratelimit',
  'spam',
  'useragent',
  'decodeddatajson',
  'raweasfeedback',
  'raweasmedia',
  'rawmedia',
  'workfeedback',
  'workmedia',
  'reviewnotescid',
  'mediaurl',
]);

const cleanUrl = (value) => {
  const candidate = cleanString(value);
  return candidate.startsWith('http://') || candidate.startsWith('https://') ? candidate : '';
};

const normalizeInteger = (value) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const countValue = (value) => {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'number' || typeof value === 'string') return normalizeInteger(value);
  return 0;
};

const firstString = (...values) => {
  for (const value of values) {
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return '';
};

const firstUrl = (...values) => {
  for (const value of values) {
    const cleaned = cleanUrl(value);
    if (cleaned) return cleaned;
  }
  return '';
};

const normalizePublicEvent = (event, fallbackType) => ({
  id: firstString(event?.id, event?.uid, event?.UID, event?.milestoneUID, event?.grantUID),
  title: firstString(event?.title, event?.name, event?.label),
  type: firstString(event?.type, fallbackType),
  status: firstString(event?.status, event?.lifecycleStatus),
  publishedAt: firstString(event?.publishedAt, event?.createdAt, event?.updatedAt, event?.completedAt),
  url: firstUrl(event?.url, event?.link, event?.externalUrl),
});

const normalizeEvents = (events, fallbackType, limit = 12) => asArray(events)
  .map((event) => normalizePublicEvent(event, fallbackType))
  .filter((event) => event.id || event.title || event.url)
  .slice(0, limit);

const sourceHasValue = (sources) => Boolean(
  cleanString(sources?.greenGoodsGardenAddress) ||
  cleanString(sources?.karmaProjectUID) ||
  cleanString(sources?.karmaProjectSlug) ||
  cleanString(sources?.karmaCommunitySlug)
);

export function hasConfiguredImpactSource(sources) {
  return sourceHasValue(sources);
}

export function shouldRenderChapterImpactUi(sources, uiEnabled = CHAPTER_IMPACT_UI_ENABLED) {
  return Boolean(uiEnabled) && Boolean(sources?.impactEnabled) && sourceHasValue(sources);
}

export function buildChapterImpactEndpoint(chapterSlug, baseUrl = CHAPTER_IMPACT_AGENT_BASE) {
  const cleanBase = cleanString(baseUrl).replace(/\/+$/, '') || CHAPTER_IMPACT_AGENT_BASE;
  return `${cleanBase}/impact/chapters/${encodeURIComponent(cleanString(chapterSlug))}`;
}

export function containsPrivateChapterImpactField(value, seen = new Set()) {
  if (!value || typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = normalizeFieldKey(key);
    return (
      PRIVATE_CHAPTER_IMPACT_FIELD_KEYS.has(normalizedKey) ||
      PRIVATE_CHAPTER_IMPACT_FIELD_PATTERNS.some((pattern) => normalizedKey.includes(pattern)) ||
      containsPrivateChapterImpactField(nestedValue, seen)
    );
  });
}

export function normalizeImpactSources(sources = {}) {
  const greenGoodsGardenAddress = cleanString(sources.greenGoodsGardenAddress);
  const karmaProjectUID = cleanString(sources.karmaProjectUID);
  const karmaProjectSlug = cleanString(sources.karmaProjectSlug);
  const karmaCommunitySlug = cleanString(sources.karmaCommunitySlug);
  const greenGoodsChainId = normalizeInteger(sources.greenGoodsChainId) || 42161;

  return {
    impactEnabled: Boolean(sources.impactEnabled),
    greenGoodsGardenAddress,
    greenGoodsChainId,
    karmaProjectUID,
    karmaProjectSlug,
    karmaCommunitySlug,
  };
}

export function toPublicImpactSourceBinding(chapter) {
  const sources = normalizeImpactSources(chapter?.data?.impactSources);
  if (!sources.impactEnabled || !sourceHasValue(sources)) return null;

  return {
    chapterSlug: cleanString(chapter?.id),
    chapterName: cleanString(chapter?.data?.name),
    chapterPath: `/chapters/${cleanString(chapter?.id)}`,
    sources,
  };
}

export function normalizeKarmaImpactSnapshot(snapshot = {}) {
  const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const project = source.project && typeof source.project === 'object'
    ? source.project
    : source;
  const milestones = normalizeEvents(
    source.milestones || source.projectMilestones || project.milestones,
    'milestone'
  );
  const updates = normalizeEvents(source.updates || source.activities || project.updates, 'update');
  const grants = normalizeEvents(source.grants || project.grants, 'grant');
  const communityImpact = source.communityImpact && typeof source.communityImpact === 'object'
    ? source.communityImpact
    : null;

  const hasProject = Boolean(
    firstString(project?.uid, project?.UID, project?.id, project?.slug, project?.title, project?.name)
  );
  const hasData = hasProject || milestones.length > 0 || updates.length > 0 || grants.length > 0 || Boolean(communityImpact);
  if (!hasData) return null;

  return {
    project: hasProject ? {
      uid: firstString(project.uid, project.UID, project.id),
      slug: firstString(project.slug),
      title: firstString(project.title, project.name),
      url: firstUrl(project.url, project.link, project.externalUrl),
    } : null,
    milestones,
    updates,
    grants,
    communityImpact: communityImpact ? {
      summary: cleanString(communityImpact.summary),
      segmentCount: countValue(communityImpact.segments),
      indicatorCount: countValue(communityImpact.indicators),
    } : null,
  };
}

export function normalizeGreenGoodsImpactSnapshot(snapshot = {}) {
  const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const garden = source.garden && typeof source.garden === 'object'
    ? source.garden
    : source;
  const address = firstString(garden.address, garden.id, source.gardenAddress);
  const hasGarden = Boolean(address || garden.name || garden.location);
  if (!hasGarden) return null;

  const activity = source.activity && typeof source.activity === 'object' ? source.activity : source;
  const roleCounts = {
    gardeners: countValue(garden.gardeners ?? source.gardeners),
    operators: countValue(garden.operators ?? source.operators),
    evaluators: countValue(garden.evaluators ?? source.evaluators),
  };
  const roleAddresses = [
    ...asArray(garden.gardeners ?? source.gardeners),
    ...asArray(garden.operators ?? source.operators),
    ...asArray(garden.evaluators ?? source.evaluators),
  ]
    .map((address) => cleanString(address).toLowerCase())
    .filter(Boolean);
  const distinctMemberCount = new Set(roleAddresses).size;
  const roleAssignmentCount = roleCounts.gardeners + roleCounts.operators + roleCounts.evaluators;

  return {
    garden: {
      address,
      chainId: normalizeInteger(garden.chainId || snapshot.chainId) || 42161,
      name: cleanString(garden.name),
      location: cleanString(garden.location),
      gapProjectUID: cleanString(garden.gapProjectUID),
      roleCounts,
      memberCount: distinctMemberCount || roleAssignmentCount,
      url: firstUrl(garden.url, garden.link, source.url),
    },
    activity: {
      actionCount: countValue(activity.actionCount ?? activity.actionsCount ?? activity.actions),
      assessmentCount: countValue(activity.assessmentCount ?? activity.assessmentsCount ?? activity.assessments),
      hypercertCount: countValue(activity.hypercertCount ?? activity.hypercertsCount ?? activity.hypercerts),
    },
  };
}

export function toPublicChapterImpactPayload({
  chapterSlug,
  chapterName,
  sources,
  karma,
  greenGoods,
  generatedAt = new Date(),
} = {}) {
  const normalizedSources = normalizeImpactSources(sources);
  const karmaImpact = normalizeKarmaImpactSnapshot(karma);
  const greenGoodsImpact = normalizeGreenGoodsImpactSnapshot(greenGoods);
  const hasKarmaSource = Boolean(
    normalizedSources.karmaProjectUID ||
    normalizedSources.karmaProjectSlug ||
    normalizedSources.karmaCommunitySlug
  );
  const hasGreenGoodsSource = Boolean(normalizedSources.greenGoodsGardenAddress);

  const proofLinks = [
    karmaImpact?.project?.url ? { label: 'KarmaGAP project', url: karmaImpact.project.url, source: 'karma' } : null,
    greenGoodsImpact?.garden?.url ? { label: 'Green Goods garden', url: greenGoodsImpact.garden.url, source: 'green-goods' } : null,
    ...asArray(karmaImpact?.milestones)
      .filter((milestone) => milestone.url)
      .map((milestone) => ({ label: milestone.title || 'KarmaGAP milestone', url: milestone.url, source: 'karma' })),
  ].filter(Boolean).slice(0, 12);

  return {
    version: 1,
    chapterSlug: cleanString(chapterSlug),
    chapterName: cleanString(chapterName),
    generatedAt: generatedAt instanceof Date ? generatedAt.toISOString() : new Date(generatedAt).toISOString(),
    sourceStatus: [
      {
        source: 'karma',
        configured: hasKarmaSource,
        status: hasKarmaSource ? (karmaImpact ? 'ok' : 'unavailable') : 'missing',
      },
      {
        source: 'green-goods',
        configured: hasGreenGoodsSource,
        status: hasGreenGoodsSource ? (greenGoodsImpact ? 'ok' : 'unavailable') : 'missing',
      },
    ],
    summary: {
      milestoneCount: countValue(karmaImpact?.milestones),
      updateCount: countValue(karmaImpact?.updates),
      grantCount: countValue(karmaImpact?.grants),
      gardenMemberCount: greenGoodsImpact?.garden?.memberCount ?? 0,
      actionCount: greenGoodsImpact?.activity?.actionCount ?? 0,
      assessmentCount: greenGoodsImpact?.activity?.assessmentCount ?? 0,
      hypercertCount: greenGoodsImpact?.activity?.hypercertCount ?? 0,
      proofLinkCount: proofLinks.length,
    },
    karma: karmaImpact,
    greenGoods: greenGoodsImpact,
    proofLinks,
  };
}
