"""
Makeup transformation prompts for img2img generation.

Each style (sweet, sexy, natural, elegant, mature, androgynous) has:
- "overall": the main style prompt (used for the hero image)
- 5 sub-style prompts keyed by sub-style display name (used for thumbnails)

Sub-style names here match the backend catalog (services/style_guide.py) so
the frontend can pass them through directly.

NOTE: 'powerful' and 'mature' are treated as the same catalog entry per
existing code (STYLE_DISPLAY maps both to the mature guide).
"""

from typing import Dict, Optional

# Shared safety preamble prepended to every prompt.
_PREAMBLE = (
    "MANDATORY CONSTRAINTS — read carefully before generating: "
    "1) Preserve EXACTLY the original face shape, eye shape, nose shape, lip shape, "
    "and all facial feature positions — do NOT reshape, enlarge, or relocate any feature. "
    "2) Skin tone and identity completely unchanged. "
    "3) ETHNICITY DETECTION FIRST: carefully observe the person's ethnicity, skin "
    "undertone, and eye type, then adapt ALL makeup colors, intensity, and technique "
    "to look most beautiful according to that aesthetic — East Asian "
    "(Chinese/Japanese/Korean): luminous flawless skin, soft-blended warm tones "
    "(rose, mauve, terracotta, warm copper), elegant liner that opens and lifts the "
    "eye, K/J-beauty refinement, avoid harshness; South/Southeast Asian: warm "
    "golden-olive tones, terracotta/plum/bronze/rich berry, bold liner and lashes "
    "flatter naturally; Middle Eastern: dramatic kohl, deep jewel tones (ruby, gold, "
    "deep plum) look stunning, rich full lips; Caucasian/European: higher contrast "
    "is fine, adapt lip shade to cool vs warm undertone; African/Dark skin: rich "
    "warm pigments — bronze, copper, gold, terracotta, burgundy — go bolder and "
    "richer, not lighter. 4) TRANSFORM the hairstyle to complete and harmonize "
    "with this specific look — each style should have a distinctly matching "
    "hairstyle. 5) The final result must look GENUINELY BEAUTIFUL, polished, and "
    "expensive — as if this person has impeccable taste and effortless elegance. "
    "Harmony between makeup, hair, and skin is everything. Apply the following "
    "makeup:\n\n"
)


def _p(body: str) -> str:
    """Prepend the shared safety preamble to a style body prompt."""
    return _PREAMBLE + body


STYLE_PROMPTS: Dict[str, Dict[str, str]] = {
    "sweet": {
        "overall": _p(
            "Apply sweet adorable makeup. Blush is placed HIGH — on or above the "
            "cheekbone, crossing the nose bridge. Lips are soft and glossy, never "
            "harsh or matte-edged. Skin reads as healthy and luminous. Eyes appear "
            "rounder and brighter. Palette stays in pinks, corals, peaches, and "
            "warm roses. Apply: dewy light-coverage base, soft pink blush high on "
            "cheeks and across nose bridge, sheer pink or coral lip gloss, mascara "
            "that opens and rounds the eyes. Overall impression: youthful, "
            "glowing, approachable sweetness."
        ),
        "Kawaii": _p(
            "Apply Kawaii East Asian cute sweet makeup. Lightweight BB cream or "
            "skin tint; spot-conceal blemishes only; minimal T-zone powder. Blush "
            "(the heart of Kawaii): soft pink or peachy-coral cream or powder "
            "placed VERY HIGH — on cheekbones, across the nose bridge, upper cheeks "
            "— blending upward toward temples; warmth radiating from within, not "
            "a stripe. Aegyo sal: pearlescent highlighter stick draws a subtle "
            "sausage-shaped highlight directly beneath the lower lash line on the "
            "fatty pad just below the lash. Eyes: soft brown pencil thickening at "
            "lid center for roundness effect (NO upward flick — roundness, not "
            "elongation); thin brown liner on outer two-thirds of lower lash line; "
            "sheer pearl shimmer at lid center. Lips: sheer coral or bubblegum "
            "pink tint blotted at center for bitten-lip gradient; clear or pink "
            "high-shine gloss on top especially at lip center."
        ),
        "Glass Skin": _p(
            "Apply Glass Skin dewy minimalist sweet makeup. Dewy-finish cushion "
            "foundation applied with damp sponge bouncing motion (not dragging); "
            "build coverage only where needed. Water-stained blush: liquid or "
            "cream blush in sheer pink or rosy coral applied with fingers at cheek "
            "apples, blended upward then inward over nose bridge for a seamless "
            "water-stained effect. Eyes: sheer champagne or rose-gold shimmer "
            "patted with fingertip over entire eyelid; tightline upper waterline "
            "with soft brown pencil; mascara favoring length over volume. Gradient "
            "lips: pinkish-rose lip tint dabbed at center and blended outward so "
            "edges are softer; single dot of clear gloss at lower lip center. "
            "Liquid highlighter pressed to cheekbone tops, nose bridge, inner eye "
            "corners, tiny area above Cupid's bow."
        ),
        "Strawberry Girl": _p(
            "Apply Strawberry Girl sweet makeup. Sheer skin tint applied with "
            "fingers for slightly imperfect natural finish — visible texture "
            "intentional. Spot-conceal only if necessary. Strawberry flush blush: "
            "bright strawberry-red or raspberry cream blush placed VERY HIGH and "
            "VERY BROAD — on cheekbones, across nose bridge, spreading to temples "
            "— applied with fingers. Optional: subtle faux freckles scattered with "
            "freckle pen. Brows: clear gel brushed upward only. Eyes: brown "
            "mascara only — no eyeshadow, no liner, or finest possible brown "
            "smudge at upper lash line. Stained lip: light red-pink or brick-rose "
            "liner slightly smudged inward; sheer berry or red lip tint stippled "
            "with fingertip for bitten stained effect; gloss at center only."
        ),
        "Glazed Glass Skin": _p(
            "Apply Glazed Glass Skin sweet makeup. Base: foundation with liquid "
            "highlighter mixed in, or luminous skin tint applied over foundation "
            "with fingers — coverage without caking, glow without oiliness. "
            "Optional sheer warm bronzer at cheek hollows. Highlight layering: "
            "blinding mirror-finish powder highlight applied in wide C-shape to "
            "cheekbone tops, along nose bridge, and on Cupid's bow. Glazed lips: "
            "nude or MLBB liner softened after application; fill entire lip with "
            "liner; layer multiple generous coats of ultra-glossy clear or "
            "barely-there pink gloss — lips must look genuinely wet. Brows: "
            "tinted brow gel only. Lashes: clear mascara or single coat "
            "lengthening black mascara. Face oil pressed over cheekbones, "
            "temples, nose bridge for final wet-look finish. ZERO setting powder."
        ),
        "Romantic Floral": _p(
            "Apply Romantic Floral vintage sweet makeup. Satin-finish foundation "
            "applied with brush for a slightly airbrushed finish. Peach-toned "
            "concealer under eyes. Light translucent powder on T-zone only. "
            "Blush rose-garden placement: dusty rose or warm rose swept with "
            "fluffy brush in a broad arc from cheek apple to temple; lightly "
            "dust across top of nose bridge. Eyes: sheer wash of dusty rose or "
            "warm mauve eyeshadow across entire lid; deepen outer corner with "
            "slightly darker mauve or soft brown in a soft V-shape; champagne or "
            "pink pearl shimmer at lid center and inner corners; soft smudge of "
            "brown or plum pencil along upper lash line (deliberately soft and "
            "diffused); curl lashes, apply mascara. Lips: rose or antique pink "
            "liner; sheer rose, dusty pink, or antique pink lipstick; blot once. "
            "Soft peach or rose-tinted liquid highlight on cheekbone tops only."
        ),
    },
    "elegant": {
        "overall": _p(
            "Apply elegant makeup. Restraint is the guiding principle — every "
            "absent element was deliberately excluded. Refined satin or "
            "natural-finish skin. Controlled harmonious color palette where "
            "everything belongs to the same visual family. The overall "
            "impression must feel timeless and effortlessly composed. Apply "
            "light-coverage natural-finish foundation, a soft cream blush in "
            "warm nude-peach, groomed brows with light feather strokes, single "
            "coat brown-black mascara on upper lashes, and a satin nude or "
            "muted rose lip. If you can identify what any product is doing, it "
            "is doing too much."
        ),
        "Quiet Luxury": _p(
            "Apply Quiet Luxury elegant makeup. Light-coverage natural-finish "
            "foundation; spot-conceal only genuinely visible concerns. One soft "
            "bloom of cream blush in warm nude-peach or dusty rose — no edges, "
            "no stripes, just a bloom. Brows: groomed, not performed — fill "
            "only sparse areas with light feather strokes in natural hair color. "
            "Eyes: single coat brown-black (NOT jet black) mascara on upper "
            "lashes only, separating each lash individually. No eyeshadow, no "
            "liner whatsoever. Lips: nude or MLBB liner followed by satin "
            "lipstick in pale caramel, refined nude, or cool rose-beige. One "
            "drop of rosehip or squalane oil pressed to cheekbones and nose "
            "bridge for natural luminosity."
        ),
        "French Girl": _p(
            "Apply French Girl elegant makeup. Tinted moisturizer or light skin "
            "tint applied with pressing circular motions. Visible pores and "
            "freckles are acceptable and desirable. Choose ONE direction and "
            "fully commit: (A) Red Lip: warm rose or raspberry cream blush + "
            "vivid red lipstick applied slightly unevenly with a finger + single "
            "coat mascara upper lashes only; OR (B) Nude Lip: soft peachy-nude "
            "blush + tinted balm or sheer MLBB lip + single coat mascara. "
            "Brows: clear or lightly tinted brow gel brushed upward only — no "
            "filling, no defining at all. Imperfection is intentional: a "
            "slightly uneven red lip reads more authentically French than "
            "anything perfectly precise."
        ),
        "Classic Liner": _p(
            "Apply Classic Liner elegant makeup. Light-medium coverage satin or "
            "natural-finish foundation. Eyeshadow primer on lid. Gel liner or "
            "precise felt-tip liquid liner: begin at inner corner as finest "
            "possible stroke, work in small sections toward outer corner "
            "thickening naturally — line thickens gradually with widest point "
            "at outer third of lash line. Clean, intentional, refined — not "
            "dramatic. Fill gaps between lashes pressing liner into roots. Nude "
            "or white pencil on full lower waterline to lift and open the eye. "
            "Single coat brown-black or black mascara, root to tip. Soft lip "
            "liner in nude or muted mauve; satin lipstick in a refined, "
            "controlled color. Brows: soft definition only, in natural hair "
            "shade."
        ),
        "Soft Neutral Glam": _p(
            "Apply Soft Neutral Glam elegant makeup. Medium coverage satin-"
            "finish foundation applied with damp sponge. Warm-toned concealer "
            "under eyes. Warm contour (camel, light terracotta, or soft brown) "
            "at cheek hollows blending upward. Warm blush (dusty rose, peach, "
            "or warm mauve) at cheek apples blending toward temples. Warm "
            "highlight (champagne, peach-gold, or bronze) pressed onto "
            "cheekbone tops. Eyes: ivory or sand base across full lid + warm "
            "taupe or camel matte blended into crease + espresso or chocolate "
            "at outer corner in soft V + champagne or rose-gold shimmer pressed "
            "at lid center. Optional thin brown liner along upper lash line. "
            "Two coats mascara on upper lashes. Warm defined brows. Lip in "
            "dusty pink, rose, mauve, or terracotta. Every element in the same "
            "warm family."
        ),
        "Chinese Elegance": _p(
            "Apply Chinese Elegance makeup. Full coverage satin foundation for "
            "a porcelain-quality canvas. San bai (三白) three-point brightening "
            "technique: apply liquid or cream highlighter to three zones — "
            "forehead center, under-eye/upper cheek, and chin center. Cool-"
            "medium brown or rose-taupe contour for proportional balance. Eyes: "
            "elongated ink line — begins thin at inner corner, widens through "
            "center and outer corner, extends in a clean slightly-upward tail. "
            "Brows: structured, slightly straighter than Western arch. Lips: "
            "deep red or dou sha (豆沙, red bean deep burgundy) with precisely "
            "defined symmetrical Cupid's bow peaks; fill entire lip with liner; "
            "apply with lip brush; optional Korean-style gradient (concentrated "
            "center, softly fading toward edges)."
        ),
    },
    "natural": {
        "overall": _p(
            "Apply natural beauty makeup. Use a light dewy-finish skin tint "
            "pressed into skin, warm cream bronzer blended at temples and cheek "
            "hollows for a sun-kissed glow, cream blush in warm peach or "
            "terracotta swept upward at cheek apples, natural brushed-up brows "
            "with clear gel, one coat of brown-black mascara on upper lashes, "
            "and clear or nude lip gloss. The finish must be luminous and "
            "glowing, never flat matte. Every edge is blurred — no visible "
            "product lines anywhere."
        ),
        "Clean Girl": _p(
            "Apply Clean Girl natural makeup. Light-coverage dewy skin tint "
            "applied by pressing fingers into skin. Translucent powder on "
            "T-zone only; everywhere else stays dewy. Brontouring: warm cream "
            "bronzer at temples, cheek hollows, nose bridge, and jawline — "
            "blend until every edge vanishes. Cream blush in warm peach, "
            "terracotta, or dusty rose at cheek apples blending upward. Brows: "
            "brushed firmly upward with clear brow gel only — no filling. "
            "Optional single coat brown-black mascara on upper lashes. Clear "
            "or barely-there nude lip gloss generously applied. Looks like "
            "excellent skincare and nothing else."
        ),
        "No-Makeup Makeup": _p(
            "Apply No-Makeup Makeup natural look. Foundation color-matched "
            "exactly to skin tone applied with damp sponge. Concealer one "
            "shade lighter under eyes as inverted triangle. Blush in the exact "
            "natural flush color applied precisely where flush naturally "
            "appears. Brows: fine pencil in exact natural hair color filling "
            "only sparse areas with hair-stroke marks; set with clear brow "
            "gel. Single coat brown mascara (NOT jet black) at root, pulled "
            "slowly to tip for separation. Lips: MLBB liner matching natural "
            "lip color; sheer MLBB lipstick or balm. Everything looks like "
            "natural perfection — this person on their absolute best day."
        ),
        "Bronzed": _p(
            "Apply Bronzed natural sun-kissed makeup. Illuminating hydrating "
            "skin tint pressed into skin with fingertips. Peach-toned under-"
            "eye concealer only if needed. Bronzer ONLY where actual sunlight "
            "lands: forehead center, bridge and tip of nose, tops of cheekbones "
            "sweeping toward temples, tip of chin. Warm peach or coral cream "
            "blush above the bronzer at cheek apples blending upward. Gold or "
            "warm champagne liquid highlight pressed to cheekbone tops, nose "
            "tip, and Cupid's bow. Optional sheer gold or copper cream shadow "
            "on lids. Honey-tinted or clear brow gel brushed upward. Warm "
            "peachy-coral lip gloss or tinted balm."
        ),
        "Skinimalism": _p(
            "Apply Skinimalism natural makeup. Base: SPF moisturizer only — "
            "NO foundation, NO tinted moisturizer. Visible skin texture "
            "including pores, freckles, and natural tone variations is "
            "intentional and beautiful. Optional: one drop illuminating primer "
            "mixed into SPF. Optional cream blush in a shade almost identical "
            "to the natural flush, applied with fingertips. Brows: brushed "
            "upward with spoolie or clear brow soap only. Optional single coat "
            "separating brown or clear mascara on upper lashes — or skip "
            "entirely. Lips: tinted lip balm making lips look vivid and "
            "moisturized — no liner, no lipstick, no gloss."
        ),
        "Dewy Flush": _p(
            "Apply Dewy Flush natural makeup. Dewy-finish tinted moisturizer "
            "or foundation applied with damp sponge pressing motion — actively "
            "glowing. Minimum peach-toned concealer under eyes. Upward sweep "
            "blush: bright vivid liquid or cream blush starting at cheek "
            "apple, sweeping diagonally upward toward temple in one continuous "
            "motion. Pressed highlight: liquid or stick highlighter tapped "
            "with fingertip to cheekbone tops, inner eye corners, nose bridge, "
            "and Cupid's bow center. Brows brushed firmly upward; set with "
            "clear brow gel. Lashes curled; single coat lengthening mascara on "
            "upper lashes. Lips: hydrating gloss in clear, baby pink, sheer "
            "coral, or light berry — full and wet-looking."
        ),
    },
    "sexy": {
        "overall": _p(
            "Apply a sexy, confident beauty look fully adapted to this "
            "person's features and ethnicity. One focal point is maximized — "
            "either a refined eye look OR a bold lip — never both "
            "simultaneously. Skin: flawless, luminous satin. For East Asian "
            "faces: luminous clean skin + an elegant focal element — a sharp "
            "lip in deep berry or wine, or a soft warm smoky eye in "
            "copper/amber tones. For other ethnicities: calibrate drama and "
            "contrast to what looks most beautiful. Brows: clean, defined, "
            "naturally shaped. Hairstyle: sleek glossy straight hair OR soft "
            "voluminous waves with a side part."
        ),
        "Classic Red Lip": _p(
            "Apply Classic Red Lip sexy makeup. Choose the red shade by skin "
            "undertone: blue-red/cherry for cool/fair skin; orange-red/brick "
            "for warm/olive/Asian skin; true classic red for neutral. SKIN: "
            "Full-coverage flawless satin foundation. Barely-there nude-peach "
            "blush at temples and cheekbone tops. EYES: single wash of neutral "
            "taupe or warm nude shadow; nude or flesh-toned pencil along lower "
            "waterline; 2 coats mascara; NO liner. Brows: clean, natural, "
            "polished. LIP: dust translucent powder around lip border first; "
            "line precisely with matching red liner, crisply define Cupid's "
            "bow; fill entire lip with liner as base; apply lipstick with "
            "brush from center outward; blot, reapply. Hairstyle: classic "
            "Hollywood soft waves with glamorous side part."
        ),
        "Cat Eye Flick": _p(
            "Apply Cat Eye Flick sexy makeup. Eyeshadow primer; press neutral "
            "base shadow across entire lid. ADAPT the flick to eye shape: for "
            "monolid/hooded/Asian eyes — draw with eyes fully open; keep flick "
            "subtle (3-6mm), angle more horizontally; thicken liner at lid "
            "center; for double-lid/almond eyes — standard elongated flick "
            "(6-12mm) angled toward brow tail. Nude or white pencil along "
            "full lower waterline. Tiny shimmer dot at inner corner. NO dark "
            "liner on lower lash line. Curl lashes; 2 coats mascara. "
            "Individual lash clusters at outer corner. LIP: nude, peachy-nude, "
            "or barely-there MLBB. Hairstyle: sleek high ponytail or center-"
            "parted glossy straight hair."
        ),
        "Smoky Eye": _p(
            "Apply a Smoky Eye look — ADAPT color and intensity to eye type. "
            "SKIN: Full-coverage flawless satin foundation. For East "
            "Asian/monolid/single-lid/hooded eyes: use WARM TONES ONLY — "
            "copper, amber, warm brown, terracotta; avoid heavy black; apply "
            "warm amber or rose-copper across lid; deepen ONLY the outer "
            "corner and lash line with medium espresso brown; smudge soft "
            "brown or deep navy liner along upper and lower lash line; add "
            "rose-gold or bronze shimmer pressed at lid center. For double-"
            "lid/deep-set eyes: taupe transition in crease, dark espresso or "
            "charcoal on outer two-thirds, smudged kohl lower lash line, "
            "shimmer center. White or nude pencil on inner corner and lower "
            "waterline. Mascara: 2-3 coats; optional half-strip lashes at "
            "outer corners only. LIP: nude, tawny, warm beige, or muted MLBB. "
            "Hairstyle: tousled romantic loose waves OR chic half-up."
        ),
        "Contour Glam": _p(
            "Apply Contour Glam sexy makeup. SKIN: Full-coverage matte or "
            "satin foundation; set with translucent powder. CONTOUR: for "
            "rounder/softer faces: lighter touch with thorough blending; for "
            "angular/defined faces: standard depth. Matte contour at temples, "
            "cheek hollows, jawline. Highlight warmth-matched to skin tone: "
            "champagne for fair, peach-gold for medium, bronze for warm/dark. "
            "Fan-brush highlight to cheekbone tops, nose bridge and tip, "
            "Cupid's bow. Blush on cheekbone peak in dusty rose, warm peach, "
            "or soft terracotta. EYES: neutral taupe or warm brown shadow; "
            "clean upper liner; mascara — polished not dramatic. LIP: warm "
            "nude, taupe, or muted rose-brown. Hairstyle: sleek high ponytail "
            "OR glossy center-parted straight hair."
        ),
        "Warm Glam": _p(
            "Apply Warm Glam Golden Goddess sexy makeup — fully adapted to "
            "skin tone. SKIN: Satin or luminous-finish foundation — actively "
            "glowing. WARMTH by ethnicity: East Asian/fair-warm/olive: "
            "rose-gold, copper, warm terracotta; medium/warm neutral: classic "
            "terracotta contour, amber shadow, champagne-gold highlight; "
            "deep/dark skin: rich bronze, burnt copper, deep gold — go bolder. "
            "CONTOUR: generous warm terracotta or bronze at cheek hollows, "
            "temples, jaw. EYES: warm copper or amber matte shadow across "
            "entire lid; deepen outer corner and crease with warm espresso in "
            "a soft V; rose-gold or champagne shimmer at lid center; smudge "
            "warm brown or espresso (NOT harsh black for Asian eyes) along "
            "lower lash line; curl lashes; 2 coats mascara. HIGHLIGHT: rich "
            "golden, rose-gold, or warm champagne at cheekbone tops, nose "
            "bridge, inner eye corners. LIP: deep wine, warm berry, brick-red, "
            "or rich terracotta-nude. Hairstyle: voluminous glossy loose "
            "waves OR a full glamorous blowout."
        ),
    },
    "mature": {
        "overall": _p(
            "Apply a mature, powerful, and deeply beautiful makeup look. "
            "Think: the most elegant, successful woman in any room — her "
            "makeup reads as effortless perfection. Immaculate satin skin. "
            "One perfectly executed focal point: architectural brow, "
            "statement lip in deep wine/cognac/rose-taupe, or precise clean "
            "liner. Palette: expensive and sophisticated — cognac, camel, "
            "deep wine, muted rose, warm berry, precise nude. For East Asian "
            "faces: refined luxury in Chinese/Korean high-fashion style — "
            "porcelain luminous skin, elegant structured brows, polished "
            "deep-rose or wine lip. Hairstyle: swept-back, side-parted, or "
            "sculpted updo."
        ),
        "Power Red": _p(
            "Apply a Power Red look — beautiful and sophisticated, not harsh. "
            "Red chosen for skin tone: blue-red/cherry for cool/fair; orange-"
            "red/brick for warm/olive/Asian; true classic red for neutral. "
            "Skin: full-coverage foundation creating flawless luminous-satin "
            "perfection. Subtle warm blush. Brows: beautifully defined, strong "
            "but elegant. Eyes: warm taupe or camel matte shadow, fine precise "
            "liner thickened at lid center, 2 coats mascara. Cheeks: quiet "
            "satin highlight on cheekbone tops only. Lip: lined precisely "
            "with matching red liner, Cupid's bow crisply defined, fill with "
            "liner, apply with brush. Hairstyle: sleek side-parted waves, "
            "classic chignon, or polished blowout."
        ),
        "One Bold Element": _p(
            "Apply a One Bold Element mature look — choose the single element "
            "that makes THIS person look most stunning. If Bold Eye: choose "
            "flattering color (deep plum or rich bronze for warm skin; slate "
            "blue or forest green for cool skin; terracotta or warm copper "
            "for Asian features); apply as beautifully blended artistic wash "
            "across lid; skin: flawless matte-satin; brows: clean and "
            "defined; lip: perfect nude or MLBB. If Bold Lip: the most "
            "flattering deep/rich statement color (deep burgundy, wine, plum, "
            "or cognac-nude); lined with absolute precision; zero eye makeup "
            "except clean mascara and defined brows. Hairstyle: sleek high "
            "ponytail or soft blowout."
        ),
        "Corporate Glam": _p(
            "Apply Corporate Glam mature makeup. Senior partner at a "
            "prestigious firm — impeccably polished, quietly powerful. Skin: "
            "medium-full coverage SATIN foundation that looks like excellent "
            "skincare; warm peach-toned concealer under eyes. Subtle "
            "contouring — light-handed. Satin highlight on cheekbones only — "
            "'lit from within'. Eyes: beautifully blended neutral taupe or "
            "warm brown shadow; precise clean liner thicker at center, clean "
            "at outer corner; 2 coats mascara; impeccably defined brows. "
            "Lip: rich controlled beautiful color — deep rose, warm berry, "
            "polished mauve, or cognac; lined precisely, applied with brush. "
            "Hairstyle: polished blowout, sleek chignon, or structured waves."
        ),
        "Old Hollywood": _p(
            "Apply Old Hollywood glamour — genuinely beautiful, not costume. "
            "Skin: full-coverage matte foundation creating 'film-set "
            "perfection'; adapted to skin tone (not ghostly pale on "
            "Asian/dark skin). Brows: beautifully shaped statement brow — for "
            "Asian faces slightly more horizontal with defined arch; for "
            "Western faces classic 1950s arc. Eyes adapted: for monolid/"
            "hooded eyes draw with eyes open, keep flick subtle and lifted; "
            "for double-lid eyes classic elongated cat flick; light neutral "
            "shadow on lid, dramatic mascara, beautiful lashes. Lip: most "
            "beautiful flattering red for skin tone — deep cherry for cool, "
            "warm red for olive/Asian, classic true red for neutral; defined "
            "with absolute precision. Loose powder for matte-silk finish. "
            "Hairstyle: glamorous Hollywood waves, sleek vintage set, or "
            "elegant side-swept updo."
        ),
        "Strong Brow": _p(
            "Apply a Strong Brow mature look — model-beautiful brows that "
            "architecturally elevate the face. Brows are the star: full "
            "natural texture, symmetrical, architecturally defined. Adapted "
            "to ethnicity — East Asian: slightly straighter, more horizontal "
            "with soft natural arch; Western: stronger arch with clean "
            "definition at peak and tail. Map inner corner, arch peak, and "
            "end point; outline with fine hair-like pencil strokes; define "
            "clean lower edge with pomade and angled brush; set with clear "
            "or tinted brow gel brushed upward. Skin: natural-medium coverage "
            "luminous foundation. Light warm contour as background structure. "
            "Eyes: warm nude or soft taupe shadow wash; single mascara coat. "
            "Lip: warm nude, rose-beige, or soft mauve. Hairstyle: pulled "
            "back, side-swept, or half-up."
        ),
    },
    "androgynous": {
        "overall": _p(
            "Apply a beautiful, high-fashion androgynous look. Vogue Korea or "
            "Paris runway — striking, captivating, genuinely beautiful. One "
            "deliberate element challenges conventional gender aesthetics "
            "while the rest of the face looks impeccably beautiful. For East "
            "Asian faces: Korean/Japanese androgynous idol aesthetic — "
            "luminous flawless skin, one refined artistic element (graphic "
            "liner or monochrome tone); for Western faces: editorial high-"
            "fashion beauty with one bold unconventional element. Hairstyle: "
            "androgynous and fashion-forward — sleek straight, curtain bangs, "
            "polished center-part, or architectural cut."
        ),
        "Graphic Liner": _p(
            "Apply Graphic Liner androgynous makeup. Wearable editorial "
            "beauty — the liner is an artistic accent. Skin: full-coverage "
            "matte foundation, perfectly set. Liner color to complement "
            "features: for Asian warm/cool skin — terracotta, warm white, or "
            "copper; for fair cool skin — cobalt blue, crisp white, or black; "
            "for warm/dark skin — gold, white, or deep forest green. Draw "
            "one confident precise geometric element: floating line above "
            "eye, clean graphic wing, double liner, or precise outer corner "
            "accent. Clear brow gel on natural brows, near-nude lip, clean "
            "skin. Hairstyle: sleek straight, architectural center-part, or "
            "polished close-cut."
        ),
        "Bleached Brow": _p(
            "Apply a Bleached/Blocked Brow androgynous look — striking and "
            "beautiful. Fade or remove the visual presence of the brows "
            "(washed-out, platinum, or absent). Pair immediately with one "
            "beautiful counterpoint: either (A) richly beautiful precise lip "
            "in deep wine, rich berry, or warm brick-red for this skin tone; "
            "or (B) beautifully artistic eye — rich color wash or graphic "
            "liner. Skin: flawless, beautiful, luminous. Hairstyle: sleek, "
            "smooth, minimal — platinum/silver if possible, or sleek dark."
        ),
        "Monochrome Face": _p(
            "Apply a Monochrome Face androgynous look — beautiful, cohesive, "
            "richly editorial. Choose one color most flattering for skin "
            "tone: for East Asian warm-cool skin: dusty rose, warm mauve, or "
            "light terracotta; for olive/warm skin: copper, warm earth, or "
            "burnt sienna; for fair cool skin: cool lilac, dusty plum, or "
            "pale rose; for dark warm skin: deep burgundy, bronze, or warm "
            "copper. Apply across three zones with equal saturation: eyelids "
            "(clean wash from lash line to crease), cheeks (continuous with "
            "eye color, blending softly toward temples), lips (full in the "
            "same tone). Light natural luminous base. Hairstyle: monochrome "
            "or tonal — sleek and simple."
        ),
        "Undone Smudged Kohl": _p(
            "Apply an Undone Smudged Kohl androgynous look — effortlessly "
            "beautiful and sultry. Skin: sheer, luminous skin tint. Kohl: "
            "for Asian skin: dark brown or deep navy smudge reads softer; "
            "for Western/dark skin: black kohl can be used more intensely. "
            "Apply to both upper and lower lash lines with deliberate "
            "beautiful imprecision, then smudge immediately — soft and "
            "diffused, like a fashion model backstage. Clear brow gel on "
            "natural brows, tinted balm on lips — rest of face beautifully "
            "bare. Hairstyle: effortless — tousled, slightly undone, or "
            "pushed back."
        ),
        "Sculptural": _p(
            "Apply a Sculptural Avant-Garde androgynous look — high-fashion, "
            "strikingly beautiful, Vogue-editorial quality. Skin: full-"
            "coverage matte foundation set flawlessly. Contouring and "
            "highlighting used to make bone structure more beautiful — "
            "cheekbones more defined, brow bone more architectural. Add one "
            "beautiful precise creative element: metallic foil accent at "
            "inner corner or beneath brow; perfectly placed gemstone; or "
            "geometric color block in a flattering shade. Lip: beautifully "
            "chosen statement color — or deliberately bare. Hairstyle: high-"
            "fashion editorial — sculptural, sleek, or dramatically textured."
        ),
    },
}


# Alias: the existing catalog uses "mature" internally and the style score
# may come in as "powerful". Map powerful -> mature prompts.
STYLE_PROMPTS["powerful"] = STYLE_PROMPTS["mature"]


# Alias mapping: style guide parser names -> prompt dictionary keys.
# The style guide parser returns display names like "Korean Dewy (韩系水光)"
# but the prompt dictionary uses shorter keys like "Glass Skin". This mapping
# bridges the two so `get_prompt` can resolve any incoming sub-style name.
_SUB_STYLE_ALIASES: Dict[str, Dict[str, str]] = {
    "sweet": {
        "korean dewy": "Glass Skin",
        "korean dewy (韩系水光)": "Glass Skin",
        "韩系水光": "Glass Skin",
        "japanese kawaii": "Kawaii",
        "japanese kawaii (日系可爱)": "Kawaii",
        "日系可爱": "Kawaii",
        "strawberry girl (草莓少女)": "Strawberry Girl",
        "草莓少女": "Strawberry Girl",
        "glazed donut": "Glazed Glass Skin",
        "glazed donut (镜面水光)": "Glazed Glass Skin",
        "镜面水光": "Glazed Glass Skin",
        "romantic floral (浪漫花园)": "Romantic Floral",
        "浪漫花园": "Romantic Floral",
    },
    "sexy": {
        "vamp": "Classic Red Lip",
        "vamp / red lip glam": "Classic Red Lip",
        "red lip glam": "Classic Red Lip",
        "cat eye glam": "Cat Eye Flick",
        "cat eye": "Cat Eye Flick",
        "mob wife": "Warm Glam",
        "mob wife / dark glam": "Warm Glam",
        "dark glam": "Warm Glam",
    },
    "mature": {
        "editorial bold": "One Bold Element",
        "editorial": "One Bold Element",
        "one bold": "One Bold Element",
        "defined brow sculpt": "Strong Brow",
        "defined brow": "Strong Brow",
        "brow sculpt": "Strong Brow",
    },
    "powerful": {
        "editorial bold": "One Bold Element",
        "editorial": "One Bold Element",
        "one bold": "One Bold Element",
        "defined brow sculpt": "Strong Brow",
        "defined brow": "Strong Brow",
        "brow sculpt": "Strong Brow",
    },
    "androgynous": {
        "smudged": "Undone Smudged Kohl",
        "smudged / undone": "Undone Smudged Kohl",
        "undone": "Undone Smudged Kohl",
        "bleached brow look": "Bleached Brow",
        "sculptural / avant-garde": "Sculptural",
        "avant-garde": "Sculptural",
    },
    "natural": {
        "sun-kissed": "Bronzed",
        "sun-kissed / bronzed": "Bronzed",
    },
    "elegant": {
        "chinese elegance (zhong shi you ya)": "Chinese Elegance",
        "zhong shi you ya": "Chinese Elegance",
    },
}


# Maps sub-style name (as shown in the UI, e.g. "Quiet Luxury") to a short
# key we accept in the API. We do lenient matching in the service layer.
def get_prompt(style: str, sub_style: Optional[str]) -> Optional[str]:
    """
    Return the generation prompt for (style, sub_style).
    If sub_style is None, empty, or "overall"/"overview", return the overall prompt.
    Uses lenient case-insensitive / prefix matching against sub-style keys,
    plus an explicit alias table for known mismatches between the style guide
    parser names and the prompt dictionary keys.
    """
    style_key = (style or "").strip().lower()
    bucket = STYLE_PROMPTS.get(style_key)
    if not bucket:
        return None

    sub = (sub_style or "").strip()
    if not sub or sub.lower() in {"overall", "overview", "main", "hero"}:
        return bucket.get("overall")

    # Exact match
    if sub in bucket:
        return bucket[sub]

    # Case-insensitive match against keys
    sub_lower = sub.lower()
    for key, val in bucket.items():
        if key == "overall":
            continue
        if key.lower() == sub_lower:
            return val

    # Alias lookup: resolve known display-name -> prompt-key mappings.
    aliases = _SUB_STYLE_ALIASES.get(style_key, {})
    alias_target = aliases.get(sub_lower)
    if alias_target and alias_target in bucket:
        return bucket[alias_target]

    # Prefix match: the UI may pass "1. Kawaii (East Asian Cute)" etc.
    # Strip leading numbering and parentheticals.
    import re
    cleaned = sub_lower
    # drop leading "N. " or "N) "
    cleaned = re.sub(r"^\s*\d+[\.\)]\s*", "", cleaned)
    # take first 3+ chars of a word
    for key, val in bucket.items():
        if key == "overall":
            continue
        key_lower = key.lower()
        if cleaned.startswith(key_lower) or key_lower in cleaned:
            return val

    # Final fallback: check aliases with the cleaned version too.
    alias_target = aliases.get(cleaned)
    if alias_target and alias_target in bucket:
        return bucket[alias_target]

    # Last resort: if no prompt found, fall back to the "overall" prompt
    # rather than returning None (which causes a 400 error). This ensures
    # sub-styles always get SOME image generated even if the name mapping
    # is incomplete.
    return bucket.get("overall")


def list_sub_styles(style: str) -> list[str]:
    """Return ordered list of sub-style display names for a given style (excl. overall)."""
    bucket = STYLE_PROMPTS.get((style or "").strip().lower())
    if not bucket:
        return []
    return [k for k in bucket.keys() if k != "overall"]