# Lipstick Enriched Data Dictionary

## Overview

This document describes the enriched lipstick shade dataset generated from the base lipstick catalog.

The goal of this schema is to support:

- lipstick dupe search
- AI lipstick try-on
- skin tone recommendation
- semantic lipstick search
- color clustering
- undertone analysis
- future recommendation systems

Current enriched dataset files:

- [lipstick_enriched.csv](/Users/liuyan/lipcolorfinder_scrape/enriched_output/lipstick_enriched.csv)
- [lipstick_enriched.json](/Users/liuyan/lipcolorfinder_scrape/enriched_output/lipstick_enriched.json)
- [lipstick_dupe_samples.json](/Users/liuyan/lipcolorfinder_scrape/enriched_output/lipstick_dupe_samples.json)

## Data Structure

Each row represents one lipstick shade. Example:

```json
{
  "id": "anastasia-beverly-hills-dusty-mauve",
  "color_hex": "#a26970",
  "brand": "Anastasia Beverly Hills",
  "product_line": "Matte Lipstick",
  "shade_name": "Dusty Mauve",
  "product_type": "lipstick",
  "color_rgb": {"r": 162, "g": 105, "b": 112},
  "color_hsl": {"h": 352.63, "s": 23.46, "l": 52.35},
  "color_lab_l": 50.6356,
  "color_lab_a": 23.7956,
  "color_lab_b": 5.4719,
  "brightness": 50.64,
  "saturation": 23.46,
  "hue_degree": 352.63,
  "undertone": "neutral",
  "undertone_confidence": 0.5333,
  "color_depth": "medium",
  "color_family": "dusty-rose",
  "color_family_confidence": 0.4806,
  "finish": "matte",
  "finish_confidence": 0.99,
  "recommended_skin_undertone": ["warm", "cool", "neutral"],
  "recommended_skin_depth": ["light", "medium", "tan", "deep"],
  "seasonal_palette": "summer"
}
```

## Field Definitions

### Base Fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Unique shade identifier, usually normalized from brand + shade name. |
| `color_hex` | string | Canonical hex color value used as the source color. |
| `brand` | string | Lipstick brand. |
| `product_line` | string | Product line or collection name. |
| `shade_name` | string | Shade display name. |
| `product_type` | string | Product category from source data. For this dataset the main focus is `lipstick`, but the schema is reusable for other lip products. |

### Core Color Fields

| Field | Type | Description |
| --- | --- | --- |
| `color_rgb` | object | RGB triplet derived from hex, shape: `{r, g, b}`. |
| `color_hsl` | object | HSL triplet derived from RGB, shape: `{h, s, l}`. |
| `color_lab_l` | float | CIELAB lightness channel. |
| `color_lab_a` | float | CIELAB green-red axis. |
| `color_lab_b` | float | CIELAB blue-yellow axis. |

### Color Analysis

| Field | Type | Description |
| --- | --- | --- |
| `brightness` | float | Perceptual brightness proxy, based on LAB lightness. |
| `saturation` | float | Color vividness, derived from HSL saturation. |
| `hue_degree` | float | Hue angle in degrees from 0 to 360. |

### Undertone

| Field | Type | Description |
| --- | --- | --- |
| `undertone` | enum | Main lipstick undertone: `warm`, `cool`, `neutral`. |
| `undertone_confidence` | float | Confidence score for undertone classification, from `0.0` to `1.0`. |

Classification considerations:

- LAB `a/b` channels
- hue angle
- saturation level
- naming keywords such as `mauve`, `peach`, `coral`, `berry`, `rosewood`

### Depth

| Field | Type | Description |
| --- | --- | --- |
| `color_depth` | enum | Visual depth bucket: `fair`, `light`, `medium`, `deep`. |

This is useful for clustering shades with similar darkness and for avoiding poor dupe matches across very different depth levels.

### Lipstick Semantic Family

| Field | Type | Description |
| --- | --- | --- |
| `color_family` | enum | Dominant semantic lipstick family. |
| `color_family_confidence` | float | Confidence score for semantic family assignment. |

Available families:

- `nude`
- `rose`
- `mauve`
- `coral`
- `peach`
- `terracotta`
- `brick`
- `chili`
- `berry`
- `wine`
- `plum`
- `red`
- `pink`
- `brown`
- `orange`
- `mlbb`
- `milk-tea`
- `dusty-rose`

Classification considerations:

- hue range
- saturation
- brightness
- name semantics from `shade_name` and `product_line`

Important note:

The current pipeline outputs one dominant `color_family` per shade. In future versions, this can be expanded into multi-label tags such as `["mauve", "dusty-rose"]` for richer semantic search.

### Finish Estimation

| Field | Type | Description |
| --- | --- | --- |
| `finish` | enum | Estimated finish inferred from product naming. |
| `finish_confidence` | float | Confidence score for finish inference. |

Available finishes:

- `matte`
- `velvet`
- `satin`
- `glossy`
- `watery`
- `sheer`
- `cream`

Inference signals:

- `product_line` keywords like `matte`, `velvet`, `shine`, `glow`, `stain`, `balm`
- `shade_name` keywords where present
- `product_type` fallback behavior

### Skin Tone Recommendation

| Field | Type | Description |
| --- | --- | --- |
| `recommended_skin_undertone` | array | Suggested matching skin undertones: `warm`, `cool`, `neutral`. |
| `recommended_skin_depth` | array | Suggested matching skin depths: `fair`, `light`, `medium`, `tan`, `deep`. |

These are recommendation hints, not hard rules. They are intended for assistant ranking and personalized filtering, not for exclusion-only logic.

### Seasonal Color Analysis

| Field | Type | Description |
| --- | --- | --- |
| `seasonal_palette` | enum | Approximate seasonal palette bucket: `spring`, `summer`, `autumn`, `winter`. |

This field can support style-based recommendations and beauty consultation flows.

## How the Enrichment Works

### 1. Color Space Conversion

Source `color_hex` is converted into:

- RGB for rendering and frontend use
- HSL for intuitive hue and saturation analysis
- CIELAB for perceptual similarity and DeltaE matching

### 2. Perceptual Color Analysis

The pipeline uses LAB and hue-based heuristics instead of relying only on RGB thresholds.

This matters because:

- RGB distance does not reflect human color perception well
- DeltaE is better for dupe matching
- undertone and depth need perceptual structure, not only raw channels

### 3. Semantic Enrichment

`shade_name` and `product_line` are parsed for beauty semantics:

- color cues: `mauve`, `chili`, `rosewood`, `berry`, `nude`
- finish cues: `matte`, `velvet`, `glow`, `stain`, `creme`
- style cues: `dusty`, `soft`, `retro`, `juicy`

This allows the system to answer queries like:

- "show me cool-toned dusty rose lipsticks"
- "find warm nude matte lipsticks for medium skin"
- "give me dupes for this berry-plum lipstick"

## How This Can Be Used

### 1. Lipstick Dupe Search

Recommended approach:

- use `color_lab_l`, `color_lab_a`, `color_lab_b` for DeltaE matching
- filter or rerank with `color_depth`, `undertone`, `finish`, and `color_family`
- optionally remove same-brand exact collection matches if the goal is cross-brand dupes

Useful fields:

- `color_lab_l`
- `color_lab_a`
- `color_lab_b`
- `color_family`
- `undertone`
- `finish`
- `color_depth`

### 2. AI Lipstick Try-On

Recommended approach:

- use `color_rgb` or `color_hex` for rendering overlays
- use `finish` to simulate matte, satin, glossy, or sheer effects
- use `brightness`, `saturation`, and `undertone` to calibrate blending on different lip images

Useful fields:

- `color_rgb`
- `color_hex`
- `finish`
- `brightness`
- `saturation`
- `undertone`

### 3. Skin Tone Recommendation

Recommended approach:

- combine user skin undertone and skin depth with recommendation arrays
- boost shades where user attributes intersect strongly with:
  `recommended_skin_undertone` and `recommended_skin_depth`
- use `seasonal_palette` as an additional ranking signal for personal color analysis flows

Useful fields:

- `recommended_skin_undertone`
- `recommended_skin_depth`
- `undertone`
- `seasonal_palette`
- `color_family`

### 4. Semantic Lipstick Search

Recommended approach:

- index searchable text from `brand`, `product_line`, `shade_name`
- add structured filters for `color_family`, `undertone`, `finish`, `seasonal_palette`
- support natural language to structured query mapping

Example query intents:

- "muted mauve lipstick"
- "warm brick red matte lipstick"
- "MLBB lipstick for neutral undertone"

Useful fields:

- `shade_name`
- `product_line`
- `brand`
- `color_family`
- `undertone`
- `finish`
- `seasonal_palette`

### 5. Color Clustering

Recommended approach:

- cluster in LAB space for perceptual color groups
- optionally append `finish`, `undertone`, and `color_depth` as metadata features
- create catalog clusters for trend analysis and inventory surfacing

Useful fields:

- `color_lab_l`
- `color_lab_a`
- `color_lab_b`
- `color_depth`
- `undertone`
- `color_family`

### 6. Undertone Analysis

Recommended approach:

- analyze catalog distribution by undertone and family
- inspect gaps such as missing cool-toned nudes or warm-toned berries
- use in merchandising and assortment optimization

Useful fields:

- `undertone`
- `undertone_confidence`
- `color_family`
- `brand`
- `product_line`

### 7. Future Recommendation Systems

Recommended approach:

- use the enriched structured fields as explicit features
- combine with user behavior features such as clicks, saves, purchases, and try-on history
- support both rule-based cold start and learned ranking models

Useful features for ranking:

- `color_family`
- `undertone`
- `color_depth`
- `finish`
- `seasonal_palette`
- `brightness`
- `saturation`

## Suggested Future Extensions

The current schema is production-usable, but these additions would make it stronger for AI-native beauty systems:

### Multi-label Semantic Tags

Add:

- `color_family_tags` as an array
- `style_tags` such as `muted`, `classic`, `bold`, `soft`, `editorial`

Reason:

Many lipstick shades naturally belong to multiple semantic groups. For example:

- `Dusty Mauve` can be both `mauve` and `dusty-rose`
- `Rosewood` can be both `rose` and `mlbb`

### Texture and Opacity

Add:

- `opacity_level`
- `shine_level`
- `pigment_intensity`

Reason:

These are important for AI try-on realism and user expectation alignment.

### Recommendation Feedback Fields

Add:

- `click_through_rate`
- `try_on_rate`
- `save_rate`
- `purchase_rate`
- `dupe_success_score`

Reason:

This supports continuous model improvement and business-aware ranking.

### Embeddings

Add:

- `visual_vector`
- `semantic_embedding`

Reason:

This enables:

- nearest-neighbor visual search
- semantic search with beauty assistant queries
- hybrid recommendation systems

## Practical Guidance

Recommended system layering:

1. Use structured metadata for filtering.
2. Use LAB + DeltaE for perceptual similarity.
3. Use embeddings for semantic retrieval.
4. Use behavior data for personalized reranking.

In practice:

- structured filters handle precision
- DeltaE handles visual truth
- embeddings handle language flexibility
- ranking models handle personalization

## Caveats

- `undertone`, `color_family`, `finish`, and `seasonal_palette` are inferred, not source-authoritative.
- Confidence scores should be used in ranking and fallback logic.
- Some shades may require multi-label semantics instead of a single dominant family.
- Product naming quality differs by brand, so naming-based inference is sometimes stronger for some brands than others.

## Summary

This enriched lipstick schema converts a simple shade catalog into a reusable beauty intelligence layer.

It is designed to support:

- dupe matching
- try-on rendering
- personalized recommendation
- semantic search
- catalog analytics
- future AI beauty assistants

It is also scalable enough to serve as the base schema for larger lipstick datasets in the `100k+` range, especially when paired with PostgreSQL, pgvector, and batch enrichment pipelines.
