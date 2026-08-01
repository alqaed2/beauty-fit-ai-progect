import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import {
  Clock,
  Trash2,
  ArrowRight,
  Sparkles,
  History,
  AlertCircle,
  Gem,
} from 'lucide-react';
import {
  getHistory,
  deleteHistoryEntry,
  clearHistory,
  getCachedTutorial,
  type HistoryEntry,
} from '@/lib/tutorialCache';

const STYLE_DISPLAY: Record<string, string> = {
  sweet: 'Sweet',
  natural: 'Natural',
  sexy: 'Sexy',
  androgynous: 'Androgynous',
  elegant: 'Elegant',
  powerful: 'Powerful',
  mature: 'Mature',
};

const STYLE_COLORS: Record<string, { from: string; to: string }> = {
  sweet: { from: '#F8B4C8', to: '#F9D1DC' },
  natural: { from: '#A8D5A2', to: '#D4EDCB' },
  sexy: { from: '#C94C4C', to: '#E88E8E' },
  androgynous: { from: '#7B68EE', to: '#B8A9F0' },
  elegant: { from: '#C9A96E', to: '#E8D5A8' },
  powerful: { from: '#2D2226', to: '#5C4A42' },
  mature: { from: '#8E9CC3', to: '#B8C4E0' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setEntries(getHistory());
  }, []);

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    setEntries(getHistory());
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearHistory();
    setEntries([]);
    setConfirmClear(false);
  };

  const handleOpenCached = (entry: HistoryEntry) => {
    const cached = getCachedTutorial(entry.styleId);
    if (cached) {
      // Navigate to the pro tutorial page with cached data in state (include userImage for stylization)
      navigate(`/style/${entry.styleId}/pro`, {
        state: {
          style: {
            id: entry.styleId,
            name: entry.styleName,
            match: entry.score ?? 0,
          },
          faceShape: entry.faceShape,
          userImage: cached.userImage,
          fromCache: true,
        },
      });
    } else {
      // Cache expired — navigate without cache (will regenerate)
      navigate(`/style/${entry.styleId}/pro`, {
        state: {
          style: {
            id: entry.styleId,
            name: entry.styleName,
            match: entry.score ?? 0,
          },
          faceShape: entry.faceShape,
        },
      });
    }
  };

  const bgGradient =
    'radial-gradient(ellipse at top left, #FDF6EE 0%, #F7EFE5 40%, #F3EAD9 100%)';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: bgGradient }}
    >
      {/* Decorative blurs */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
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

      <div className="max-w-[800px] mx-auto px-6 pt-32 pb-20 relative z-10">
        {/* Header */}
        <div className="mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(142,156,195,0.12), rgba(184,112,106,0.12))',
              border: '1px solid rgba(142,156,195,0.25)',
            }}
          >
            <History className="w-3.5 h-3.5 text-[#8E9CC3]" />
            <span className="font-body text-[10px] font-bold tracking-[0.25em] uppercase text-[#8E9CC3]">
              Your Reports
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2226] mb-3">
            History
          </h1>
          <p className="font-body text-[#5C4A42] max-w-2xl leading-relaxed">
            Your previously generated Pro tutorials are cached locally. Click
            any entry to instantly reload it without waiting for regeneration.
          </p>
        </div>

        {/* Actions bar */}
        {entries.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <span className="font-body text-sm text-[#6B5B52]">
              {entries.length} report{entries.length !== 1 ? 's' : ''} saved
            </span>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold font-body border transition-all !bg-transparent"
              style={{
                borderColor: confirmClear
                  ? 'rgba(220,38,38,0.5)'
                  : 'rgba(232,221,214,0.8)',
                color: confirmClear ? '#dc2626' : '#6B5B52',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmClear ? 'Tap again to confirm' : 'Clear all'}
            </button>
          </div>
        )}

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="rounded-2xl p-10 bg-white/80 backdrop-blur border border-[#E8DDD6]/60 shadow-md text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center bg-[#F3EAD9]">
              <AlertCircle className="w-7 h-7 text-[#9B8A82]" />
            </div>
            <h2 className="font-display text-xl font-semibold text-[#2D2226] mb-2">
              No reports yet
            </h2>
            <p className="font-body text-sm text-[#5C4A42] mb-6 max-w-md mx-auto">
              Once you generate a Pro tutorial for any style, it will appear
              here so you can revisit it instantly.
            </p>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold font-body shadow-md hover:shadow-lg hover:brightness-110 transition-all"
              style={{
                background:
                  'linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)',
              }}
            >
              <Sparkles className="w-4 h-4" />
              Analyze My Face
            </Link>
          </div>
        )}

        {/* History list */}
        {entries.length > 0 && (
          <div className="space-y-4">
            {entries.map((entry) => {
              const colors = STYLE_COLORS[entry.styleId] || {
                from: '#8E9CC3',
                to: '#B8C4E0',
              };
              const hasCached = getCachedTutorial(entry.styleId) !== null;

              return (
                <div
                  key={entry.id}
                  className="group rounded-2xl bg-white/85 backdrop-blur border border-[#E8DDD6]/60 shadow-sm hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="flex items-stretch">
                    {/* Color accent bar */}
                    <div
                      className="w-2 flex-shrink-0"
                      style={{
                        background: `linear-gradient(180deg, ${colors.from}, ${colors.to})`,
                      }}
                    />

                    {/* Content */}
                    <div className="flex-1 p-5 sm:p-6 flex items-center gap-4">
                      {/* Thumbnail or style icon */}
                      {entry.thumbnail ? (
                        <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden shadow-sm border-2" style={{ borderColor: colors.from }}>
                          <img
                            src={entry.thumbnail}
                            alt={entry.styleName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                          }}
                        >
                          <Gem className="w-5 h-5 text-white" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg font-semibold text-[#2D2226] truncate">
                          {entry.styleName ||
                            STYLE_DISPLAY[entry.styleId] ||
                            entry.styleId}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          <span className="inline-flex items-center gap-1 font-body text-xs text-[#9B8A82]">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.generatedAt)}
                          </span>
                          {entry.faceShape && (
                            <span className="font-body text-xs text-[#8E9CC3]">
                              {entry.faceShape} face
                            </span>
                          )}
                          {entry.score != null && (
                            <span className="font-body text-xs text-[#C9A96E]">
                              {Math.round(entry.score)}% match
                            </span>
                          )}
                          {entry.subStyleCount > 0 && (
                            <span className="font-body text-xs text-[#6B5B52]">
                              {entry.subStyleCount} sub-styles
                            </span>
                          )}
                        </div>
                        {!hasCached && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-body font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Cache expired — will regenerate
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 rounded-full text-[#9B8A82] hover:text-red-500 hover:bg-red-50 transition-colors !bg-transparent"
                          title="Remove from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenCached(entry)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold font-body shadow-sm hover:shadow-md hover:brightness-110 transition-all"
                          style={{
                            background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                          }}
                        >
                          {hasCached ? 'View' : 'Regenerate'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        {entries.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-semibold font-body shadow-md hover:shadow-lg hover:brightness-110 transition-all"
              style={{
                background:
                  'linear-gradient(135deg, #B8706A 0%, #8E9CC3 50%, #C9A96E 100%)',
              }}
            >
              <Sparkles className="w-4 h-4" />
              Generate a New Report
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}