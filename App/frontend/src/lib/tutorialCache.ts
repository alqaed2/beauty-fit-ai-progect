/**
 * Tutorial Cache & History Manager
 *
 * Stores generated Pro tutorial results in localStorage so users don't
 * have to re-generate on revisit. Also maintains a history log of all
 * generated reports for the History page.
 */

import type { ProTutorialResponse } from './proTutorial';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedTutorial {
  /** Cache key: `${styleId}` */
  styleId: string;
  /** Display name of the style */
  styleName: string;
  /** The full tutorial response */
  tutorial: ProTutorialResponse;
  /** ISO timestamp when this was generated */
  generatedAt: string;
  /** Face shape used for this generation (for display) */
  faceShape?: string;
  /** Match score */
  score?: number;
  /** User's photo (base64 data URI) — stored for re-display */
  userImage?: string;
  /** Stylized image URLs keyed by sub-style name (e.g. "overall", "Romantic Sweet") */
  stylizedImageUrls?: Record<string, string>;
  /** Small thumbnail for history list (resized base64 or first stylized URL) */
  thumbnail?: string;
}

export interface HistoryEntry {
  id: string;
  styleId: string;
  styleName: string;
  generatedAt: string;
  faceShape?: string;
  score?: number;
  /** Number of sub-styles in the tutorial */
  subStyleCount: number;
  /** Recommended sub-style name */
  recommendedSubStyle?: string | null;
  /** Thumbnail URL or small base64 for display in history list */
  thumbnail?: string;
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'beautyfit_tutorial_cache_';
const HISTORY_KEY = 'beautyfit_tutorial_history_v1';

// ---------------------------------------------------------------------------
// Cache Operations
// ---------------------------------------------------------------------------

function cacheKey(styleId: string): string {
  return `${CACHE_PREFIX}${styleId.toLowerCase()}`;
}

/**
 * Save a tutorial result to the cache and add to history.
 */
export function cacheTutorial(params: {
  styleId: string;
  styleName: string;
  tutorial: ProTutorialResponse;
  faceShape?: string;
  score?: number;
  userImage?: string;
  stylizedImageUrls?: Record<string, string>;
}): void {
  const { styleId, styleName, tutorial, faceShape, score, userImage, stylizedImageUrls } = params;
  const now = new Date().toISOString();

  // Create a thumbnail: prefer the "overall" stylized image URL, else first available URL,
  // else fall back to the user's uploaded photo (so history always shows something).
  let thumbnail: string | undefined;
  if (stylizedImageUrls) {
    thumbnail = stylizedImageUrls['overall'] || Object.values(stylizedImageUrls)[0];
  }
  if (!thumbnail && userImage) {
    thumbnail = userImage;
  }

  const cached: CachedTutorial = {
    styleId: styleId.toLowerCase(),
    styleName,
    tutorial,
    generatedAt: now,
    faceShape,
    score,
    userImage,
    stylizedImageUrls,
    thumbnail,
  };

  try {
    localStorage.setItem(cacheKey(styleId), JSON.stringify(cached));
  } catch {
    // localStorage full — try without userImage (it's large)
    const slimCached = { ...cached, userImage: undefined };
    evictOldest(3);
    try {
      localStorage.setItem(cacheKey(styleId), JSON.stringify(slimCached));
    } catch {
      /* give up silently */
    }
  }

  // Add to history
  addToHistory({
    id: `${styleId.toLowerCase()}_${Date.now()}`,
    styleId: styleId.toLowerCase(),
    styleName,
    generatedAt: now,
    faceShape,
    score,
    subStyleCount: tutorial.sub_styles?.length ?? 0,
    recommendedSubStyle: tutorial.recommended_sub_style,
    thumbnail,
  });
}

/**
 * Update the cached stylized image URLs for a given style (called after stylization completes).
 */
export function updateCachedStylizedUrls(styleId: string, urls: Record<string, string>): void {
  try {
    const raw = localStorage.getItem(cacheKey(styleId));
    if (!raw) return;
    const cached: CachedTutorial = JSON.parse(raw);
    cached.stylizedImageUrls = { ...cached.stylizedImageUrls, ...urls };
    // Update thumbnail if we now have an overall image
    if (urls['overall']) {
      cached.thumbnail = urls['overall'];
    } else if (!cached.thumbnail && Object.values(urls)[0]) {
      cached.thumbnail = Object.values(urls)[0];
    }
    localStorage.setItem(cacheKey(styleId), JSON.stringify(cached));

    // Also update history entry thumbnail
    const history = getHistoryRaw();
    const entry = history.find((h) => h.styleId === styleId.toLowerCase());
    if (entry && !entry.thumbnail && cached.thumbnail) {
      entry.thumbnail = cached.thumbnail;
      saveHistory(history);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Retrieve a cached tutorial for a given style.
 * Returns null if not found or expired (older than 7 days).
 */
export function getCachedTutorial(styleId: string): CachedTutorial | null {
  try {
    const raw = localStorage.getItem(cacheKey(styleId));
    if (!raw) return null;
    const cached: CachedTutorial = JSON.parse(raw);

    // Expire after 7 days
    const age = Date.now() - new Date(cached.generatedAt).getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    if (age > SEVEN_DAYS) {
      localStorage.removeItem(cacheKey(styleId));
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

/**
 * Check if a cached tutorial exists (without parsing the full object).
 */
export function hasCachedTutorial(styleId: string): boolean {
  try {
    return localStorage.getItem(cacheKey(styleId)) !== null;
  } catch {
    return false;
  }
}

/**
 * Invalidate (delete) a specific cached tutorial.
 */
export function invalidateCache(styleId: string): void {
  try {
    localStorage.removeItem(cacheKey(styleId));
  } catch {
    /* ignore */
  }
}

/**
 * Clear all cached tutorials.
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX)
    );
    for (const k of keys) {
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// History Operations
// ---------------------------------------------------------------------------

function getHistoryRaw(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // If storage is full, trim to last 20 entries
    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(entries.slice(-20))
      );
    } catch {
      /* give up */
    }
  }
}

function addToHistory(entry: HistoryEntry): void {
  const history = getHistoryRaw();

  // Avoid duplicate entries for same style within 1 minute
  const recent = history.find(
    (h) =>
      h.styleId === entry.styleId &&
      Math.abs(new Date(h.generatedAt).getTime() - new Date(entry.generatedAt).getTime()) < 60_000
  );
  if (recent) return;

  history.push(entry);

  // Keep max 50 entries
  const trimmed = history.slice(-50);
  saveHistory(trimmed);
}

/**
 * Get the full history list, most recent first.
 */
export function getHistory(): HistoryEntry[] {
  return getHistoryRaw().slice().reverse();
}

/**
 * Delete a specific history entry by id.
 */
export function deleteHistoryEntry(id: string): void {
  const history = getHistoryRaw().filter((h) => h.id !== id);
  saveHistory(history);
}

/**
 * Clear all history.
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Evict the N oldest cached tutorials to free space.
 */
function evictOldest(count: number): void {
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(CACHE_PREFIX)
    );
    const entries: Array<{ key: string; time: number }> = [];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw) as CachedTutorial;
          entries.push({ key: k, time: new Date(parsed.generatedAt).getTime() });
        }
      } catch {
        entries.push({ key: k, time: 0 });
      }
    }
    entries.sort((a, b) => a.time - b.time);
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      localStorage.removeItem(entries[i].key);
    }
  } catch {
    /* ignore */
  }
}