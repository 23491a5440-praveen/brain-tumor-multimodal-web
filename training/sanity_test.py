import torch
from torch.utils.data import DataLoader
from dataset import SingleModalityBrainDataset
from preprocessing import get_transforms
from model import NeuroScanModel
import traceback

def test():
    data_dir = r"C:\Users\prave\Downloads\data sheet ct & mri\Dataset"
    
    try:
        print("\n--- 1. Initializing Datasets ---")
        ct_dataset = SingleModalityBrainDataset(data_dir=data_dir, modality="ct", transform=get_transforms())
        mri_dataset = SingleModalityBrainDataset(data_dir=data_dir, modality="mri", transform=get_transforms())
        
        print("\n--- 2. Verifying Data Loaders & Preprocessing ---")
        ct_loader = DataLoader(ct_dataset, batch_size=2, shuffle=True)
        mri_loader = DataLoader(mri_dataset, batch_size=2, shuffle=True)
        
        ct_batch_imgs, ct_batch_labels = next(iter(ct_loader))
        mri_batch_imgs, mri_batch_labels = next(iter(mri_loader))
        
        print(f"CT Batch shape: {ct_batch_imgs.shape}, Labels: {ct_batch_labels}")
        print(f"MRI Batch shape: {mri_batch_imgs.shape}, Labels: {mri_batch_labels}")

        print("\n--- 3. Initializing Model ---")
        model = NeuroScanModel(num_classes=2)
        model.eval()

        # Create hooks to capture the 512-D and 1024-D shapes
        shapes = {}
        def ct_hook(module, input, output): shapes['ct_features'] = output.shape
        def mri_hook(module, input, output): shapes['mri_features'] = output.shape
        def mlp_hook(module, input): shapes['fused_features_input'] = input[0].shape
        
        model.ct_branch.register_forward_hook(ct_hook)
        model.mri_branch.register_forward_hook(mri_hook)
        model.mlp_head.register_forward_pre_hook(mlp_hook)

        print("\n--- 4. Testing Forward Pass (CT Only) ---")
        with torch.no_grad():
            output_ct = model(ct_images=ct_batch_imgs, mri_images=None)
            print(f"CT Branch Output Shape (512-D expected): {shapes.get('ct_features', 'Hook failed')}")
            print(f"Late Fusion Input Shape to MLP (1024-D expected): {shapes.get('fused_features_input', 'Hook failed')}")
            print(f"Final Output Shape (2 classes expected): {output_ct.shape}")
            
        shapes.clear()
        
        print("\n--- 5. Testing Forward Pass (MRI Only) ---")
        with torch.no_grad():
            output_mri = model(ct_images=None, mri_images=mri_batch_imgs)
            print(f"MRI Branch Output Shape (512-D expected): {shapes.get('mri_features', 'Hook failed')}")
            print(f"Late Fusion Input Shape to MLP (1024-D expected): {shapes.get('fused_features_input', 'Hook failed')}")
            print(f"Final Output Shape (2 classes expected): {output_mri.shape}")

        print("\n[SUCCESS] Sanity Test Complete. All checks passed.")
    except Exception as e:
        print(f"\n[ERROR] Sanity test failed:")
        traceback.print_exc()

if __name__ == "__main__":
    test()
