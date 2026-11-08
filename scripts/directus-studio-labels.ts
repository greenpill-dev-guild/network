// Portuguese (Brazil) and Spanish labels for the fields and form groups of the
// steward-facing collections in Data Studio.
//
// DRAFT: written without a native speaker. Every label below waits for review
// by a pt-BR and a Spanish speaker; DRAFT_LABEL_REVIEW records who reviewed
// what. English labels are not touched.
//
// Data Studio picks a field label by the viewer's exact locale (their own
// language setting, else the project default) and does not fall back from
// es-419 to es-ES or to English labels. A field with no label for that locale
// shows its name as a title, as it does today. So the keys below have to be
// the ones users can actually have.
//
// Production on 2026-11-08: the project default is en-US and none of the 21
// users had set a language, so nobody was on a Portuguese or Spanish locale
// yet. A steward who switches picks from Directus's own list, which has one
// Brazilian Portuguese key and four Spanish ones, so the Spanish draft is
// written under all four.

type LabelLanguage = 'pt' | 'es';
type Labels = Readonly<Record<LabelLanguage, string>>;
type Translation = { language: string; translation: string };

// Directus locale key -> which draft it shows.
export const STUDIO_LABEL_LOCALES: Readonly<Record<string, LabelLanguage>> = Object.freeze({
  'pt-BR': 'pt',
  'es-419': 'es',
  'es-ES': 'es',
  'es-MX': 'es',
  'es-CL': 'es',
});

// The locale keys Directus 11.17.4 offers for these languages, from its
// language list. A key outside this list would never match a user.
export const DIRECTUS_LOCALE_KEYS_FOR_LABELS = Object.freeze(['pt-BR', 'pt-PT', 'es-419', 'es-CL', 'es-ES', 'es-MX']);

// Where the native-speaker review stands. Update it when a reviewer signs off.
export const DRAFT_LABEL_REVIEW: Readonly<Record<LabelLanguage, string>> = Object.freeze({
  pt: 'draft; review requested from the Greenpill Brasil stewards (2026-11-08)',
  es: 'draft; Spanish reviewer not yet named (2026-11-08)',
});

export const STEWARD_FACING_COLLECTIONS = Object.freeze([
  'chapters',
  'chapter_initiatives',
  'chapter_update_requests',
  'chapter_update_request_links',
  'chapter_update_request_proof_signals',
  'guilds',
  'projects',
  'people',
  'themes',
  'chapter_impact_snapshots',
]);

const label = (pt: string, es: string): Labels => Object.freeze({ pt, es });

// Fields that mean the same thing in every steward-facing collection.
const SHARED_FIELD_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  slug: label('Identificador (slug)', 'Identificador (slug)'),
  name: label('Nome', 'Nombre'),
  title: label('Título', 'Título'),
  summary: label('Resumo', 'Resumen'),
  description: label('Descrição', 'Descripción'),
  entity_status: label('Situação', 'Situación'),
  chapter_slug: label('Capítulo', 'Capítulo'),
  theme_slugs: label('Temas (slugs)', 'Temas (slugs)'),
  steward_slugs: label('Stewards (slugs)', 'Stewards (slugs)'),
  stewards: label('Stewards', 'Stewards'),
  links: label('Links', 'Enlaces'),
  connect_links: label('Links para contato', 'Enlaces de contacto'),
  proof_signals: label('Evidências', 'Evidencias'),
  impact_sources: label('Fontes de impacto', 'Fuentes de impacto'),
  featured_weight: label('Peso no destaque', 'Peso en destacados'),
  media: label('Mídia', 'Multimedia'),
  seo: label('SEO', 'SEO'),
  sort_order: label('Ordem', 'Orden'),
  publication_status: label('Status de publicação', 'Estado de publicación'),
  published_at: label('Publicado em', 'Publicado el'),
  reviewed_at: label('Revisado em', 'Revisado el'),
  reviewed_by: label('Revisado por', 'Revisado por'),
});

// Fields and form groups whose meaning depends on the collection.
const COLLECTION_LABELS: Readonly<Record<string, Readonly<Record<string, Labels>>>> = Object.freeze({
  chapters: {
    group_identity: label('Identidade e localização', 'Identidad y ubicación'),
    group_story: label('História', 'Historia'),
    group_links_media: label('Links e mídia', 'Enlaces y multimedia'),
    group_impact: label('Impacto', 'Impacto'),
    group_workflow: label('Publicação e fluxo de trabalho', 'Publicación y flujo de trabajo'),
    city: label('Cidade', 'Ciudad'),
    country: label('País', 'País'),
    region: label('Região', 'Región'),
    intro_quote: label('Citação de abertura', 'Cita de apertura'),
    intro_quote_attribution: label('Autor da citação', 'Autor de la cita'),
    image_file: label('Imagem do capítulo', 'Imagen del capítulo'),
    image_alt: label('Texto alternativo da imagem', 'Texto alternativo de la imagen'),
    image_credit: label('Crédito da imagem', 'Crédito de la imagen'),
    founded: label('Fundação', 'Fundación'),
    latitude: label('Latitude', 'Latitud'),
    longitude: label('Longitude', 'Longitud'),
    primary_link: label('Link principal', 'Enlace principal'),
    related_chapter_slugs: label('Capítulos relacionados (slugs)', 'Capítulos relacionados (slugs)'),
    featured_story: label('História em destaque', 'Historia destacada'),
    featured_story_slugs: label('Histórias em destaque (slugs)', 'Historias destacadas (slugs)'),
    authored_resource_slugs: label('Recursos próprios (slugs)', 'Recursos propios (slugs)'),
    initiatives: label('Iniciativas', 'Iniciativas'),
  },
  chapter_initiatives: {
    related_story_slugs: label('Histórias relacionadas (slugs)', 'Historias relacionadas (slugs)'),
    related_resource_slugs: label('Recursos relacionados (slugs)', 'Recursos relacionados (slugs)'),
  },
  chapter_update_requests: {
    request_status: label('Status da solicitação', 'Estado de la solicitud'),
    summary: label('Resumo da solicitação', 'Resumen de la solicitud'),
    proposed_summary: label('Resumo proposto', 'Resumen propuesto'),
    proposed_primary_link: label('Link principal proposto', 'Enlace principal propuesto'),
    proposed_image: label('Imagem proposta (URL)', 'Imagen propuesta (URL)'),
    proposed_image_alt: label('Texto alternativo proposto', 'Texto alternativo propuesto'),
    proposed_image_credit: label('Crédito da imagem proposto', 'Crédito de imagen propuesto'),
    requested_changes: label('Alterações solicitadas (JSON)', 'Cambios solicitados (JSON)'),
    reviewer_notes: label('Notas da revisão', 'Notas de revisión'),
    chapter_updated_at_snapshot: label('Versão do capítulo', 'Versión del capítulo'),
  },
  chapter_update_request_links: {
    update_request_id: label('Solicitação', 'Solicitud'),
    label: label('Rótulo', 'Etiqueta'),
    url: label('URL', 'URL'),
    kind: label('Tipo', 'Tipo'),
    subtext: label('Texto de apoio', 'Texto de apoyo'),
    handle: label('Usuário', 'Usuario'),
    action: label('Ação', 'Acción'),
    icon: label('Ícone', 'Ícono'),
  },
  chapter_update_request_proof_signals: {
    update_request_id: label('Solicitação', 'Solicitud'),
    label: label('Rótulo', 'Etiqueta'),
    value: label('Valor', 'Valor'),
    source: label('Fonte', 'Fuente'),
    href: label('Link da fonte', 'Enlace de la fuente'),
  },
  guilds: {
    group_identity: label('Identidade', 'Identidad'),
    group_story: label('História e membros', 'Historia y miembros'),
    group_links_media: label('Links e mídia', 'Enlaces y multimedia'),
    group_workflow: label('Publicação e fluxo de trabalho', 'Publicación y flujo de trabajo'),
    type: label('Tipo', 'Tipo'),
    founded_year: label('Ano de fundação', 'Año de fundación'),
    oneliner: label('Frase curta', 'Frase breve'),
    image: label('Imagem (URL)', 'Imagen (URL)'),
    cadence: label('Ritmo de encontros', 'Ritmo de reuniones'),
    member_slugs: label('Membros (slugs)', 'Miembros (slugs)'),
    public_members: label('Membros públicos', 'Miembros públicos'),
    mandate_paragraphs: label('Mandato', 'Mandato'),
    outputs: label('Publicações', 'Publicaciones'),
    principles: label('Princípios', 'Principios'),
    projects: label('Projetos', 'Proyectos'),
  },
  projects: {
    guild_slug: label('Guilda', 'Gremio'),
    image: label('Imagem (URL)', 'Imagen (URL)'),
    tech_stack: label('Tecnologias', 'Tecnologías'),
    repo_url: label('Repositório (URL)', 'Repositorio (URL)'),
    live_url: label('Site ou app (URL)', 'Sitio o app (URL)'),
  },
  people: {
    display_name: label('Nome de exibição', 'Nombre visible'),
    role: label('Função', 'Rol'),
    avatar: label('Avatar (URL)', 'Avatar (URL)'),
    bio: label('Biografia', 'Biografía'),
  },
  themes: {},
  chapter_impact_snapshots: {
    synced_at: label('Última sincronização', 'Última sincronización'),
    stale_after: label('Desatualizado a partir de', 'Desactualizado a partir de'),
    error_count: label('Falhas seguidas', 'Fallos seguidos'),
    last_error: label('Último erro', 'Último error'),
    source_status: label('Status das fontes', 'Estado de las fuentes'),
  },
});

function cleanCollectionName(collection: string) {
  return collection.replace(/^(content|intake|impact)[._]/, '');
}

export function stewardFacingLabels(collection: string, field: string): Labels | null {
  const base = cleanCollectionName(collection);
  if (!STEWARD_FACING_COLLECTIONS.includes(base)) return null;
  return COLLECTION_LABELS[base]?.[field] ?? SHARED_FIELD_LABELS[field] ?? null;
}

// The field's translations with this module's locales set and every other
// language (English labels above all) left as it was. Running it twice gives
// the same list, so a rerun of the Studio setup adds no duplicates.
export function withLocaleLabels(collection: string, field: string, translations: readonly Translation[] | null | undefined) {
  const labels = stewardFacingLabels(collection, field);
  const kept = (translations ?? []).filter((entry) => !(entry.language in STUDIO_LABEL_LOCALES));
  if (!labels) return translations ?? null;
  return [
    ...kept,
    ...Object.entries(STUDIO_LABEL_LOCALES).map(([language, draft]) => ({ language, translation: labels[draft] })),
  ];
}

// Field metadata with the locale labels merged into its translations.
export function withLocaleLabelMeta<Meta extends Record<string, unknown>>(collection: string, field: string, meta: Meta) {
  const translations = withLocaleLabels(collection, field, meta.translations as Translation[] | null | undefined);
  return translations && translations.length > 0 ? { ...meta, translations } : meta;
}

// Planned field metadata as it should be written over what the field has now.
// Directus replaces a field's translations list whole, so the stored entries
// are merged in here, when the stored list is known: a language the plan sets
// is replaced, and any other one stays, such as a label added by hand in Data
// Studio. Metadata that sets no translations comes back unchanged, which
// leaves the stored ones alone.
export function keepOtherTranslations<Meta extends Record<string, unknown>>(
  currentMeta: Record<string, unknown> | null | undefined,
  plannedMeta: Meta
): Meta {
  const planned = plannedMeta.translations;
  if (!Array.isArray(planned)) return plannedMeta;
  const stored = Array.isArray(currentMeta?.translations) ? (currentMeta.translations as Translation[]) : [];
  const plannedLanguages = new Set((planned as Translation[]).map((entry) => entry.language));
  return {
    ...plannedMeta,
    translations: [...stored.filter((entry) => !plannedLanguages.has(entry.language)), ...planned],
  };
}
