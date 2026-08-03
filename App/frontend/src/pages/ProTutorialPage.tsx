import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import SocialMediaCard from '@/components/SocialMediaCard';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Gem,
  CheckCircle2,
  Wand2,
  Palette,
  Lightbulb,
  Loader2,
  AlertCircle,
  ChevronRight,
  Share2,
  RotateCcw,
} from 'lucide-react';
import {
  generateProTutorial,
  type ProTutorialResponse,
} from '@/lib/proTutorial';
import { stylizeImage } from '@/lib/stylize';
import {
  cacheTutorial,
  getCachedTutorial,
  updateCachedStylizedUrls,
} from '@/lib/tutorialCache';

interface LocationStateShape {
  style?: {
    id: string;
    name: string;
    tagline: string;
    image: string;
    match: number;
    keyFocus: string[];
  };
  faceShape?: string;
  eyeTags?: string[];
  facialTags?: string[];
  metrics?: Record<string, number>;
  styleScores?: Record<string, number>;
  /** User photo (base64 data URI) forwarded from ResultsPage. */
  userImage?: string;
}

/** Status of one stylized image (overall hero or a sub-style thumbnail). */
interface StylizedImageState {
  status: 'loading' | 'ready' | 'error';
  url?: string;
  error?: string;
}

const STYLE_DISPLAY: Record<string, string> = {
  sweet: 'Sweet',
  natural: 'Natural',
  sexy: 'Sexy',
  androgynous: 'Androgynous',
  elegant: 'Elegant',
  powerful: 'Powerful',
  mature: 'Mature',
};

/** Slogan map for social media cards — keys are lowercase style/sub-style names. */
const STYLE_SLOGANS: Record<string, string> = {
  'sexy': 'She doesn\'t enter a room. She rewrites it.',
  'vamp': 'Velvet lips. Venomous grace. No apologies.',
  'red lip glam': 'One shade of red. A thousand unspoken words.',
  'cat eye glam': 'Her eyes don\'t follow the light — they command it.',
  'smoky eye': 'Smoke and mirrors — except the mirror already surrendered.',
  'contour glam': 'Carved by shadow. Illuminated by intention.',
  'mob wife': 'Dripping in mystery. Born to reign in shadows.',
  'dark glam': 'Dripping in mystery. Born to reign in shadows.',
  'mob wife / dark glam': 'Dripping in mystery. Born to reign in shadows.',
  'sweet': 'Soft power. Petal armor. Quietly devastating.',
  'japanese kawaii': 'Doe eyes that disarm. A sweetness that conquers.',
  'kawaii': 'Doe eyes that disarm. A sweetness that conquers.',
  'korean dewy': 'Luminous like morning dew on glass — impossibly perfect.',
  'glass skin': 'Luminous like morning dew on glass — impossibly perfect.',
  'strawberry girl': 'Sun-flushed. Berry-kissed. Recklessly alive.',
  'glazed donut': 'She glows like she swallowed the golden hour.',
  'glazed glass skin': 'She glows like she swallowed the golden hour.',
  'romantic floral': 'Petals on skin. Poetry in every blush.',
  'elegant': 'Less noise. More gravity. Absolute presence.',
  'quiet luxury': 'Whispered wealth. The loudest silence in the room.',
  'french girl': 'Perfectly undone. Impossibly magnetic.',
  'classic liner': 'One flick of the wrist. An empire of elegance.',
  'soft neutral glam': 'Warmth so effortless, it looks like fate.',
  'chinese elegance': 'Ink-stroke precision. Silk-draped power.',
  'natural': 'Bare-faced audacity. The art of being unapologetically you.',
  'clean girl': 'Stripped back. Lit from within. Untouchable.',
  'no-makeup makeup': 'The illusion of nothing. The impact of everything.',
  'sun-kissed': 'Golden hour lives on her skin permanently.',
  'bronzed': 'Golden hour lives on her skin permanently.',
  'sun-kissed / bronzed': 'Golden hour lives on her skin permanently.',
  'skinimalism': 'Her skin is the statement. Everything else is silence.',
  'dewy flush': 'Fresh as first light. Alive like a secret.',
  'androgynous': 'Rules were made. She was made to unmake them.',
  'graphic liner': 'Where geometry meets rebellion — art begins.',
  'bleached brow look': 'Erase the expected. Reveal the extraordinary.',
  'bleached brow': 'Erase the expected. Reveal the extraordinary.',
  'monochrome face': 'One hue. Total devotion. Zero compromise.',
  'monochrome': 'One hue. Total devotion. Zero compromise.',
  'smudged': 'Beautifully wrecked. Intentionally imperfect.',
  'undone': 'Beautifully wrecked. Intentionally imperfect.',
  'smudged / undone': 'Beautifully wrecked. Intentionally imperfect.',
  'sculptural': 'Her face is not worn — it is exhibited.',
  'avant-garde': 'Her face is not worn — it is exhibited.',
  'sculptural / avant-garde': 'Her face is not worn — it is exhibited.',
  'mature': 'Time didn\'t age her. It crowned her.',
  'powerful': 'Time didn\'t age her. It crowned her.',
  'mature / powerful': 'Time didn\'t age her. It crowned her.',
  'power red': 'Authority isn\'t requested. It\'s applied in one stroke.',
  'editorial bold': 'Maximum impact. Minimum explanation.',
  'corporate glam': 'Boardroom polish. Backroom fire.',
  'old hollywood': 'Timeless isn\'t a trend — it\'s a bloodline.',
  'defined brow sculpt': 'Arched like architecture. Sharp like ambition.',
  'defined brow': 'Arched like architecture. Sharp like ambition.',
};

/** Look up the slogan for a given style/sub-style name. */
function getSlogan(name: string, fallback?: string): string {
  const key = name.toLowerCase().trim();
  if (STYLE_SLOGANS[key]) return STYLE_SLOGANS[key];
  for (const [k, v] of Object.entries(STYLE_SLOGANS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return fallback || `Your personalized ${name} look`;
}

/** Convert a sub-style display name to a URL-safe slug. */
function subStyleSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ProTutorialPage() {
  const { styleId: styleIdParam, subStyleSlug: subStyleSlugParam } = useParams<{
    styleId: string;
    subStyleSlug?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as LocationStateShape;
  const styleId = (state.style?.id || styleIdParam || '').toLowerCase();
  const styleName = state.style?.name || STYLE_DISPLAY[styleId] || 'This Style';

  /** True when viewing a specific sub-style tutorial page. */
  const isSubStyleView = Boolean(subStyleSlugParam);

  const [tutorial, setTutorial] = useState<ProTutorialResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState<string>('Contacting the AI stylist…');
  const [elapsed, setElapsed] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  const [stylizedImages, setStylizedImages] = useState<
    Record<string, StylizedImageState>
  >({});
  const [cachedUserImage, setCachedUserImage] = useState<string | undefined>(undefined);
  const userImage = state.userImage || cachedUserImage;
  const stylizedRestoredFromCache = useRef(false);

  const [socialCardOpen, setSocialCardOpen] = useState(false);
  const [socialCardData, setSocialCardData] = useState<{
    imageUrl: string;
    styleName: string;
    slogan: string;
  } | null>(null);

  const openSocialCard = (imageUrl: string, name: string, slogan: string) => {
    setSocialCardData({ imageUrl, styleName: name, slogan });
    setSocialCardOpen(true);
  };

  useEffect(() => {
    if (!styleId) {
      navigate('/analyze', { replace: true });
    }
  }, [styleId, navigate]);

  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!styleId || tutorial) return;
    const cached = getCachedTutorial(styleId);
    if (cached) {
      setTutorial(cached.tutorial);
      setFromCache(true);
      if (cached.userImage && !state.userImage) {
        setCachedUserImage(cached.userImage);
      }
      if (cached.stylizedImageUrls) {
        const restored: Record<string, StylizedImageState> = {};
        for (const [key, url] of Object.entries(cached.stylizedImageUrls)) {
          if (url) restored[key] = { status: 'ready', url };
        }
        if (Object.keys(restored).length > 0) {
          setStylizedImages(restored);
          stylizedRestoredFromCache.current = true;
        }
      }
    }
  }, [styleId, tutorial, state.userImage]);

  const canFetch = Boolean(styleId) && !fromCache;

  useEffect(() => {
    if (!loading) return;
    const start = Date.now();
    const stages: Array<{ at: number; msg: string }> = [
      { at: 0, msg: 'Loading your style guide…' },
      { at: 2, msg: 'Matching sub-styles to your features…' },
      { at: 5, msg: 'Personalizing your recommendation…' },
      { at: 10, msg: 'Assembling your step-by-step tutorial…' },
      { at: 18, msg: 'Finalizing your palette and pro tips…' },
    ];
    const id = window.setInterval(() => {
      const secs = (Date.now() - start) / 1000;
      setElapsed(Math.floor(secs));
      const pct = Math.min(95, 100 * (1 - Math.exp(-secs / 8)));
      setProgress(pct);
      let current = stages[0].msg;
      for (const s of stages) if (secs >= s.at) current = s.msg;
      setProgressMsg(current);
    }, 300);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!canFetch || tutorial) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setProgress(0);
      setElapsed(0);
      setProgressMsg('Contacting the AI stylist…');
      try {
        const snap = (location.state || {}) as LocationStateShape;
        const score =
          snap.styleScores && styleId in snap.styleScores
            ? Number(snap.styleScores[styleId])
            : snap.style?.match;
        const resp = await generateProTutorial({
          style: styleId,
          image: userImage,
          face_shape: snap.faceShape,
          eye_tags: snap.eyeTags,
          facial_tags: snap.facialTags,
          metrics: snap.metrics as Record<string, number>,
          score: typeof score === 'number' ? score : undefined,
        });
        if (!cancelled) {
          setTutorial(resp);
          cacheTutorial({
            styleId,
            styleName,
            tutorial: resp,
            faceShape: snap.faceShape,
            score: typeof score === 'number' ? score : undefined,
            userImage: snap.userImage,
          });
        }
      } catch (err) {
        if (!cancelled) {
          let msg: string;
          if (err instanceof Error) {
            msg = err.message;
          } else if (typeof err === 'string') {
            msg = err;
          } else {
            try {
              msg = JSON.stringify(err);
            } catch {
              msg = 'Failed to load tutorial';
            }
          }
          if (msg === 'AUTH_REQUIRED') {
            setError(
              'The tutorial API requires authentication on the backend.'
            );
          } else {
            setError(msg);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canFetch, styleId, retryKey]);

  const selectedSubStyle = useMemo(() => {
    if (!isSubStyleView || !tutorial) return null;
    return (
      tutorial.sub_styles.find(
        (s) => subStyleSlug(s.name) === subStyleSlugParam
      ) || null
    );
  }, [isSubStyleView, tutorial, subStyleSlugParam]);

  useEffect(() => {
    if (!tutorial || !styleId) return;

    if (stylizedRestoredFromCache.current) {
      stylizedRestoredFromCache.current = false;
      return;
    }

    if (!userImage) {
      const key =
        isSubStyleView && selectedSubStyle ? selectedSubStyle.name : 'overall';
      setStylizedImages((prev) => ({
        ...prev,
        [key]: {
          status: 'error',
          error:
            'No source photo was provided for stylization. Please go back and re-upload your photo on the Analyze page.',
        },
      }));
      return;
    }

    const allTargets: Array<{ key: string; subStyle: string | null }> =
      isSubStyleView && selectedSubStyle
        ? [{ key: selectedSubStyle.name, subStyle: selectedSubStyle.name }]
        : [
            { key: 'overall', subStyle: null },
            ...tutorial.sub_styles.map((s) => ({
              key: s.name,
              subStyle: s.name,
            })),
          ];

    setStylizedImages((prev) => {
      const next = { ...prev };
      for (const t of allTargets) {
        if (!next[t.key]) next[t.key] = { status: 'loading' };
      }
      return next;
    });

    const controller = new AbortController();
    let cancelled = false;

    const runOne = async (t: { key: string; subStyle: string | null }) => {
      try {
        const resp = await stylizeImage(
          { style: styleId, sub_style: t.subStyle, image: userImage },
          { signal: controller.signal }
        );
        if (cancelled) return;
        setStylizedImages((prev) => ({
          ...prev,
          [t.key]: { status: 'ready', url: resp.image },
        }));
        if (resp.image) {
          updateCachedStylizedUrls(styleId, { [t.key]: resp.image });
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const msg =
          err instanceof Error ? err.message : 'Failed to generate image';
        setStylizedImages((prev) => ({
          ...prev,
          [t.key]: { status: 'error', error: msg },
        }));
      }
    };

    void Promise.all(allTargets.map((t) => runOne(t)));

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [tutorial, userImage, styleId, isSubStyleView, selectedSubStyle?.name]);

  const bgGradient =
    'radial-gradient(ellipse at top left, #FDF6EE 0%, #F7EFE5 40%, #F3EAD9 100%)';

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: bgGradient }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{
            top: '8%',
            right: '-6%',
            background:
              'radial-gradient(circle, rgba(184,112,106,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute w-[420px] h-[420px] rounded-full blur-[110px]"
          style={{
            bottom: '12%',
            left: '-6%',
            background:
              'radial-gradient(circle, rgba(142,156,195,0.10) 0%, transparent 70%)',
          }}
        />
      </div>

      <Navbar />

      <div className="max-w-[960px] mx-auto px-6 pt-32 pb-20 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[#6B7AA0] font-body text-sm font-medium hover:text-[#8E9CC3] transition-colors mb-8 group !bg-transparent"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
            style={{ background: 'linear-gradient(135deg, rgba(184,112,106,0.12), rgba(201,169,110,0.12))', border: '1px solid rgba(184,112,106,0.25)' }}>
            <Gem className="w-3.5 h-3.5 text-[#B8706A]" />
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-[#B8706A]">
              BeautyFit Pro
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2226] mb-3">
            {isSubStyleView && selectedSubStyle
              ? `${selectedSubStyle.name} — ${styleName}`
              : `${styleName} — Personal Tutorial`}
          </h1>
          <p className="font-body text-[#5C4A42] max-w-2xl leading-relaxed">
            {isSubStyleView && selectedSubStyle
              ? `A step-by-step ${selectedSubStyle.name} tutorial within the ${styleName} family — tailored to your facial analysis.`
              : `A detailed, step-by-step makeup tutorial tailored to your facial analysis — including products, techniques, color palette, and pro tips.`}
          </p>
          {fromCache && tutorial && (
            <button
              onClick={() => {
                setFromCache(false);
                setTutorial(null);
                setError(null);
                setProgress(0);
                setElapsed(0);
                setProgressMsg('Contacting the AI stylist…');
                setRetryKey((k) => k + 1);
              }}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8DDD6] text-[#6B5B52] text-xs font-body font-medium hover:bg-[#F7EFE5] transition !bg-transparent"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenerate (cached result shown)
            </button>
          )}
        </div>

        {/* Loading */}
        {canFetch && loading && !tutorial && (
          <div className="rounded-2xl p-8 sm:p-10 bg-white/80 backdrop-blur border border-[#E8DDD6]/60 shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <Loader2 className="w-6 h-6 animate-spin text-[#B8706A] flex-shrink-0" />
              <div className="flex-1">
                <p className="font-display text-lg font-semibold text-[#2D2226]">
                  Crafting your personalized {styleName} tutorial…
                </p>
                <p className="font-body text-sm text-[#6B5B52]">{progressMsg}</p>
              </div>
              <span className="font-mono text-xs text-[#9B8A82] tabular-nums">
                {elapsed}s
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#F3EAD9] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background:
                    'linear-gradient(90deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)',
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between font-body text-[11px] text-[#9B8A82]">
              <span>{Math.round(progress)}%</span>
              <span>
                {elapsed < 15
                  ? 'Usually ready in under 10 seconds'
                  : elapsed < 30
                  ? 'Still working — almost there'
                  : "Taking longer than usual — we'll fall back if needed"}
              </span>
            </div>

            {elapsed >= 25 && (
              <button
                onClick={() => {
                  setError(null);
                  setTutorial(null);
                  setLoading(false);
                }}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8DDD6] text-[#6B5B52] text-xs font-body font-medium hover:bg-[#F7EFE5] transition !bg-transparent"
              >
                Cancel and go back
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {canFetch && error && !loading && (
          <div className="rounded-2xl p-6 bg-white/80 border border-red-200 shadow-md flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-display text-base font-semibold text-[#2D2226] mb-1">
                We couldn't load the tutorial
              </p>
              <p className="font-body text-sm text-[#5C4A42] mb-3">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setTutorial(null);
                  setProgress(0);
                  setElapsed(0);
                  setProgressMsg('Contacting the AI stylist…');
                  setRetryKey((k) => k + 1);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold font-body shadow-sm hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #B8706A, #8E9CC3)' }}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Tutorial content */}
        {tutorial && (
          <div className="space-y-8 animate-fade-in-up">
            {isSubStyleView && selectedSubStyle && (
              <>
                <section className="rounded-2xl overflow-hidden bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-lg">
                    <div className="w-full bg-[#F3EAD9] flex items-center justify-center p-4 sm:p-6">
                      <StylizedImageBlock
                        state={stylizedImages[selectedSubStyle.name]}
                        alt={`${selectedSubStyle.name} — ${styleName} look`}
                        fallback={userImage || ''}
                        label={`${selectedSubStyle.name}`}
                      />
                    </div>
                    <div className="p-6 sm:p-8 border-t border-[#E8DDD6]/60">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="inline-flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-[#B8706A]" />
                            <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-[#B8706A]">
                              AI Makeup Preview
                            </span>
                          </div>
                          <h2 className="font-display text-2xl font-bold text-[#2D2226] mb-2">
                            Your {selectedSubStyle.name} look
                          </h2>
                          <p className="font-body text-sm text-[#5C4A42] leading-relaxed">
                            {selectedSubStyle.summary}
                          </p>
                          {selectedSubStyle.best_for && (
                            <p className="font-body text-xs text-[#8E9CC3] mt-2">
                              Best for: {selectedSubStyle.best_for}
                            </p>
                          )}
                        </div>
                        {stylizedImages[selectedSubStyle.name]?.status === 'ready' &&
                          stylizedImages[selectedSubStyle.name]?.url && (
                          <button
                            onClick={() =>
                              openSocialCard(
                                stylizedImages[selectedSubStyle.name]!.url!,
                                selectedSubStyle.name,
                                getSlogan(selectedSubStyle.name, selectedSubStyle.summary)
                              )
                            }
                            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-semibold font-body shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #B8706A 0%, #C9A96E 100%)',
                            }}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share Card
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                <section className="rounded-2xl p-8 bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-lg relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ background: 'linear-gradient(180deg, #B8706A, #8E9CC3)' }} />
                  <h2 className="font-display text-2xl font-bold text-[#2D2226] mb-3 pl-4">
                    Overview
                  </h2>
                  <p className="font-body text-sm text-[#5C4A42] leading-relaxed pl-4 mb-4">
                    {selectedSubStyle.summary || tutorial.overview}
                  </p>
                  <div className="pl-4 pt-4 border-t border-[#E8DDD6]/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-[#C9A96E]" />
                      <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9A96E]">
                        Why this works for you
                      </span>
                    </div>
                    <p className="font-body text-sm text-[#5C4A42] leading-relaxed">
                      {tutorial.personalized_analysis}
                    </p>
                  </div>
                </section>

                {renderColorPalette(tutorial)}
                {renderSteps(tutorial)}
                {renderProTips(tutorial)}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link
                    to={`/style/${styleId}/pro`}
                    state={state}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#8E9CC3]/30 text-[#6B7AA0] text-sm font-semibold font-body hover:border-[#8E9CC3]/60 hover:text-[#7A8AB5] transition-all !bg-transparent"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to {styleName} Overview
                  </Link>
                  <Link
                    to="/analyze"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold font-body shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                    style={{ background: 'linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)' }}
                  >
                    Try Another Photo
                    <Sparkles className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}

            {!isSubStyleView && (
              <>
                <section className="rounded-2xl overflow-hidden bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-lg">
                    <div className="w-full bg-[#F3EAD9] flex items-center justify-center p-4 sm:p-6">
                      <StylizedImageBlock
                        state={stylizedImages['overall']}
                        alt={`${styleName} — overall look`}
                        fallback={userImage || ''}
                        label={`overall ${styleName.toLowerCase()} look`}
                      />
                    </div>
                    <div className="p-6 sm:p-8 border-t border-[#E8DDD6]/60">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="inline-flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-[#B8706A]" />
                            <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-[#B8706A]">
                              AI Makeup Preview
                            </span>
                          </div>
                          <h2 className="font-display text-xl font-bold text-[#2D2226] mb-2">
                            Your personalized {styleName} look
                          </h2>
                          <p className="font-body text-sm text-[#5C4A42] leading-relaxed">
                            Generated directly from your photo. Hairstyle, complexion,
                            and color palette are tuned to your features — your identity
                            is preserved.
                          </p>
                        </div>
                        {stylizedImages['overall']?.status === 'ready' &&
                          stylizedImages['overall']?.url && (
                          <button
                            onClick={() =>
                              openSocialCard(
                                stylizedImages['overall']!.url!,
                                styleName,
                                getSlogan(styleName, state.style?.tagline)
                              )
                            }
                            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-semibold font-body shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                            style={{
                              background: 'linear-gradient(135deg, #B8706A 0%, #C9A96E 100%)',
                            }}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share Card
                          </button>
                        )}
                      </div>
                    </div>
                  </section>

                <section className="rounded-2xl p-8 bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-lg relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ background: 'linear-gradient(180deg, #B8706A, #8E9CC3)' }} />
                  <h2 className="font-display text-2xl font-bold text-[#2D2226] mb-3 pl-4">Overview</h2>
                  <p className="font-body text-sm text-[#5C4A42] leading-relaxed pl-4 mb-4">
                    {tutorial.overview}
                  </p>
                  <div className="pl-4 pt-4 border-t border-[#E8DDD6]/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-[#C9A96E]" />
                      <span className="font-body text-[11px] font-bold uppercase tracking-[0.2em] text-[#C9A96E]">
                        Why this works for you
                      </span>
                    </div>
                    <p className="font-body text-sm text-[#5C4A42] leading-relaxed">
                      {tutorial.personalized_analysis}
                    </p>
                  </div>
                </section>

                {tutorial.sub_styles.length > 0 && (
                  <section>
                    <h2 className="font-display text-2xl font-bold text-[#2D2226] mb-2">
                      Sub-styles to explore
                    </h2>
                    <p className="font-body text-sm text-[#5C4A42] mb-6">
                      Each sub-style is a distinct variation of {styleName}. Click
                      any card to open its full step-by-step tutorial.
                    </p>
                    <div className="flex flex-col gap-5">
                      {tutorial.sub_styles.map((s) => {
                        const recommended =
                          tutorial.recommended_sub_style &&
                          s.name.toLowerCase() ===
                            tutorial.recommended_sub_style.toLowerCase();
                        return (
                          <Link
                            key={s.name}
                            to={`/style/${styleId}/pro/${subStyleSlug(s.name)}`}
                            state={state}
                            className="group block rounded-2xl bg-white/85 border shadow-sm hover:shadow-xl transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#B8706A]/50"
                            style={{
                              borderColor: recommended
                                ? 'rgba(184,112,106,0.4)'
                                : 'rgba(232,221,214,0.6)',
                            }}
                          >
                            <div className="flex flex-col sm:flex-row">
                              <div className="relative w-full sm:w-[280px] sm:flex-shrink-0 bg-[#F3EAD9] flex items-center justify-center p-3">
                                <StylizedImageBlock
                                  state={stylizedImages[s.name]}
                                  alt={`${s.name} look`}
                                  fallback={userImage || ''}
                                  label={s.name}
                                  compact
                                />
                              </div>
                              <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center">
                                {recommended && (
                                  <div className="inline-block mb-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white w-fit"
                                    style={{ background: 'linear-gradient(135deg, #B8706A, #C9A96E)' }}>
                                    Recommended For You
                                  </div>
                                )}
                                <h3 className="font-display text-xl font-semibold text-[#2D2226] mb-2 group-hover:text-[#B8706A] transition-colors">
                                  {s.name}
                                </h3>
                                <p className="font-body text-sm text-[#5C4A42] leading-relaxed mb-2">
                                  {s.summary}
                                </p>
                                {s.best_for && (
                                  <p className="font-body text-xs text-[#8E9CC3] mb-3">
                                    Best for: {s.best_for}
                                  </p>
                                )}
                                <div className="mt-auto flex items-center gap-3">
                                  <span className="inline-flex items-center gap-1.5 text-[#B8706A] text-xs font-semibold font-body group-hover:gap-2.5 transition-all">
                                    View step-by-step tutorial
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                  </span>
                                  {stylizedImages[s.name]?.status === 'ready' &&
                                    stylizedImages[s.name]?.url && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openSocialCard(
                                          stylizedImages[s.name]!.url!,
                                          s.name,
                                          getSlogan(s.name, s.summary)
                                        );
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[10px] font-semibold font-body shadow hover:shadow-md hover:brightness-110 transition-all z-10"
                                      style={{
                                        background: 'linear-gradient(135deg, #B8706A 0%, #C9A96E 100%)',
                                      }}
                                    >
                                      <Share2 className="w-3 h-3" />
                                      Share
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {renderColorPalette(tutorial)}
                {renderSteps(tutorial)}
                {renderProTips(tutorial)}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <Link
                    to={`/style/${styleId}`}
                    state={{
                      style: state.style,
                      faceShape: state.faceShape,
                      eyeTags: state.eyeTags,
                      facialTags: state.facialTags,
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#8E9CC3]/30 text-[#6B7AA0] text-sm font-semibold font-body hover:border-[#8E9CC3]/60 hover:text-[#7A8AB5] transition-all !bg-transparent"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Style Overview
                  </Link>
                  <Link
                    to="/analyze"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold font-body shadow-md hover:shadow-lg hover:brightness-110 transition-all"
                    style={{ background: 'linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)' }}
                  >
                    Try Another Photo
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {socialCardData && (
        <SocialMediaCard
          imageUrl={socialCardData.imageUrl}
          styleName={socialCardData.styleName}
          slogan={socialCardData.slogan}
          open={socialCardOpen}
          onClose={() => setSocialCardOpen(false)}
        />
      )}
    </div>
  );
}

function renderColorPalette(tutorial: ProTutorialResponse) {
  if (tutorial.color_palette.length === 0) return null;
  return (
    <section className="rounded-2xl p-6 bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4 text-[#B8706A]" />
        <h2 className="font-display text-xl font-bold text-[#2D2226]">Color Palette</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {tutorial.color_palette.map((hex, i) => (
          <div key={`${hex}-${i}`} className="flex flex-col items-center gap-1">
            <div
              className="w-14 h-14 rounded-full shadow-md border border-white/60"
              style={{ background: hex }}
            />
            <span className="font-mono text-[10px] text-[#5C4A42]">{hex}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderSteps(tutorial: ProTutorialResponse) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-4 h-4 text-[#8E9CC3]" />
        <h2 className="font-display text-2xl font-bold text-[#2D2226]">Step-by-Step</h2>
      </div>
      <div className="space-y-4">
        {tutorial.steps.map((step, i) => (
          <div
            key={`${step.title}-${i}`}
            className="rounded-2xl p-6 bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-sm relative"
          >
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-display font-bold"
                style={{ background: 'linear-gradient(135deg, #B8706A, #8E9CC3)' }}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-[#2D2226] mb-1">
                  {step.title}
                </h3>
                <p className="font-body text-sm text-[#5C4A42] leading-relaxed mb-3">
                  {step.description}
                </p>
                {step.technique && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-[#FAF5F0] border border-[#E8DDD6]/50">
                    <span className="font-body text-[11px] font-bold uppercase tracking-wider text-[#B8706A] mr-2">
                      Technique
                    </span>
                    <span className="font-body text-xs text-[#5C4A42]">
                      {step.technique}
                    </span>
                  </div>
                )}
                {step.products.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {step.products.map((p, j) => (
                      <span
                        key={`${p}-${j}`}
                        className="px-3 py-1 rounded-full text-xs font-body font-medium bg-[#F0ECF8] text-[#6B5B8A] border border-[#C9B8E0]/40"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function renderProTips(tutorial: ProTutorialResponse) {
  if (tutorial.pro_tips.length === 0) return null;
  return (
    <section className="rounded-2xl p-8 relative overflow-hidden text-white"
      style={{ background: 'linear-gradient(135deg, #1E1518 0%, #2D2226 100%)' }}>
      <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-[#B8706A]/10 blur-[80px]" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#C9A96E]" />
          <h2 className="font-display text-xl font-bold">Pro Tips</h2>
        </div>
        <ul className="space-y-3">
          {tutorial.pro_tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#C9A96E] flex-shrink-0 mt-1" />
              <span className="font-body text-sm text-[#E8DDD6] leading-relaxed">
                {tip}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* Enhanced Image block with Image Load Error Fallback                       */
/* ------------------------------------------------------------------------- */

function StylizedImageBlock({
  state,
  alt,
  fallback,
  label,
  compact = false,
}: {
  state: StylizedImageState | undefined;
  alt: string;
  fallback: string;
  label: string;
  compact?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  const status: StylizedImageState['status'] | 'idle' =
    state === undefined ? 'idle' : state.status;
  const isReady = status === 'ready' && !!state?.url && !imgError;
  const isError = status === 'error' || imgError;
  const isLoading = status === 'loading';

  // Fallback cleanly to user image if stylized image errored out
  const srcToUse = isReady ? state!.url! : fallback;

  const maxH = compact ? 'max-h-[320px] min-h-[180px]' : 'max-h-[640px] min-h-[300px]';

  return (
    <div className="relative w-full flex items-center justify-center">
      {srcToUse ? (
        <img
          src={srcToUse}
          alt={alt}
          onError={() => {
            console.warn(`[StylizedImageBlock] Failed to render image, falling back to original: ${label}`);
            setImgError(true);
          }}
          className={[
            'block w-auto h-auto max-w-full',
            maxH,
            'object-contain rounded-xl transition-all duration-500',
            isReady || status === 'idle' || imgError ? 'opacity-100' : 'opacity-60 blur-[2px]',
          ].join(' ')}
        />
      ) : (
        <div className={`w-full ${maxH} bg-[#E8DDD6]/30 flex items-center justify-center rounded-xl`}>
          <span className="text-xs text-[#5C4A42]">No Preview Available</span>
        </div>
      )}

      {isLoading && <LoadingOverlay label={label} compact={compact} />}

      {isError && (
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-900/80 backdrop-blur shadow flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 text-red-200" />
          <span className="font-body text-[10px] font-medium text-white">
            Stylize Failed (Original Shown)
          </span>
        </div>
      )}

      {isReady && !compact && (
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur shadow">
          <span className="font-body text-[10px] font-bold tracking-wider uppercase text-[#B8706A]">
            AI Generated
          </span>
        </div>
      )}
    </div>
  );
}

function LoadingOverlay({
  label,
  compact,
}: {
  label: string;
  compact: boolean;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const longRunning = seconds >= 60;
  const textSize = compact ? 'text-[10px]' : 'text-xs';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2D2226]/25 rounded-xl px-3 text-center backdrop-blur-[1px]">
      <Loader2
        className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} animate-spin text-white mb-2`}
      />
      <span
        className={`font-body font-medium text-white/95 ${textSize} tracking-wide`}
      >
        Generating {label}…
      </span>
      <span className={`font-body text-white/80 ${textSize} mt-1`}>
        {longRunning
          ? `Still working… (${seconds}s) — AI stylization can take up to ~2 min`
          : `${seconds}s elapsed`}
      </span>
    </div>
  );
}
