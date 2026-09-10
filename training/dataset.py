import os
import glob
from PIL import Image
import torch
from torch.utils.data import Dataset

class SingleModalityBrainDataset(Dataset):
    def __init__(self, data_dir, modality="ct", transform=None):
        """
        Loads either CT or MRI brain scans as a separate dataset.
        Because verified patient-level CT-MRI pairing is unavailable, 
        modalities are handled as independent datasets.
        """
        self.data_dir = data_dir
        self.modality = modality.lower()
        self.transform = transform
        self.samples = [] # List of tuples: (image_path, label)
        
        if self.modality == "ct":
            healthy_dir = os.path.join(data_dir, "Brain Tumor CT scan Images", "Healthy")
            tumor_dir = os.path.join(data_dir, "Brain Tumor CT scan Images", "Tumor")
        elif self.modality == "mri":
            healthy_dir = os.path.join(data_dir, "Brain Tumor MRI images", "Healthy")
            tumor_dir = os.path.join(data_dir, "Brain Tumor MRI images", "Tumor")
        else:
            raise ValueError("Modality must be 'ct' or 'mri'")
            
        # Load Healthy images (Label 0)
        if os.path.exists(healthy_dir):
            for filepath in glob.glob(os.path.join(healthy_dir, "*.*")):
                if filepath.split('.')[-1].lower() in ['jpg', 'jpeg', 'png']:
                    self.samples.append((filepath, 0))
                    
        # Load Tumor images (Label 1)
        if os.path.exists(tumor_dir):
            for filepath in glob.glob(os.path.join(tumor_dir, "*.*")):
                if filepath.split('.')[-1].lower() in ['jpg', 'jpeg', 'png']:
                    self.samples.append((filepath, 1))
                    
        print(f"Initialized {self.modality.upper()} Dataset: Loaded {len(self.samples)} unpaired samples.")
        
    def __len__(self):
        return len(self.samples)
        
    def __getitem__(self, idx):
        """
        Loads a single modality image and its label.
        """
        img_path, label = self.samples[idx]
        
        # Load image and convert to RGB (3 channels) for EfficientNet
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
            
        return image, torch.tensor(label, dtype=torch.long)
