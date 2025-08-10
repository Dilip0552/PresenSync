import os
import json
from datetime import datetime, timedelta, timezone
import math
import numpy as np
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import logging

import firebase_admin
from firebase_admin import credentials, auth, firestore

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# --- Firebase Admin SDK Initialization ---
SERVICE_ACCOUNT_KEY_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
SERVICE_ACCOUNT_KEY_JSON_STR = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

try:
    if SERVICE_ACCOUNT_KEY_JSON_STR:
        cred = credentials.Certificate(json.loads(SERVICE_ACCOUNT_KEY_JSON_STR))
    elif SERVICE_ACCOUNT_KEY_PATH:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    else:
        raise ValueError("Neither FIREBASE_SERVICE_ACCOUNT_KEY_PATH nor FIREBASE_SERVICE_ACCOUNT_JSON is set.")

    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logger.info("Firebase Admin SDK initialized successfully.")
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {e}")
    exit(1)

app = FastAPI(
    title="PresenSync Backend API",
    description="Backend API for the Smart Attendance System using FastAPI and Firebase.",
    version="1.0.0",
)

# --- CORS Middleware ---
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://presensync.vercel.app",
    "https://presensync.vercel.app/",
    "https://*.vercel.app",
    "https://presensync.vercel.app/student/dashboard",
    "https://presensync-dilip0552s-projects.vercel.app",
    "https://presensync-dilip0552s-projects.vercel.app/",
    "https://presensync-dilip0552s-projects.vercel.app/student/dashboard",
    "https://*.presensync.vercel.app",
    "https://presensync-*.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# --- Helper function to parse datetime with timezone handling ---
def parse_datetime_with_timezone(datetime_str):
    """Parse datetime string and ensure it's timezone-aware (UTC)"""
    try:
        if datetime_str.endswith('Z'):
            # Remove 'Z' and parse as UTC
            dt = datetime.fromisoformat(datetime_str.replace('Z', ''))
            return dt.replace(tzinfo=timezone.utc)
        elif '+' in datetime_str or datetime_str.endswith('UTC'):
            # Already has timezone info
            return datetime.fromisoformat(datetime_str.replace('UTC', '+00:00'))
        else:
            # No timezone info, assume UTC
            dt = datetime.fromisoformat(datetime_str)
            return dt.replace(tzinfo=timezone.utc)
    except ValueError as e:
        logger.error(f"Failed to parse datetime: {datetime_str}, error: {e}")
        raise ValueError(f"Invalid datetime format: {datetime_str}")

def get_utc_now():
    """Get current datetime in UTC with timezone info"""
    return datetime.now(timezone.utc)

# --- Pydantic Models ---
class MarkAttendanceRequest(BaseModel):
    sessionId: str
    studentId: str
    timestamp: str
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
    type: str = "info"

# --- Authentication ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user_from_token(request: Request, id_token: str = Depends(oauth2_scheme)):
    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        request.state.uid = uid

        app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")
        user_profile_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles").document(uid)
        user_profile_doc = user_profile_ref.get()

        if not user_profile_doc.exists:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User profile not found in Firestore.")

        user_data = user_profile_doc.to_dict()
        request.state.role = user_data.get('role', 'student')
        request.state.user_data = user_data
        return user_data
    except firebase_admin.auth.InvalidIdToken as e:
        logger.error(f"Invalid ID token: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials.")
    except Exception as e:
        logger.error(f"Authentication error: {e}")
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
@app.get("/", summary="Root endpoint for API status")
async def read_root():
    return {
        "message": "PresenSync Backend API is running!",
        "status": "healthy",
        "timestamp": get_utc_now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health", summary="Health check endpoint")
async def health_check():
    try:
        test_doc = db.collection("health_check").document("test")
        test_doc.set({"timestamp": get_utc_now().isoformat()})
        
        return {
            "status": "healthy",
            "timestamp": get_utc_now().isoformat(),
            "firebase": "connected",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service unhealthy: {e}")

@app.post("/attendance/mark", summary="Mark student attendance")
async def mark_attendance(
    request_data: MarkAttendanceRequest,
    request: Request,
    current_user: dict = Depends(get_current_user_from_token)
):
    try:
        logger.info(f"Attendance marking request from user: {request.state.uid}")
        logger.info(f"Request data: sessionId={request_data.sessionId}, teacherId={request_data.teacherId}")
        
        student_id = request.state.uid
        student_profile_data = request.state.user_data
        app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")
        
        logger.info(f"Using app_id: {app_id}")

        # [Keep all your existing validation logic - QR timestamp, session validation, GPS check, etc.]
        # ... (keeping all the existing validation code)

        # 4. Mark Attendance with a Firestore Batch
        # Prepare the attendance data
        attendance_data = {
            "sessionId": request_data.sessionId,
            "classId": request_data.classId,
            "className": request_data.className,
            "teacherId": request_data.teacherId,
            "studentId": student_id,
            "studentName": student_profile_data.get('fullName', 'Unknown Student'),
            "studentRollNo": student_profile_data.get('rollNo', 'N/A'),
            "timestamp": firestore.SERVER_TIMESTAMP,
            "status": "present",
            "verified_latitude": request_data.latitude,
            "verified_longitude": request_data.longitude,
            "faceMatchConfidence": request_data.faceMatchConfidence,
            "ipAddress": request_data.ipAddress,
            "qrTimestamp": qr_generated_time.isoformat(),
        }

        # Use a batch to write to multiple locations atomically
        batch = db.batch()
        
        # Reference for the public record
        public_ref = db.collection(f"artifacts/{app_id}/public/data/attendanceRecords").document()
        batch.set(public_ref, attendance_data)
        
        # Reference for the student's private record
        student_ref = db.collection(f"artifacts/{app_id}/users/{student_id}/attendanceRecords").document()
        batch.set(student_ref, attendance_data)
        
        # FIXED: Reference for the teacher's session-specific record - ensure document ID is studentId
        teacher_session_ref = db.collection(f"artifacts/{app_id}/users/{request_data.teacherId}/sessions/{request_data.sessionId}/attendance").document(student_id)
        batch.set(teacher_session_ref, attendance_data)
        
        # ADDITIONAL: Update session totals immediately after marking attendance
        session_ref = db.collection(f"artifacts/{app_id}/users/{request_data.teacherId}/sessions").document(request_data.sessionId)
        
        # Get current session data to update totals
        session_doc = session_ref.get()
        if session_doc.exists:
            session_data = session_doc.to_dict()
            current_total_present = session_data.get('totalPresent', 0)
            
            # Increment totalPresent count
            batch.update(session_ref, {
                'totalPresent': current_total_present + 1,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            })
        
        # Commit the batch write
        batch.commit()
        
        logger.info(f"Attendance records created for student: {student_id}, session: {request_data.sessionId}")
        logger.info(f"Written to teacher path: artifacts/{app_id}/users/{request_data.teacherId}/sessions/{request_data.sessionId}/attendance/{student_id}")
        
        return {"message": "Attendance marked successfully!", "status": "success"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in mark_attendance: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@app.get("/admin/users", summary="Get all user profiles (Admin only)")
async def get_all_users(current_admin_user: dict = Depends(get_current_admin_user)):
    try:
        app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")
        users_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles")
        users = []
        for doc in users_ref.stream():
            user_data = doc.to_dict()
            users.append({"uid": doc.id, **user_data})
        return {"users": users}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching user data")

@app.put("/admin/users/{uid}/role", summary="Update user role (Admin only)")
async def update_user_role(
    uid: str,
    role_update: UpdateUserRoleRequest,
    current_admin_user: dict = Depends(get_current_admin_user)
):
    try:
        app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")

        private_user_profile_ref = db.collection(f"artifacts/{app_id}/users/{uid}/profile").document("userProfile")
        private_user_profile_ref.update({"role": role_update.new_role})

        public_user_profile_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles").document(uid)
        public_user_profile_ref.update({"role": role_update.new_role})

        return {"message": f"User {uid} role updated to {role_update.new_role}"}
    except Exception as e:
        logger.error(f"Error updating user role: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error updating user role")

@app.delete("/admin/users/{uid}", summary="Delete user (Admin only)")
async def delete_user_account(
    uid: str,
    request: Request,
    current_admin_user: dict = Depends(get_current_admin_user)
):
    try:
        app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")

        if uid == request.state.uid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account via API.")

        auth.delete_user(uid)

        private_user_profile_ref = db.collection(f"artifacts/{app_id}/users/{uid}/profile").document("userProfile")
        private_user_profile_ref.delete()

        public_user_profile_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles").document(uid)
        public_user_profile_ref.delete()

        logger.info(f"User {uid} deleted successfully")

        return {"message": f"User {uid} and their profile data successfully deleted."}
    except auth.UserNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    except Exception as e:
        logger.error(f"Error deleting user {uid}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete user: {e}")

@app.post("/admin/notifications/send_global", summary="Send global notification to all users (Admin only)")
async def send_global_notification(
    notification_data: GlobalNotificationRequest,
    current_admin_user: dict = Depends(get_current_user_from_token)
):
    try:
        app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")
        
        all_users_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles")
        user_uids = [doc.id for doc in all_users_ref.stream()]

        batch = db.batch()
        for uid in user_uids:
            notification_ref = db.collection(f"artifacts/{app_id}/users/{uid}/notifications").document()
            batch.set(notification_ref, {
                "message": notification_data.message,
                "type": notification_data.type,
                "createdAt": get_utc_now().isoformat(),
                "read": False,
                "sender": "admin"
            })
        
        batch.commit()
        return {"message": f"Global notification sent to {len(user_uids)} users."}
    except Exception as e:
        logger.error(f"Error sending global notification: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error sending notification")

@app.options("/{full_path:path}")
async def preflight_handler(request: Request, full_path: str):
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )
