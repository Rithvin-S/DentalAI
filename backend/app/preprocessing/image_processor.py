import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Dict, Any, Optional

from app.utils.image_utils import pil_to_cv2, cv2_to_pil


class ImageProcessor:
    """
    OpenCV Dental Image Preprocessing Module.
    Responsible for image validation, colour-safe contrast enhancement (CLAHE on L-channel),
    adaptive edge-preserving denoising, and standardized resolution scaling.
    """

    def __init__(
        self,
        clahe_clip_limit: float = 2.0,
        clahe_tile_grid_size: Tuple[int, int] = (8, 8),
        target_size: Tuple[int, int] = (640, 640)
    ):
        self.clahe = cv2.createCLAHE(
            clipLimit=clahe_clip_limit,
            tileGridSize=clahe_tile_grid_size
        )
        self.target_size = target_size

    def validate_image(self, cv_img: np.ndarray) -> Tuple[bool, Optional[str]]:
        """
        Validates image dimensions, channels, and decodability.
        """
        if cv_img is None:
            return False, "Image array is null or unreadable"
        if len(cv_img.shape) != 3 or cv_img.shape[2] != 3:
            return False, f"Expected 3-channel RGB/BGR image, got shape {cv_img.shape}"
        h, w = cv_img.shape[:2]
        if h < 100 or w < 100:
            return False, f"Image resolution too low ({w}x{h}); minimum 100x100 required"
        aspect_ratio = max(w / h, h / w)
        if aspect_ratio > 4.0:
            return False, f"Extreme aspect ratio ({aspect_ratio:.1f}); standard intraoral photos expected"
        return True, None

    def enhance_contrast_lab(self, cv_img: np.ndarray) -> np.ndarray:
        """
        Applies CLAHE strictly to the Lightness (L) channel in CIE-LAB colour space.
        Preserves A* (green-red) and B* (blue-yellow) channels completely intact,
        ensuring clinical gingival redness and tooth chromatic discoloration are never distorted.
        """
        lab = cv2.cvtColor(cv_img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        enhanced_l = self.clahe.apply(l)
        merged = cv2.merge((enhanced_l, a, b))
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

    def light_denoise(self, cv_img: np.ndarray) -> np.ndarray:
        """
        Applies subtle bilateral filtering to reduce CMOS sensor noise in dark oral cavities
        while strictly preserving sharp tooth margins and enamel fissure borders.
        """
        return cv2.bilateralFilter(cv_img, d=5, sigmaColor=25, sigmaSpace=25)

    def letterbox_resize(
        self,
        cv_img: np.ndarray,
        target_size: Optional[Tuple[int, int]] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Resizes the image to target_size maintaining aspect ratio with letterbox padding.
        Returns padded image and transform metadata for inverse coordinate mapping.
        """
        target_w, target_h = target_size or self.target_size
        h, w = cv_img.shape[:2]

        scale = min(target_w / w, target_h / h)
        new_w = int(round(w * scale))
        new_h = int(round(h * scale))

        resized = cv2.resize(cv_img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        pad_x = (target_w - new_w) // 2
        pad_y = (target_h - new_h) // 2

        canvas = np.full((target_h, target_w, 3), 114, dtype=np.uint8)  # standard YOLO neutral grey
        canvas[pad_y:pad_y + new_h, pad_x:pad_x + new_w] = resized

        metadata = {
            "orig_w": w,
            "orig_h": h,
            "scale": scale,
            "pad_x": pad_x,
            "pad_y": pad_y,
            "target_w": target_w,
            "target_h": target_h
        }
        return canvas, metadata

    def assess_quality(self, cv_img: np.ndarray) -> Dict[str, Any]:
        """
        Computes photometric quality indicators (mean brightness, variance/sharpness, contrast).
        """
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        # Laplacian variance as sharpness score
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        contrast = float(gray.std())

        status = "assessed"
        note = "Adequate illumination and contrast"
        if brightness < 30:
            status = "poor_quality"
            note = "Under-illuminated photographic view; increase intraoral lighting"
        elif brightness > 235:
            status = "poor_quality"
            note = "Severe flash specular blowout / overexposure"
        elif sharpness < 20:
            status = "poor_quality"
            note = "Motion blur or optical defocus detected; retake with stable camera"

        return {
            "status": status,
            "quality_note": note,
            "brightness": round(brightness, 2),
            "sharpness": round(sharpness, 2),
            "contrast": round(contrast, 2)
        }

    def preprocess(
        self,
        image: Image.Image,
        apply_enhancement: bool = True
    ) -> Tuple[np.ndarray, Image.Image, Dict[str, Any]]:
        """
        Main OpenCV preprocessing pipeline:
        1. Convert PIL to CV2 BGR
        2. Validate
        3. Assess quality
        4. Apply CLAHE on L-channel (color-preserving)
        5. Light bilateral denoising
        Returns (preprocessed_bgr_array, preprocessed_pil_image, diagnostic_metadata)
        """
        cv_img = pil_to_cv2(image)
        is_valid, err_msg = self.validate_image(cv_img)
        if not is_valid:
            raise ValueError(f"OpenCV validation failed: {err_msg}")

        quality = self.assess_quality(cv_img)

        # Enhance contrast if not severely overexposed
        if apply_enhancement and quality["brightness"] < 220:
            enhanced = self.enhance_contrast_lab(cv_img)
            denoised = self.light_denoise(enhanced)
        else:
            denoised = cv_img

        pil_processed = cv2_to_pil(denoised)
        quality["preprocessed_resolution"] = f"{denoised.shape[1]}x{denoised.shape[0]}"
        quality["color_space"] = "LAB-Preserved RGB"

        return denoised, pil_processed, quality


image_processor = ImageProcessor()

