import { useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, X } from 'lucide-react';

interface SocialMediaCardProps {
  /** The AI-generated stylized image URL or data URI */
  imageUrl: string;
  /** Style or sub-style name */
  styleName: string;
  /** Slogan / tagline for the style */
  slogan: string;
  /** Whether the modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
}

const SITE_URL = 'https://beautyfit.app';

// Fixed card dimensions (9:16 ratio)
const CARD_W = 360;
const CARD_H = 640;
const IMAGE_H = Math.round(CARD_H * 0.75); // 75% for image
const BOTTOM_H = CARD_H - IMAGE_H; // 25% for caption area

export default function SocialMediaCard({
  imageUrl,
  styleName,
  slogan,
  open,
  onClose,
}: SocialMediaCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        width: CARD_W,
        height: CARD_H,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#1a1215',
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });

      // Guarantee exact 9:16 output (720×1280 at scale 2)
      const targetWidth = 720;
      const targetHeight = 1280;
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = targetWidth;
      outputCanvas.height = targetHeight;
      const ctx = outputCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1a1215';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      }

      const link = document.createElement('a');
      link.download = `beautyfit-${styleName.toLowerCase().replace(/\s+/g, '-')}-card.png`;
      link.href = (ctx ? outputCanvas : canvas).toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate card image:', err);
    } finally {
      setGenerating(false);
    }
  }, [styleName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative max-h-[90vh] max-w-[90vw] flex flex-col items-center gap-4 overflow-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition"
        >
          <X className="w-4 h-4 text-[#2D2226]" />
        </button>

        {/* The card */}
        <div
          ref={cardRef}
          style={{
            position: 'relative',
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            overflow: 'hidden',
            borderRadius: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            backgroundColor: '#1a1215',
          }}
        >
          {/* Image area — uses background-image so html2canvas respects cover cropping */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${CARD_W}px`,
              height: `${IMAGE_H}px`,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Top gradient for style name readability */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '90px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* Bottom gradient blending into caption area */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '70px',
                background: 'linear-gradient(to bottom, transparent, #1a1215)',
                pointerEvents: 'none',
              }}
            />

            {/* Style name — TOP LEFT, elegant serif with generous spacing */}
            <h2
              style={{
                position: 'absolute',
                top: '22px',
                left: '22px',
                right: '22px',
                margin: 0,
                fontSize: '13px',
                fontWeight: 400,
                letterSpacing: '0.35em',
                textTransform: 'uppercase',
                color: '#ffffff',
                fontFamily: '"Playfair Display", "Georgia", serif',
                textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                lineHeight: 1.4,
              }}
            >
              {styleName}
            </h2>
          </div>

          {/* Bottom caption area — 25% height, editorial magazine style */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: `${CARD_W}px`,
              height: `${BOTTOM_H}px`,
              padding: '14px 22px 20px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Slogan — italic serif, poetic and flowing */}
            <p
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 400,
                fontStyle: 'italic',
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.9)',
                fontFamily: '"Playfair Display", "Georgia", serif',
                paddingRight: '56px',
                letterSpacing: '0.01em',
              }}
            >
              &ldquo;{slogan}&rdquo;
            </p>

            {/* Bottom row: BeautyFit link + QR code — 20% bigger */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <a
                href="https://beautyfit.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  color: '#C9A96E',
                  fontFamily: '"Playfair Display", "Georgia", serif',
                  textDecoration: 'none',
                }}
              >
                BEAUTYFIT
              </a>

              <div
                style={{
                  background: 'rgba(255,255,255,0.93)',
                  borderRadius: '7px',
                  padding: '5px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                <QRCodeSVG
                  value={SITE_URL}
                  size={48}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#2D2226"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)',
            }}
          >
            <Download className="w-4 h-4" />
            {generating ? 'Generating...' : 'Save to Photos'}
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/30 text-white/90 text-sm font-medium hover:bg-white/10 transition !bg-transparent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}