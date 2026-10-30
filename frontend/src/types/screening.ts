export type ViewType = 'front' | 'upper' | 'lower';

export type ScreeningStatusType = 'completed' | 'unable_to_assess' | 'failed';

export type DetectionMethod = 'multi_model' | 'yolo' | 'gemini';

export interface DetectionMethodInfo {
  id: DetectionMethod;
  name: string;
  badge: string;
  model_tag: string;
  description: string;
  available: boolean;
  is_default?: boolean;
}

export interface BoundingBox {
  ymin: number; // 0.0 to 1.0 normalized
  xmin: number; // 0.0 to 1.0 normalized
  ymax: number; // 0.0 to 1.0 normalized
  xmax: number; // 0.0 to 1.0 normalized
}

export interface SegmentationInfo {
  is_segmented: boolean;
  mask_polygons?: number[][][]; // array of polygons, each having [x, y] in 0.0 - 1.0
  mask_base64?: string; // data:image/png;base64,...
  dice_score?: number;
  coverage_ratio?: number;
  coverage_percent?: number;
  structure_label?: string;
}

export interface ClassificationInfo {
  category: string;
  display_title?: string;
  confidence: number;
  uncertainty: 'low' | 'moderate' | 'review_recommended';
  probabilities?: Record<string, number>;
  clinical_note?: string;
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
  segmentation?: SegmentationInfo | null;
  classification?: ClassificationInfo | null;
  models_used?: string | null;
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
  detection_method?: string;
  model_name?: string;
}

export interface ViewUploadState {
  file: File | null;
  previewUrl: string | null;
  dimensions?: { width: number; height: number };
  error: string | null;
}
