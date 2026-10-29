from pathlib import Path
from ultralytics import YOLO

def main():
    base_dir = Path(__file__).resolve().parent
    model_path = base_dir / "runs" / "dental" / "baseline" / "weights" / "best.pt"
    data_yaml = base_dir / "data.yaml"

    if not model_path.exists():
        raise FileNotFoundError(f"Model weights not found at: {model_path}. Please run train.py first.")

    model = YOLO(str(model_path))
    metrics = model.val(
        data=str(data_yaml),
        split="test",
        imgsz=640,
        plots=True,
        workers=0
    )

    print("\n--- Test Evaluation Results ---")
    print(f"mAP50:      {metrics.box.map50:.4f}")
    print(f"mAP50-95:   {metrics.box.map:.4f}")
    print(f"Precision:  {metrics.box.mp:.4f}")
    print(f"Recall:     {metrics.box.mr:.4f}")

    print("\nPer-class AP50:")
    for class_id, ap in enumerate(metrics.box.ap50):
        name = model.names.get(class_id, f"Class {class_id}")
        print(f"  {name}: {ap:.4f}")

if __name__ == "__main__":
    main()
