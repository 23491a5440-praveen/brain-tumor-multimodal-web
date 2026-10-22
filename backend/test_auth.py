import sys
import os
import shutil
from pathlib import Path
from fastapi.testclient import TestClient

PROJECT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_DIR))

# Use an isolated temporary SQLite database for tests
TEST_DB_PATH = PROJECT_DIR / "backend" / "data" / "test_auth_four_roles.db"
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

os.environ["DATABASE_PATH"] = str(TEST_DB_PATH)
os.environ["ENVIRONMENT"] = "development"

from backend.main import app
from backend.database import init_db, get_db

init_db()
client = TestClient(app)

def run_auth_tests():
    print("=" * 75)
    print("NeuroScan AI Authentication Test Suite (4 Roles: Hospital, Clinic, Student, Researcher)")
    print("=" * 75)

    passed = 0
    total = 0

    # Role 1: Hospital Registration
    total += 1
    print("\n[Test 1] Hospital registration...")
    resp = client.post("/api/auth/register", json={
        "role": "hospital",
        "email": "dr.house@princetonplainsboro.org",
        "full_name": "Dr. Gregory House",
        "organization": "Princeton-Plainsboro Teaching Hospital",
        "password": "MedicalPassword99#",
        "confirm_password": "MedicalPassword99#"
    })
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert data["user"]["role"] == "hospital"
    assert data["user"]["email"] == "dr.house@princetonplainsboro.org"
    assert data["user"]["organization"] == "Princeton-Plainsboro Teaching Hospital"
    print(" [PASS] Hospital account created successfully.")
    passed += 1

    # Role 2: Clinic/Diagnostic Centre Registration
    total += 1
    print("\n[Test 2] Clinic/Diagnostic Centre registration...")
    resp = client.post("/api/auth/register", json={
        "role": "clinic",
        "email": "dr.vance@apexdiagnostics.com",
        "full_name": "Dr. Marcus Vance",
        "organization": "Apex Neuro Imaging Diagnostic Centre",
        "password": "ClinicDiagnostic2026!",
        "confirm_password": "ClinicDiagnostic2026!"
    })
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert data["user"]["role"] == "clinic"
    assert data["user"]["email"] == "dr.vance@apexdiagnostics.com"
    assert data["user"]["organization"] == "Apex Neuro Imaging Diagnostic Centre"
    print(" [PASS] Clinic/Diagnostic Centre account created successfully.")
    passed += 1

    # Role 3: Student Registration
    total += 1
    print("\n[Test 3] Student registration...")
    resp = client.post("/api/auth/register", json={
        "role": "student",
        "email": "student.sarah@mit.edu",
        "full_name": "Sarah Connor",
        "organization": "Massachusetts Institute of Technology",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    })
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert data["user"]["role"] == "student"
    assert data["user"]["email"] == "student.sarah@mit.edu"
    assert data["user"]["organization"] == "Massachusetts Institute of Technology"
    print(" [PASS] Student account created successfully.")
    passed += 1

    # Role 4: Researcher Registration
    total += 1
    print("\n[Test 4] Researcher registration...")
    resp = client.post("/api/auth/register", json={
        "role": "researcher",
        "email": "a.thorne@broadinstitute.org",
        "full_name": "Dr. Aris Thorne",
        "organization": "Broad Institute AI Neurobiology Lab",
        "password": "ResearchLab2026#",
        "confirm_password": "ResearchLab2026#"
    })
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert data["user"]["role"] == "researcher"
    assert data["user"]["email"] == "a.thorne@broadinstitute.org"
    assert data["user"]["organization"] == "Broad Institute AI Neurobiology Lab"
    print(" [PASS] Researcher account created successfully.")
    passed += 1

    # Test 5: Rejection of invalid role
    total += 1
    print("\n[Test 5] Invalid role rejection...")
    resp = client.post("/api/auth/register", json={
        "role": "superadmin",
        "email": "admin@fake.com",
        "full_name": "Fake Admin",
        "organization": "Fake Org",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    assert resp.status_code == 400
    assert "Role must be one of" in resp.json()["detail"]
    print(" [PASS] Invalid role rejected with 400 Bad Request.")
    passed += 1

    # Test 6: Duplicate email rejection across roles
    total += 1
    print("\n[Test 6] Duplicate email rejection across roles (case-insensitive)...")
    resp = client.post("/api/auth/register", json={
        "role": "researcher",
        "email": "DR.HOUSE@PRINCETONPLAINSBORO.ORG",
        "full_name": "Duplicate House",
        "organization": "Another Hospital",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    assert resp.status_code == 409
    print(" [PASS] Duplicate email rejected with 409 Conflict.")
    passed += 1

    # Test 7: Hospital Login & Verification
    total += 1
    print("\n[Test 7] Hospital login & session verification...")
    resp = client.post("/api/auth/login", json={
        "email": "dr.house@princetonplainsboro.org",
        "password": "MedicalPassword99#"
    })
    assert resp.status_code == 200
    hosp_token = resp.json()["token"]
    resp_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {hosp_token}"})
    assert resp_me.status_code == 200
    assert resp_me.json()["user"]["role"] == "hospital"
    print(" [PASS] Hospital login and session verification succeeded.")
    passed += 1

    # Test 8: Clinic Login & Verification
    total += 1
    print("\n[Test 8] Clinic/Diagnostic Centre login & session verification...")
    resp = client.post("/api/auth/login", json={
        "email": "dr.vance@apexdiagnostics.com",
        "password": "ClinicDiagnostic2026!"
    })
    assert resp.status_code == 200
    clinic_token = resp.json()["token"]
    resp_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {clinic_token}"})
    assert resp_me.status_code == 200
    assert resp_me.json()["user"]["role"] == "clinic"
    print(" [PASS] Clinic/Diagnostic Centre login and session verification succeeded.")
    passed += 1

    # Test 9: Student Login & Verification
    total += 1
    print("\n[Test 9] Student login & session verification...")
    resp = client.post("/api/auth/login", json={
        "email": "student.sarah@mit.edu",
        "password": "SecurePassword123!"
    })
    assert resp.status_code == 200
    student_token = resp.json()["token"]
    resp_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {student_token}"})
    assert resp_me.status_code == 200
    assert resp_me.json()["user"]["role"] == "student"
    print(" [PASS] Student login and session verification succeeded.")
    passed += 1

    # Test 10: Researcher Login & Verification
    total += 1
    print("\n[Test 10] Researcher login & session verification...")
    resp = client.post("/api/auth/login", json={
        "email": "a.thorne@broadinstitute.org",
        "password": "ResearchLab2026#"
    })
    assert resp.status_code == 200
    researcher_token = resp.json()["token"]
    resp_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {researcher_token}"})
    assert resp_me.status_code == 200
    assert resp_me.json()["user"]["role"] == "researcher"
    print(" [PASS] Researcher login and session verification succeeded.")
    passed += 1

    # Test 11: Invalid Password Rejection
    total += 1
    print("\n[Test 11] Invalid password rejection...")
    resp = client.post("/api/auth/login", json={
        "email": "a.thorne@broadinstitute.org",
        "password": "WrongPassword999!"
    })
    assert resp.status_code == 401
    print(" [PASS] Invalid password rejected with 401 Unauthorized.")
    passed += 1

    # Test 12: Logout
    total += 1
    print("\n[Test 12] Logout and session invalidation...")
    resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {researcher_token}"})
    assert resp.status_code == 200
    resp_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {researcher_token}"})
    assert resp_after.status_code == 401
    print(" [PASS] Logout invalidated researcher session token.")
    passed += 1

    # Test 13: Forgot Password OTP flow for Clinic role
    total += 1
    print("\n[Test 13] Forgot password - OTP dispatch for Clinic...")
    resp = client.post("/api/auth/forgot-password/request-otp", json={
        "email": "dr.vance@apexdiagnostics.com"
    })
    assert resp.status_code == 200
    req_data = resp.json()
    assert req_data["status"] == "success"
    dev_otp = None
    if req_data.get("dev_hint"):
        dev_otp = req_data["dev_hint"].get("dev_otp")
    if not dev_otp:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, salt, otp_hash FROM password_resets WHERE email = 'dr.vance@apexdiagnostics.com' ORDER BY id DESC LIMIT 1")
            rec = cursor.fetchone()
            from backend.auth_utils import hash_otp
            for candidate in range(100000, 1000000):
                if hash_otp(str(candidate), rec["salt"]) == rec["otp_hash"]:
                    dev_otp = str(candidate)
                    break
    print(f" [PASS] OTP generated for Clinic user: dr.vance@apexdiagnostics.com")
    passed += 1

    # Test 14: Verify OTP & Issue Reset Token
    total += 1
    print("\n[Test 14] Verify OTP & Issue Reset Token...")
    resp = client.post("/api/auth/forgot-password/verify-otp", json={
        "email": "dr.vance@apexdiagnostics.com",
        "otp": dev_otp
    })
    assert resp.status_code == 200
    reset_token = resp.json()["reset_token"]
    assert len(reset_token) > 20
    print(" [PASS] OTP verified successfully.")
    passed += 1

    # Test 15: Reset Password with Token
    total += 1
    print("\n[Test 15] Reset Password with token...")
    resp = client.post("/api/auth/forgot-password/reset-password", json={
        "email": "dr.vance@apexdiagnostics.com",
        "reset_token": reset_token,
        "new_password": "NewClinicPassword2026!",
        "confirm_password": "NewClinicPassword2026!"
    })
    assert resp.status_code == 200
    print(" [PASS] Password updated successfully.")
    passed += 1

    # Test 16: Login with new password succeeds
    total += 1
    print("\n[Test 16] Login with new password succeeds...")
    resp = client.post("/api/auth/login", json={
        "email": "dr.vance@apexdiagnostics.com",
        "password": "NewClinicPassword2026!"
    })
    assert resp.status_code == 200
    assert "token" in resp.json()
    print(" [PASS] Login with new password succeeded.")
    passed += 1

    print("\n" + "=" * 75)
    print(f"4-ROLE AUTH TEST SUITE COMPLETE: {passed}/{total} tests passed (100% success rate)")
    print("=" * 75)

    # Clean up test database
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

if __name__ == "__main__":
    run_auth_tests()
