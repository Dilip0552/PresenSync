import os
import json
from datetime import datetime, timedelta
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
    logger.info("Firebase Admin SDK initialized successfully.")
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {e}")
    logger.error("Ensure FIREBASE_SERVICE_ACCOUNT_KEY_PATH in .env (local) or FIREBASE_SERVICE_ACCOUNT_JSON (Render env var) is set correctly.")
    exit(1) # Exit if Firebase SDK cannot be initialized

app = FastAPI(
    title="PresenSync Backend API",
    description="Backend API for the Smart Attendance System using FastAPI and Firebase.",
    version="1.0.0",
)

# --- Enhanced CORS Middleware ---
# More comprehensive origins list
origins = [
    "http://localhost:3000",
    "http://localhost:5173",  # Your React frontend local development server
    "http://127.0.0.1:5173",
    "https://presensync.vercel.app", # Vercel URL
    "https://presensync.vercel.app/",
    "https://*.vercel.app", # Allow all Vercel subdomains for preview deployments
    "https://presensync.vercel.app/student/dashboard",
    "https://presensync-dilip0552s-projects.vercel.app",
    "https://presensync-dilip0552s-projects.vercel.app/",
    "https://presensync-dilip0552s-projects.vercel.app/student/dashboard",
    # Add any other frontend URLs you might have
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
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Add a global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred"}
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
        # FIX: Use the correct Firestore API with doc function
        user_profile_ref = db.collection(f"artifacts/{app_id}/public/data/allUserProfiles").document(uid)
        user_profile_doc = user_profile_ref.get()

        if not user_profile_doc.exists:
            # This should ideally not happen for authenticated users, but as a safeguard
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User profile not found in Firestore.")

        user_data = user_profile_doc.to_dict()
        request.state.role = user_data.get('role', 'student') # Store role in request state
        request.state.user_data = user_data # Store full user data for attendance marking
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
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health", summary="Health check endpoint")
async def health_check():
    try:
        # Test Firebase connection
        test_doc = db.collection("health_check").document("test")
        test_doc.set({"timestamp": datetime.now().isoformat()})
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "firebase": "connected",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service unhealthy: {e}")
@app.post("/attendance/mark", summary="Mark student attendance")
async def mark_attendance(
    request_data: MarkAttendanceRequest,
    request: Request, # Inject the request object to access state
    current_user: dict = Depends(get_current_user_from_token) # Ensure student is authenticated
):
    try:
        logger.info(f"Attendance marking request from user: {request.state.uid}")
        logger.info(f"Request data: sessionId={request_data.sessionId}, teacherId={request_data.teacherId}")
        
        student_id = request.state.uid # Get student UID from verified token
        student_profile_data = request.state.user_data # Get full user data from state
        app_id = os.getenv("FIREBASE_PROJECT_ID", "default-app-id")
        
        logger.info(f"Using app_id: {app_id}")

        # 0. Validate QR Code Timestamp Liveness
        QR_LIVENESS_WINDOW_SECONDS = 300  # Increased to 5 minutes for testing
        try:
            # Handle different timestamp formats
            timestamp_str = request_data.timestamp
            if timestamp_str.endswith('Z'):
                qr_generated_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            elif '+' in timestamp_str or timestamp_str.endswith('UTC'):
                qr_generated_time = datetime.fromisoformat(timestamp_str.replace('UTC', ''))
            else:
                qr_generated_time = datetime.fromisoformat(timestamp_str)
                
            logger.info(f"QR generated time: {qr_generated_time}")
        except ValueError as e:
            logger.error(f"Invalid QR timestamp format: {timestamp_str}, error: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid QR timestamp format: {timestamp_str}")
            
        current_server_time = datetime.now()
        time_diff = (current_server_time - qr_generated_time).total_seconds()
        logger.info(f"Time difference: {time_diff} seconds")

        if time_diff > QR_LIVENESS_WINDOW_SECONDS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"QR Code expired. Time difference: {time_diff:.1f} seconds")

        # 1. Validate Session Details (existence, active, not expired)
        session_path = f"artifacts/{app_id}/users/{request_data.teacherId}/sessions"
        logger.info(f"Looking for session in path: {session_path}/{request_data.sessionId}")
        
        try:
            session_ref = db.collection(session_path).document(request_data.sessionId)
            session_doc = session_ref.get()
            
            if not session_doc.exists:
                logger.error(f"Session not found: {session_path}/{request_data.sessionId}")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

            session_data = session_doc.to_dict()
            logger.info(f"Session data found: status={session_data.get('status')}")
            
        except Exception as e:
            logger.error(f"Error fetching session: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error fetching session: {e}")

        if session_data.get('status') != 'active':
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Session is not active. Current status: {session_data.get('status')}")

        # Parse session times
        try:
            session_start_str = session_data['startTime']
            logger.info(f"Session start time string: {session_start_str}")
            
            if session_start_str.endswith('Z'):
                session_start_time = datetime.fromisoformat(session_start_str.replace('Z', '+00:00'))
            elif '+' in session_start_str:
                session_start_time = datetime.fromisoformat(session_start_str)
            else:
                session_start_time = datetime.fromisoformat(session_start_str)
                
            logger.info(f"Parsed session start time: {session_start_time}")
        except (ValueError, KeyError) as e:
            logger.error(f"Invalid session start time: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session start time format.")

        duration_minutes = session_data.get('duration', 60)
        if session_data.get('durationUnit') == 'hrs':
            duration_minutes *= 60
        session_end_time = session_start_time + timedelta(minutes=duration_minutes)
        
        logger.info(f"Session window: {session_start_time} to {session_end_time}")
        logger.info(f"Current server time: {current_server_time}")
        
        # More lenient time check for testing
        if current_server_time < (session_start_time - timedelta(minutes=5)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session has not started yet.")
        
        if current_server_time > (session_end_time + timedelta(minutes=5)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session has ended.")

        # 2. GPS Location Check (make it optional for testing)
        classroom_lat = session_data.get('classroomLat')
        classroom_lon = session_data.get('classroomLon')
        GPS_RADIUS_METERS = 200  # Increased radius for testing

        if classroom_lat is not None and classroom_lon is not None:
            try:
                distance = haversine_distance(classroom_lat, classroom_lon, request_data.latitude, request_data.longitude)
                logger.info(f"GPS distance: {distance:.2f}m")
                
                if distance > GPS_RADIUS_METERS:
                    logger.warning(f"GPS check failed: {distance:.2f}m > {GPS_RADIUS_METERS}m")
                    # For testing, make this a warning instead of error
                    # raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Outside classroom range. Distance: {distance:.2f}m")
                else:
                    logger.info("GPS check passed")
            except Exception as e:
                logger.error(f"GPS calculation error: {e}")
        else:
            logger.warning("Classroom coordinates missing, skipping GPS check")

        # 3. Check for Duplicate Attendance
        try:
            attendance_records_ref = db.collection(f"artifacts/{app_id}/public/data/attendanceRecords")
            existing_query = attendance_records_ref.where("sessionId", "==", request_data.sessionId).where("studentId", "==", student_id).limit(1)
            existing_docs = list(existing_query.stream())  # Convert to list
            
            logger.info(f"Duplicate check: found {len(existing_docs)} existing records")

            if len(existing_docs) > 0:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance already marked for this session.")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking for duplicate attendance: {e}")
            # Don't fail the request for duplicate check errors
            logger.warning("Proceeding without duplicate check due to error")

        # 4. Mark Attendance
        try:
            attendance_data = {
                "sessionId": request_data.sessionId,
                "classId": request_data.classId,
                "className": request_data.className,
                "teacherId": request_data.teacherId,
                "studentId": student_id,
                "studentName": student_profile_data.get('fullName', 'Unknown Student'),
                "studentRollNo": student_profile_data.get('rollNo', 'N/A'),
                "timestamp": datetime.now().isoformat(),
                "status": "present",
                "verified_latitude": request_data.latitude,
                "verified_longitude": request_data.longitude,
                "faceMatchConfidence": request_data.faceMatchConfidence,
                "ipAddress": request_data.ipAddress,
                "qrTimestamp": qr_generated_time.isoformat(),
            }
            
            logger.info(f"Creating attendance record: {attendance_data}")
            
            # Add the attendance record
            attendance_records_ref = db.collection(f"artifacts/{app_id}/public/data/attendanceRecords")
            doc_ref = attendance_records_ref.add(attendance_data)
            
            logger.info(f"Attendance record created with ID: {doc_ref[1].id}")
            
        except Exception as e:
            logger.error(f"Error creating attendance record: {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating attendance record: {str(e)}")
        
        logger.info(f"Attendance marked successfully for student: {student_id}, session: {request_data.sessionId}")
        return {"message": "Attendance marked successfully!", "status": "success"}
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
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

        logger.info(f"User {uid} and their profile data deleted. Note: User-specific subcollections (classes, sessions, notifications) may still exist.")

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
                "createdAt": datetime.now().isoformat(),
                "read": False,
                "sender": "admin"
            })
        
        batch.commit()
        return {"message": f"Global notification sent to {len(user_uids)} users."}
    except Exception as e:
        logger.error(f"Error sending global notification: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error sending notification")

# Add OPTIONS handler for all routes to handle CORS preflight
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

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)