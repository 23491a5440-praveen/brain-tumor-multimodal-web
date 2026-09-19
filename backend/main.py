import sys
import base64
import io
import numpy as np
from pathlib import Path
import gc

import torch
import torch.nn.functional as F

torch.set_num_threads(1)
torch.set_num_interop_threads(1)
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from torchvision import transforms

# Allow importing the trained model
PROJECT_DIR = Path(__file__).resolve().parent.parent
TRAINING_DIR = PROJECT_DIR / "training"
sys.path.insert(0, str(TRAINING_DIR))

from model import NeuroScanModel


app = FastAPI(title="NeuroScan AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = PROJECT_DIR / "models" / "best_model.pth"

device = torch.device("cpu")

model = NeuroScanModel(num_classes=2)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.to(device)
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


def prepare_image(data: bytes):
    try:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        return transform(image).unsqueeze(0).to(device)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        
        self.handle_forward = self.target_layer.register_forward_hook(self.save_activation)
        self.handle_backward = self.target_layer.register_full_backward_hook(self.save_gradient)
        
    def save_activation(self, module, input, output):
        self.activations = output
        
    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]
        
    def remove(self):
        self.handle_forward.remove()
        self.handle_backward.remove()
        
    def generate(self):
        if self.gradients is None or self.activations is None:
            return None
        
        weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = cam - torch.min(cam)
        if torch.max(cam) != 0:
            cam = cam / torch.max(cam)
        
        cam = F.interpolate(cam, size=(224, 224), mode='bilinear', align_corners=False)
        return cam.squeeze().cpu().detach().numpy()

def apply_colormap_and_encode(heatmap, original_image_tensor):
    h = heatmap.astype(float)
    r = np.clip(1.5 - np.abs(4 * h - 3), 0, 1)
    g = np.clip(1.5 - np.abs(4 * h - 2), 0, 1)
    b = np.clip(1.5 - np.abs(4 * h - 1), 0, 1)
    colormap_img = np.stack([r, g, b], axis=-1)
    
    mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1).to(original_image_tensor.device)
    std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1).to(original_image_tensor.device)
    unnorm_img = original_image_tensor[0] * std + mean
    unnorm_img = unnorm_img.cpu().numpy().transpose(1, 2, 0)
    unnorm_img = np.clip(unnorm_img, 0, 1)
    
    overlay = 0.5 * colormap_img + 0.5 * unnorm_img
    overlay = np.uint8(255 * overlay)
    
    pil_img = Image.fromarray(overlay)
    buffered = io.BytesIO()
    pil_img.save(buffered, format="JPEG", quality=85)
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return f"data:image/jpeg;base64,{img_str}"


@app.get("/")
def root():
    return {"status": "NeuroScan AI backend is running."}


@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": True}


@app.post("/predict")
async def predict(
    ct_image: UploadFile = File(...),
    mri_image: UploadFile = File(...)
):
    if not ct_image.content_type or not ct_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="CT scan must be an image file.")

    if not mri_image.content_type or not mri_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="MRI scan must be an image file.")

    ct_data = await ct_image.read()
    mri_data = await mri_image.read()

    ct_tensor = prepare_image(ct_data)
    mri_tensor = prepare_image(mri_data)

    # Phase 1: Normal Prediction
    with torch.no_grad():
        outputs = model(
            ct_images=ct_tensor,
            mri_images=mri_tensor
        )
        probabilities = torch.softmax(outputs, dim=1)	
        predicted_class = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0, predicted_class].item() * 100

    ct_base64 = None
    mri_base64 = None

    label = "Tumor" if predicted_class == 1 else "Healthy"

    return {
        "status": "success",
        "prediction": label,
        "confidence": round(confidence, 2),
        "message": "AI-assisted prediction generated for research and educational purposes.",
        "explanation": "The prediction is based on learned image features extracted from the uploaded CT and MRI scans using EfficientNet-B0 and combined through late fusion. This result is not a medical diagnosis.",
        "ct_heatmap": ct_base64,
        "mri_heatmap": mri_base64
    }
