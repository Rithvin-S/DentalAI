import type { ScreeningResponse } from '../types/screening';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface PublicConfig {
  project: string;
  max_file_size_bytes: number;
  max_file_size_mb: number;
  allowed_extensions: string[];
  allowed_mime_types: string[];
  ai_provider: string;
  version: string;
}

export async function fetchConfigInfo(): Promise<PublicConfig> {
  try {
    const res = await fetch(`${API_BASE_URL}/screenings/config-info`);
    if (!res.ok) {
      throw new Error(`Failed to load server config: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Backend config-info unavailable, using default client config', err);
    return {
      project: 'DentalAI',
      max_file_size_bytes: 10 * 1024 * 1024,
      max_file_size_mb: 10,
      allowed_extensions: ['.jpg', '.jpeg', '.png', '.webp'],
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
      ai_provider: 'auto',
      version: '1.0.0'
    };
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitScreeningAnalysis(
  frontFile: File,
  upperFile: File,
  lowerFile: File,
  consentAcknowledged: boolean,
  scenario?: string
): Promise<ScreeningResponse> {
  const formData = new FormData();
  formData.append('front_image', frontFile);
  formData.append('upper_image', upperFile);
  formData.append('lower_image', lowerFile);
  formData.append('consent_acknowledged', consentAcknowledged ? 'true' : 'false');

  let url = `${API_BASE_URL}/screenings/analyze`;
  if (scenario && scenario !== 'default') {
    url += `?scenario=${encodeURIComponent(scenario)}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = 'Failed to submit screening.';
    try {
      const errData = await response.json();
      errorMsg = errData.detail || errData.message || errorMsg;
    } catch {
      errorMsg = `Server error (${response.status}): ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}
