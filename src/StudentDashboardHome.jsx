import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as faceapi from 'face-api.js';
import { CheckCircle, XCircle, MapPin, QrCode, Scan, UserCheck, Wifi } from 'lucide-react';
import Spinner from './Spinner';
import NotificationSystem from './NotificationSystem';
import { useFirebase } from './FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';

// --- Backend API Base URL ---
const API_BASE_URL = 'https://presensync.onrender.com'; // Ensure this matches your FastAPI server URL

// Constants for attendance logic (some moved to backend for consistency)
const QR_EXPIRATION_TIME_MS = 5 * 60 * 1000; // 5 minutes in milliseconds (for initial QR validation)
const GPS_RADIUS_METERS = 100; // 100 meters radius for location check (used for frontend display, backend validates)
const FACE_MATCH_THRESHOLD = 0.6; // Lower value means stricter match
const BLINK_THRESHOLD = 0.4; // Threshold for eye closure to detect blink
const HEAD_TURN_THRESHOLD = 0.1; // Threshold for head turn detection

const MOCK_ALLOWED_IPS = ['192.168.1.1', '10.0.0.1', '203.0.113.45']; // Example allowed IPs (frontend check, backend can re-verify)

// Helper function to calculate Haversine distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
}

const StudentDashboardHome = ({ addNotification, studentProfile }) => {
    const [currentStep, setCurrentStep] = useState(0); // 0: QR, 1: Face, 2: GPS, 3: IP, 4: Submit, 5: Done
    const [qrScanResult, setQrScanResult] = useState(null); // Stores { sessionId, timestamp, classId, className, teacherId, classroomLat, classroomLon }
    const [faceRecognitionStatus, setFaceRecognitionStatus] = useState({ status: 'idle', message: '' });
    const [locationStatus, setLocationStatus] = useState({ status: 'idle', message: '' });
    const [ipStatus, setIpStatus] = useState({ status: 'idle', message: '' });
    const [attendanceStatus, setAttendanceStatus] = useState({ status: 'idle', message: '' });
    const [overallLoading, setOverallLoading] = useState(false); // Overall loading for the entire component
    const [qrScannerReady, setQrScannerReady] = useState(false);
    const [sessionDetails, setSessionDetails] = useState(null); // Full session details from Firestore (fetched after QR scan)
    const [currentGeolocation, setCurrentGeolocation] = useState(null); // Store actual student geolocation
    const [qrScanError, setQrScanError] = useState(''); // New state for QR scan specific error messages

    const videoRef = useRef();
    const canvasRef = useRef();
    const faceMatcherRef = useRef(null);
    const livenessBlinkCountRef = useRef(0);
    const livenessHeadTurnCountRef = useRef(0);
    const lastBlinkTimeRef = useRef(0);
    const lastHeadTurnTimeRef = useRef(0);
    const prevFaceDetectionRef = useRef(null);
    const qrCodeScannerRef = useRef(null);
    const mediaStreamRef = useRef(null); // To store camera stream for cleanup
    const detectionIntervalRef = useRef(null); // Ref for the face detection interval
    const isModelsReadyRef = useRef(false); // Ref to track actual model readiness
    const isMountedRef = useRef(true);
    const qrScannerBusyRef = useRef(false); // Add a ref to track if the scanner is busy
    const { db, userId, idToken } = useFirebase(); // Get idToken
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Step definitions for progress tracker
    const steps = [
        { name: 'Scan QR Code', icon: QrCode, status: qrScanResult ? 'completed' : 'pending' },
        { name: 'Face Authentication', icon: UserCheck, status: faceRecognitionStatus.status === 'success' ? 'completed' : faceRecognitionStatus.status === 'failed' ? 'failed' : 'pending' },
        { name: 'Location Check', icon: MapPin, status: locationStatus.status === 'success' ? 'completed' : locationStatus.status === 'failed' ? 'failed' : 'pending' },
        { name: 'IP Check (Optional)', icon: Wifi, status: ipStatus.status === 'success' ? 'completed' : ipStatus.status === 'failed' ? 'failed' : 'pending' },
        { name: 'Submit Attendance', icon: Scan, status: attendanceStatus.status === 'success' ? 'completed' : attendanceStatus.status === 'failed' ? 'failed' : 'pending' },
    ];

    // --- QR Code Scanning Logic ---
    useEffect(() => {
        // This is the sole place where the scanner's lifecycle is managed
        const startScanner = () => {
            const qrReaderElement = document.getElementById("qr-reader");

            if (qrReaderElement && !qrCodeScannerRef.current) {
                setQrScanError('');
                const scannerInstance = new Html5QrcodeScanner(
                    "qr-reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        disableFlip: false,
                        videoConstraints: {
                            facingMode: { exact: "environment" },
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        }
                    },
                    false
                );

                const onScanSuccess = async (decodedText) => {
                    // This function should ONLY update state and NOT try to re-render the scanner
                    if (qrScannerBusyRef.current) {
                        console.warn("QR scanner is busy, ignoring scan result.");
                        return;
                    }

                    qrScannerBusyRef.current = true; // Set the busy flag

                    try {
                        if (!isMountedRef.current) return;

                        setOverallLoading(true);
                        setQrScanError('');

                        try {
                            const qrData = JSON.parse(decodedText);
                            const { sessionId, timestamp, classId, teacherId, classroomLat, classroomLon } = qrData;

                            if (!sessionId || !timestamp || !classId || !teacherId) {
                                throw new Error('Invalid QR Code data structure!');
                            }

                            const sessionDocRef = doc(db, `artifacts/${appId}/users/${teacherId}/sessions`, sessionId);
                            const sessionSnap = await getDoc(sessionDocRef);

                            if (!sessionSnap.exists()) {
                                throw new Error('Session not found or invalid QR code!');
                            }

                            const sessionFirestoreData = sessionSnap.data();
                            setSessionDetails(sessionFirestoreData);

                            const sessionStartTime = new Date(sessionFirestoreData.startTime).getTime();
                            const sessionDurationMs = (sessionFirestoreData.durationUnit === 'min' ? sessionFirestoreData.duration : sessionFirestoreData.duration * 60) * 60 * 1000;
                            const sessionEndTime = sessionStartTime + sessionDurationMs;
                            const currentTime = Date.now();

                            if (currentTime < sessionStartTime) {
                                throw new Error('Session has not started yet!');
                            }

                            if (currentTime > sessionEndTime || sessionFirestoreData.status === 'ended') {
                                throw new Error('Session has ended or QR Code expired!');
                            }

                            if (isMountedRef.current) {
                                setQrScanResult(qrData);
                                addNotification('QR Code scanned successfully!', 'success');
                                setCurrentStep(1); // This will trigger the useEffect cleanup and stop the scanner
                            }
                        } catch (error) {
                            console.error("Error processing QR code:", error);
                            addNotification(error.message, 'error');
                            setQrScanError('Scan failed. ' + error.message);
                            setQrScanResult(null);
                        } finally {
                            if (isMountedRef.current) {
                                setOverallLoading(false);
                            }
                        }
                    } finally {
                        qrScannerBusyRef.current = false; // Release the busy flag
                    }
                };

                const onScanError = (errorMessage) => {
                    if (errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission denied")) {
                        setQrScanError("Camera access denied. Please allow permissions.");
                        addNotification("Camera access denied. Please allow camera permissions.", "error");
                    } else if (errorMessage.includes("NotFoundError")) {
                        setQrScanError("No camera found. Please ensure a camera is connected.");
                        addNotification("No camera found. Please ensure a camera is connected.", "error");
                    } else if (errorMessage.includes("OverconstrainedError")) {
                        setQrScanError("Camera resolution not supported. Trying default.");
                        addNotification("Camera resolution/constraints not supported. Trying default.", "warning");
                    } else if (errorMessage.includes("Failed to start camera")) {
                        setQrScanError("Failed to start camera. Check if it's in use by another app.");
                        addNotification("Failed to start camera. Is it in use by another app?", "error");
                    } else if (errorMessage.includes("QR code not found")) {
                        setQrScanError("No QR code detected. Please align the QR code clearly.");
                    } else {
                        setQrScanError("Scanning error. Please check camera feed.");
                    }
                };

                try {
                    scannerInstance.render(onScanSuccess, onScanError);
                    qrCodeScannerRef.current = scannerInstance;
                    setQrScannerReady(true);
                } catch (renderError) {
                    console.error("Error rendering QR scanner:", renderError);
                    setQrScanError("Failed to start QR scanner. Please check console for details.");
                    addNotification("Failed to start QR scanner. Please check console for details.", "error");
                }
            }
        };

        const stopScanner = async () => {
            if (qrCodeScannerRef.current) {
                try {
                    await qrCodeScannerRef.current.clear();
                } catch (err) {
                    // Ignore the 'removeChild' error during a re-render.
                    // This error indicates the scanner's UI has already been removed.
                    console.error("Failed to clear QR scanner gracefully:", err);
                }
                qrCodeScannerRef.current = null;
                setQrScannerReady(false);
                setQrScanError('');
            }
        };
        
        if (currentStep === 0) {
            startScanner();
        } else {
            // Stop the scanner immediately when the step changes
            stopScanner();
        }

        // Cleanup function for the useEffect hook
        return () => {
            isMountedRef.current = false;
            stopScanner();
        };
    }, [currentStep, addNotification, db, appId]);


    // --- Face Recognition Logic ---

    const startCamera = useCallback(async () => {
        setFaceRecognitionStatus(prev => ({ ...prev, status: 'loading', message: 'Starting camera...' }));
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
            videoRef.current.srcObject = stream;
            mediaStreamRef.current = stream;
            videoRef.current.play();
            setFaceRecognitionStatus(prev => ({ ...prev, status: 'pending', message: 'Camera started. Please align your face.' }));
        } catch (err) {
            console.error("Error accessing camera:", err);
            addNotification('Failed to access camera. Please allow camera permissions.', 'error');
            setFaceRecognitionStatus(prev => ({ ...prev, status: 'failed', message: 'Camera access denied.' }));
            throw err;
        }
    }, [addNotification]);

    const stopCamera = useCallback(() => {
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

    const detectFaceAndLiveness = useCallback(async () => {
        if (!isModelsReadyRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended || !faceMatcherRef.current) {
            return;
        }

        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        if (canvasRef.current && displaySize.width > 0 && displaySize.height > 0) {
            faceapi.matchDimensions(canvasRef.current, displaySize);
            const context = canvasRef.current.getContext('2d');
            context.clearRect(0, 0, displaySize.width, displaySize.height);

            const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
                faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

                const bestMatch = faceMatcherRef.current.findBestMatch(resizedDetections.descriptor);

                if (bestMatch.label === userId && bestMatch.distance < FACE_MATCH_THRESHOLD) {
                    const landmarks = resizedDetections.landmarks;
                    const leftEye = landmarks.getLeftEye();
                    const rightEye = landmarks.getRightEye();

                    const eyeLidsDistLeft = faceapi.euclideanDistance(leftEye[1], leftEye[5]) + faceapi.euclideanDistance(leftEye[2], leftEye[4]);
                    const eyeBrowDistLeft = faceapi.euclideanDistance(leftEye[0], leftEye[3]);
                    const leftEyeAspectRatio = eyeLidsDistLeft / (2 * eyeBrowDistLeft);

                    const eyeLidsDistRight = faceapi.euclideanDistance(rightEye[1], rightEye[5]) + faceapi.euclideanDistance(rightEye[2], rightEye[4]);
                    const eyeBrowDistRight = faceapi.euclideanDistance(rightEye[0], rightEye[3]);
                    const rightEyeAspectRatio = eyeLidsDistRight / (2 * eyeBrowDistRight);

                    const avgEyeAspectRatio = (leftEyeAspectRatio + rightEyeAspectRatio) / 2;
                    const eyesClosed = avgEyeAspectRatio < BLINK_THRESHOLD;
                    const currentTime = Date.now();

                    if (eyesClosed && (currentTime - lastBlinkTimeRef.current > 1000)) {
                        livenessBlinkCountRef.current += 1;
                        lastBlinkTimeRef.current = currentTime;
                        setFaceRecognitionStatus(prev => ({ ...prev, message: `Blink detected! (${livenessBlinkCountRef.current}/1)` }));
                    }

                    if (prevFaceDetectionRef.current) {
                        const prevNoseX = prevFaceDetectionRef.current.landmarks.getNose()[3].x;
                        const currNoseX = resizedDetections.landmarks.getNose()[3].x;
                        const deltaX = Math.abs(currNoseX - prevNoseX);

                        if (deltaX > HEAD_TURN_THRESHOLD * displaySize.width && (currentTime - lastHeadTurnTimeRef.current > 1000)) {
                            livenessHeadTurnCountRef.current += 1;
                            lastHeadTurnTimeRef.current = currentTime;
                            setFaceRecognitionStatus(prev => ({ ...prev, message: `Head turn detected! (${livenessHeadTurnCountRef.current}/1)` }));
                        }
                    }
                    prevFaceDetectionRef.current = resizedDetections;

                    if (livenessBlinkCountRef.current >= 1 || livenessHeadTurnCountRef.current >= 1) {
                        setFaceRecognitionStatus({ status: 'success', message: 'Face matched and liveness confirmed!' });
                        addNotification('Face authentication successful!', 'success');
                        if (detectionIntervalRef.current) {
                            clearInterval(detectionIntervalRef.current);
                            detectionIntervalRef.current = null;
                        }
                        stopCamera();
                        setCurrentStep(2);
                        livenessBlinkCountRef.current = 0;
                        livenessHeadTurnCountRef.current = 0;
                    } else {
                        setFaceRecognitionStatus({ status: 'pending', message: 'Face matched. Please blink or slightly turn your head.' });
                    }

                } else {
                    setFaceRecognitionStatus({ status: 'failed', message: 'Face not recognized. Please try again.' });
                    addNotification('Face not recognized. Please try again.', 'error');
                }
            } else {
                setFaceRecognitionStatus({ status: 'pending', message: 'No face detected. Please center your face.' });
            }
        }
    }, [addNotification, stopCamera, userId]);

    const initializeFaceRecognition = useCallback(async () => {
        setOverallLoading(true);
        setFaceRecognitionStatus({ status: 'loading', message: 'Loading face models...' });
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

            if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceLandmark68Net.isLoaded || !faceapi.nets.faceRecognitionNet.isLoaded) {
                throw new Error("Face-API models failed to load completely. Check manifest files.");
            }
            isModelsReadyRef.current = true;

            setFaceRecognitionStatus({ status: 'idle', message: 'Models loaded. Ready for face scan.' });

            await startCamera();

            detectionIntervalRef.current = setInterval(() => {
                detectFaceAndLiveness();
            }, 100);

            setOverallLoading(false);
        } catch (error) {
            console.error("Error initializing face recognition:", error);
            addNotification('Failed to initialize face recognition. Ensure models are in public/models and camera access is allowed.', 'error');
            setFaceRecognitionStatus({ status: 'failed', message: 'Failed to initialize face recognition.' });
            setOverallLoading(false);
            isModelsReadyRef.current = false;
        }
    }, [addNotification, studentProfile, userId, startCamera, detectFaceAndLiveness]);


    useEffect(() => {
        if (currentStep === 1) {
            initializeFaceRecognition();

            return () => {
                if (detectionIntervalRef.current) {
                    clearInterval(detectionIntervalRef.current);
                    detectionIntervalRef.current = null;
                }
                stopCamera();
                isModelsReadyRef.current = false;
            };
        }
    }, [currentStep, initializeFaceRecognition, stopCamera]);


    // --- GPS Location Check Logic ---
    const checkGPSLocation = useCallback(() => {
        setOverallLoading(true);
        setLocationStatus({ status: 'loading', message: 'Checking your location...' });

        if (!qrScanResult || !sessionDetails || !sessionDetails.classroomLat || !sessionDetails.classroomLon) {
            setLocationStatus({ status: 'failed', message: 'Classroom coordinates not available from session data.' });
            addNotification('Cannot perform location check: missing classroom coordinates.', 'error');
            setOverallLoading(false);
            return;
        }

        const CLASSROOM_LAT = sessionDetails.classroomLat;
        const CLASSROOM_LON = sessionDetails.classroomLon;

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const studentLat = position.coords.latitude;
                    const studentLon = position.coords.longitude;
                    setCurrentGeolocation({ latitude: studentLat, longitude: studentLon });
                    const distance = haversineDistance(CLASSROOM_LAT, CLASSROOM_LON, studentLat, studentLon);

                    if (distance <= GPS_RADIUS_METERS) {
                        setLocationStatus({ status: 'success', message: `Within ${Math.round(distance)}m of classroom.` });
                        addNotification('Location check successful!', 'success');
                        setCurrentStep(3);
                    } else {
                        setLocationStatus({ status: 'failed', message: `Too far from classroom (${Math.round(distance)}m).` });
                        addNotification('You are outside the classroom range.', 'error');
                    }
                    setOverallLoading(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setLocationStatus({ status: 'failed', message: 'Location access denied or unavailable.' });
                    addNotification('Failed to get your location. Please enable GPS.', "error");
                    setOverallLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            setLocationStatus({ status: 'failed', message: 'Geolocation not supported by your browser.' });
            addNotification('Geolocation not supported.', "error");
            setOverallLoading(false);
        }
    }, [addNotification, qrScanResult, sessionDetails]);

    useEffect(() => {
        if (currentStep === 2) {
            checkGPSLocation();
        }
    }, [currentStep, checkGPSLocation]);

    // --- Optional: Public IP Check Logic ---
    const checkPublicIP = useCallback(async () => {
        setOverallLoading(true);
        setIpStatus({ status: 'loading', message: 'Checking public IP...' });
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const userIp = data.ip;

            if (MOCK_ALLOWED_IPS.includes(userIp)) {
                setIpStatus({ status: 'success', message: `IP matched: ${userIp}` });
                addNotification('IP check successful!', 'success');
                setCurrentStep(4);
            } else {
                setIpStatus({ status: 'failed', message: `IP not allowed: ${userIp}` });
                addNotification('Your IP is not on the allowed list.', 'warning');
                setCurrentStep(4);
            }
        } catch (error) {
            console.error("Error fetching IP:", error);
            setIpStatus({ status: 'failed', message: 'Failed to retrieve public IP.' });
            addNotification('Could not check public IP.', 'warning');
            setCurrentStep(4);
        } finally {
            setOverallLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        if (currentStep === 3) {
            checkPublicIP();
        }
    }, [currentStep, checkPublicIP]);

    // --- Attendance Submission Logic (to Backend API) ---
    const markAttendance = useCallback(async () => {
        setOverallLoading(true);
        setAttendanceStatus({ status: 'loading', message: 'Submitting attendance...' });

        if (!qrScanResult || !sessionDetails || !userId || !idToken || !currentGeolocation || faceRecognitionStatus.status !== 'success' || locationStatus.status !== 'success') {
            setAttendanceStatus({ status: 'failed', message: 'One or more pre-requisite checks failed. Cannot submit.' });
            addNotification('Pre-requisite checks failed. Cannot mark attendance.', 'error');
            setOverallLoading(false);
            return;
        }

        console.log("StudentDashboardHome: Sending attendance data to backend:", {
            sessionId: qrScanResult.sessionId,
            studentId: userId,
            timestamp: new Date().toISOString(),
            latitude: currentGeolocation.latitude,
            longitude: currentGeolocation.longitude,
            faceMatchConfidence: FACE_MATCH_THRESHOLD,
            ipAddress: ipStatus.message.includes('IP matched') ? ipStatus.message.split(': ')[1] : 'N/A',
            classId: qrScanResult.classId,
            className: qrScanResult.className,
            teacherId: qrScanResult.teacherId,
        });

        try {
            const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    sessionId: qrScanResult.sessionId,
                    studentId: userId,
                    timestamp: new Date().toISOString(),
                    latitude: currentGeolocation.latitude,
                    longitude: currentGeolocation.longitude,
                    faceMatchConfidence: FACE_MATCH_THRESHOLD,
                    ipAddress: ipStatus.message.includes('IP matched') ? ipStatus.message.split(': ')[1] : 'N/A',
                    classId: qrScanResult.classId,
                    className: qrScanResult.className,
                    teacherId: qrScanResult.teacherId,
                })
            });

            const result = await response.json();
            console.log("StudentDashboardHome: Backend response:", result);

            if (response.ok) {
                setAttendanceStatus({ status: 'success', message: result.message });
                addNotification(result.message, 'success');
                setCurrentStep(5);
            } else {
                setAttendanceStatus({ status: 'failed', message: result.detail || 'Failed to submit attendance.' });
                addNotification(result.detail || 'Failed to submit attendance.', 'error');
            }
        } catch (error) {
            console.error("StudentDashboardHome: Error submitting attendance to backend:", error);
            setAttendanceStatus({ status: 'failed', message: 'Network error or unable to reach backend.' });
            addNotification('Network error or unable to reach backend.', 'error');
        } finally {
            setOverallLoading(false);
        }
    }, [addNotification, qrScanResult, sessionDetails, userId, idToken, currentGeolocation, faceRecognitionStatus.status, locationStatus.status, ipStatus.message]);

    useEffect(() => {
        if (currentStep === 4) {
            markAttendance();
        }
    }, [currentStep, markAttendance]);

    // UI for status cards
    const StatusCard = ({ icon: Icon, title, status, message }) => {
        let borderColor, bgColor, textColor, iconColor;
        switch (status) {
            case 'completed':
            case 'success':
                borderColor = 'border-green-500';
                bgColor = 'bg-green-100';
                textColor = 'text-green-800';
                iconColor = 'text-green-500';
                break;
            case 'failed':
                borderColor = 'border-red-500';
                bgColor = 'bg-red-100';
                textColor = 'text-red-800';
                iconColor = 'text-red-500';
                break;
            case 'loading':
                borderColor = 'border-blue-500';
                bgColor = 'bg-blue-100';
                textColor = 'text-blue-800';
                iconColor = 'text-blue-500';
                break;
            case 'pending':
            default:
                borderColor = 'border-gray-300';
                bgColor = 'bg-gray-50';
                textColor = 'text-gray-600';
                iconColor = 'text-gray-400';
                break;
        }

        return (
            <motion.div
                className={`flex items-center p-4 rounded-xl shadow-md ${bgColor} ${borderColor} border-l-4 mb-3`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div className={`mr-4 p-2 rounded-full ${iconColor} bg-white bg-opacity-70 shadow-sm`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className={`font-semibold ${textColor}`}>{title}</h3>
                    <p className={`text-sm ${textColor}`}>{message}</p>
                </div>
            </motion.div>
        );
    };

    // UI for progress bar
    const ProgressBar = ({ steps, currentStep }) => {
        return (
            <div className="flex justify-between items-center w-full mb-8">
                {/* Adjusted for mobile: flex-wrap, smaller icons/text on extra small screens */}
                <div className="flex flex-wrap justify-between items-center w-full sm:flex-nowrap">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.name}>
                            <div className="flex flex-col items-center flex-1 min-w-[80px] sm:min-w-0 px-1"> {/* min-w for mobile wrapping */}
                                <motion.div
                                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                        index <= currentStep ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: index === currentStep ? 1.1 : 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                    <step.icon size={16} className="sm:size-[20px]" /> {/* Smaller icon on mobile */}
                                </motion.div>
                                <p className={`text-xs mt-1 text-center ${index <= currentStep ? 'text-indigo-700 font-medium' : 'text-gray-500'} hidden sm:block`}> {/* Hide text on very small screens */}
                                    {step.name}
                                </p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-1 bg-gray-200 mx-1 sm:mx-2 relative hidden sm:block"> {/* Hide connector on very small screens */}
                                    <motion.div
                                        className="absolute inset-y-0 left-0 bg-indigo-600 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: index < currentStep ? '100%' : '0%' }}
                                        transition={{ duration: 0.5, ease: "easeInOut" }}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };


    return (
        <div className="min-h-full bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4 font-inter">
            <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-8 w-full max-w-4xl transform transition-all duration-500 ease-in-out scale-95 md:scale-100 relative"> {/* Adjusted padding */}
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-indigo-800 mb-6 sm:mb-8">Mark Your Attendance</h2> {/* Adjusted font size */}

                <ProgressBar steps={steps} currentStep={currentStep} />

                {/* Overall Loading Spinner as an overlay */}
                <AnimatePresence>
                    {overallLoading && (
                        <motion.div
                            key="overall-spinner-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40 rounded-3xl"
                        >
                            <Spinner message="Processing..." size="large" isVisible={true} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {currentStep === 0 && (
                        <motion.div
                            key="qr-scan"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Step 1: Scan QR Code</h3>
                            <p className="text-sm sm:text-base text-gray-500 mb-6 text-center">Position the QR code within the scanning area.</p>
                            <div id="qr-reader" className="w-full max-w-xs sm:max-w-sm lg:max-w-md aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center relative">
                                <Spinner message="Initializing QR Scanner..." isVisible={!qrScannerReady} />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-3/4 h-3/4 border-4 border-dashed border-blue-400 rounded-lg opacity-70 animate-pulse"></div>
                                </div>
                                {qrScanError && (
                                    <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-red-500 text-xs sm:text-sm font-semibold bg-white bg-opacity-80 p-1 rounded-md z-10 text-center w-full max-w-[90%]">{qrScanError}</p>
                                )}
                            </div>
                            <StatusCard
                                icon={QrCode}
                                title="QR Code Status"
                                status={qrScanResult ? 'success' : 'pending'}
                                message={qrScanResult ? `Session ID: ${qrScanResult.sessionId}` : 'Waiting for QR scan...'}
                            />
                        </motion.div>
                    )}

                    {currentStep === 1 && (
                        <motion.div
                            key="face-auth"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Step 2: Face Authentication</h3>
                            <p className="text-sm sm:text-base text-gray-500 mb-6 text-center">Align your face in the frame and perform the liveness action (blink or slight head turn).</p>
                            <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                                <video ref={videoRef} autoPlay muted playsInline className="absolute w-full h-full object-cover rounded-xl"></video>
                                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full"></canvas>
                                <div className="absolute inset-0 border-4 border-dashed border-indigo-400 rounded-xl flex items-center justify-center">
                                    <div className="w-3/4 h-3/4 border-2 border-white border-opacity-50 rounded-full animate-pulse"></div>
                                </div>
                                <Spinner message={faceRecognitionStatus.message} isVisible={faceRecognitionStatus.status === 'loading'} />
                            </div>
                            <StatusCard
                                icon={UserCheck}
                                title="Face Recognition Status"
                                status={faceRecognitionStatus.status}
                                message={faceRecognitionStatus.message || 'Waiting for face detection...'}
                            />
                            {faceRecognitionStatus.status === 'failed' && (
                                <button
                                    onClick={() => {
                                        setFaceRecognitionStatus({ status: 'idle', message: '' });
                                        livenessBlinkCountRef.current = 0;
                                        livenessHeadTurnCountRef.current = 0;
                                        initializeFaceRecognition();
                                    }}
                                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                                >
                                    Retry Face Scan
                                </button>
                            )}
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div
                            key="gps-check"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Step 3: Location Check</h3>
                            <p className="text-sm sm:text-base text-gray-500 mb-6 text-center">Verifying your proximity to the classroom.</p>
                            <Spinner message={locationStatus.message} isVisible={locationStatus.status === 'loading'} />
                            <StatusCard
                                icon={MapPin}
                                title="Location Status"
                                status={locationStatus.status}
                                message={locationStatus.message || 'Waiting for location data...'}
                            />
                            {locationStatus.status === 'failed' && (
                                <button
                                    onClick={checkGPSLocation}
                                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                                >
                                    Retry Location Check
                                </button>
                            )}
                        </motion.div>
                    )}

                    {currentStep === 3 && (
                        <motion.div
                            key="ip-check"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Step 4: IP Address Check (Optional)</h3>
                            <p className="text-sm sm:text-base text-gray-500 mb-6 text-center">Verifying your network connection.</p>
                            <Spinner message={ipStatus.message} isVisible={ipStatus.status === 'loading'} />
                            <StatusCard
                                icon={Wifi}
                                title="IP Status"
                                status={ipStatus.status}
                                message={ipStatus.message || 'Checking IP address...'}
                            />
                            {ipStatus.status === 'failed' && (
                                <button
                                    onClick={checkPublicIP}
                                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                                >
                                    Retry IP Check
                                </button>
                            )}
                        </motion.div>
                    )}

                    {currentStep === 4 && (
                        <motion.div
                            key="submit-attendance"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center justify-center"
                        >
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Step 5: Submit Attendance</h3>
                            <p className="text-sm sm:text-base text-gray-500 mb-6 text-center">Finalizing your attendance record.</p>
                            <Spinner message={attendanceStatus.message} isVisible={attendanceStatus.status === 'loading'} />
                            <StatusCard
                                icon={Scan}
                                title="Attendance Submission"
                                status={attendanceStatus.status}
                                message={attendanceStatus.message || 'Ready to submit...'}
                            />
                        </motion.div>
                    )}

                    {currentStep === 5 && (
                        <motion.div
                            key="attendance-complete"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center justify-center text-center"
                        >
                            <CheckCircle size={64} className="text-green-500 mb-4" />
                            <h3 className="text-2xl sm:text-3xl font-bold text-green-700 mb-2">Attendance Marked!</h3>
                            <p className="text-base sm:text-lg text-gray-600 mb-6">Your attendance for the session has been successfully recorded.</p>
                            <button
                                onClick={() => {
                                    setCurrentStep(0);
                                    setQrScanResult(null);
                                    setFaceRecognitionStatus({ status: 'idle', message: '' });
                                    setLocationStatus({ status: 'idle', message: '' });
                                    setIpStatus({ status: 'idle', message: '' });
                                    setAttendanceStatus({ status: 'idle', message: '' });
                                    setOverallLoading(false);
                                    setQrScannerReady(false);
                                    setSessionDetails(null);
                                }}
                                className="px-6 py-3 sm:px-8 sm:py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors transform hover:scale-105 text-sm sm:text-base"
                            >
                                Mark New Attendance
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StudentDashboardHome;
