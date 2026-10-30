import io
import base64
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import cv2
from PIL import Image


def pil_to_cv2(pil_img: Image.Image) -> np.ndarray:
    """Converts a PIL RGB Image to an OpenCV BGR numpy ndarray."""
    rgb_arr = np.array(pil_img.convert("RGB"))
    return cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)


def cv2_to_pil(cv_img: np.ndarray) -> Image.Image:
    """Converts an OpenCV BGR ndarray to a PIL RGB Image."""
    rgb_arr = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb_arr)


def bytes_to_pil(image_bytes: bytes) -> Image.Image:
    """Decodes raw image bytes into a PIL Image safely."""
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def pil_to_bytes(pil_img: Image.Image, format: str = "JPEG", quality: int = 90) -> bytes:
    """Encodes a PIL Image into bytes."""
    buf = io.BytesIO()
    pil_img.save(buf, format=format, quality=quality)
    return buf.getvalue()


def normalize_coords(
    x1: float, y1: float, x2: float, y2: float, width: int, height: int
) -> Tuple[float, float, float, float]:
    """Converts pixel coords [x1, y1, x2, y2] to normalized [ymin, xmin, ymax, xmax] (0.0 - 1.0)."""
    xmin = max(0.0, min(1.0, float(x1) / max(width, 1)))
    ymin = max(0.0, min(1.0, float(y1) / max(height, 1)))
    xmax = max(0.0, min(1.0, float(x2) / max(width, 1)))
    ymax = max(0.0, min(1.0, float(y2) / max(height, 1)))
    return ymin, xmin, ymax, xmax


def denormalize_coords(
    ymin: float, xmin: float, ymax: float, xmax: float, width: int, height: int
) -> Tuple[int, int, int, int]:
    """Converts normalized coords [ymin, xmin, ymax, xmax] to pixel [x1, y1, x2, y2]."""
    x1 = int(round(xmin * width))
    y1 = int(round(ymin * height))
    x2 = int(round(xmax * width))
    y2 = int(round(ymax * height))
    # Clamping
    x1 = max(0, min(width - 1, x1))
    y1 = max(0, min(height - 1, y1))
    x2 = max(x1 + 1, min(width, x2))
    y2 = max(y1 + 1, min(height, y2))
    return x1, y1, x2, y2


def crop_region_with_padding(
    image: Image.Image,
    ymin: float,
    xmin: float,
    ymax: float,
    xmax: float,
    padding: float = 0.08
) -> Tuple[Image.Image, Tuple[int, int, int, int]]:
    """
    Extracts a region crop from a PIL image given normalized coordinates,
    with an optional contextual margin/padding, safely clamped to image bounds.
    Returns (cropped_image, (pad_x1, pad_y1, pad_x2, pad_y2)).
    """
    w, h = image.size
    box_w = xmax - xmin
    box_h = ymax - ymin

    pad_xmin = max(0.0, xmin - box_w * padding)
    pad_ymin = max(0.0, ymin - box_h * padding)
    pad_xmax = min(1.0, xmax + box_w * padding)
    pad_ymax = min(1.0, ymax + box_h * padding)

    x1, y1, x2, y2 = denormalize_coords(pad_ymin, pad_xmin, pad_ymax, pad_xmax, w, h)
    crop = image.crop((x1, y1, x2, y2))
    return crop, (x1, y1, x2, y2)


def mask_to_normalized_polygons(
    mask_np: np.ndarray,
    origin_x1: int,
    origin_y1: int,
    crop_w: int,
    crop_h: int,
    full_w: int,
    full_h: int,
    tolerance: float = 1.5
) -> List[List[List[float]]]:
    """
    Extracts polygon contours from a binary mask (H, W) and projects them
    back into full-image normalized coordinates [x, y] in [0.0, 1.0].
    """
    if mask_np.dtype != np.uint8:
        mask_np = (mask_np > 0.5).astype(np.uint8) * 255

    contours, _ = cv2.findContours(mask_np, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons: List[List[List[float]]] = []

    for cnt in contours:
        if len(cnt) < 3:
            continue
        # Approximate polygon to reduce point count for frontend SVG rendering
        epsilon = tolerance
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        if len(approx) < 3:
            approx = cnt

        poly_points: List[List[float]] = []
        for pt in approx:
            # pt is shape (1, 2) -> [px_x, px_y] relative to mask crop
            mx = float(pt[0][0])
            my = float(pt[0][1])

            # Scale to crop pixel coordinates
            scale_x = crop_w / max(mask_np.shape[1], 1)
            scale_y = crop_h / max(mask_np.shape[0], 1)
            full_px_x = origin_x1 + mx * scale_x
            full_px_y = origin_y1 + my * scale_y

            # Normalize to [0, 1] relative to original image
            norm_x = round(max(0.0, min(1.0, full_px_x / max(full_w, 1))), 4)
            norm_y = round(max(0.0, min(1.0, full_px_y / max(full_h, 1))), 4)
            poly_points.append([norm_x, norm_y])

        if len(poly_points) >= 3:
            polygons.append(poly_points)

    return polygons


def mask_to_base64_overlay(
    mask_np: np.ndarray,
    color_rgb: Tuple[int, int, int] = (0, 245, 212),
    alpha: int = 150
) -> str:
    """
    Renders a binary mask (H, W) into a base64 encoded PNG data URI
    with transparent background and colored semi-transparent mask pixels.
    """
    h, w = mask_np.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    binary = mask_np > 0.5
    rgba[binary, 0] = color_rgb[0]
    rgba[binary, 1] = color_rgb[1]
    rgba[binary, 2] = color_rgb[2]
    rgba[binary, 3] = alpha

    img = Image.fromarray(rgba, mode="RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def calculate_mask_metrics(mask_np: np.ndarray, total_image_pixels: int) -> Dict[str, Any]:
    """Calculates coverage metrics for a segmentation mask."""
    binary = mask_np > 0.5
    mask_pixels = int(np.sum(binary))
    coverage_ratio = float(mask_pixels) / max(total_image_pixels, 1)
    return {
        "mask_pixel_count": mask_pixels,
        "coverage_ratio": round(coverage_ratio, 5),
        "coverage_percent": round(coverage_ratio * 100, 3)
    }

