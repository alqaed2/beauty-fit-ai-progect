# BeautyFit — Face Analysis + Makeup Recommendation (Frontend)

## Design Guidelines

### Design References (Primary Inspiration)
- **Glossier.com**: Clean, airy, soft pink tones, modern beauty brand feel
- **Aesop.com**: Premium minimalism, elegant typography, generous whitespace
- **Chanel Beauty**: Luxurious, sophisticated, timeless elegance
- **Style**: Soft Luxury + Gentle Femininity + Professional Beauty Tech

### Color Palette
- Primary Background: #FDF8F5 (Warm Cream)
- Secondary Background: #F9F1EC (Soft Blush)
- Accent Rose: #C4917B (Muted Rose Gold)
- Accent Deep: #8B6F5E (Warm Taupe)
- Dark Text: #2D2226 (Rich Espresso)
- Body Text: #5C4A42 (Warm Brown)
- Muted Text: #9B8A82 (Soft Taupe)
- Card Glass: rgba(255, 255, 255, 0.6) with backdrop-blur
- Border Soft: #E8DDD6 (Warm Sand)
- Highlight: #E8C4B8 (Soft Peach)
- CTA Gradient: linear-gradient from #C4917B to #D4A494

### Typography
- Heading Display: "Playfair Display" (serif) — elegant, luxurious, editorial
- Body/UI: "Inter" (sans-serif) — clean, modern, professional readability
- Heading1: Playfair Display 700 (56px) — hero titles
- Heading2: Playfair Display 600 (40px) — section titles
- Heading3: Playfair Display 500 (28px) — card titles
- Body: Inter 400 (16px) — paragraphs
- Caption: Inter 400 (14px) — labels, small text
- Button: Inter 600 (16px) — CTAs

### Key Component Styles
- **Buttons (Primary)**: Rose gold gradient background, white text, 24px rounded, subtle shadow, hover: brighten + lift
- **Buttons (Secondary)**: Transparent with rose gold border, rose gold text, hover: fill
- **Cards**: White/glass background with backdrop-blur, soft shadow, 16px rounded, hover: lift 4px
- **Upload Area**: Dashed border with rose gold accent, large icon, gentle pulse animation
- **Result Cards**: Elegant cards with left accent border in rose gold

### Layout & Spacing
- Hero: Full viewport with soft gradient background + floating decorative elements
- Max content width: 1200px centered
- Section padding: 96px vertical
- Card gaps: 24px
- Generous whitespace everywhere — let the design breathe

### Animations
- Page transitions: Fade + slide up (300ms)
- Cards: Hover lift with smooth shadow transition
- Hero text: Staggered fade-in
- Upload: Gentle pulse on hover
- Results: Sequential reveal animation

### Images to Generate
1. **hero-beauty-abstract.jpg** — Soft abstract beauty composition with rose gold tones, gentle light, makeup brushes and petals artfully arranged, dreamy bokeh (Style: photorealistic, soft luxury)
2. **face-analysis-illustration.jpg** — Elegant illustration of a diverse woman's face with subtle geometric analysis lines overlaid, soft warm tones (Style: minimalist, editorial)
3. **makeup-style-natural.jpg** — Beautiful natural/fresh makeup look on diverse model, soft lighting, warm tones, editorial quality (Style: photorealistic, beauty editorial)
4. **makeup-style-glam.jpg** — Glamorous evening makeup look, rich warm tones, professional beauty photography (Style: photorealistic, beauty editorial)

---

## Development Tasks

### Files to Create (7 files)

1. **src/index.css** — Update CSS variables for BeautyFit color palette + custom animations
2. **src/pages/Index.tsx** — Landing page with Hero section + "How It Works" + Features preview + CTA
3. **src/pages/AnalyzePage.tsx** — Photo upload interface with drag-and-drop, guidelines, analyzing state
4. **src/pages/ResultsPage.tsx** — Analysis results display: face shape, features, 3 makeup style recommendations
5. **src/pages/StyleDetailPage.tsx** — Detailed view of a recommended makeup style with principles and tips
6. **src/components/Navbar.tsx** — Sleek navigation bar with logo, links, and Pro CTA
7. **src/App.tsx** — Update routes for all pages

### Implementation Notes
- Face analysis is MOCK data for now (frontend only, backend later)
- Use simulated AI analysis with realistic mock results
- Upload accepts image but processes locally with mock delay
- Results show pre-defined face shape types with matching recommendations
- Mobile-responsive throughout