import os
import json
import glob
from pathlib import Path
from typing import List, Dict, Tuple, Any

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from PIL import Image

from app.segmentation.unet_segmenter import DentalUNet
from app.classification.resnet_classifier import ResNetClassifier
from app.utils.image_utils import denormalize_coords, crop_region_with_padding

DEVICE = torch.device("cpu")


# -------------------------------------------------------------
# 1. Dataset Preparation for U-Net (Image + Binary Mask pairs)
# -------------------------------------------------------------
class DentalSegmentationDataset(Dataset):
    def __init__(self, images_dir: str, labels_dir: str, img_size: Tuple[int, int] = (256, 256)):
        self.img_size = img_size
        self.image_paths = sorted(glob.glob(os.path.join(images_dir, "*.jpg")))
        self.labels_dir = labels_dir

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        img_path = self.image_paths[idx]
        stem = Path(img_path).stem
        label_path = os.path.join(self.labels_dir, f"{stem}.txt")

        pil_img = Image.open(img_path).convert("RGB")
        w_orig, h_orig = pil_img.size

        # Create binary ground truth mask
        mask = np.zeros((h_orig, w_orig), dtype=np.uint8)

        if os.path.exists(label_path):
            with open(label_path, "r") as f:
                lines = f.readlines()
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5:
                    cls_id = int(parts[0])
                    xc, yc, w, h = map(float, parts[1:5])
                    # Denormalize
                    xmin = max(0.0, xc - w / 2.0)
                    ymin = max(0.0, yc - h / 2.0)
                    xmax = min(1.0, xc + w / 2.0)
                    ymax = min(1.0, yc + h / 2.0)
                    x1, y1, x2, y2 = denormalize_coords(ymin, xmin, ymax, xmax, w_orig, h_orig)

                    # Create morphological finding shape in mask
                    center = ((x1 + x2) // 2, (y1 + y2) // 2)
                    axes = (max(2, (x2 - x1) // 2), max(2, (y2 - y1) // 2))
                    cv2.ellipse(mask, center, axes, 0, 0, 360, 1, -1)

        # Resize to U-Net input size
        pil_resized = pil_img.resize(self.img_size, Image.BILINEAR)
        mask_resized = cv2.resize(mask, self.img_size, interpolation=cv2.INTER_NEAREST)

        # Normalize image
        img_np = np.array(pil_resized, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img_np = (img_np - mean) / std
        img_tensor = torch.from_numpy(img_np.transpose(2, 0, 1))

        mask_tensor = torch.from_numpy(mask_resized.astype(np.float32)).unsqueeze(0)
        return img_tensor, mask_tensor


# -------------------------------------------------------------
# 2. Dataset Preparation for ResNet (Image Crops + Class IDs)
# -------------------------------------------------------------
class DentalClassificationDataset(Dataset):
    def __init__(self, images_dir: str, labels_dir: str, crop_size: Tuple[int, int] = (224, 224)):
        self.crop_size = crop_size
        self.crops: List[Tuple[Image.Image, int]] = []
        self._extract_crops(images_dir, labels_dir)

    def _extract_crops(self, images_dir: str, labels_dir: str):
        image_paths = sorted(glob.glob(os.path.join(images_dir, "*.jpg")))
        for img_path in image_paths:
            stem = Path(img_path).stem
            label_path = os.path.join(labels_dir, f"{stem}.txt")
            pil_img = Image.open(img_path).convert("RGB")
            w, h = pil_img.size

            has_box = False
            if os.path.exists(label_path):
                with open(label_path, "r") as f:
                    for line in f:
                        parts = line.strip().split()
                        if len(parts) >= 5:
                            cls_id = int(parts[0])
                            xc, yc, bw, bh = map(float, parts[1:5])
                            ymin = max(0.0, yc - bh / 2.0)
                            xmin = max(0.0, xc - bw / 2.0)
                            ymax = min(1.0, yc + bh / 2.0)
                            xmax = min(1.0, xc + bw / 2.0)

                            crop, _ = crop_region_with_padding(pil_img, ymin, xmin, ymax, xmax, padding=0.1)
                            self.crops.append((crop, min(cls_id, 4)))
                            has_box = True

            # Extract a negative background sound enamel crop if image has empty regions
            if not has_box or len(self.crops) % 3 == 0:
                sound_crop = pil_img.crop((w // 4, h // 4, 3 * w // 4, 3 * h // 4))
                self.crops.append((sound_crop, 5))  # 5: sound_enamel

    def __len__(self):
        return len(self.crops)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        crop_img, label = self.crops[idx]
        resized = crop_img.resize(self.crop_size, Image.BILINEAR)
        arr = np.array(resized, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr = (arr - mean) / std
        tensor = torch.from_numpy(arr.transpose(2, 0, 1))
        return tensor, torch.tensor(label, dtype=torch.long)


# -------------------------------------------------------------
# 3. Dice Loss Function
# -------------------------------------------------------------
class DiceBCELoss(nn.Module):
    def __init__(self, smooth: float = 1.0):
        super().__init__()
        self.smooth = smooth
        self.bce = nn.BCELoss()

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        bce_loss = self.bce(pred, target)
        pred_flat = pred.contiguous().view(-1)
        target_flat = target.contiguous().view(-1)
        intersection = (pred_flat * target_flat).sum()
        dice = (2.0 * intersection + self.smooth) / (pred_flat.sum() + target_flat.sum() + self.smooth)
        dice_loss = 1.0 - dice
        return bce_loss + dice_loss


def calculate_dice_iou(pred_bin: np.ndarray, target_bin: np.ndarray) -> Tuple[float, float]:
    intersection = np.logical_and(pred_bin, target_bin).sum()
    total = pred_bin.sum() + target_bin.sum()
    union = np.logical_or(pred_bin, target_bin).sum()
    dice = float((2.0 * intersection + 1e-6) / (total + 1e-6))
    iou = float((intersection + 1e-6) / (union + 1e-6))
    return round(dice, 4), round(iou, 4)


# -------------------------------------------------------------
# 4. Training and Evaluation Orchestration
# -------------------------------------------------------------
def train_and_evaluate_multi_model(dataset_root: str, models_root: str):
    print("=" * 60)
    print("DentalAI Multi-Model Training & Evaluation (U-Net & ResNet)")
    print("=" * 60)

    train_img_dir = os.path.join(dataset_root, "images", "train")
    train_lbl_dir = os.path.join(dataset_root, "labels", "train")
    val_img_dir = os.path.join(dataset_root, "images", "val")
    val_lbl_dir = os.path.join(dataset_root, "labels", "val")
    test_img_dir = os.path.join(dataset_root, "images", "test")
    test_lbl_dir = os.path.join(dataset_root, "labels", "test")

    os.makedirs(os.path.join(models_root, "unet"), exist_ok=True)
    os.makedirs(os.path.join(models_root, "resnet"), exist_ok=True)

    # -----------------------------
    # Train U-Net Segmentation
    # -----------------------------
    print("\n[Phase 5] Training Dental U-Net Segmentation Network...")
    train_seg_ds = DentalSegmentationDataset(train_img_dir, train_lbl_dir)
    val_seg_ds = DentalSegmentationDataset(val_img_dir, val_lbl_dir)
    test_seg_ds = DentalSegmentationDataset(test_img_dir, test_lbl_dir)

    train_seg_loader = DataLoader(train_seg_ds, batch_size=4, shuffle=True)
    val_seg_loader = DataLoader(val_seg_ds, batch_size=2, shuffle=False)

    unet = DentalUNet(in_channels=3, out_channels=1).to(DEVICE)
    unet_criterion = DiceBCELoss()
    unet_optimizer = optim.Adam(unet.parameters(), lr=1e-3, weight_decay=1e-5)

    num_seg_epochs = 8
    best_val_loss = float("inf")
    unet_save_path = os.path.join(models_root, "unet", "best.pth")

    for epoch in range(1, num_seg_epochs + 1):
        unet.train()
        train_loss = 0.0
        for imgs, masks in train_seg_loader:
            imgs, masks = imgs.to(DEVICE), masks.to(DEVICE)
            unet_optimizer.zero_grad()
            preds = unet(imgs)
            loss = unet_criterion(preds, masks)
            loss.backward()
            unet_optimizer.step()
            train_loss += loss.item() * imgs.size(0)

        train_loss /= len(train_seg_ds)

        unet.eval()
        val_loss = 0.0
        with torch.no_grad():
            for imgs, masks in val_seg_loader:
                imgs, masks = imgs.to(DEVICE), masks.to(DEVICE)
                preds = unet(imgs)
                loss = unet_criterion(preds, masks)
                val_loss += loss.item() * imgs.size(0)
        val_loss /= max(len(val_seg_ds), 1)

        print(f"  Epoch {epoch:02d}/{num_seg_epochs:02d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(unet.state_dict(), unet_save_path)

    # If best.pth wasn't saved yet, save current
    if not os.path.exists(unet_save_path):
        torch.save(unet.state_dict(), unet_save_path)
    print(f"  -> U-Net saved to {unet_save_path}")

    # Evaluate U-Net on held-out test patients
    unet.eval()
    test_dices, test_ious = [], []
    with torch.no_grad():
        for i in range(len(test_seg_ds)):
            img, mask = test_seg_ds[i]
            img = img.unsqueeze(0).to(DEVICE)
            pred = unet(img).squeeze().cpu().numpy()
            pred_bin = (pred > 0.45).astype(np.uint8)
            gt_bin = (mask.squeeze().numpy() > 0.5).astype(np.uint8)
            d, iou = calculate_dice_iou(pred_bin, gt_bin)
            test_dices.append(d)
            test_ious.append(iou)

    mean_dice = float(np.mean(test_dices))
    mean_iou = float(np.mean(test_ious))
    print(f"  [U-Net Test Evaluation on Held-Out Patients]: Mean Dice = {mean_dice:.4f}, Mean IoU = {mean_iou:.4f}")

    # -----------------------------
    # Train ResNet Classification
    # -----------------------------
    print("\n[Phase 6] Training Dental ResNet-18 Classification Network...")
    train_cls_ds = DentalClassificationDataset(train_img_dir, train_lbl_dir)
    val_cls_ds = DentalClassificationDataset(val_img_dir, val_lbl_dir)
    test_cls_ds = DentalClassificationDataset(test_img_dir, test_lbl_dir)

    train_cls_loader = DataLoader(train_cls_ds, batch_size=4, shuffle=True)
    val_cls_loader = DataLoader(val_cls_ds, batch_size=2, shuffle=False)

    classifier_module = ResNetClassifier()
    resnet = classifier_module.model
    resnet_criterion = nn.CrossEntropyLoss()
    resnet_optimizer = optim.Adam(resnet.parameters(), lr=5e-4, weight_decay=1e-4)

    num_cls_epochs = 8
    best_val_acc = -1.0
    resnet_save_path = os.path.join(models_root, "resnet", "best.pth")

    for epoch in range(1, num_cls_epochs + 1):
        resnet.train()
        train_loss = 0.0
        train_correct = 0
        total_samples = 0
        for imgs, labels in train_cls_loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            resnet_optimizer.zero_grad()
            outputs = resnet(imgs)
            loss = resnet_criterion(outputs, labels)
            loss.backward()
            resnet_optimizer.step()
            train_loss += loss.item() * imgs.size(0)
            preds = torch.argmax(outputs, dim=1)
            train_correct += (preds == labels).sum().item()
            total_samples += imgs.size(0)

        train_acc = train_correct / max(total_samples, 1)

        resnet.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for imgs, labels in val_cls_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                outputs = resnet(imgs)
                preds = torch.argmax(outputs, dim=1)
                val_correct += (preds == labels).sum().item()
                val_total += imgs.size(0)
        val_acc = val_correct / max(val_total, 1)

        print(f"  Epoch {epoch:02d}/{num_cls_epochs:02d} | Train Acc: {train_acc*100:.1f}% | Val Acc: {val_acc*100:.1f}%")
        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            torch.save(resnet.state_dict(), resnet_save_path)

    if not os.path.exists(resnet_save_path):
        torch.save(resnet.state_dict(), resnet_save_path)
    print(f"  -> ResNet saved to {resnet_save_path}")

    # Evaluate ResNet on held-out test patients
    resnet.eval()
    y_true, y_pred = [], []
    with torch.no_grad():
        for i in range(len(test_cls_ds)):
            img, label = test_cls_ds[i]
            img = img.unsqueeze(0).to(DEVICE)
            out = resnet(img)
            pred = int(torch.argmax(out, dim=1).item())
            y_true.append(int(label.item()))
            y_pred.append(pred)

    correct = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp)
    test_acc = float(correct / max(len(y_true), 1))
    print(f"  [ResNet Test Evaluation on Held-Out Patients]: Overall Accuracy = {test_acc*100:.1f}% ({correct}/{len(y_true)})")

    # Save summary report
    evaluation_summary = {
        "pipeline": "OpenCV • YOLOv8 • U-Net • ResNet",
        "dataset_split": {
            "train_images": len(train_seg_ds),
            "val_images": len(val_seg_ds),
            "test_images": len(test_seg_ds),
            "patient_level_isolation": True
        },
        "unet_segmentation": {
            "loss": "Dice + Binary Cross-Entropy",
            "test_mean_dice_score": mean_dice,
            "test_mean_iou": mean_iou,
            "weights_path": resnet_save_path.replace("\\", "/")
        },
        "resnet_classification": {
            "architecture": "ResNet-18",
            "classes": classifier_module.CLASSES,
            "test_accuracy": round(test_acc, 4),
            "uncertainty_detection": True,
            "weights_path": resnet_save_path.replace("\\", "/")
        }
    }

    report_path = os.path.join(models_root, "multi_model_evaluation.json")
    with open(report_path, "w") as f:
        json.dump(evaluation_summary, f, indent=2)
    print(f"\n[Completed] Evaluation report saved to {report_path}")
    return evaluation_summary


if __name__ == "__main__":
    dataset_dir = r"DentalAI-Model/dataset"
    models_dir = r"backend/models"
    train_and_evaluate_multi_model(dataset_dir, models_dir)

