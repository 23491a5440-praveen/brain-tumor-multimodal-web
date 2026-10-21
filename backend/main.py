import sys
import base64
import io
import logging
import numpy as np
from pathlib import Path
import gc

import torch
import torch.nn.functional as F

torch.set_num_threads(1)
torch.set_num_interop_threads(1)
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException, Response, status, Header
from fastapi.middleware.cors import CORSMiddleware
from torchvision import transforms

# Allow importing the trained model
PROJECT_DIR = Path(__file__).resolve().parent.parent
TRAINING_DIR = PROJECT_DIR / "training"
sys.path.insert(0, str(TRAINING_DIR))

from model import NeuroScanModel

# Configure backend logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("neuroscan.backend")

app = FastAPI(title="NeuroScan AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = PROJECT_DIR / "models" / "best_model.pth"
EXPERIMENTAL_MODEL_PATH = PROJECT_DIR / "models" / "best_model_finetuned_experiment.pth"

device = torch.device("cpu")
model = None
model_load_error = None
experimental_model = None
experimental_model_load_error = None

def load_model_checkpoint(path: Path) -> NeuroScanModel:
    """Safely loads model weights from a state_dict or wrapped checkpoint dictionary."""
    if not path.exists():
        raise FileNotFoundError(f"Model checkpoint not found at: {path}")

    checkpoint = torch.load(path, map_location=device)
    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        state_dict = checkpoint["model_state_dict"]
    elif isinstance(checkpoint, dict):
        state_dict = checkpoint
    else:
        raise ValueError(f"Unrecognized checkpoint object type: {type(checkpoint)}")

    net = NeuroScanModel(num_classes=2)
    net.load_state_dict(state_dict, strict=True)
    net.to(device)
    net.eval()
    return net

try:
    model = load_model_checkpoint(MODEL_PATH)
    logger.info("Default model loaded successfully from %s", MODEL_PATH.name)
except Exception as e:
    model_load_error = str(e)
    logger.error("Failed to load default model from %s: %s", MODEL_PATH.name, e, exc_info=True)

try:
    if EXPERIMENTAL_MODEL_PATH.exists():
        experimental_model = load_model_checkpoint(EXPERIMENTAL_MODEL_PATH)
        logger.info("Experimental model loaded successfully from %s", EXPERIMENTAL_MODEL_PATH.name)
    else:
        experimental_model_load_error = f"Checkpoint file not found: {EXPERIMENTAL_MODEL_PATH.name}"
        logger.warning("Experimental model checkpoint not found at %s", EXPERIMENTAL_MODEL_PATH)
except Exception as e:
    experimental_model_load_error = str(e)
    logger.warning("Failed to load experimental model from %s: %s", EXPERIMENTAL_MODEL_PATH.name, e, exc_info=True)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])


def prepare_image(data: bytes, modality_name: str = "Image"):
    if not data or len(data) == 0:
        raise HTTPException(status_code=400, detail=f"{modality_name} file is empty (0 bytes).")

    try:
        img_buf = io.BytesIO(data)
        with Image.open(img_buf) as img:
            img.load()  # Decode pixels to catch corrupted or truncated image streams
            rgb_img = img.convert("RGB")
        return transform(rgb_img).unsqueeze(0).to(device)
    except HTTPException:
        raise
    except (Image.UnidentifiedImageError, ValueError):
        raise HTTPException(status_code=400, detail=f"{modality_name} is corrupted or not a valid image file.")
    except Exception as e:
        logger.warning("Error processing %s: %s", modality_name, e)
        raise HTTPException(status_code=400, detail=f"Unable to process {modality_name}: invalid image data.")

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
def health(response: Response):
    if model is None:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unhealthy", "model_loaded": False, "detail": model_load_error}
    return {"status": "healthy", "model_loaded": True}


@app.post("/predict")
async def predict(
    ct_image: UploadFile = File(...),
    mri_image: UploadFile = File(...),
    x_model_variant: str | None = Header(default=None, alias="X-Model-Variant")
):
    is_experimental = bool(x_model_variant and x_model_variant.strip().lower() == "experimental")

    if is_experimental:
        if experimental_model is None:
            logger.error("Experimental prediction rejected: model not loaded (%s)", experimental_model_load_error)
            raise HTTPException(
                status_code=503,
                detail=f"Experimental model is unavailable: {experimental_model_load_error or 'model not loaded'}."
            )
        active_model = experimental_model
    else:
        if model is None:
            logger.error("Prediction rejected: default model not loaded (%s)", model_load_error)
            raise HTTPException(
                status_code=503,
                detail="Inference service is currently unavailable: model is not loaded."
            )
        active_model = model

    if not ct_image.content_type or not ct_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="CT scan must be an image file.")

    if not mri_image.content_type or not mri_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="MRI scan must be an image file.")

    ct_data = await ct_image.read()
    mri_data = await mri_image.read()

    ct_tensor = prepare_image(ct_data, modality_name="CT scan")
    mri_tensor = prepare_image(mri_data, modality_name="MRI scan")

    # Phase 1: Normal Prediction
    with torch.no_grad():
        outputs = active_model(
            ct_images=ct_tensor,
            mri_images=mri_tensor
        )
        probabilities = torch.softmax(outputs, dim=1)
        predicted_class = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0, predicted_class].item() * 100

    ct_base64 = None
    mri_base64 = None

    label = "Tumor" if predicted_class == 1 else "Healthy"

    response_payload = {
        "status": "success",
        "prediction": label,
        "confidence": round(confidence, 2),
        "message": "AI-assisted prediction generated for research and educational purposes.",
        "explanation": "The prediction is based on learned image features extracted from the uploaded CT and MRI scans using EfficientNet-B0 and combined through late fusion. This result is not a medical diagnosis.",
        "ct_heatmap": ct_base64,
        "mri_heatmap": mri_base64
    }
    if is_experimental:
        response_payload["model_variant"] = "experimental"

    return response_payload
