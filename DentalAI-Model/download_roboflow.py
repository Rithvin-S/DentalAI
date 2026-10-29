"""
Helper script to download dental datasets directly from Roboflow Universe and auto-import.

Usage:
  python download_roboflow.py --api_key YOUR_KEY [--workspace WS] [--project PROJ] [--version V]

Defaults to public dental caries detection project on Roboflow Universe.
"""

import argparse
import sys
from pathlib import Path
from roboflow import Roboflow

BASE_DIR = Path(__file__).resolve().parent

def main():
    parser = argparse.ArgumentParser(description="Download dental dataset from Roboflow Universe")
    parser.add_argument("--api_key", required=True, help="Your Roboflow API Key (get from https://app.roboflow.com)")
    parser.add_argument("--workspace", default="yolo-v8-training", help="Roboflow workspace name (default: yolo-v8-training)")
    parser.add_argument("--project", default="tooth-caries-1tfry", help="Roboflow project slug (default: tooth-caries-1tfry)")
    parser.add_argument("--version", type=int, default=1, help="Dataset version number (default: 1)")

    args = parser.parse_args()

    print(f"Connecting to Roboflow: {args.workspace}/{args.project} v{args.version}...")
    rf = Roboflow(api_key=args.api_key)
    project = rf.workspace(args.workspace).project(args.project)
    version = project.version(args.version)

    download_dir = BASE_DIR / "roboflow_download"
    dataset = version.download("yolov8", location=str(download_dir))
    print(f"Dataset downloaded to {download_dir}")

    # Auto-import using import_dataset logic
    import import_dataset
    # Look for zip or folder
    zips = list(download_dir.glob("*.zip"))
    if zips:
        import_dataset.import_zip_dataset(str(zips[0]))
    else:
        print(f"Importing directly from {download_dir}...")
        # If extracted folder
        # We can zip it temporarily or import directly
        import zipfile
        temp_zip = BASE_DIR / "temp_roboflow.zip"
        with zipfile.ZipFile(temp_zip, "w") as zf:
            for f in download_dir.rglob("*"):
                if f.is_file():
                    zf.write(f, f.relative_to(download_dir))
        import_dataset.import_zip_dataset(str(temp_zip))
        temp_zip.unlink(missing_ok=True)

    print("\nNext step: Run 'python train.py' to fine-tune YOLO on this dataset!")

if __name__ == "__main__":
    main()
