import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import {
  Sparkles,
  Camera,
  Scan,
  Palette,
  ArrowRight,
  Star,
  Shield,
  Heart,
  Users,
  Gem,
  Feather,
} from "lucide-react";

const HERO_IMG = "https://mgx-backend-cdn.metadl.com/generate/images/1030796/2026-04-21/naxyipqaafnq/hero-beauty-abstract.png";
const ANALYSIS_IMG = "https://mgx-backend-cdn.metadl.com/generate/images/1030796/2026-04-21/naxyhlaaafmq/face-analysis-illustration.png";

const steps = [
  {
    icon: Camera,
    title: "Upload Your Selfie",
    desc: "Take a clear, front-facing photo with good lighting. No filters needed — we celebrate your real beauty.",
    accent: "#B8706A",
  },
  {
    icon: Scan,
    title: "AI Analyzes Your Face",
    desc: "Our AI identifies your face shape, eye type, nose structure, and lip shape — tailored to diverse features worldwide.",
    accent: "#8E9CC3",
  },
  {
    icon: Palette,
    title: "Get Your Recommendations",
    desc: "Receive 1–3 makeup styles that truly complement your unique features, with explanations of why they work for you.",
    accent: "#C9A96E",
  },
];

const values = [
  {
    icon: Users,
    title: "Built for Every Face",
    desc: "Not just European standards. We recognize and celebrate Asian, South Asian, Latin, Middle Eastern, and African features.",
    gradient: "from-[#B8706A]/10 to-[#A88B9D]/10",
    iconColor: "#B8706A",
  },
  {
    icon: Shield,
    title: "No Filters. Real Results.",
    desc: "We don't add beauty filters or AR effects. Our recommendations are based on your real features, not an idealized version.",
    gradient: "from-[#8E9CC3]/10 to-[#C9A96E]/10",
    iconColor: "#8E9CC3",
  },
  {
    icon: Heart,
    title: "Understand the Why",
    desc: "Every recommendation comes with the reasoning behind it — so you truly learn what works for your face and why.",
    gradient: "from-[#C9A96E]/10 to-[#D4B896]/10",
    iconColor: "#C9A96E",
  },
];

/* Flowing sand blob component */
function SandBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Warm rose blob */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px] animate-sand-flow"
        style={{
          top: "5%",
          left: "60%",
          background: "radial-gradient(circle, rgba(184,112,106,0.12) 0%, rgba(184,112,106,0) 70%)",
        }}
      />
      {/* Cool lavender blob */}
      <div
        className="absolute w-[450px] h-[450px] rounded-full blur-[110px] animate-sand-flow-reverse"
        style={{
          top: "30%",
          left: "-5%",
          background: "radial-gradient(circle, rgba(142,156,195,0.14) 0%, rgba(142,156,195,0) 70%)",
        }}
      />
      {/* Warm gold blob */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-[100px] animate-sand-flow-slow"
        style={{
          bottom: "10%",
          right: "10%",
          background: "radial-gradient(circle, rgba(201,169,110,0.1) 0%, rgba(201,169,110,0) 70%)",
        }}
      />
      {/* Cool mauve blob */}
      <div
        className="absolute w-[350px] h-[350px] rounded-full blur-[100px] animate-sand-flow"
        style={{
          top: "55%",
          left: "40%",
          background: "radial-gradient(circle, rgba(168,139,157,0.1) 0%, rgba(168,139,157,0) 70%)",
          animationDelay: "-5s",
        }}
      />
      {/* Cool blue accent */}
      <div
        className="absolute w-[300px] h-[300px] rounded-full blur-[90px] animate-sand-flow-reverse"
        style={{
          top: "10%",
          left: "25%",
          background: "radial-gradient(circle, rgba(122,138,181,0.08) 0%, rgba(122,138,181,0) 70%)",
          animationDelay: "-8s",
        }}
      />
      {/* Subtle grain overlay for sand texture */}
      <div
        className="absolute inset-0 opacity-[0.015] animate-grain-drift"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />
    </div>
  );
}

export default function IndexPage() {
  return (
    <div className="min-h-screen bg-gradient-warm overflow-hidden">
      <Navbar />

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-screen flex items-center bg-gradient-hero">
        <SandBlobs />

        {/* Subtle decorative line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#8E9CC3]/20 to-transparent" />

        <div className="max-w-[1200px] mx-auto px-6 pt-28 pb-20 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
          {/* Left — Copy */}
          <div className="stagger-children">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-cool text-xs font-semibold font-body text-[#6B7AA0] mb-6 shadow-sm">
              <Gem className="w-3.5 h-3.5 text-[#8E9CC3]" />
              AI-Powered Beauty Analysis
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-[64px] font-bold leading-[1.08] text-[#2D2226] mb-6">
              Beauty that{" "}
              <span className="text-gradient-cool italic">fits you.</span>
            </h1>

            <p className="font-body text-lg text-[#5C4A42] leading-relaxed max-w-lg mb-8">
              Your AI makeup coach — built for{" "}
              <span className="font-semibold text-gradient-gold">your</span> face,
              not someone else's. Discover makeup styles that truly complement
              your unique features.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/analyze"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-white text-base font-semibold font-body shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-300 group animate-gradient-shift"
                style={{ background: "linear-gradient(135deg, #B8706A 0%, #A88B9D 30%, #8E9CC3 60%, #C9A96E 100%)", backgroundSize: "200% 200%" }}
              >
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Analyze My Face
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border-2 border-[#8E9CC3]/25 text-[#6B7AA0] text-base font-semibold font-body hover:border-[#8E9CC3]/50 hover:text-[#7A8AB5] transition-all duration-300 !bg-transparent"
              >
                <Feather className="w-4 h-4" />
                Learn More
              </a>
            </div>



            {/* Social proof */}
            <div className="flex items-center gap-4 mt-10 pt-8 border-t border-[#E8DDD6]/50">
              <div className="flex -space-x-2.5">
                {[
                  "linear-gradient(135deg, #B8706A, #A88B9D)",
                  "linear-gradient(135deg, #8E9CC3, #C9A96E)",
                  "linear-gradient(135deg, #C4917B, #8E9CC3)",
                  "linear-gradient(135deg, #A88B9D, #5C4A42)",
                ].map((bg, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-[2.5px] border-white shadow-sm"
                    style={{ background: bg }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-[#C9A96E] text-[#C9A96E]"
                    />
                  ))}
                  <span className="ml-1.5 font-body text-xs font-bold text-[#2D2226]">4.9</span>
                </div>
                <p className="text-xs font-body text-[#9B8A82] mt-0.5">
                  Loved by 2,000+ users worldwide
                </p>
              </div>
            </div>
          </div>

          {/* Right — Hero Image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md">
              {/* Glow behind image — warm + cool */}
              <div className="absolute inset-0 rounded-3xl blur-2xl scale-105"
                style={{ background: "linear-gradient(135deg, rgba(184,112,106,0.12) 0%, rgba(142,156,195,0.1) 50%, rgba(201,169,110,0.1) 100%)" }}
              />
              {/* Decorative ring */}
              <div className="absolute -inset-3 rounded-[28px] border border-[#8E9CC3]/10" />
              <img
                src={HERO_IMG}
                alt="Beauty composition"
                className="relative w-full rounded-3xl shadow-2xl object-cover aspect-[4/3]"
              />
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 glass-card-strong rounded-2xl px-5 py-3 shadow-lg animate-float border-accent-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #B8706A, #8E9CC3)" }}
                  >
                    <Scan className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-body text-xs font-semibold text-[#2D2226]">
                      Face Shape
                    </p>
                    <p className="font-body text-xs text-[#9B8A82]">
                      Detected: Heart
                    </p>
                  </div>
                </div>
              </div>
              {/* Floating badge 2 */}
              <div className="absolute -top-3 -right-3 glass-card-cool rounded-xl px-4 py-2.5 shadow-lg animate-float-slow">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#8E9CC3]" />
                  <span className="font-body text-xs font-semibold text-[#2D2226]">
                    3 Styles Found
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/50 to-transparent pointer-events-none" />
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-28 bg-gradient-section-alt relative overflow-hidden">
        {/* Flowing sand blobs for this section */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-[100px] animate-sand-flow-slow"
            style={{
              top: "20%",
              right: "-5%",
              background: "radial-gradient(circle, rgba(142,156,195,0.1) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute w-[350px] h-[350px] rounded-full blur-[90px] animate-sand-flow"
            style={{
              bottom: "10%",
              left: "5%",
              background: "radial-gradient(circle, rgba(168,139,157,0.08) 0%, transparent 70%)",
              animationDelay: "-4s",
            }}
          />
        </div>

        {/* Decorative top line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#8E9CC3]/15 to-transparent" />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16 stagger-children">
            <p className="font-body text-xs font-bold text-[#8E9CC3] tracking-[0.25em] uppercase mb-4">
              How It Works
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2226] mb-4">
              Three simple steps
            </h2>
            <p className="font-body text-base text-[#5C4A42] max-w-xl mx-auto">
              Get personalized makeup recommendations in under 5 minutes — no
              expertise required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-[72px] left-[16.67%] right-[16.67%] h-[1px] bg-gradient-to-r from-[#B8706A]/20 via-[#8E9CC3]/20 to-[#C9A96E]/20" />

            {steps.map((step, i) => (
              <div
                key={i}
                className="group relative glass-card-warm rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500"
              >
                {/* Step number */}
                <div className="absolute top-6 right-6 font-display text-5xl font-bold"
                  style={{ color: `${step.accent}15` }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:shadow-md"
                  style={{
                    background: `${step.accent}12`,
                  }}
                >
                  <step.icon className="w-6 h-6 transition-colors duration-500" style={{ color: step.accent }} />
                </div>
                <h3 className="font-display text-xl font-semibold text-[#2D2226] mb-3">
                  {step.title}
                </h3>
                <p className="font-body text-sm text-[#5C4A42] leading-relaxed">
                  {step.desc}
                </p>
                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, ${step.accent}, transparent)` }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Feature Showcase ─── */}
      <section className="py-28 bg-gradient-hero relative overflow-hidden">
        {/* Flowing sand blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute w-[500px] h-[500px] rounded-full blur-[120px] animate-sand-flow-reverse"
            style={{
              top: "10%",
              right: "0%",
              background: "radial-gradient(circle, rgba(142,156,195,0.1) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-[100px] animate-sand-flow"
            style={{
              bottom: "5%",
              left: "-5%",
              background: "radial-gradient(circle, rgba(184,112,106,0.08) 0%, transparent 70%)",
              animationDelay: "-6s",
            }}
          />
          <div
            className="absolute w-[300px] h-[300px] rounded-full blur-[80px] animate-sand-flow-slow"
            style={{
              top: "50%",
              left: "50%",
              background: "radial-gradient(circle, rgba(168,139,157,0.07) 0%, transparent 70%)",
              animationDelay: "-10s",
            }}
          />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image */}
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl blur-2xl scale-105"
                style={{ background: "linear-gradient(135deg, rgba(184,112,106,0.1) 0%, rgba(142,156,195,0.08) 50%, rgba(201,169,110,0.08) 100%)" }}
              />
              {/* Decorative frames */}
              <div className="absolute -inset-4 rounded-[32px] border border-[#8E9CC3]/10" />
              <div className="absolute -inset-8 rounded-[36px] border border-[#B8706A]/5" />
              <img
                src={ANALYSIS_IMG}
                alt="Face analysis illustration"
                className="relative w-full rounded-3xl shadow-xl object-cover aspect-square max-w-md mx-auto"
              />
              {/* Floating stat */}
              <div className="absolute -right-4 top-1/4 glass-card-cool rounded-xl px-4 py-3 shadow-lg animate-float-gentle">
                <p className="font-body text-[10px] font-semibold text-[#6B7AA0] uppercase tracking-wider">Accuracy</p>
                <p className="font-display text-xl font-bold text-gradient-cool">95%</p>
              </div>
            </div>

            {/* Copy */}
            <div className="stagger-children">
              <p className="font-body text-xs font-bold text-[#8E9CC3] tracking-[0.25em] uppercase mb-4">
                AI Face Analysis
              </p>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2226] mb-6 leading-tight">
                Understand your{" "}
                <span className="italic text-gradient-rose">unique</span>{" "}
                <span className="text-gradient-gold">beauty</span>
              </h2>
              <p className="font-body text-base text-[#5C4A42] leading-relaxed mb-8">
                Our AI doesn't just detect your face shape — it maps your
                complete facial feature profile: eye type, brow arch, nose
                bridge, lip shape, and cheekbone structure. Every recommendation
                is grounded in <em>why</em> it works for your specific features.
              </p>

              <div className="space-y-4">
                {[
                  { text: "Face shape detection (Oval, Round, Square, Heart, Oblong)", color: "#B8706A" },
                  { text: "Eye type analysis (Monolid, Double lid, Deep-set, Hooded)", color: "#8E9CC3" },
                  { text: "Personalized style recommendations with explanations", color: "#C9A96E" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${item.color}18` }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    </div>
                    <p className="font-body text-sm text-[#5C4A42]">{item.text}</p>
                  </div>
                ))}
              </div>

              <Link
                to="/analyze"
                className="inline-flex items-center gap-2.5 mt-8 px-7 py-3.5 rounded-full text-white text-sm font-semibold font-body shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-300 group"
                style={{ background: "linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)" }}
              >
                Try It Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Values / Why BeautyFit ─── */}
      <section className="py-28 bg-gradient-section-alt relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#A88B9D]/10 to-transparent" />

        {/* Flowing sand */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute w-[380px] h-[380px] rounded-full blur-[100px] animate-sand-flow"
            style={{
              top: "30%",
              left: "60%",
              background: "radial-gradient(circle, rgba(142,156,195,0.08) 0%, transparent 70%)",
              animationDelay: "-3s",
            }}
          />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <p className="font-body text-xs font-bold text-[#C9A96E] tracking-[0.25em] uppercase mb-4">
              Why BeautyFit
            </p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2226] mb-4">
              Beauty, <span className="italic text-gradient-cool">redefined</span>
            </h2>
            <p className="font-body text-base text-[#5C4A42] max-w-xl mx-auto">
              We're building the beauty tool the world actually needs — one that
              sees and celebrates every face.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div
                key={i}
                className="group glass-card rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 text-center relative overflow-hidden"
              >
                {/* Subtle gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${v.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 group-hover:shadow-md"
                    style={{ background: `${v.iconColor}10` }}
                  >
                    <v.icon className="w-7 h-7 transition-colors duration-500" style={{ color: v.iconColor }} />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#2D2226] mb-3">
                    {v.title}
                  </h3>
                  <p className="font-body text-sm text-[#5C4A42] leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-28 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #FAF5F0 0%, #EDE0D4 30%, #E5E0EC 55%, #EDE0D4 75%, #F0E4DA 100%)" }}
      >
        {/* Flowing sand blobs — warm + cool mix */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute w-[450px] h-[450px] rounded-full blur-[110px] animate-sand-flow"
            style={{
              top: "10%",
              left: "5%",
              background: "radial-gradient(circle, rgba(184,112,106,0.1) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-[100px] animate-sand-flow-reverse"
            style={{
              bottom: "5%",
              right: "5%",
              background: "radial-gradient(circle, rgba(142,156,195,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute w-[300px] h-[300px] rounded-full blur-[80px] animate-sand-flow-slow"
            style={{
              top: "40%",
              left: "45%",
              background: "radial-gradient(circle, rgba(168,139,157,0.08) 0%, transparent 70%)",
              animationDelay: "-7s",
            }}
          />
          {/* Grain texture */}
          <div
            className="absolute inset-0 opacity-[0.012] animate-grain-drift"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundSize: "200px 200px",
            }}
          />
        </div>

        <div className="max-w-[800px] mx-auto px-6 text-center stagger-children relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card-cool text-xs font-semibold font-body text-[#6B7AA0] mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#8E9CC3]" />
            Free to Try
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2226] mb-5 leading-tight">
            Ready to discover{" "}
            <span className="italic text-gradient-cool">your look</span>?
          </h2>
          <p className="font-body text-base text-[#5C4A42] max-w-lg mx-auto mb-8">
            Upload a selfie and let our AI find the makeup styles that were made
            for your face. Free to try — no sign-up required.
          </p>
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2.5 px-10 py-4 rounded-full text-white text-base font-semibold font-body shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-300 group animate-gradient-shift"
            style={{ background: "linear-gradient(135deg, #B8706A 0%, #A88B9D 30%, #8E9CC3 60%, #C9A96E 100%)", backgroundSize: "200% 200%" }}
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Start My Free Analysis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="font-body text-xs text-[#9B8A82] mt-4">
            3 free analyses per month · No credit card needed
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-14 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1E1518 0%, #1D1F2B 40%, #2D2226 70%, #1E1518 100%)" }}
      >
        {/* Decorative top line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#8E9CC3]/20 to-transparent" />
        <div className="absolute top-10 right-[15%] w-48 h-48 rounded-full bg-[#8E9CC3]/[0.04] blur-[60px] pointer-events-none" />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #B8706A, #8E9CC3)" }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-white">
                BeautyFit
              </span>
            </div>
            <p className="font-body text-sm text-[#9B8A82]">
              Beauty that fits you. — Your AI makeup coach.
            </p>
            <p className="font-body text-xs text-[#9B8A82]/50">
              © 2026 BeautyFit. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}