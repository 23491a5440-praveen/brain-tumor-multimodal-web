import sys
import io
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

# Add project root and backend to sys.path
PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))
sys.path.insert(0, str(PROJECT_DIR / "backend"))

import backend.main as main_module
from backend.main import app

client = TestClient(app)

def create_valid_test_jpeg():
    """Generates an in-memory valid RGB JPEG for testing."""
    buf = io.BytesIO()
    img = Image.new("RGB", (64, 64), color=(120, 150, 200))
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()

def run_tests():
    print("=" * 70)
    print("NeuroScan AI API Endpoints & Error Handling Verification Suite")
    print("=" * 70)
    
    valid_jpeg = create_valid_test_jpeg()
    corrupted_jpeg = (PROJECT_DIR / "dummy.jpg").read_bytes() if (PROJECT_DIR / "dummy.jpg").exists() else b"broken_data_123"
    empty_bytes = b""
    
    passed = 0
    total = 0
    
    # Test 1: Root endpoint GET /
    total += 1
    print("\n[Test 1] Testing GET / ...")
    resp = client.get("/")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.json() == {"status": "NeuroScan AI backend is running."}, f"Unexpected response: {resp.json()}"
    print(f" [PASS] GET / returned 200: {resp.json()}")
    passed += 1

    # Test 2: Health endpoint GET /health (Healthy State)
    total += 1
    print("\n[Test 2] Testing GET /health (Healthy State) ...")
    resp = client.get("/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.json() == {"status": "healthy", "model_loaded": True}, f"Unexpected response: {resp.json()}"
    print(f" [PASS] GET /health returned 200: {resp.json()}")
    passed += 1

    # Test 3: POST /predict with valid CT and MRI scans
    total += 1
    print("\n[Test 3] Testing POST /predict with valid scans ...")
    files = {
        "ct_image": ("test_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
        "mri_image": ("test_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    resp = client.post("/predict", files=files)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "success", f"Expected status success, got {data.get('status')}"
    assert data["prediction"] in ["Healthy", "Tumor"], f"Unexpected prediction: {data.get('prediction')}"
    assert isinstance(data["confidence"], (int, float)), "Confidence must be a number"
    assert "explanation" in data and "message" in data, "Missing explanation/message keys"
    assert "ct_heatmap" in data and "mri_heatmap" in data, "Missing heatmap keys"
    print(f" [PASS] POST /predict succeeded with valid response: prediction={data['prediction']}, confidence={data['confidence']}%")
    passed += 1

    # Test 4: POST /predict with Empty (0-byte) CT scan
    total += 1
    print("\n[Test 4] Testing POST /predict with empty (0-byte) CT scan ...")
    files = {
        "ct_image": ("empty_ct.jpg", io.BytesIO(empty_bytes), "image/jpeg"),
        "mri_image": ("valid_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    resp = client.post("/predict", files=files)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "empty" in resp.json()["detail"].lower(), f"Unexpected error detail: {resp.json()}"
    print(f" [PASS] Caught empty CT file: HTTP 400 -> {resp.json()['detail']}")
    passed += 1

    # Test 5: POST /predict with Empty (0-byte) MRI scan
    total += 1
    print("\n[Test 5] Testing POST /predict with empty (0-byte) MRI scan ...")
    files = {
        "ct_image": ("valid_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
        "mri_image": ("empty_mri.jpg", io.BytesIO(empty_bytes), "image/jpeg"),
    }
    resp = client.post("/predict", files=files)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "empty" in resp.json()["detail"].lower(), f"Unexpected error detail: {resp.json()}"
    print(f" [PASS] Caught empty MRI file: HTTP 400 -> {resp.json()['detail']}")
    passed += 1

    # Test 6: POST /predict with Corrupted CT scan
    total += 1
    print("\n[Test 6] Testing POST /predict with corrupted CT scan ...")
    files = {
        "ct_image": ("corrupted_ct.jpg", io.BytesIO(corrupted_jpeg), "image/jpeg"),
        "mri_image": ("valid_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    resp = client.post("/predict", files=files)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "corrupted" in resp.json()["detail"].lower() or "invalid" in resp.json()["detail"].lower(), f"Unexpected error detail: {resp.json()}"
    print(f" [PASS] Caught corrupted CT file: HTTP 400 -> {resp.json()['detail']}")
    passed += 1

    # Test 7: POST /predict with Non-Image MIME type
    total += 1
    print("\n[Test 7] Testing POST /predict with text/plain upload ...")
    files = {
        "ct_image": ("notes.txt", io.BytesIO(b"Hello world"), "text/plain"),
        "mri_image": ("valid_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    resp = client.post("/predict", files=files)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "must be an image file" in resp.json()["detail"].lower(), f"Unexpected error detail: {resp.json()}"
    print(f" [PASS] Caught non-image MIME type: HTTP 400 -> {resp.json()['detail']}")
    passed += 1

    # Test 8A: POST /predict with CT scan only (Single Modality Zero-Imputation)
    total += 1
    print("\n[Test 8A] Testing POST /predict with CT scan only (Single Modality) ...")
    files_ct_only = {
        "ct_image": ("valid_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    resp_ct = client.post("/predict", files=files_ct_only)
    assert resp_ct.status_code == 200, f"Expected 200, got {resp_ct.status_code}: {resp_ct.text}"
    assert resp_ct.json()["status"] == "success"
    print(f" [PASS] CT-only prediction succeeded: prediction={resp_ct.json()['prediction']}, confidence={resp_ct.json()['confidence']}%")
    passed += 1

    # Test 8B: POST /predict with MRI scan only (Single Modality Zero-Imputation)
    total += 1
    print("\n[Test 8B] Testing POST /predict with MRI scan only (Single Modality) ...")
    files_mri_only = {
        "mri_image": ("valid_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    resp_mri = client.post("/predict", files=files_mri_only)
    assert resp_mri.status_code == 200, f"Expected 200, got {resp_mri.status_code}: {resp_mri.text}"
    assert resp_mri.json()["status"] == "success"
    print(f" [PASS] MRI-only prediction succeeded: prediction={resp_mri.json()['prediction']}, confidence={resp_mri.json()['confidence']}%")
    passed += 1

    # Test 8C: POST /predict with neither scan provided
    total += 1
    print("\n[Test 8C] Testing POST /predict with neither scan provided ...")
    resp_none = client.post("/predict", files={})
    assert resp_none.status_code == 400, f"Expected 400, got {resp_none.status_code}: {resp_none.text}"
    assert "at least one" in resp_none.json()["detail"].lower()
    print(f" [PASS] Caught request with neither scan: HTTP 400 -> {resp_none.json()['detail']}")
    passed += 1

    # Test 9: Simulated Model-Loading Failure (Safe In-Memory Simulation)
    total += 1
    print("\n[Test 9] Testing Safe Simulated Model-Loading Failure & State Restoration ...")
    saved_model = main_module.model
    saved_error = main_module.model_load_error
    try:
        # Simulate uninitialized model state
        main_module.model = None
        main_module.model_load_error = "Simulated checkpoint load failure"
        
        # 9a. Verify /health returns 503
        resp_health = client.get("/health")
        assert resp_health.status_code == 503, f"Expected 503, got {resp_health.status_code}"
        assert resp_health.json()["status"] == "unhealthy", f"Expected unhealthy status: {resp_health.json()}"
        print(f" [PASS] Unhealthy GET /health returned 503: {resp_health.json()}")
        
        # 9b. Verify /predict returns 503
        files = {
            "ct_image": ("test_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
            "mri_image": ("test_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
        }
        resp_predict = client.post("/predict", files=files)
        assert resp_predict.status_code == 503, f"Expected 503, got {resp_predict.status_code}"
        assert "unavailable" in resp_predict.json()["detail"].lower(), f"Unexpected detail: {resp_predict.json()}"
        print(f" [PASS] Rejected prediction when model unavailable: HTTP 503 -> {resp_predict.json()['detail']}")
        
    finally:
        # Restore original state
        main_module.model = saved_model
        main_module.model_load_error = saved_error
        
    # Verify state was cleanly restored
    resp_restored = client.get("/health")
    assert resp_restored.status_code == 200, f"Expected 200 after restoration, got {resp_restored.status_code}"
    print(" [PASS] Global model state cleanly restored. GET /health verified back to 200.")
    passed += 1

    # Test 10: POST /predict with X-Model-Variant: experimental
    total += 1
    print("\n[Test 10] Testing POST /predict with X-Model-Variant: experimental ...")
    files = {
        "ct_image": ("test_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
        "mri_image": ("test_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    headers = {"X-Model-Variant": "experimental"}
    resp = client.post("/predict", files=files, headers=headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data_exp = resp.json()
    assert data_exp["status"] == "success", f"Expected success, got {data_exp.get('status')}"
    assert data_exp["prediction"] in ["Healthy", "Tumor"], f"Unexpected prediction: {data_exp.get('prediction')}"
    assert data_exp.get("model_variant") == "experimental", f"Expected model_variant=experimental, got {data_exp.get('model_variant')}"
    print(f" [PASS] Experimental prediction succeeded: prediction={data_exp['prediction']}, confidence={data_exp['confidence']}%, model_variant={data_exp['model_variant']}")
    passed += 1

    # Test 11: POST /predict with X-Model-Variant when experimental model is unavailable (Simulated)
    total += 1
    print("\n[Test 11] Testing POST /predict with X-Model-Variant when experimental model is unavailable ...")
    saved_exp_model = main_module.experimental_model
    saved_exp_error = main_module.experimental_model_load_error
    try:
        main_module.experimental_model = None
        main_module.experimental_model_load_error = "Simulated experimental model missing"

        files = {
            "ct_image": ("test_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
            "mri_image": ("test_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
        }
        resp = client.post("/predict", files=files, headers={"X-Model-Variant": "experimental"})
        assert resp.status_code == 503, f"Expected 503, got {resp.status_code}"
        assert "unavailable" in resp.json()["detail"].lower(), f"Unexpected detail: {resp.json()}"
        print(f" [PASS] Caught unavailable experimental model: HTTP 503 -> {resp.json()['detail']}")
    finally:
        main_module.experimental_model = saved_exp_model
        main_module.experimental_model_load_error = saved_exp_error

    # Verify restoration
    resp_exp_restored = client.post("/predict", files=files, headers={"X-Model-Variant": "experimental"})
    assert resp_exp_restored.status_code == 200, f"Expected 200 after exp restoration, got {resp_exp_restored.status_code}"
    print(" [PASS] Experimental model state cleanly restored. Verified back to HTTP 200.")
    passed += 1

    # Test 12: Verify default requests (no X-Model-Variant header) do not alter schema
    total += 1
    print("\n[Test 12] Testing default request without header to verify schema untouched ...")
    files = {
        "ct_image": ("test_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
        "mri_image": ("test_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    resp_def = client.post("/predict", files=files)
    assert resp_def.status_code == 200, f"Expected 200, got {resp_def.status_code}"
    def_keys = set(resp_def.json().keys())
    expected_keys = {"status", "prediction", "confidence", "message", "explanation", "ct_heatmap", "mri_heatmap"}
    assert def_keys == expected_keys, f"Default keys mismatch: {def_keys} vs {expected_keys}"
    print(" [PASS] Default request without header matches exact 7-field production schema.")
    passed += 1

    # Test 13: POST /predict with X-Model-Variant: fast
    total += 1
    print("\n[Test 13] Testing POST /predict with X-Model-Variant: fast ...")
    files = {
        "ct_image": ("test_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
        "mri_image": ("test_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
    }
    headers_fast = {"X-Model-Variant": "fast"}
    resp_fast = client.post("/predict", files=files, headers=headers_fast)
    assert resp_fast.status_code == 200, f"Expected 200, got {resp_fast.status_code}: {resp_fast.text}"
    data_fast = resp_fast.json()
    assert data_fast["status"] == "success", f"Expected success, got {data_fast.get('status')}"
    assert data_fast["prediction"] in ["Healthy", "Tumor"], f"Unexpected prediction: {data_fast.get('prediction')}"
    assert data_fast.get("model_variant") == "fast", f"Expected model_variant=fast, got {data_fast.get('model_variant')}"
    assert "warning" in data_fast, "Expected warning disclaimer in fast model payload"
    print(f" [PASS] Fast model prediction succeeded: prediction={data_fast['prediction']}, confidence={data_fast['confidence']}%, model_variant={data_fast['model_variant']}")
    print(f"        Advisory warning verified: \"{data_fast['warning']}\"")
    passed += 1

    # Test 14: POST /predict with X-Model-Variant: fast when fast model is unavailable (Simulated)
    total += 1
    print("\n[Test 14] Testing POST /predict with X-Model-Variant: fast when fast model is unavailable ...")
    saved_fast_model = main_module.fast_model
    saved_fast_error = main_module.fast_model_load_error
    try:
        main_module.fast_model = None
        main_module.fast_model_load_error = "Simulated fast model missing"

        files = {
            "ct_image": ("test_ct.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
            "mri_image": ("test_mri.jpg", io.BytesIO(valid_jpeg), "image/jpeg"),
        }
        resp = client.post("/predict", files=files, headers={"X-Model-Variant": "fast"})
        assert resp.status_code == 503, f"Expected 503, got {resp.status_code}"
        assert "unavailable" in resp.json()["detail"].lower(), f"Unexpected detail: {resp.json()}"
        print(f" [PASS] Caught unavailable fast model: HTTP 503 -> {resp.json()['detail']}")
    finally:
        main_module.fast_model = saved_fast_model
        main_module.fast_model_load_error = saved_fast_error

    # Verify restoration
    resp_fast_restored = client.post("/predict", files=files, headers={"X-Model-Variant": "fast"})
    assert resp_fast_restored.status_code == 200, f"Expected 200 after fast restoration, got {resp_fast_restored.status_code}"
    print(" [PASS] Fast model state cleanly restored. Verified back to HTTP 200.")
    passed += 1

    # Test 15: CORS headers for Netlify production origin
    total += 1
    print("\n[Test 15] Testing CORS headers for Netlify origin (https://neuroscan-ai.netlify.app) ...")
    resp_cors_netlify = client.options(
        "/predict",
        headers={
            "Origin": "https://neuroscan-ai.netlify.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    assert resp_cors_netlify.headers.get("access-control-allow-origin") == "https://neuroscan-ai.netlify.app", (
        f"Expected Netlify origin to be allowed, got: {resp_cors_netlify.headers.get('access-control-allow-origin')}"
    )
    print(" [PASS] Netlify origin (https://*.netlify.app) allowed by CORS.")
    passed += 1

    # Test 16: CORS headers for local dev origin
    total += 1
    print("\n[Test 16] Testing CORS headers for local dev origin (http://localhost:5173) ...")
    resp_cors_local = client.options(
        "/predict",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    assert resp_cors_local.headers.get("access-control-allow-origin") == "http://localhost:5173", (
        f"Expected local dev origin to be allowed, got: {resp_cors_local.headers.get('access-control-allow-origin')}"
    )
    print(" [PASS] Local development origin (http://localhost:5173) allowed by CORS.")
    passed += 1

    # Test 17: CORS rejection for unauthorized third-party origin
    total += 1
    print("\n[Test 17] Testing CORS rejection for unauthorized third-party origin ...")
    resp_cors_unauthorized = client.options(
        "/predict",
        headers={
            "Origin": "https://unauthorized-attacker-site.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    assert resp_cors_unauthorized.headers.get("access-control-allow-origin") is None, (
        f"Expected unauthorized origin to NOT have access-control-allow-origin, got: {resp_cors_unauthorized.headers.get('access-control-allow-origin')}"
    )
    print(" [PASS] Unauthorized third-party origin correctly denied CORS access.")
    passed += 1

    print("\n" + "=" * 70)
    print(f"TEST SUITE COMPLETE: {passed}/{total} tests passed (100% success rate)")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()

