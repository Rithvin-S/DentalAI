import os
import sys
import shutil
import zipfile
import yaml
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "dataset"
DATA_YAML_PATH = BASE_DIR / "data.yaml"

def import_zip_dataset(zip_path_str: str):
    zip_path = Path(zip_path_str)
    if not zip_path.exists():
        print(f"Error: File not found at '{zip_path}'")
        return

    print(f"Extracting '{zip_path.name}'...")
    temp_extract = BASE_DIR / "temp_import"
    if temp_extract.exists():
        shutil.rmtree(temp_extract)
    temp_extract.mkdir(parents=True)

    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(temp_extract)

    # Search for data.yaml or train/val/test folders inside extracted content
    found_yamls = list(temp_extract.rglob("*.yaml")) + list(temp_extract.rglob("*.yml"))
    dataset_root = temp_extract

    source_names = {}
    if found_yamls:
        yaml_candidate = found_yamls[0]
        dataset_root = yaml_candidate.parent
        print(f"Found dataset configuration: {yaml_candidate}")
        try:
            with open(yaml_candidate, "r", encoding="utf-8") as yf:
                cfg = yaml.safe_load(yf)
                if isinstance(cfg, dict) and "names" in cfg:
                    source_names = cfg["names"]
                    print(f"Detected classes: {source_names}")
        except Exception as ye:
            print(f"Notice: Could not parse yaml names: {ye}")

    # Standardize directory paths
    # Many Roboflow/Kaggle zips have: train/images, valid/images, test/images
    split_map = {
        "train": ["train", "training"],
        "val": ["val", "valid", "validation"],
        "test": ["test", "testing"]
    }

    # Clean existing dataset folders
    backup_dir = BASE_DIR / "dataset_backup"
    if DATASET_DIR.exists():
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        print(f"Backing up existing dataset to {backup_dir.name}...")
        shutil.copytree(DATASET_DIR, backup_dir)
        shutil.rmtree(DATASET_DIR)

    for split in ["train", "val", "test"]:
        (DATASET_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (DATASET_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    imported_counts = {"train": 0, "val": 0, "test": 0}

    for std_split, aliases in split_map.items():
        src_split_dir = None
        for alias in aliases:
            cand = dataset_root / alias
            if cand.exists() and cand.is_dir():
                src_split_dir = cand
                break

        if src_split_dir is None:
            continue

        # Look for images and labels subdirectories
        img_src = src_split_dir / "images" if (src_split_dir / "images").exists() else src_split_dir
        lbl_src = src_split_dir / "labels" if (src_split_dir / "labels").exists() else src_split_dir

        for img_file in img_src.iterdir():
            if img_file.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                shutil.copy2(img_file, DATASET_DIR / "images" / std_split / img_file.name)
                # Look for corresponding label file
                lbl_name = img_file.stem + ".txt"
                lbl_file = lbl_src / lbl_name
                target_lbl = DATASET_DIR / "labels" / std_split / lbl_name
                if lbl_file.exists():
                    shutil.copy2(lbl_file, target_lbl)
                else:
                    # Empty label file for normal/background image
                    target_lbl.write_text("", encoding="utf-8")
                imported_counts[std_split] += 1

    # Update data.yaml
    final_names = source_names if source_names else {
        0: "suspected_caries",
        1: "gum_redness",
        2: "tooth_discoloration",
        3: "tooth_chip",
        4: "oral_lesion"
    }

    # Ensure integer keys if names is a list
    if isinstance(final_names, list):
        final_names = {idx: name for idx, name in enumerate(final_names)}

    yaml_content = f"""path: {DATASET_DIR.as_posix()}
train: images/train
val: images/val
test: images/test

names:
"""
    for cid, cname in final_names.items():
        yaml_content += f"  {cid}: {cname}\n"

    DATA_YAML_PATH.write_text(yaml_content, encoding="utf-8")

    # Cleanup temp
    shutil.rmtree(temp_extract, ignore_errors=True)

    print("\nDataset imported successfully!")
    print(f"Summary of imported images: {imported_counts}")
    print(f"Updated data.yaml with classes: {final_names}")
    print("\nYou can now retrain the model by running:\n  python train.py")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_dataset.py <path_to_downloaded_dataset.zip>")
        sys.exit(1)
    import_zip_dataset(sys.argv[1])
