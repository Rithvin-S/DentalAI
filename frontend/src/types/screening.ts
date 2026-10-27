export type ViewType = 'front' | 'upper' | 'lower';

export type ScreeningStatusType = 'completed' | 'unable_to_assess' | 'failed';

export interface BoundingBox {
  ymin: number; // 0.0 to 1.0 normalized
  xmin: number; // 0.0 to 1.0 normalized
  ymax: number; // 0.0 to 1.0 normalized
  xmax: number; // 0.0 to 1.0 normalized
}

export interface Finding {
  id: string;
  view: ViewType;
  label: string;
  title: string;
  description: string;
  confidence: number | null;
  severity?: 'mild_concern' | 'moderate_concern' | 'review_recommended' | null;
  localization: BoundingBox | null;
}

export interface ViewAssessment {
  view: ViewType;
  status: 'assessed' | 'unable_to_assess' | 'poor_quality';
  quality_note?: string | null;
  findings_count: number;
}

export interface ScreeningResponse {
  request_id: string;
  status: ScreeningStatusType;
  summary: string;
  findings: Finding[];
  view_assessments: Record<string, ViewAssessment>;
  limitations: string[];
  emergency_notice: string;
  disclaimer: string;
  timestamp: string;
}

export interface ViewUploadState {
  file: File | null;
  previewUrl: string | null;
  dimensions?: { width: number; height: number };
  error: string | null;
}
