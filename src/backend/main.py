import os
import json
from datetime import datetime, timedelta
import math
import numpy as np
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field

import firebase_admin
from firebase_admin import credentials, auth, firestore

# Load environment variables from .env file
load_dotenv()

# --- Firebase Admin SDK Initialization ---
# Path to your service account key JSON file
SERVICE_ACCOUNT_KEY_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH") # Read from .env
SERVICE_ACCOUNT_KEY_JSON_STR = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") # Read full JSON string from .env (for Render)

try:
    if SERVICE_ACCOUNT_KEY_JSON_STR:
        # If the JSON string is provided as an environment variable (e.g., on Render)
        cred = credentials.Certificate(json.loads(SERVICE_ACCOUNT_KEY_JSON_STR))
    elif SERVICE_ACCOUNT_KEY_PATH:
        # If the path to the JSON file is provided (e.g., local development)
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    else:
        raise ValueError("Neither FIREBASE_SERVICE_ACCOUNT_KEY_PATH nor FIREBASE_SERVICE_ACCOUNT_JSON is set.")

    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin SDK initialized successfully.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    print("Ensure FIREBASE_SERVICE_ACCOUNT_KEY_PATH in .env (local) or FIREBASE_SERVICE_ACCOUNT_JSON (Render env var) is set correctly.")
    exit(1) # Exit if Firebase SDK cannot be initialized

app = FastAPI(
    title="PresenSync Backend API",
    description="Backend API for the Smart Attendance System using FastAPI and Firebase.",
    version="1.0.0",
)

# --- CORS Middleware ---
# Adjust origins based on your frontend's URL
origins = [
    "http://localhost:5173",  # Your React frontend local development server
    "http://127.0.0.1:5173",
    # Add your Vercel frontend URL here when deployed
    # Example: "https://your-presensync-frontend.vercel.app",
    "https://*.vercel.app", # Allow all Vercel subdomains for preview deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Request Body Validation ---
class MarkAttendanceRequest(BaseModel):
    sessionId: str
    studentId: str
    timestamp: str # ISO string from frontend (this is the QR generation timestamp)
    latitude: float
    longitude: float
    faceMatchConfidence: float = Field(..., description="Confidence score from face-api.js match")
    ipAddress: str = Field(..., description="Public IP address of the student")
    classId: str
    className: str
    teacherId: str

class UpdateUserRoleRequest(BaseModel):
    new_role: str

class GlobalNotificationRequest(BaseModel):
    message: str
    type: str = "info" # info, success, warning, error

# --- Authentication Dependency ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user_from_token(request: Request, id_token: str = Depends(oauth2_scheme)):
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        request.state.uid = uid # Store UID in request state for later use

        # Fetch user's role from Firestore (private profile)
        app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id") # Ensure this matches your __app_id
        user_profile_ref = db.collection(f"artifacts/{app_id}/users/{uid}/profile").document("userProfile")
        user_profile_doc = user_profile_ref.get()

        if not user_profile_doc.exists:
            # This should ideally not happen for authenticated users, but as a safeguard
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User profile not found in Firestore.")

        user_data = user_profile_doc.to_dict()
        request.state.role = user_data.get('role', 'student') # Store role in request state
        request.state.user_data = user_data # Store full user data for attendance marking
        return user_data
    except firebase_admin.auth.InvalidIdToken:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials.")
    except Exception as e:
        print(f"Authentication error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not validate credentials: {e}")

async def get_current_admin_user(current_user: dict = Depends(get_current_user_from_token)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to perform this action.")
    return current_user

# --- Helper Functions ---
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371e3
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) * math.sin(delta_phi / 2) + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2) * math.sin(delta_lambda / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    d = R * c
    return d

# --- API Endpoints ---

@app.post("/attendance/mark", summary="Mark student attendance")
async def mark_attendance(
    request_data: MarkAttendanceRequest,
    request: Request, # Inject the request object to access state
    current_user: dict = Depends(get_current_user_from_token) # Ensure student is authenticated
):
    student_id = request.state.uid # Get student UID from verified token
    student_profile_data = request.state.user_data # Get full user data from state
    app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")

    # 0. Validate QR Code Timestamp Liveness
    QR_LIVENESS_WINDOW_SECONDS = 60 # QR code must be scanned within 60 seconds of its generation
    try:
        qr_generated_time = datetime.fromisoformat(request_data.timestamp.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR timestamp format.")
        
    current_server_time = datetime.now()

    if (current_server_time - qr_generated_time).total_seconds() > QR_LIVENESS_WINDOW_SECONDS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QR Code expired. Please scan a fresh QR.")

    # 1. Validate Session Details (existence, active, not expired)
    session_ref = db.collection(f"artifacts/{app_id}/users/{request_data.teacherId}/sessions").document(request_data.sessionId)
    session_doc = session_ref.get()

    if not session_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    session_data = session_doc.to_dict()

    if session_data.get('status') != 'active':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not active.")

    try:
        session_start_time = datetime.fromisoformat(session_data['startTime'].replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session start time format.")

    duration_minutes = session_data['duration']
    if session_data['durationUnit'] == 'hrs':
        duration_minutes *= 60
    session_end_time = session_start_time + timedelta(minutes=duration_minutes)
    
    if not (session_start_time <= current_server_time <= session_end_time):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance outside session time window.")

    # 2. GPS Location Check
    classroom_lat = session_data.get('classroomLat')
    classroom_lon = session_data.get('classroomLon')
    GPS_RADIUS_METERS = 100

    if classroom_lat is None or classroom_lon is None:
        print(f"Warning: Classroom coordinates missing for session {request_data.sessionId}. Skipping GPS check.")
    else:
        distance = haversine_distance(classroom_lat, classroom_lon, request_data.latitude, request_data.longitude)
        if distance > GPS_RADIUS_METERS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Outside classroom range. Distance: {distance:.2f}m")

    # 3. Check for Duplicate Attendance
    attendance_records_ref = db.collection(f"artifacts/{app_id}/public/data/attendanceRecords")
    existing_attendance_query = attendance_records_ref.where("sessionId", "==", request_data.sessionId).where("studentId", "==", student_id).limit(1)
    existing_attendance_docs = existing_attendance_query.get()

    if len(existing_attendance_docs) > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance already marked for this session.")

    # 4. Mark Attendance
    attendance_data = {
        "sessionId": request_data.sessionId,
        "classId": request_data.classId,
        "className": request_data.className,
        "teacherId": request_data.teacherId,
        "studentId": student_id,
        "studentName": student_profile_data.get('fullName', 'Unknown Student'),
        "studentRollNo": student_profile_data.get('rollNo', 'N/A'),
        "timestamp": datetime.now().isoformat(), # Backend's timestamp for record integrity
        "status": "present",
        "verified_latitude": request_data.latitude,
        "verified_longitude": request_data.longitude,
        "faceMatchConfidence": request_data.faceMatchConfidence,
        "ipAddress": request_data.ipAddress,
        "qrTimestamp": qr_generated_time.isoformat(), # Original QR timestamp from frontend
    }

    attendance_records_ref.add(attendance_data)

    return {"message": "Attendance marked successfully!", "status": "success"}

@app.get("/admin/users", summary="Get all user profiles (Admin only)")
async def get_all_users(current_admin_user: dict = Depends(get_current_admin_user)):
    app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")
    users_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles")
    users = []
    for doc in users_ref.stream():
        user_data = doc.to_dict()
        users.append({"uid": doc.id, **user_data})
    return {"users": users}

@app.put("/admin/users/{uid}/role", summary="Update user role (Admin only)")
async def update_user_role(
    uid: str,
    role_update: UpdateUserRoleRequest,
    current_admin_user: dict = Depends(get_current_admin_user)
):
    app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")

    private_user_profile_ref = db.collection(f"artifacts/{app_id}/users/{uid}/profile").document("userProfile")
    private_user_profile_ref.update({"role": role_update.new_role})

    public_user_profile_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles").document(uid)
    public_user_profile_ref.update({"role": role_update.new_role})

    return {"message": f"User {uid} role updated to {role_update.new_role}"}

@app.delete("/admin/users/{uid}", summary="Delete user (Admin only)")
async def delete_user_account(
    uid: str,
    request: Request,
    current_admin_user: dict = Depends(get_current_admin_user)
):
    app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")

    if uid == request.state.uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account via API.")

    try:
        auth.delete_user(uid)

        private_user_profile_ref = db.collection(f"artifacts/{app_id}/users/{uid}/profile").document("userProfile")
        private_user_profile_ref.delete()

        public_user_profile_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles").document(uid)
        public_user_profile_ref.delete()

        print(f"User {uid} and their profile data deleted. Note: User-specific subcollections (classes, sessions, notifications) may still exist.")

        return {"message": f"User {uid} and their profile data successfully deleted."}
    except auth.UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    except Exception as e:
        print(f"Error deleting user {uid}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete user: {e}")

@app.post("/admin/notifications/send_global", summary="Send global notification to all users (Admin only)")
async def send_global_notification(
    notification_data: GlobalNotificationRequest,
    current_admin_user: dict = Depends(get_current_admin_user)
):
    app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")
    
    all_users_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles")
    user_uids = [doc.id for doc in all_users_ref.stream()]

    batch = db.batch()
    for uid in user_uids:
        notification_ref = db.collection(f"artifacts/{app_id}/users/{uid}/notifications").document()
        batch.set(notification_ref, {
            "message": notification_data.message,
            "type": notification_data.type,
            "createdAt": datetime.now().isoformat(),
            "read": False,
            "sender": "admin"
        })
    
    batch.commit()
    return {"message": f"Global notification sent to {len(user_uids)} users."}

# --- Root Endpoint for Testing ---
@app.get("/", summary="Root endpoint for API status")
async def read_root():
    return {"message": "PresenSync Backend API is running!"}

