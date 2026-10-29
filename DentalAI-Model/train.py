import os
from pathlib import Path
import torch
from ultralytics import YOLO

def main():
    base_dir = Path(__file__).resolve().parent
    data_yaml = base_dir / "data.yaml"
    project_dir = base_dir / "runs" / "dental"

    # Pretrained YOLO11 nano model
    model = YOLO("yolo11n.pt")
    device = 0 if torch.cuda.is_available() else "cpu"
    print(f"Starting training on device: {device}")

    # Train model fine-tuning on dental dataset
    results = model.train(
        data=str(data_yaml),
        epochs=30,
        imgsz=640,
        batch=4,
        device=device,
        workers=0,  # Windows CPU stability
        patience=10,
        project=str(project_dir),
        name="baseline",
        seed=42,
        plots=True,
        exist_ok=True
    )

    best_pt = project_dir / "baseline" / "weights" / "best.pt"
    if best_pt.exists():
        print(f"\nTraining completed successfully! Best checkpoint saved at: {best_pt}")
    else:
        print(f"\nTraining finished. Check run folder: {project_dir / 'baseline'}")

if __name__ == "__main__":
    main()
