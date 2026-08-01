import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Target,
  Eye,
  Heart,
  Gem,
} from "lucide-react";

interface StyleData {
  id: string;
  name: string;
  tagline: string;
  image: string;
  match: number;
  keyFocus: string[];
}

/* ── Detailed content per style dimension ── */
const styleDetails: Record<
  string,
  {
    overview: string;
    whyItWorks: string;
    focusAreas: { area: string; tip: string; icon: React.ElementType; color: string }[];
    principles: string[];
    proTeaser: string;
  }
> = {
  sweet: {
    overview:
      "Sweet style emphasizes youthful, approachable charm through round eye techniques, soft color palettes, and dewy finishes. It creates an innocent, doll-like aesthetic that highlights your most endearing features with warm pinks, peaches, and gentle gradients.",
    whyItWorks:
      "Based on your facial analysis, your eye shape and face proportions align well with Sweet techniques. Round eye enhancement and gradient lip application will amplify your natural charm while the soft blush placement complements your cheekbone structure.",
    focusAreas: [
      {
        area: "Eyes — Round Enhancement",
        tip: "Apply shimmer eyeshadow on the center of the lid to create a rounded, doll-like effect. Use a soft brown in the outer corner and blend upward. For monolids, extend color above the crease line so it's visible when eyes are open.",
        icon: Eye,
        color: "#8E9CC3",
      },
      {
        area: "Skin — Dewy Glow",
        tip: "Build a luminous base with a hydrating foundation or skin tint. Apply cream highlighter on cheekbones, brow bone, and cupid's bow for a youthful, lit-from-within glow.",
        icon: Sparkles,
        color: "#C9A96E",
      },
      {
        area: "Lips — Gradient Technique",
        tip: "Apply a deeper shade at the center of the lips and blend outward with a finger or brush. This gradient (ombré) lip creates dimension and a sweet, bitten-lip effect.",
        icon: Heart,
        color: "#B8706A",
      },
      {
        area: "Blush — Apple Placement",
        tip: "Smile and apply cream blush to the apples of your cheeks in a circular motion. This placement creates a youthful, flushed look that's the hallmark of Sweet style.",
        icon: Target,
        color: "#A88B9D",
      },
    ],
    principles: [
      "Round shapes everywhere — round eye shadow, circular blush, soft lip edges",
      "Warm pink and peach tones create the most youthful, approachable palette",
      "Dewy finish over matte — luminosity equals youth in Sweet style",
      "Gradient lip technique is the signature — master the center-out blend",
    ],
    proTeaser:
      "Unlock the full Sweet Style Guide with detailed hand techniques, product recommendations for your skin tone, and common mistakes to avoid.",
  },
  sexy: {
    overview:
      "Sexy style creates magnetic allure through cat-eye techniques, sculpted contours, deep lip colors, and smoky eye effects. It emphasizes angular, elongated features that draw attention and create an air of confidence and sophistication.",
    whyItWorks:
      "Your facial metrics indicate strong potential for Sexy style techniques. The cat-eye liner will enhance your eye tilt, while sculpted contour along your jawline and cheekbones will create dramatic dimension that commands attention.",
    focusAreas: [
      {
        area: "Eyes — Cat-Eye Liner",
        tip: "Create a sharp, upward-angled wing that extends from the outer corner. The wing should follow the angle from your lower lash line to your brow tail. Use gel or liquid liner for precision.",
        icon: Eye,
        color: "#8E9CC3",
      },
      {
        area: "Contour — Sculpted Definition",
        tip: "Use a cool-toned contour below the cheekbones, along the jawline, and at the temples. The key is creating sharp shadows that add angular dimension to your bone structure.",
        icon: Target,
        color: "#B8706A",
      },
      {
        area: "Lips — Deep Statement",
        tip: "Choose deep, rich shades — berry, wine, deep rose, or classic red. Line lips precisely, slightly outside the natural border for subtle fullness. Blot and reapply for lasting intensity.",
        icon: Heart,
        color: "#C9A96E",
      },
      {
        area: "Skin — Flawless Matte",
        tip: "A smooth, matte base lets the dramatic elements shine. Use a medium-to-full coverage foundation, set with translucent powder, and add strategic highlight only on the highest cheekbone point.",
        icon: Sparkles,
        color: "#A88B9D",
      },
    ],
    principles: [
      "Angular lines and sharp edges define Sexy style — avoid rounded shapes",
      "Cat-eye angle should follow your natural eye tilt for the most flattering effect",
      "Cool-toned contour creates more realistic shadows than warm-toned products",
      "One bold focal point at a time — dramatic eyes with nude lip, or bold lip with subtle eyes",
    ],
    proTeaser:
      "Master the perfect cat-eye wing angle for your eye shape and learn advanced smoky eye blending techniques.",
  },
  powerful: {
    overview:
      "Powerful style projects confidence and authority through strong brow shaping, angular contour, matte finishes, and bold lip choices. It's the makeup equivalent of a power suit — structured, intentional, and commanding.",
    whyItWorks:
      "Your jaw angle and facial proportions provide an excellent foundation for Powerful style techniques. Strong brow shaping will frame your face with authority, while angular contour will enhance your natural bone structure for maximum impact.",
    focusAreas: [
      {
        area: "Brows — Strong Architecture",
        tip: "Define brows with a slightly angular arch. Fill in with hair-like strokes using a fine-tip pencil, then set with a tinted brow gel for a bold, structured frame that anchors the entire look.",
        icon: Eye,
        color: "#8E9CC3",
      },
      {
        area: "Contour — Angular Sculpting",
        tip: "Apply contour in straight, angular lines below the cheekbones and along the jawline. Avoid blending too softly — the structured shadow is intentional and adds commanding dimension.",
        icon: Target,
        color: "#B8706A",
      },
      {
        area: "Skin — Matte Perfection",
        tip: "A completely matte, flawless base is the canvas for Powerful style. Use a mattifying primer, medium-to-full coverage foundation, and set thoroughly with powder. No visible shine.",
        icon: Sparkles,
        color: "#C9A96E",
      },
      {
        area: "Lips — Bold Authority",
        tip: "Choose a bold, opaque lip color — classic red, deep burgundy, or rich mauve. Apply with precision using a lip brush and liner. The lip should look intentional and polished.",
        icon: Heart,
        color: "#A88B9D",
      },
    ],
    principles: [
      "Structure and precision define every element — no soft, blended edges",
      "Matte finish throughout conveys control and sophistication",
      "Strong brows are the anchor — they frame everything else",
      "Bold lip color should match your energy level — the bolder, the more commanding",
    ],
    proTeaser:
      "Get the complete Power Makeup masterclass with face-shape-specific contour maps and boardroom-to-evening transition techniques.",
  },
  elegant: {
    overview:
      "Elegant style embodies refined sophistication through balanced proportions, classic techniques, and timeless color choices. It's about enhancing your natural beauty with precision and taste — never overdone, always polished.",
    whyItWorks:
      "Your facial proportions and feature balance are well-suited for Elegant style. Classic winged liner will complement your eye shape, while subtle highlighting and a defined cupid's bow will create the refined, sophisticated look that this style is known for.",
    focusAreas: [
      {
        area: "Eyes — Classic Wing",
        tip: "A thin, precise winged liner that follows your natural eye shape is the cornerstone. Keep the wing subtle and close to the lash line. Pair with neutral, blended eyeshadow in taupe and champagne tones.",
        icon: Eye,
        color: "#8E9CC3",
      },
      {
        area: "Lips — Defined Cupid's Bow",
        tip: "Use a lip liner to precisely define the cupid's bow and natural lip border. Fill with a sophisticated nude-rose or mauve shade. The definition, not the color, is what creates elegance.",
        icon: Heart,
        color: "#B8706A",
      },
      {
        area: "Skin — Luminous Satin",
        tip: "Aim for a satin finish — not fully matte, not fully dewy. Use a medium-coverage foundation with a natural finish, and add subtle highlight only on the highest points of the face.",
        icon: Sparkles,
        color: "#C9A96E",
      },
      {
        area: "Contour — Subtle Refinement",
        tip: "Light, diffused contour that mimics natural shadows. Focus on the hollows of the cheeks and sides of the nose. The goal is refinement, not drama — you should barely notice it's there.",
        icon: Target,
        color: "#A88B9D",
      },
    ],
    principles: [
      "Precision in application is more important than product choice",
      "Neutral, sophisticated color palette — think champagne, taupe, mauve, rose",
      "Satin finish balances luminosity and polish for the most elegant effect",
      "Less is more — elegance comes from restraint and intentionality",
    ],
    proTeaser:
      "Discover the Elegant Style complete guide with classic technique tutorials and timeless color palette recommendations for every skin tone.",
  },
  natural: {
    overview:
      "Natural style celebrates the 'your skin but better' philosophy. This minimal approach uses lightweight products to enhance your authentic features with a dewy, healthy-looking finish that feels completely effortless and unforced.",
    whyItWorks:
      "Natural style works beautifully for virtually every face because it doesn't try to change your features — it enhances them. A dewy finish, soft color on the cheeks, and a tinted lip create a cohesive, youthful look that lets your natural beauty take center stage.",
    focusAreas: [
      {
        area: "Skin — Barely-There Base",
        tip: "Start with great skincare. Use a lightweight skin tint or tinted moisturizer instead of full-coverage foundation. Spot-conceal only where needed. Your skin should look like skin.",
        icon: Sparkles,
        color: "#C9A96E",
      },
      {
        area: "Cheeks — Natural Flush",
        tip: "A cream or liquid blush in a shade close to your natural flush creates the most believable, healthy glow. Smile and apply to the apples, blending upward toward temples.",
        icon: Heart,
        color: "#B8706A",
      },
      {
        area: "Lips — Your Lips But Better",
        tip: "A tinted lip balm or sheer lipstick in a 'my lips but better' shade adds just enough color. Look for hydrating formulas with a slight sheen for that effortless look.",
        icon: Heart,
        color: "#A88B9D",
      },
      {
        area: "Eyes — Soft Definition",
        tip: "Skip heavy eyeshadow. A single wash of neutral shimmer, curled lashes, and a coat of brown mascara keep eyes bright and open without looking 'done'.",
        icon: Eye,
        color: "#8E9CC3",
      },
    ],
    principles: [
      "Skincare is the foundation — hydrate, prime, and let your skin breathe",
      "Cream and liquid textures blend more naturally than powders",
      "Match your blush to your natural flush for the most believable effect",
      "Brown mascara looks softer and more natural than black",
    ],
    proTeaser:
      "Discover the 5-minute Fresh Face routine with product layering order and setting techniques for all-day natural wear.",
  },
  androgynous: {
    overview:
      "Androgynous style embraces gender-fluid aesthetics with structured lines, neutral tones, and a focus on bone structure over traditional femininity. It creates a striking, modern look that transcends conventional beauty categories.",
    whyItWorks:
      "Your facial structure provides an excellent canvas for Androgynous style. The focus on bone structure enhancement through straight brows and neutral contour will create a striking, editorial look that highlights your unique proportions.",
    focusAreas: [
      {
        area: "Brows — Straight & Natural",
        tip: "Maintain a straight, natural brow shape without an exaggerated arch. Fill in sparsely with light, feathery strokes. The goal is a strong but unmanipulated brow that frames the face neutrally.",
        icon: Eye,
        color: "#8E9CC3",
      },
      {
        area: "Skin — Matte & Even",
        tip: "Create an even, matte complexion that emphasizes bone structure. Use a lightweight matte foundation and set with translucent powder. Skip highlight and shimmer — the focus is on texture, not glow.",
        icon: Sparkles,
        color: "#C9A96E",
      },
      {
        area: "Contour — Neutral Structure",
        tip: "Contour to enhance natural bone structure without feminizing or masculinizing. Focus on the hollows of the cheeks and sides of the nose with a neutral-toned product. Blend well for a natural shadow effect.",
        icon: Target,
        color: "#B8706A",
      },
      {
        area: "Lips — Bare & Balanced",
        tip: "Keep lips bare or use a nude lip balm that matches your natural lip color. The focus in Androgynous style is on the upper face and bone structure, not the lips.",
        icon: Heart,
        color: "#A88B9D",
      },
    ],
    principles: [
      "Straight lines and neutral tones define the Androgynous aesthetic",
      "Bone structure is the star — enhance it, don't mask it",
      "Skip traditional feminine elements like pink blush and glossy lips",
      "Confidence in simplicity — the power is in what you leave off",
    ],
    proTeaser:
      "Master the Androgynous Style with our complete guide to gender-fluid beauty techniques, editorial inspiration, and product recommendations.",
  },
};

export default function StyleDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const style = location.state?.style as StyleData | undefined;
  const faceShape = location.state?.faceShape as string | undefined;

  useEffect(() => {
    if (!style) navigate("/analyze", { replace: true });
  }, [style, navigate]);

  if (!style) return null;

  const details = styleDetails[style.id] || styleDetails["natural"];

  const faceShapeDisplay: Record<string, string> = {
    OVAL: "Oval",
    ROUND: "Round",
    SQUARE: "Square",
    HEART: "Heart",
    OBLONG: "Oblong",
    DIAMOND: "Diamond",
  };

  return (
    <div className="min-h-screen bg-gradient-warm relative overflow-hidden">
      {/* Flowing sand blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute w-[450px] h-[450px] rounded-full blur-[110px] animate-sand-flow"
          style={{
            top: "15%",
            right: "-3%",
            background: "radial-gradient(circle, rgba(142,156,195,0.1) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute w-[380px] h-[380px] rounded-full blur-[100px] animate-sand-flow-reverse"
          style={{
            bottom: "20%",
            left: "-5%",
            background: "radial-gradient(circle, rgba(168,139,157,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full blur-[80px] animate-sand-flow-slow"
          style={{
            top: "55%",
            left: "35%",
            background: "radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)",
            animationDelay: "-9s",
          }}
        />
      </div>

      <Navbar />

      <div className="max-w-[900px] mx-auto px-6 pt-32 pb-20 relative z-10">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[#6B7AA0] font-body text-sm font-medium hover:text-[#8E9CC3] transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Results
        </button>

        {/* Hero */}
        <div className="glass-card-strong rounded-3xl overflow-hidden shadow-xl mb-10 animate-fade-in-up relative">
          {/* Accent top border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#B8706A] via-[#8E9CC3] to-[#C9A96E] z-10" />

          <div className="grid md:grid-cols-[320px_1fr]">
            {/* Image */}
            <div className="relative h-64 md:h-auto">
              <img
                src={style.image}
                alt={style.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-white/90 backdrop-blur shadow-sm">
                <span className="font-body text-xs font-bold text-[#8E9CC3]">
                  {style.match} pts
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <p
                className="font-body text-[10px] font-bold tracking-[0.25em] uppercase mb-2"
                style={{ color: "#8E9CC3" }}
              >
                Recommended for {faceShapeDisplay[faceShape || ""] || faceShape || "Your"} Face Shape
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#2D2226] mb-3">
                {style.name}
              </h1>
              <p className="font-body text-base text-[#5C4A42] leading-relaxed mb-5">
                {style.tagline}
              </p>
              <div className="flex flex-wrap gap-2">
                {style.keyFocus.map((focus, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full bg-[#FAF5F0] border border-[#E8DDD6]/50 text-[#6B7AA0] font-body text-xs font-medium"
                  >
                    {focus}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="glass-card-warm rounded-2xl p-8 mb-8 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: "100ms" }}>
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "linear-gradient(180deg, #B8706A, #8E9CC3)" }} />
          <h2 className="font-display text-2xl font-bold text-[#2D2226] mb-4 pl-4">
            Overview
          </h2>
          <p className="font-body text-sm text-[#5C4A42] leading-relaxed pl-4">
            {details.overview}
          </p>
        </div>

        {/* Why it works for you */}
        <div className="glass-card-cool rounded-2xl p-8 mb-8 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: "200ms" }}>
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#8E9CC3]/30 via-transparent to-[#C9A96E]/30" />
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(142,156,195,0.15), rgba(201,169,110,0.15))" }}
            >
              <Lightbulb className="w-5 h-5 text-[#8E9CC3]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-[#2D2226]">
              Why This Works for You
            </h2>
          </div>
          <p className="font-body text-sm text-[#5C4A42] leading-relaxed">
            {details.whyItWorks}
          </p>
        </div>

        {/* Focus Areas */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <h2 className="font-display text-2xl font-bold text-[#2D2226] mb-5">
            Key Focus Areas
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {details.focusAreas.map((area, i) => (
              <div
                key={i}
                className="glass-card-warm rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500 relative overflow-hidden group"
              >
                {/* Subtle corner accent */}
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-[0.06] group-hover:opacity-[0.10] transition-opacity"
                  style={{ background: area.color }}
                />
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${area.color}15` }}
                  >
                    <area.icon className="w-5 h-5" style={{ color: area.color }} />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#2D2226]">
                    {area.area}
                  </h3>
                </div>
                <p className="font-body text-sm text-[#5C4A42] leading-relaxed">
                  {area.tip}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Principles */}
        <div className="glass-card rounded-2xl p-8 mb-8 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: "400ms" }}>
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "linear-gradient(180deg, #8E9CC3, #C9A96E)" }} />
          <h2 className="font-display text-2xl font-bold text-[#2D2226] mb-5 pl-4">
            Core Principles
          </h2>
          <div className="space-y-3 pl-4">
            {details.principles.map((p, i) => {
              const colors = ["#B8706A", "#8E9CC3", "#C9A96E", "#A88B9D"];
              return (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors[i] }} />
                  <p className="font-body text-sm text-[#5C4A42]">{p}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pro Teaser */}
        <div
          className="relative rounded-2xl overflow-hidden p-8 sm:p-10 animate-fade-in-up"
          style={{ animationDelay: "500ms" }}
        >
          {/* Rich dark background */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1E1518 0%, #1D1F2B 30%, #2D2226 60%, #1E1518 100%)" }} />
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#8E9CC3]/[0.08] blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-[#B8706A]/[0.06] blur-[60px] pointer-events-none" />
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#B8706A] via-[#8E9CC3] to-[#C9A96E]" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-[#8E9CC3]" />
              <span className="font-body text-[10px] font-bold text-[#8E9CC3] uppercase tracking-[0.25em]">
                BeautyFit Pro
              </span>
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-3">
              Want the full step-by-step guide?
            </h3>
            <p className="font-body text-sm text-[#B8C4D8]/70 leading-relaxed mb-6 max-w-lg">
              {details.proTeaser}
            </p>
            <Link
              to={`/style/${style.id}/pro`}
              state={{
                style,
                faceShape,
                eyeTags: location.state?.eyeTags,
                facialTags: location.state?.facialTags,
                metrics: location.state?.metrics,
                styleScores: location.state?.styleScores,
                // CRITICAL: forward userImage so the Pro tutorial page can
                // run img2img stylization. Without this, the stylize
                // overlay stays stuck on "Generating…" forever.
                userImage: location.state?.userImage,
              }}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-white text-sm font-semibold font-body shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-300 cursor-pointer group"
              style={{ background: "linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)" }}
            >
              <Gem className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Unlock the Full Pro Tutorial
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#8E9CC3]/25 text-[#6B7AA0] text-sm font-semibold font-body hover:border-[#8E9CC3]/50 hover:text-[#7A8AB5] transition-all duration-300 !bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Styles
          </button>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold font-body shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-300"
            style={{ background: "linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)" }}
          >
            Try Another Photo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}