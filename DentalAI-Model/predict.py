import sys
from pathlib import Path
from ultralytics import YOLO

def main():
    base_dir = Path(__file__).resolve().parent
    model_path = base_dir / "runs" / "dental" / "baseline" / "weights" / "best.pt"

    if len(sys.argv) > 1:
        image_path = Path(sys.argv[1])
    else:
        # Default sample image
        image_path = Path(r"e:\Dental AI Website\frontend\public\samples\front_sample.jpg")

    if not model_path.exists():
        raise FileNotFoundError(f"Trained model not found at: {model_path}. Please run train.py first.")
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found at: {image_path}")

    print(f"Loading model: {model_path}")
    print(f"Testing on image: {image_path}")

    model = YOLO(str(model_path))
    results = model.predict(
        source=str(image_path),
        conf=0.20,
        imgsz=640,
        save=True,
        project=str(base_dir / "runs" / "predict"),
        name="test_inference",
        exist_ok=True
    )

    detected_findings = []
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls.item())
            confidence = float(box.conf.item())
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            # Also normalized coords
            norm_box = box.xyxyn[0].tolist()
            finding = {
                "label": model.names[class_id],
                "confidence": round(confidence, 3),
                "pixel_box": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                "normalized_box": {
                    "ymin": round(norm_box[1], 4),
                    "xmin": round(norm_box[0], 4),
                    "ymax": round(norm_box[3], 4),
                    "xmax": round(norm_box[2], 4)
                }
            }
            detected_findings.append(finding)
            print(finding)

    print(f"\nTotal findings detected: {len(detected_findings)}")
    print(f"Visualized prediction saved to: {base_dir / 'runs' / 'predict' / 'test_inference'}")

if __name__ == "__main__":
    main()
