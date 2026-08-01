import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import SocialMediaCard from '@/components/SocialMediaCard';
import { ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';

/** Slogan map — same as ProTutorialPage. */
const STYLE_SLOGANS: Record<string, string> = {
  'sexy': "She doesn't enter a room. She rewrites it.",
  'vamp': 'Velvet lips. Venomous grace. No apologies.',
  'red lip glam': 'One shade of red. A thousand unspoken words.',
  'cat eye glam': "Her eyes don't follow the light — they command it.",
  'smoky eye': 'Smoke and mirrors — except the mirror already surrendered.',
  'contour glam': 'Carved by shadow. Illuminated by intention.',
  'mob wife / dark glam': 'Dripping in mystery. Born to reign in shadows.',
  'sweet': 'Soft power. Petal armor. Quietly devastating.',
  'japanese kawaii': 'Doe eyes that disarm. A sweetness that conquers.',
  'korean dewy / glass skin': 'Luminous like morning dew on glass — impossibly perfect.',
  'strawberry girl': 'Sun-flushed. Berry-kissed. Recklessly alive.',
  'glazed donut': 'She glows like she swallowed the golden hour.',
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
  'sun-kissed / bronzed': 'Golden hour lives on her skin permanently.',
  'skinimalism': 'Her skin is the statement. Everything else is silence.',
  'dewy flush': 'Fresh as first light. Alive like a secret.',
  'androgynous': 'Rules were made. She was made to unmake them.',
  'graphic liner': 'Where geometry meets rebellion — art begins.',
  'bleached brow': 'Erase the expected. Reveal the extraordinary.',
  'monochrome': 'One hue. Total devotion. Zero compromise.',
  'smudged / undone': 'Beautifully wrecked. Intentionally imperfect.',
  'sculptural / avant-garde': 'Her face is not worn — it is exhibited.',
  'mature / powerful': "Time didn't age her. It crowned her.",
  'power red': "Authority isn't requested. It's applied in one stroke.",
  'editorial bold': 'Maximum impact. Minimum explanation.',
  'corporate glam': 'Boardroom polish. Backroom fire.',
  'old hollywood': "Timeless isn't a trend — it's a bloodline.",
  'defined brow': 'Arched like architecture. Sharp like ambition.',
};

const STYLE_OPTIONS = Object.entries(STYLE_SLOGANS).map(([key, slogan]) => ({
  value: key,
  label: key
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' '),
  slogan,
}));

export default function CardTestPage() {
  const [imageSource, setImageSource] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(STYLE_OPTIONS[0].value);
  const [cardOpen, setCardOpen] = useState(false);

  const currentSlogan = useMemo(
    () => STYLE_SLOGANS[selectedStyle] || 'Your personalized look',
    [selectedStyle]
  );

  const currentStyleLabel = useMemo(
    () =>
      STYLE_OPTIONS.find((o) => o.value === selectedStyle)?.label ||
      selectedStyle,
    [selectedStyle]
  );

  const resolvedImage = imageSource === 'upload' ? uploadedImage : imageUrl;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const bgGradient =
    'radial-gradient(ellipse at top left, #FDF6EE 0%, #F7EFE5 40%, #F3EAD9 100%)';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: bgGradient }}
    >
      <Navbar />

      <div className="max-w-[720px] mx-auto px-6 pt-32 pb-20 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[#6B7AA0] font-body text-sm font-medium hover:text-[#8E9CC3] transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#2D2226] mb-2">
          Card Test Studio
        </h1>
        <p className="font-body text-[#5C4A42] mb-8">
          Preview and test the social media share card without regenerating AI
          images. Upload any image or paste a URL, pick a style, and see the
          result instantly.
        </p>

        {/* Image source selection */}
        <div className="rounded-2xl p-6 bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-md mb-6">
          <h2 className="font-display text-lg font-semibold text-[#2D2226] mb-4">
            1. Choose an Image
          </h2>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setImageSource('upload')}
              className={`px-4 py-2 rounded-full text-sm font-medium font-body transition-all ${
                imageSource === 'upload'
                  ? 'bg-[#2D2226] text-white shadow'
                  : 'bg-[#F3EAD9] text-[#5C4A42] hover:bg-[#E8DDD6]'
              }`}
            >
              <Upload className="w-3.5 h-3.5 inline mr-1.5" />
              Upload File
            </button>
            <button
              onClick={() => setImageSource('url')}
              className={`px-4 py-2 rounded-full text-sm font-medium font-body transition-all ${
                imageSource === 'url'
                  ? 'bg-[#2D2226] text-white shadow'
                  : 'bg-[#F3EAD9] text-[#5C4A42] hover:bg-[#E8DDD6]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 inline mr-1.5" />
              Paste URL
            </button>
          </div>

          {imageSource === 'upload' ? (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="block w-full text-sm text-[#5C4A42] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#B8706A]/10 file:text-[#B8706A] hover:file:bg-[#B8706A]/20 cursor-pointer"
              />
              {uploadedImage && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-[#E8DDD6]"
                  />
                  <span className="font-body text-xs text-[#6B5B52]">
                    Image loaded ✓
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8DDD6] bg-white text-sm font-body text-[#2D2226] placeholder:text-[#9B8A82] focus:outline-none focus:ring-2 focus:ring-[#B8706A]/30"
              />
              {imageUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover border border-[#E8DDD6]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span className="font-body text-xs text-[#6B5B52]">
                    URL preview
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Style selection */}
        <div className="rounded-2xl p-6 bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-md mb-6">
          <h2 className="font-display text-lg font-semibold text-[#2D2226] mb-4">
            2. Pick a Style
          </h2>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E8DDD6] bg-white text-sm font-body text-[#2D2226] focus:outline-none focus:ring-2 focus:ring-[#B8706A]/30"
          >
            {STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-3 font-body text-xs text-[#6B5B52] italic">
            Slogan: &ldquo;{currentSlogan}&rdquo;
          </p>
        </div>

        {/* Preview button */}
        <div className="rounded-2xl p-6 bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-md">
          <h2 className="font-display text-lg font-semibold text-[#2D2226] mb-4">
            3. Preview Card
          </h2>

          {!resolvedImage ? (
            <p className="font-body text-sm text-[#9B8A82]">
              Please upload an image or paste a URL above first.
            </p>
          ) : (
            <button
              onClick={() => setCardOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold font-body shadow-md hover:shadow-lg hover:brightness-110 transition-all"
              style={{
                background:
                  'linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)',
              }}
            >
              Open Share Card Preview
            </button>
          )}
        </div>
      </div>

      {/* The SocialMediaCard modal */}
      {resolvedImage && (
        <SocialMediaCard
          imageUrl={resolvedImage}
          styleName={currentStyleLabel}
          slogan={currentSlogan}
          open={cardOpen}
          onClose={() => setCardOpen(false)}
        />
      )}
    </div>
  );
}