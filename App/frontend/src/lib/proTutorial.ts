import axios from 'axios';
import { getAPIBaseURL } from './config';

export interface ProTutorialRequest {
  style: string;
  face_shape?: string;
  eye_tags?: string[];
  facial_tags?: string[];
  metrics?: Record<string, number | string>;
  score?: number;
}

export interface TutorialStep {
  title: string;
  description: string;
  products: string[];
  technique: string;
}

export interface SubStyle {
  name: string;
  summary: string;
  best_for: string;
}

export interface ProTutorialResponse {
  style: string;
  overview: string;
  personalized_analysis: string;
  steps: TutorialStep[];
  sub_styles: SubStyle[];
  recommended_sub_style?: string | null;
  color_palette: string[];
  pro_tips: string[];
  simulation_prompt: string;
}

const httpClient = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90_000,
});

/**
 * Call the backend Pro tutorial endpoint. Requires the user to be
 * authenticated via the Atoms auth system (cookie-based session).
 */
export async function generateProTutorial(
  req: ProTutorialRequest
): Promise<ProTutorialResponse> {
  try {
    const resp = await httpClient.post<ProTutorialResponse>(
      `${getAPIBaseURL()}/api/v1/pro/tutorial`,
      req
    );
    return resp.data;
  } catch (err) {
    const anyErr = err as {
      response?: { status?: number; data?: { detail?: unknown } };
      message?: string;
    };
    if (anyErr.response?.status === 401) {
      throw new Error('AUTH_REQUIRED');
    }
    throw new Error(extractErrorMessage(anyErr));
  }
}

/**
 * Safely turn an arbitrary axios error (including FastAPI's 422 validation
 * error, where `detail` is an array of objects) into a human-readable string.
 */
function extractErrorMessage(anyErr: {
  response?: { status?: number; data?: { detail?: unknown } };
  message?: string;
}): string {
  const detail = anyErr.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object') {
          const obj = d as { msg?: unknown; loc?: unknown };
          const msg = typeof obj.msg === 'string' ? obj.msg : '';
          const loc = Array.isArray(obj.loc) ? obj.loc.join('.') : '';
          return loc ? `${loc}: ${msg}` : msg;
        }
        return '';
      })
      .filter(Boolean);
    if (parts.length) return parts.join('; ');
  }
  if (detail && typeof detail === 'object') {
    try {
      return JSON.stringify(detail);
    } catch {
      /* ignore */
    }
  }
  return anyErr.message || 'Failed to generate Pro tutorial';
}

/**
 * LocalStorage key used to simulate a "Pro subscription" flag. In production
 * this should be replaced with real entitlements from the backend.
 */
const PRO_FLAG_KEY = 'beautyfit_pro_entitlement_v1';

export function hasProEntitlement(): boolean {
  try {
    return localStorage.getItem(PRO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function grantProEntitlement(): void {
  try {
    localStorage.setItem(PRO_FLAG_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function revokeProEntitlement(): void {
  try {
    localStorage.removeItem(PRO_FLAG_KEY);
  } catch {
    /* ignore */
  }
}