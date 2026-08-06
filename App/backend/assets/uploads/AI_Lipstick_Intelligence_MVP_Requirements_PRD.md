# AI Lipstick Intelligence Platform — MVP Requirements

## 1. Product Vision

Build an AI-powered lipstick intelligence platform centered around structured lipstick color understanding, semantic beauty search, dupe matching, and AI virtual try-on.

The platform should support:
- Lipstick discovery
- Dupe search
- AI lipstick try-on
- Semantic beauty search
- Personalized recommendation
- Future AI beauty assistant capabilities

---

## 2. Core Database Schema

Each lipstick record should include:

```json
{
  "id": "anastasia-beverly-hills-dusty-mauve",
  "brand": "Anastasia Beverly Hills",
  "product_line": "Matte Lipstick",
  "shade_name": "Dusty Mauve",
  "product_type": "lipstick",
  "hex": "#a26970",
  "rgb": [162,105,112],
  "lab": [52.1,24.5,5.3],
  "undertone": "cool",
  "finish": "matte",
  "brightness": 0.63,
  "saturation": 0.41,
  "color_family": ["mauve", "dusty-rose", "mlbb"],
  "seasonal_palette": "autumn"
}
```

---

## 3. MVP Feature Requirements

### M1. Lipstick Database Explorer (P0)

Users can:
- Browse all lipsticks
- Search by brand
- Search by shade name
- Search by product line
- Filter by undertone
- Filter by finish
- Filter by color family
- Sort by brightness or saturation

Each lipstick card should display:
- Swatch
- Brand
- Shade name
- HEX code
- Undertone
- Finish

---

### M2. Dupe Search (P0)

Users can click "Find Dupes" to discover similar lipsticks.

Requirements:
- Use CIELAB color space
- Use DeltaE2000 for similarity
- Support cross-brand matching
- Support budget alternatives

Example:

```text
Dior 999
→ MAC Chili
→ rom&nd Figfig
→ INTO YOU EM05
```

---

### M3. Semantic Beauty Search (P0)

Users can search using natural language:
- 冷调豆沙
- 韩女奶茶色
- 欧美姨妈色
- 适合黄皮

The system should parse:
- Undertone
- Color family
- Brightness
- Saturation
- Finish
- Style keywords

The first version should be rule-based without LLM.

---

### M4. AI Virtual Try-On (P0)

Users upload a selfie.

System pipeline:
- Face detection
- Lip segmentation
- Lipstick overlay
- Finish simulation

Supported finish simulation:
- Matte
- Glossy
- Velvet

MVP implementation should use:
- Mask-based blending
- Opacity adjustment
- Highlight simulation
- NOT diffusion models

---

### M5. Skin-Tone-Based Recommendation (P1)

Users upload a photo.

The system should estimate:
- Skin undertone
- Skin depth

Then recommend:
- Suitable lipstick families
- Best-matching shades
- Warm vs cool recommendations

First version should be rule-based.

---

### M6. Color Universe Page (P1)

Create color-themed pages:
- Nude
- Mauve
- Milk Tea
- Rose
- Berry
- Terracotta
- Chili

These pages should be SEO-friendly and visually explorable.

---

### M7. Find Lipstick from Image (P1)

Users can upload:
- Influencer photos
- Xiaohongshu screenshots
- Selfies

The system should:
- Extract lip color
- Convert to LAB
- Perform nearest-neighbor search
- Return closest lipsticks

---

## 4. Database Requirements

### D1. Core Fields

Required fields:
- id
- brand
- product_line
- shade_name
- product_type
- hex
- rgb
- lab_l
- lab_a
- lab_b
- undertone
- finish
- brightness
- saturation
- color_family
- seasonal_palette

---

### D2. Similarity Index

Precompute:
- Top 20 similar shades for each lipstick
- DeltaE2000 distance matrix

---

### D3. Semantic Tags

Support multi-tag semantic labels:

```json
[
  "cool-toned",
  "mlbb",
  "dusty-rose",
  "fall",
  "korean-style"
]
```

---

## 5. Recommendation Engine

Recommendation scoring should combine:

| Feature | Weight |
|---|---|
| Color similarity | 40% |
| Undertone match | 20% |
| Finish similarity | 15% |
| Popularity | 10% |
| Seasonal palette | 15% |

---

## 6. Natural Language Search

Example query:

```text
适合黄皮的温柔裸色
```

Parsed into:

```json
{
  "undertone": "warm",
  "family": "nude",
  "style": "soft"
}
```

---

## 7. Recommended Tech Stack

Frontend:
- Next.js
- TailwindCSS
- shadcn/ui

Backend:
- FastAPI
- PostgreSQL
- pgvector

Image Processing:
- OpenCV
- MediaPipe FaceMesh

Vector Search:
- pgvector
- FAISS

---

## 8. Future Expansion

Future categories:
- Blush
- Eyeshadow
- Foundation
- Full makeup recommendation
- AI beauty assistant
- Creator community
- Seasonal color analysis

---

## 9. Core Product Thesis

This is NOT just a lipstick database.

This is a computational beauty intelligence system.

The real moat is:
- Structured color understanding
- LAB-based beauty search
- Semantic beauty reasoning
- AI-native beauty recommendation
