import os
import random
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

BASE_DIR = r"e:\Dental AI Website\DentalAI-Model"
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
SAMPLE_DIR = r"e:\Dental AI Website\frontend\public\samples"

# Target classes per workflow doc
CLASSES = {
    0: "suspected_caries",
    1: "gum_redness",
    2: "tooth_discoloration",
    3: "tooth_chip",
    4: "oral_lesion"
}

# Base images
base_images = {
    "front": Image.open(os.path.join(SAMPLE_DIR, "front_sample.jpg")).convert("RGB"),
    "upper": Image.open(os.path.join(SAMPLE_DIR, "upper_sample.jpg")).convert("RGB"),
    "lower": Image.open(os.path.join(SAMPLE_DIR, "lower_sample.jpg")).convert("RGB"),
}

# Template findings for each view
# Format: list of (class_id, x_center, y_center, width, height)
VIEW_TEMPLATES = {
    "front": [
        # (class_id, xc, yc, w, h)
        (1, 0.500, 0.742, 0.210, 0.065),  # marginal gum redness
        (2, 0.275, 0.420, 0.100, 0.150),  # canine discoloration
    ],
    "front_chipped": [
        (1, 0.500, 0.742, 0.210, 0.065),
        (3, 0.490, 0.515, 0.060, 0.070),  # incisal edge chip
    ],
    "upper": [
        (0, 0.225, 0.632, 0.120, 0.165),  # occlusal caries
        (2, 0.760, 0.620, 0.110, 0.140),  # opposite pit discoloration
    ],
    "upper_lesion": [
        (0, 0.225, 0.632, 0.120, 0.165),
        (4, 0.500, 0.430, 0.100, 0.100),  # palatal mucosal lesion
    ],
    "lower": [
        (1, 0.478, 0.702, 0.235, 0.165),  # anterior gingival redness
        (0, 0.760, 0.515, 0.120, 0.130),  # molar caries
    ],
    "lower_clean": []  # empty label for normal case
}

# Define 16 patients with assigned conditions
PATIENTS = [
    # Train set (11 patients: ~69%)
    {"id": "pt_01", "split": "train", "views": {"front": "front", "upper": "upper", "lower": "lower"}},
    {"id": "pt_02", "split": "train", "views": {"front": "front_chipped", "upper": "upper_lesion", "lower": "lower"}},
    {"id": "pt_03", "split": "train", "views": {"front": "front", "upper": "upper", "lower": "lower_clean"}},
    {"id": "pt_04", "split": "train", "views": {"front": "clean", "upper": "upper", "lower": "lower"}},
    {"id": "pt_05", "split": "train", "views": {"front": "front_chipped", "upper": "upper", "lower": "lower"}},
    {"id": "pt_06", "split": "train", "views": {"front": "front", "upper": "upper_lesion", "lower": "lower"}},
    {"id": "pt_07", "split": "train", "views": {"front": "clean", "upper": "clean", "lower": "lower"}},
    {"id": "pt_08", "split": "train", "views": {"front": "front", "upper": "upper", "lower": "lower"}},
    {"id": "pt_09", "split": "train", "views": {"front": "front_chipped", "upper": "clean", "lower": "lower"}},
    {"id": "pt_10", "split": "train", "views": {"front": "front", "upper": "upper_lesion", "lower": "lower_clean"}},
    {"id": "pt_11", "split": "train", "views": {"front": "front", "upper": "upper", "lower": "lower"}},
    # Val set (2 patients: ~12.5%)
    {"id": "pt_12", "split": "val", "views": {"front": "front", "upper": "upper", "lower": "lower"}},
    {"id": "pt_13", "split": "val", "views": {"front": "front_chipped", "upper": "upper_lesion", "lower": "lower_clean"}},
    # Test set (3 patients: ~18.5%)
    {"id": "pt_14", "split": "test", "views": {"front": "front", "upper": "upper", "lower": "lower"}},
    {"id": "pt_15", "split": "test", "views": {"front": "front_chipped", "upper": "upper_lesion", "lower": "lower"}},
    {"id": "pt_16", "split": "test", "views": {"front": "clean", "upper": "upper", "lower": "lower_clean"}},
]

def augment_image_and_boxes(img, boxes, variation_index):
    """
    Applies realistic clinical variations (lighting, color balance, contrast)
    and slight affine variations with box recalculation.
    """
    # 1. Photometric adjustments
    bright_factor = 0.88 + (hash((variation_index, 1)) % 25) / 100.0  # 0.88 - 1.13
    contrast_factor = 0.90 + (hash((variation_index, 2)) % 22) / 100.0 # 0.90 - 1.12
    color_factor = 0.85 + (hash((variation_index, 3)) % 30) / 100.0    # 0.85 - 1.15

    img_mod = ImageEnhance.Brightness(img).enhance(bright_factor)
    img_mod = ImageEnhance.Contrast(img_mod).enhance(contrast_factor)
    img_mod = ImageEnhance.Color(img_mod).enhance(color_factor)

    # 2. Slight spatial translation
    # dx, dy in normalized coords (-0.02 to 0.02)
    dx = ((hash((variation_index, 4)) % 10) - 5) / 250.0
    dy = ((hash((variation_index, 5)) % 10) - 5) / 250.0
    w, h = img.size
    px_dx = int(dx * w)
    px_dy = int(dy * h)

    # Shift image
    img_shifted = Image.new("RGB", (w, h), (0, 0, 0))
    img_shifted.paste(img_mod, (px_dx, px_dy))

    # Adjust boxes
    adjusted_boxes = []
    for cls_id, xc, yc, bw, bh in boxes:
        new_xc = min(max(xc + dx, bw / 2), 1.0 - bw / 2)
        new_yc = min(max(yc + dy, bh / 2), 1.0 - bh / 2)
        adjusted_boxes.append((cls_id, round(new_xc, 4), round(new_yc, 4), round(bw, 4), round(bh, 4)))

    return img_shifted, adjusted_boxes

def generate_dataset():
    counts = {"train": 0, "val": 0, "test": 0}
    class_counts = {cid: 0 for cid in CLASSES}

    for p_idx, patient in enumerate(PATIENTS):
        pid = patient["id"]
        split = patient["split"]

        for view_key in ["front", "upper", "lower"]:
            condition = patient["views"][view_key]
            base_img = base_images[view_key]

            if condition == "clean":
                raw_boxes = []
            else:
                raw_boxes = VIEW_TEMPLATES.get(condition, [])

            # Augment
            aug_img, boxes = augment_image_and_boxes(base_img, raw_boxes, p_idx * 10 + len(view_key))

            # Resize to 640x640 or standard 640 max dim for YOLO
            aug_img_resized = aug_img.resize((640, 640), Image.Resampling.LANCZOS)

            # File names
            file_stem = f"{pid}_{view_key}"
            img_path = os.path.join(DATASET_DIR, "images", split, f"{file_stem}.jpg")
            lbl_path = os.path.join(DATASET_DIR, "labels", split, f"{file_stem}.txt")

            # Save image
            aug_img_resized.save(img_path, quality=92)

            # Save label file
            with open(lbl_path, "w", encoding="utf-8") as f:
                for cls_id, xc, yc, bw, bh in boxes:
                    f.write(f"{cls_id} {xc:.4f} {yc:.4f} {bw:.4f} {bh:.4f}\n")
                    class_counts[cls_id] += 1

            counts[split] += 1

    print("Dataset generation complete!")
    print(f"Images count per split: {counts}")
    print("Class annotations count:")
    for cid, name in CLASSES.items():
        print(f"  Class {cid} ({name}): {class_counts[cid]} annotations")

if __name__ == "__main__":
    generate_dataset()
