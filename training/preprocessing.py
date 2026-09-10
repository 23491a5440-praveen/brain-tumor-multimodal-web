from torchvision import transforms

def get_transforms():
    """
    Returns the standard preprocessing pipeline for the multimodal model.
    Applies 224x224 resizing, normalization, and placeholders for denoising.
    """
    return transforms.Compose([
        transforms.Resize((224, 224)),
        # Placeholder for custom denoising transform (e.g., Non-Local Means, Median Filter)
        # CustomDenoiseTransform(),
        transforms.ToTensor(),
        # Standard ImageNet normalization since we use pretrained EfficientNet weights
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
