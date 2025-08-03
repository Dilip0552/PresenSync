import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from './FirebaseContext';
import Spinner from './Spinner';
import * as faceapi from 'face-api.js';

function StudentProfile({ addNotification, studentProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: studentProfile?.fullName || '',
    email: studentProfile?.email || '',
    phone: studentProfile?.phone || '',
    rollNo: studentProfile?.rollNo || '',
    department: studentProfile?.department || '',
    subject: studentProfile?.subject || '',
    employeeId: studentProfile?.employeeId || '',
    currentPassword: '',
    newPassword: '',
    theme: 'Light',
    notifications: false,
    feedback: '',
    role: studentProfile?.role || 'student',
  });
  const [loading, setLoading] = useState(true); // For initial profile loading in modal
  const [saving, setSaving] = useState(false); // <--- THIS LINE IS NOW CORRECTLY PLACED
  const [faceEnrollmentStatus, setFaceEnrollmentStatus] = useState({ status: 'idle', message: '' });
  const isModelsReadyRef = useRef(false);

  const videoRef = useRef();
  const canvasRef = useRef();
  const mediaStreamRef = useRef(null);

  const { db, userId } = useFirebase();
  const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Effect to load initial formData from studentProfile prop
  useEffect(() => {
    if (studentProfile) {
      setFormData({
        fullName: studentProfile.fullName || studentProfile.displayName || '', // Fallback to displayName
        email: studentProfile.email || '',
        phone: studentProfile.phone || '',
        rollNo: studentProfile.rollNo || '',
        department: studentProfile.department || '',
        subject: studentProfile.subject || '',
        employeeId: studentProfile.employeeId || '',
        theme: studentProfile.theme || 'Light',
        notifications: studentProfile.notifications || false,
        currentPassword: '', // Always reset password fields
        newPassword: '',     // Always reset password fields
        feedback: '',        // Not stored in profile
        role: studentProfile.role || 'student',
      });
      setLoading(false)
    }
  }, [studentProfile]);

  // Generic handleChange for all form fields
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true); // Use setSaving for the saving operation
    try {
      const updates = {
        fullName: formData.fullName,
        phone: formData.phone,
        rollNo: formData.rollNo,
        department: formData.department,
        subject: formData.subject,
        employeeId: formData.employeeId,
        theme: formData.theme,
        notifications: formData.notifications,
      };

      const privateUserProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
      await setDoc(privateUserProfileRef, updates, { merge: true });

      const publicUserProfileRef = doc(db, `artifacts/${appId}/public/data/allUserProfiles`, userId);
      await setDoc(publicUserProfileRef, updates, { merge: true });

      addNotification('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      addNotification('Failed to update profile.', 'error');
    } finally {
      setSaving(false); // Ensure saving state is reset
    }
  };

  const loadFaceModels = useCallback(async () => {
    setFaceEnrollmentStatus({ status: 'loading', message: 'Loading face models...' });
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceLandmark68Net.isLoaded || !faceapi.nets.faceRecognitionNet.isLoaded) {
          throw new Error("Face-API models failed to load completely. Check manifest files.");
      }
      isModelsReadyRef.current = true;

      setFaceEnrollmentStatus({ status: 'idle', message: 'Models loaded. Ready for enrollment.' });
    } catch (error) {
      console.error("Error loading face-api models for enrollment:", error);
      addNotification('Failed to load face recognition models for enrollment. Ensure models are in public/models (including manifest.json files).', 'error');
      setFaceEnrollmentStatus({ status: 'failed', message: 'Failed to load models.' });
      isModelsReadyRef.current = false;
    }
  }, [addNotification]);

  const startCameraForEnrollment = useCallback(async () => {
    if (!isModelsReadyRef.current) {
        await loadFaceModels();
        if (!isModelsReadyRef.current) {
            addNotification('Face models not ready. Cannot start camera.', 'error');
            return;
        }
    }

    setFaceEnrollmentStatus(prev => ({ ...prev, status: 'loading', message: 'Starting camera...' }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      videoRef.current.srcObject = stream;
      mediaStreamRef.current = stream;
      videoRef.current.play();
      setFaceEnrollmentStatus(prev => ({ ...prev, status: 'pending', message: 'Camera started. Align your face for enrollment.' }));
    } catch (err) {
      console.error("Error accessing camera for enrollment:", err);
      addNotification('Failed to access camera. Please allow camera permissions.', 'error');
      setFaceEnrollmentStatus(prev => ({ ...prev, status: 'failed', message: 'Camera access denied.' }));
    }
  }, [addNotification, loadFaceModels]);

  const stopCameraForEnrollment = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  const handleEnrollFace = async () => {
    if (!isModelsReadyRef.current) {
        addNotification("Face models are not loaded. Please wait or try starting camera again.", "error");
        return;
    }
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      addNotification("Camera not active. Please start camera first.", "error");
      return;
    }

    setFaceEnrollmentStatus({ status: 'loading', message: 'Capturing and processing face...' });
    try {
      const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections && detections.descriptor) {
        const faceDescriptor = JSON.stringify(Array.from(detections.descriptor));

        const privateUserProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
        await setDoc(privateUserProfileRef, {
          faceDescriptor: faceDescriptor,
          faceEnrolledAt: new Date().toISOString(),
        }, { merge: true });

        const publicUserProfileRef = doc(db, `artifacts/${appId}/public/data/allUserProfiles`, userId);
        await setDoc(publicUserProfileRef, {
          faceDescriptor: faceDescriptor,
          faceEnrolledAt: new Date().toISOString(),
        }, { merge: true });

        addNotification('Face enrolled successfully!', 'success');
        setFaceEnrollmentStatus({ status: 'success', message: 'Face enrolled!' });
        stopCameraForEnrollment();
      } else {
        addNotification('No face detected. Please ensure your face is clearly visible.', 'error');
        setFaceEnrollmentStatus({ status: 'failed', message: 'No face detected.' });
      }
    } catch (error) {
      console.error("Error enrolling face:", error);
      addNotification('Failed to enroll face. Please try again.', 'error');
      setFaceEnrollmentStatus({ status: 'failed', message: 'Enrollment failed.' });
    }
  };

  useEffect(() => {
    return () => {
        stopCameraForEnrollment();
    };
  }, [stopCameraForEnrollment]);


  return (
    <div className="w-full h-full flex flex-col items-start justify-start p-4">
      <h2 className="text-2xl font-semibold text-blue-700 mb-6">Your Profile</h2>

      {loading && <Spinner message="Loading profile..." isVisible={true} />}

      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-2xl mb-8 border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleFormChange}
              placeholder="Your Full Name"
              className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
              disabled={saving || !isEditing}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-100 cursor-not-allowed"
              disabled
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="+91 XXXXXXXXXX"
              className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
              disabled={saving || !isEditing}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Roll No.</label>
            <input
              type="text"
              id="rollNo"
              name="rollNo"
              value={formData.rollNo}
              onChange={handleFormChange}
              placeholder="Your Roll No."
              className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
              disabled={saving || !isEditing}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600 mb-1">Role</label>
            <input
              type="text"
              id="role"
              name="role"
              value={formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
              readOnly
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 bg-gray-100 cursor-not-allowed capitalize"
              disabled
            />
          </div>
          {formData.role === 'teacher' && (
            <>
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleFormChange}
                  placeholder="Computer Science"
                  className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  disabled={saving || !isEditing}
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject Taught</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  placeholder="Data Structures"
                  className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  disabled={saving || !isEditing}
                />
              </div>
              <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleFormChange}
                  placeholder="EMP12345"
                  className="w-full px-3 py-2 rounded-lg border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  disabled={saving || !isEditing}
                />
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset form data to original studentProfile values if cancel
                  setFormData({
                    fullName: studentProfile?.fullName || studentProfile?.displayName || '',
                    email: studentProfile?.email || '',
                    phone: studentProfile?.phone || '',
                    rollNo: studentProfile?.rollNo || '',
                    department: studentProfile?.department || '',
                    subject: studentProfile?.subject || '',
                    employeeId: studentProfile?.employeeId || '',
                    theme: studentProfile?.theme || 'Light',
                    notifications: studentProfile?.notifications || false,
                    currentPassword: '',
                    newPassword: '',
                    feedback: '',
                    role: studentProfile?.role || 'student',
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                disabled={saving}
              >
                <Spinner size="small" color="white" isVisible={saving} />
                <span className={saving ? 'opacity-0' : ''}>Save Changes</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-2xl border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Face Enrollment</h3>
        <p className="text-gray-600 mb-4">
          Enroll your face for quick and secure attendance marking.
          {studentProfile?.faceDescriptor ? (
            <span className="text-green-600 font-medium ml-2"> (Face currently enrolled)</span>
          ) : (
            <span className="text-red-500 font-medium ml-2"> (Face not enrolled)</span>
          )}
        </p>

        <div className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center mb-4">
          <video ref={videoRef} autoPlay muted playsInline className="absolute w-full h-full object-cover rounded-xl"></video>
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></canvas>
          <div className="absolute inset-0 border-4 border-dashed border-purple-400 rounded-xl flex items-center justify-center">
            <div className="w-3/4 h-3/4 border-2 border-white border-opacity-50 rounded-full animate-pulse"></div>
          </div>
          <Spinner message={faceEnrollmentStatus.message} isVisible={faceEnrollmentStatus.status === 'loading'} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={startCameraForEnrollment}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            disabled={faceEnrollmentStatus.status === 'loading' || mediaStreamRef.current}
          >
            Start Camera
          </button>
          <button
            onClick={handleEnrollFace}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            disabled={!isModelsReadyRef.current || !mediaStreamRef.current || faceEnrollmentStatus.status === 'loading'}
          >
            <Spinner size="small" color="white" isVisible={faceEnrollmentStatus.status === 'loading'} />
            <span className={faceEnrollmentStatus.status === 'loading' ? 'opacity-0' : ''}>Enroll My Face</span>
          </button>
          <button
            onClick={stopCameraForEnrollment}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            disabled={!mediaStreamRef.current}
          >
            Stop Camera
          </button>
        </div>
        {faceEnrollmentStatus.message && faceEnrollmentStatus.status !== 'loading' && (
          <p className={`mt-3 text-center text-sm ${faceEnrollmentStatus.status === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {faceEnrollmentStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default StudentProfile;
