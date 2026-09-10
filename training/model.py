import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

class NeuroScanModel(nn.Module):
    def __init__(self, num_classes=2):
        super(NeuroScanModel, self).__init__()
        
        # Branch 1: CT Scan EfficientNet-B0
        self.ct_branch = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        # Replace the classifier head to output a 512-dimensional feature vector
        in_features_ct = self.ct_branch.classifier[1].in_features
        self.ct_branch.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features_ct, 512)
        )
        
        # Branch 2: MRI Scan EfficientNet-B0
        self.mri_branch = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        # Replace the classifier head to output a 512-dimensional feature vector
        in_features_mri = self.mri_branch.classifier[1].in_features
        self.mri_branch.classifier = nn.Sequential(
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(in_features_mri, 512)
        )
        
        # Late Fusion MLP Classification Head
        # Concatenates 512 (CT) + 512 (MRI) = 1024
        self.mlp_head = nn.Sequential(
            nn.Linear(1024, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(512, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(128, num_classes)
        )

    def forward(self, ct_images=None, mri_images=None):
        device = next(self.parameters()).device
        
        # Process CT Branch or zero-impute
        if ct_images is not None:
            batch_size = ct_images.size(0)
            ct_features = self.ct_branch(ct_images)     # Shape: (batch_size, 512)
        else:
            if mri_images is None:
                raise ValueError("At least one modality (CT or MRI) must be provided.")
            batch_size = mri_images.size(0)
            ct_features = torch.zeros(batch_size, 512, device=device)
            
        # Process MRI Branch or zero-impute
        if mri_images is not None:
            mri_features = self.mri_branch(mri_images)  # Shape: (batch_size, 512)
        else:
            mri_features = torch.zeros(batch_size, 512, device=device)
        
        # Late Fusion: Concatenate CT and MRI feature vectors
        fused_features = torch.cat((ct_features, mri_features), dim=1) # Shape: (batch_size, 1024)
        
        # MLP Classification
        output = self.mlp_head(fused_features)
        
        return output
