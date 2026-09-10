import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
import numpy as np
from model import NeuroScanModel
from dataset import SingleModalityBrainDataset
from preprocessing import get_transforms

def set_seed(seed=42):
    """Sets reproducible random seeds for experiments."""
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

def train(args):
    print("Initializing Production-Ready Training Pipeline (Zero-Imputation Strategy)...")
    
    # Configuration
    set_seed(42)
    batch_size = 32
    epochs = 50
    learning_rate = 1e-4
    val_split = 0.2
    data_dir = args.data_dir
    best_model_path = "best_model.pth"
    
    # 1. Device Detection
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using Device: {device}")
    print(f"Dataset Path: {data_dir}")
    
    # DataLoader kwargs for GPU performance
    loader_kwargs = {'num_workers': 2, 'pin_memory': True} if torch.cuda.is_available() else {}
    
    # 2. Datasets & Splitting
    print("Loading and splitting datasets...")
    ct_dataset = SingleModalityBrainDataset(data_dir=data_dir, modality="ct", transform=get_transforms())
    mri_dataset = SingleModalityBrainDataset(data_dir=data_dir, modality="mri", transform=get_transforms())
    
    ct_val_size = int(len(ct_dataset) * val_split)
    ct_train_size = len(ct_dataset) - ct_val_size
    ct_train_dataset, ct_val_dataset = random_split(ct_dataset, [ct_train_size, ct_val_size])
    
    mri_val_size = int(len(mri_dataset) * val_split)
    mri_train_size = len(mri_dataset) - mri_val_size
    mri_train_dataset, mri_val_dataset = random_split(mri_dataset, [mri_train_size, mri_val_size])
    
    # 3. DataLoaders
    ct_train_loader = DataLoader(ct_train_dataset, batch_size=batch_size, shuffle=True, **loader_kwargs)
    ct_val_loader = DataLoader(ct_val_dataset, batch_size=batch_size, shuffle=False, **loader_kwargs)
    
    mri_train_loader = DataLoader(mri_train_dataset, batch_size=batch_size, shuffle=True, **loader_kwargs)
    mri_val_loader = DataLoader(mri_val_dataset, batch_size=batch_size, shuffle=False, **loader_kwargs)
    
    print(f"CT: {len(ct_train_dataset)} Train | {len(ct_val_dataset)} Validation")
    print(f"MRI: {len(mri_train_dataset)} Train | {len(mri_val_dataset)} Validation")
    
    # 4. Model Initialization
    model = NeuroScanModel(num_classes=2).to(device)
    
    # 5. Loss & Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    best_val_loss = float('inf')
    
    # 6. Training Loop
    print("\nStarting Training Loop...")
    for epoch in range(1, epochs + 1):
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0
        
        # 6a. Train on CT batches (Zero-Impute MRI)
        for ct_imgs, labels in ct_train_loader:
            ct_imgs, labels = ct_imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(ct_images=ct_imgs, mri_images=None)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * ct_imgs.size(0)
            _, predicted = torch.max(outputs, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
            
        # 6b. Train on MRI batches (Zero-Impute CT)
        for mri_imgs, labels in mri_train_loader:
            mri_imgs, labels = mri_imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(ct_images=None, mri_images=mri_imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * mri_imgs.size(0)
            _, predicted = torch.max(outputs, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
            
        avg_train_loss = train_loss / train_total
        train_acc = 100.0 * train_correct / train_total
        
        # 7. Validation Loop
        model.eval()
        val_loss, val_correct, val_total = 0.0, 0, 0
        
        with torch.no_grad():
            # Validate on CT
            for ct_imgs, labels in ct_val_loader:
                ct_imgs, labels = ct_imgs.to(device), labels.to(device)
                outputs = model(ct_images=ct_imgs, mri_images=None)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item() * ct_imgs.size(0)
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
                
            # Validate on MRI
            for mri_imgs, labels in mri_val_loader:
                mri_imgs, labels = mri_imgs.to(device), labels.to(device)
                outputs = model(ct_images=None, mri_images=mri_imgs)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item() * mri_imgs.size(0)
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
                
        avg_val_loss = val_loss / val_total
        val_acc = 100.0 * val_correct / val_total
        
        # 8. Epoch Output & Checkpointing
        print(f"Epoch [{epoch}/{epochs}] "
              f"Train Loss: {avg_train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
              f"Val Loss: {avg_val_loss:.4f} | Val Acc: {val_acc:.2f}%")
              
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), best_model_path)
            print(f"   --> Best model saved to {best_model_path} (Val Loss: {best_val_loss:.4f})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NeuroScan AI - Missing Modality Training Loop")
    parser.add_argument("--data_dir", type=str, 
                        default=r"C:\Users\prave\Downloads\data sheet ct & mri\Dataset",
                        help="Path to the dataset directory (e.g. /kaggle/input/dataset-name on Kaggle)")
    
    args = parser.parse_args()
    train(args)
