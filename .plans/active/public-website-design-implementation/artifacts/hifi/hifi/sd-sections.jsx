/* hifi/sd-sections.jsx — Story Detail composed sections. */

/* ---------- Article hero — four variants ----------
   variant: 'stacked' (title above photo)
          | 'overlay' (title on full-bleed photo)
          | 'split'   (title left, photo right)
          | 'typographic' (no photo, pure type)
*/
const SdArticleHero = ({ bp, variant = 'stacked', showShare = true }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);

  /* Title block bits reused across variants */
  const Meta = () => (
    <StMeta chapter={`Chapter · ${SD_STORY.chapter}`} tag={SD_STORY.tag} size={11} />
  );

  /* ---------- typographic (no photo) ---------- */
  if (variant === 'typographic') {
    return (
      <section style={{ padding: mobile ? '40px 20px 24px' : `${88}px ${inset}px 40px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 22 : 36, maxWidth: 1200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span aria-hidden="true" style={{ width: 56, height: 1, background: 'var(--gp-primary)', flex: 'none' }} />
            <Meta />
          </div>
          <GP_H1
            size={mobile ? 44 : 'clamp(72px, 7.4vw, 112px)'}
            style={{ letterSpacing: '-0.03em', lineHeight: 0.98, maxWidth: 1100 }}
          >{SD_STORY.title}</GP_H1>
          <p style={{
            margin: 0,
            maxWidth: 800,
            fontFamily: 'var(--gp-font-display)',
            fontVariationSettings: 'var(--gp-display-vs)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: mobile ? 18 : 24,
            lineHeight: 1.4,
            color: 'var(--gp-off-white-dim)',
            letterSpacing: '-0.005em',
            textWrap: 'pretty',
          }}>{SD_STORY.dek}</p>
          <div style={{
            display: 'flex',
            flexDirection: mobile ? 'column' : 'row',
            alignItems: mobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 16,
            paddingTop: 18,
            borderTop: '1px solid var(--gp-border-soft)',
          }}>
            <SdByline bp={bp} />
            {!mobile && showShare && <SdShareSaveButtons />}
          </div>
        </div>
      </section>
    );
  }

  /* ---------- overlay (full-bleed photo, content scrim-anchored bottom) ---------- */
  if (variant === 'overlay') {
    const heroH = mobile ? 520 : (bp === 'tablet' ? 620 : 720);
    return (
      <section style={{
        padding: mobile ? '0' : `${24}px ${inset}px 32px`,
      }}>
        <SdHeroPhoto
          h={heroH}
          caption={SD_STORY.heroPhoto}
          radius={mobile ? 0 : 'var(--gp-radius-xl)'}
          scrim
        >
          <div style={{
            position: 'absolute',
            left: mobile ? 20 : 56,
            right: mobile ? 20 : 56,
            bottom: mobile ? 64 : 72,
            display: 'flex', flexDirection: 'column',
            gap: mobile ? 16 : 24,
            maxWidth: 1100,
            zIndex: 2,
          }}>
            <Meta />
            <GP_H1
              size={mobile ? 32 : 'clamp(48px, 5vw, 72px)'}
              style={{ letterSpacing: '-0.02em', lineHeight: 1.04, maxWidth: 1000 }}
            >{SD_STORY.title}</GP_H1>
            <GP_Body size={mobile ? 15 : 19} color="var(--gp-off-white-dim)" style={{ maxWidth: 760, lineHeight: 1.5 }}>
              {SD_STORY.dek}
            </GP_Body>
            <div style={{
              display: 'flex',
              flexDirection: mobile ? 'column' : 'row',
              alignItems: mobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: 14,
              paddingTop: 6,
            }}>
              <SdByline bp={bp} />
              {!mobile && showShare && <SdShareSaveButtons tone="on-photo" />}
            </div>
          </div>
        </SdHeroPhoto>
      </section>
    );
  }

  /* ---------- split (title left, photo right) ---------- */
  if (variant === 'split') {
    return (
      <section style={{ padding: mobile ? '32px 20px 24px' : `${64}px ${inset}px 32px` }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr' : 'minmax(0, 1.05fr) minmax(0, 1fr)',
          gap: mobile ? 24 : 56,
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 18 : 26, minWidth: 0 }}>
            <Meta />
            <GP_H1
              size={mobile ? 36 : 'clamp(44px, 4.4vw, 64px)'}
              style={{ letterSpacing: '-0.02em', lineHeight: 1.04 }}
            >{SD_STORY.title}</GP_H1>
            <GP_Body size={mobile ? 16 : 18} color="var(--gp-off-white-dim)" style={{ lineHeight: 1.55 }}>
              {SD_STORY.dek}
            </GP_Body>
            <div style={{ paddingTop: 8 }}>
              <SdByline bp={bp} />
            </div>
            {!mobile && showShare && (
              <div style={{ paddingTop: 6 }}>
                <SdShareSaveButtons />
              </div>
            )}
          </div>
          <SdHeroPhoto
            h={mobile ? 280 : (bp === 'tablet' ? 480 : 560)}
            caption={SD_STORY.heroPhoto}
          />
        </div>
      </section>
    );
  }

  /* ---------- stacked (default) ---------- */
  const heroH = mobile ? 280 : (bp === 'tablet' ? 460 : 560);
  return (
    <section style={{ padding: mobile ? '32px 20px 24px' : `${56}px ${inset}px 32px` }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 18 : 28, maxWidth: 1100 }}>
        <Meta />
        <GP_H1
          size={mobile ? 36 : 'clamp(50px, 5.4vw, 76px)'}
          style={{ letterSpacing: '-0.02em', lineHeight: 1.04 }}
        >{SD_STORY.title}</GP_H1>
        <GP_Body size={mobile ? 16 : 20} color="var(--gp-off-white-dim)" style={{ maxWidth: 760, lineHeight: 1.5 }}>
          {SD_STORY.dek}
        </GP_Body>
        <div style={{
          display: 'flex',
          flexDirection: mobile ? 'column' : 'row',
          alignItems: mobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingTop: 8,
        }}>
          <SdByline bp={bp} />
          {!mobile && showShare && <SdShareSaveButtons />}
        </div>
      </div>
      <div style={{ marginTop: mobile ? 24 : 40 }}>
        <SdHeroPhoto h={heroH} caption={SD_STORY.heroPhoto} />
      </div>
    </section>
  );
};

/* ---------- Article body in a constrained column ---------- */

const SdArticleBody = ({
  bp,
  readingWidth = 'standard',  /* 'narrow' | 'standard' | 'wide' */
  dropcap = false,
  pullquoteStyle = 'border',
  showStats = true,
  showTranslations = true,
  showShare = true,
  showAuthorBio = true,
}) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);

  /* Constrained reading column. Inset more aggressively than other sections
     so the line measure stays in the editorial sweet-spot. */
  const widthMap = { narrow: 620, standard: 720, wide: 840 };
  const colMax = mobile ? '100%' : `min(${widthMap[readingWidth] || 720}px, 100%)`;

  return (
    <section style={{
      padding: mobile ? '8px 20px 24px' : `24px ${inset}px 32px`,
    }}>
      {showTranslations && (
        <div style={{ maxWidth: 1100 }}>
          <SdTranslationsRow bp={bp} />
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : `1fr ${colMax} 1fr`,
        marginTop: mobile ? 28 : (showTranslations ? 44 : 8),
      }}>
        <div style={{ gridColumn: mobile ? '1' : '2 / 3' }}>
          {showStats && <SdStatStrip bp={bp} />}
          <div style={{ marginTop: showStats ? (mobile ? 28 : 44) : 0 }}>
            <SdProse bp={bp} dropcap={dropcap} pullquoteStyle={pullquoteStyle} />
          </div>
          {showShare && (
            <div style={{ marginTop: mobile ? 32 : 48 }}>
              <SdArticleFooter bp={bp} />
            </div>
          )}
          {showAuthorBio && (
            <div style={{ marginTop: mobile ? 28 : 40 }}>
              <SdAuthorBio bp={bp} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ---------- Continue reading ---------- */

const SdContinueReadingSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '40px 20px 24px' : `72px ${inset}px 24px`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: mobile ? 18 : 28, gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GP_Overline>Continue reading</GP_Overline>
          <GP_H2 size={mobile ? 26 : 38}>From across the network</GP_H2>
        </div>
        <GP_ArrowLink href="Stories (Hi-Fi).html">All stories</GP_ArrowLink>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
        gap: mobile ? 14 : 22,
      }}>
        {SD_CONTINUE_READING.map((it, i) => (
          <SdContinueCard key={i} item={it} bp={bp} />
        ))}
      </div>
    </section>
  );
};

/* ---------- Newsletter (reuse) ---------- */

const SdNewsletterSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '32px 20px' : `48px ${inset}px`,
    }}>
      <StNewsletter bp={bp} />
    </section>
  );
};

/* ---------- Submit (reuse) ---------- */

const SdSubmitSection = ({ bp }) => {
  const mobile = bp === 'mobile';
  const inset = GP_useInset(bp);
  return (
    <section style={{
      padding: mobile ? '0 20px 24px' : `0 ${inset}px 48px`,
    }}>
      <StSubmitStrip bp={bp} />
    </section>
  );
};

Object.assign(window, {
  SdArticleHero, SdArticleBody,
  SdContinueReadingSection,
  SdNewsletterSection, SdSubmitSection,
});
