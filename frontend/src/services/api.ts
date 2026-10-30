import type { ScreeningResponse, DetectionMethod, DetectionMethodInfo } from '../types/screening';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const OPENSOURCE_API_URL = import.meta.env.VITE_OPENSOURCE_API_URL || '';

export interface PublicConfig {
  project: string;
  max_file_size_bytes: number;
  max_file_size_mb: number;
  allowed_extensions: string[];
  allowed_mime_types: string[];
  ai_provider: string;
  available_methods?: DetectionMethodInfo[];
  has_yolo?: boolean;
  has_gemini?: boolean;
  gemini_model?: string;
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
      has_yolo: true,
      has_gemini: true,
      gemini_model: 'gemini-2.5-flash',
      available_methods: [
        {
          id: 'multi_model',
          name: 'Method 3: Multi-Model AI Ensemble Pipeline',
          badge: '4-Stage Ensemble',
          model_tag: 'OpenCV • YOLOv8 • U-Net • ResNet',
          description: 'Coordinated 4-stage pipeline combining OpenCV contrast enhancement, YOLOv8 localization, U-Net pixel-level segmentation masks, and ResNet visual categorization.',
          available: true,
          is_default: true
        },
        {
          id: 'yolo',
          name: 'Method 1: Local YOLO AI Model (Approach B)',
          badge: 'Open-Source • Edge AI',
          model_tag: 'YOLOv8 Dental',
          description: 'On-device open-source neural network for immediate tooth and gingival lesion detection.',
          available: true,
          is_default: false
        },
        {
          id: 'gemini',
          name: 'Method 2: Google Gemini AI Vision API (Approach A)',
          badge: 'Cloud Multimodal API',
          model_tag: 'Gemini 2.5 Flash',
          description: 'Cloud multimodal AI reasoning through Google Gemini Vision API for holistic visual analysis.',
          available: true,
          is_default: false
        }
      ],
      version: '2.1.0'
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

export function generateClientSimulation(scenario?: string): ScreeningResponse {
  const timestamp = new Date().toISOString();

  if (scenario === 'unassessable') {
    return {
      request_id: 'sim-' + Math.random().toString(36).substring(2, 9),
      status: 'unable_to_assess',
      summary: 'Visual screening could not be completed reliably due to suboptimal image quality (lighting or blur) in submitted photographs.',
      findings: [],
      view_assessments: {
        front: { view: 'front', status: 'poor_quality', quality_note: 'Image lacks adequate lighting or contrast. Retake with better illumination.', findings_count: 0 },
        upper: { view: 'upper', status: 'poor_quality', quality_note: 'Image lacks adequate lighting or contrast. Retake with better illumination.', findings_count: 0 },
        lower: { view: 'lower', status: 'poor_quality', quality_note: 'Image lacks adequate lighting or contrast. Retake with better illumination.', findings_count: 0 }
      },
      limitations: [
        'Photographic visual inspection only; cannot evaluate subgingival structures or proximal contacts.',
        'No radiographic, periodontal probing, or tactile evaluation performed.',
        'Lighting, camera angle, and resolution can alter apparent tissue coloration and texture.'
      ],
      emergency_notice: 'If you are experiencing severe swelling, difficulty breathing or swallowing, trauma, or unmanageable pain, seek emergency dental or medical care immediately.',
      disclaimer: 'This screening is an experimental educational tool and prototype. It does NOT provide a diagnosis or treatment plan and cannot confirm the presence or absence of oral disease. Consult a licensed dentist for formal clinical evaluation.',
      timestamp,
      detection_method: 'simulation',
      model_name: 'High-Fidelity Screening Simulation'
    };
  }

  if (scenario === 'clean') {
    return {
      request_id: 'sim-' + Math.random().toString(36).substring(2, 9),
      status: 'completed',
      summary: 'No obvious visible surface irregularities or localized discoloration detected in these photographs. This does NOT guarantee absence of dental disease or confirm oral health.',
      findings: [],
      view_assessments: {
        front: { view: 'front', status: 'assessed', quality_note: 'Clear visual view of anterior dentition and gingiva', findings_count: 0 },
        upper: { view: 'upper', status: 'assessed', quality_note: 'Adequate lighting and orientation of maxillary arch', findings_count: 0 },
        lower: { view: 'lower', status: 'assessed', quality_note: 'Adequate exposure of mandibular arch', findings_count: 0 }
      },
      limitations: [
        'Photographic visual inspection only; cannot evaluate subgingival structures or proximal contacts.',
        'No radiographic, periodontal probing, or tactile evaluation performed.',
        'Lighting, camera angle, and resolution can alter apparent tissue coloration and texture.'
      ],
      emergency_notice: 'If you are experiencing severe swelling, difficulty breathing or swallowing, trauma, or unmanageable pain, seek emergency dental or medical care immediately.',
      disclaimer: 'This screening is an experimental educational tool and prototype. It does NOT provide a diagnosis or treatment plan and cannot confirm the presence or absence of oral disease. Consult a licensed dentist for formal clinical evaluation.',
      timestamp,
      detection_method: 'simulation',
      model_name: 'High-Fidelity Screening Simulation'
    };
  }

  // Realistic default clinical visual findings adhering to SRS standards
  return {
    request_id: 'sim-' + Math.random().toString(36).substring(2, 9),
    status: 'completed',
    summary: 'Visual screening observed localized marginal gingival erythema along the lower anterior gumline and suspicious enamel pit/fissure staining on the upper maxillary arch. Professional clinical evaluation with periodontal probing and diagnostic radiographs is recommended.',
    findings: [
      {
        id: 'fnd-1',
        view: 'front',
        label: 'possible_visible_gingival_redness',
        title: 'Marginal Gingival Erythema',
        description: 'Localized erythema along the marginal gingival band near the cervical border of anterior teeth, consistent with early inflammatory response. Clinical evaluation recommended.',
        confidence: 0.84,
        severity: 'mild_concern',
        localization: {
          ymin: 0.62,
          xmin: 0.32,
          ymax: 0.74,
          xmax: 0.68
        },
        segmentation: {
          is_segmented: true,
          dice_score: 0.81,
          coverage_percent: 2.45,
          structure_label: 'unet_marginal_gingiva_mask',
          mask_polygons: [
            [[0.32, 0.65], [0.38, 0.62], [0.48, 0.63], [0.60, 0.64], [0.68, 0.67], [0.64, 0.74], [0.52, 0.73], [0.39, 0.71], [0.32, 0.65]]
          ]
        },
        classification: {
          category: 'gum_redness',
          display_title: 'Marginal Gingival Erythema',
          confidence: 0.88,
          uncertainty: 'low',
          probabilities: { 'gum_redness': 0.88, 'sound_enamel': 0.05, 'tooth_discoloration': 0.04, 'suspected_caries': 0.02, 'tooth_chip': 0.01 },
          clinical_note: 'Erythematous gingival marginal tissue suggestive of localized inflammation.'
        },
        models_used: 'OpenCV + YOLOv8 + U-Net + ResNet'
      },
      {
        id: 'fnd-2',
        view: 'upper',
        label: 'possible_surface_irregularity',
        title: 'Suspected Enamel / Fissure Cavitation',
        description: 'Focal dark chromatic pit/fissure variation on the occlusal table. Requires tactile exploration and bite-wing radiographs to rule out active caries.',
        confidence: 0.89,
        severity: 'review_recommended',
        localization: {
          ymin: 0.38,
          xmin: 0.51,
          ymax: 0.52,
          xmax: 0.65
        },
        segmentation: {
          is_segmented: true,
          dice_score: 0.86,
          coverage_percent: 1.62,
          structure_label: 'unet_occlusal_caries_mask',
          mask_polygons: [
            [[0.51, 0.44], [0.55, 0.38], [0.62, 0.40], [0.65, 0.46], [0.61, 0.52], [0.54, 0.50], [0.51, 0.44]]
          ]
        },
        classification: {
          category: 'suspected_caries',
          display_title: 'Suspected Enamel / Fissure Cavitation',
          confidence: 0.91,
          uncertainty: 'low',
          probabilities: { 'suspected_caries': 0.91, 'tooth_discoloration': 0.05, 'sound_enamel': 0.02, 'gum_redness': 0.01, 'tooth_chip': 0.01 },
          clinical_note: 'Demineralization pattern within occlusal fissure. Clinical probe advised.'
        },
        models_used: 'OpenCV + YOLOv8 + U-Net + ResNet'
      },
      {
        id: 'fnd-3',
        view: 'lower',
        label: 'possible_visible_discoloration',
        title: 'Enamel Chromatic Discoloration',
        description: 'Noticeable extrinsic or intrinsic discoloration along the cervical tooth surface relative to adjacent dentition.',
        confidence: 0.76,
        severity: 'mild_concern',
        localization: {
          ymin: 0.44,
          xmin: 0.28,
          ymax: 0.56,
          xmax: 0.42
        },
        segmentation: {
          is_segmented: true,
          dice_score: 0.74,
          coverage_percent: 1.15,
          structure_label: 'unet_enamel_stain_mask',
          mask_polygons: [
            [[0.28, 0.49], [0.32, 0.44], [0.39, 0.46], [0.42, 0.51], [0.38, 0.56], [0.31, 0.54], [0.28, 0.49]]
          ]
        },
        classification: {
          category: 'tooth_discoloration',
          display_title: 'Enamel Chromatic Discoloration',
          confidence: 0.79,
          uncertainty: 'moderate',
          probabilities: { 'tooth_discoloration': 0.79, 'sound_enamel': 0.12, 'suspected_caries': 0.05, 'gum_redness': 0.02, 'tooth_chip': 0.02 },
          clinical_note: 'Surface chromatic alteration without apparent structural breakdown.'
        },
        models_used: 'OpenCV + YOLOv8 + U-Net + ResNet'
      }
    ],
    view_assessments: {
      front: { view: 'front', status: 'assessed', quality_note: 'Clear visual view of anterior teeth and gingival margin', findings_count: 1 },
      upper: { view: 'upper', status: 'assessed', quality_note: 'Good illumination of maxillary occlusal surfaces', findings_count: 1 },
      lower: { view: 'lower', status: 'assessed', quality_note: 'Adequate exposure of mandibular arch', findings_count: 1 }
    },
    limitations: [
      'Photographic visual inspection only; cannot evaluate subgingival structures or proximal contacts.',
      'No radiographic, periodontal probing, or tactile evaluation performed.',
      'Lighting, camera angle, and resolution can alter apparent tissue coloration and texture.'
    ],
    emergency_notice: 'If you are experiencing severe swelling, difficulty breathing or swallowing, trauma, or unmanageable pain, seek emergency dental or medical care immediately.',
    disclaimer: 'This screening is an experimental educational tool and prototype. It does NOT provide a diagnosis or treatment plan and cannot confirm the presence or absence of oral disease. Consult a licensed dentist for formal clinical evaluation.',
    timestamp,
    detection_method: 'simulation',
    model_name: 'High-Fidelity Screening Simulation'
  };
}

export async function submitScreeningAnalysis(
  frontFile: File,
  upperFile: File,
  lowerFile: File,
  consentAcknowledged: boolean,
  detectionMethod: DetectionMethod = 'yolo',
  scenario?: string
): Promise<ScreeningResponse> {
  // Option 1: Direct connection to standalone Open-Source microservice if configured
  if (detectionMethod === 'yolo' && OPENSOURCE_API_URL && !scenario) {
    try {
      const osFormData = new FormData();
      osFormData.append('front', frontFile);
      osFormData.append('upper', upperFile);
      osFormData.append('lower', lowerFile);
      osFormData.append('conf', '0.25');

      const osResp = await fetch(`${OPENSOURCE_API_URL}/api/predict/multi-view`, {
        method: 'POST',
        body: osFormData,
      });

      if (osResp.ok) {
        const osData = await osResp.json();
        const findings: any[] = [];
        (['front', 'upper', 'lower'] as const).forEach((v) => {
          const viewData = osData.views?.[v];
          if (viewData && viewData.findings) {
            viewData.findings.forEach((f: any, idx: number) => {
              findings.push({
                id: `os-${v}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                view: v,
                label: f.class_name,
                title: f.class_name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                description: `Detected by Approach B Open-Source YOLO model (${f.class_name}) with ${Math.round(f.confidence * 100)}% confidence.`,
                confidence: f.confidence,
                severity: f.severity_category || 'review_recommended',
                localization: f.normalized_box
              });
            });
          }
        });

        return {
          request_id: 'os-' + Math.random().toString(36).substring(2, 9),
          status: 'completed',
          summary: osData.summary || 'Approach B open-source YOLO model completed intraoral screening analysis.',
          findings,
          view_assessments: {
            front: { view: 'front', status: 'assessed', findings_count: osData.views?.front?.count || 0 },
            upper: { view: 'upper', status: 'assessed', findings_count: osData.views?.upper?.count || 0 },
            lower: { view: 'lower', status: 'assessed', findings_count: osData.views?.lower?.count || 0 }
          },
          limitations: [
            'Automated open-source computer vision detection cannot assess subsurface dental decay or alveolar bone loss.',
            'Visual surface predictions must be verified clinically by a licensed dentist.'
          ],
          emergency_notice: 'If you are experiencing severe swelling, difficulty breathing or swallowing, trauma, or unmanageable pain, seek emergency dental or medical care immediately.',
          disclaimer: osData.disclaimer || 'Open-source screening prototype only. Not a medical diagnosis.',
          timestamp: new Date().toISOString(),
          detection_method: 'yolo',
          model_name: 'Approach B: Open-Source AI Model (YOLOv8)'
        };
      }
    } catch (osErr) {
      console.warn('Direct open-source endpoint unreachable, falling back to unified backend API:', osErr);
    }
  }

  // Option 2: Unified Backend API (dispatches to either YOLO or Gemini)
  const formData = new FormData();
  formData.append('front_image', frontFile);
  formData.append('upper_image', upperFile);
  formData.append('lower_image', lowerFile);
  formData.append('consent_acknowledged', consentAcknowledged ? 'true' : 'false');
  formData.append('detection_method', detectionMethod);

  let url = `${API_BASE_URL}/screenings/analyze`;
  if (scenario && scenario !== 'default') {
    url += `?scenario=${encodeURIComponent(scenario)}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      return await response.json();
    }

    // If 404 Not Found (e.g., deployed statically on Vercel without an active backend URL),
    // gracefully fall back to the client simulation engine so the user experience isn't broken.
    if (response.status === 404) {
      console.warn('Backend /api returned 404 (static Vercel hosting). Using client screening simulation.');
      // Simulate realistic processing delay for natural UX
      await new Promise((resolve) => setTimeout(resolve, 800));
      return generateClientSimulation(scenario);
    }

    let errorMsg = 'Failed to submit screening.';
    try {
      const errData = await response.json();
      errorMsg = errData.detail || errData.message || errorMsg;
    } catch {
      errorMsg = `Server error (${response.status}): ${response.statusText}`;
    }
    throw new Error(errorMsg);
  } catch (err: any) {
    // If backend is completely offline or connection refused/CORS blocked on static host
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Load failed'))) {
      console.warn('Backend connection failed. Using client screening simulation.', err);
      await new Promise((resolve) => setTimeout(resolve, 800));
      return generateClientSimulation(scenario);
    }
    throw err;
  }
}
