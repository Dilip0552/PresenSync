import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import * as faceapi from 'face-api.js';
import { CheckCircle, XCircle, MapPin, QrCode, Scan, UserCheck, Wifi, Camera, RefreshCw } from 'lucide-react';
import Spinner from './Spinner';
import NotificationSystem from './NotificationSystem';
import { useFirebase } from './FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';

// --- Backend API Base URL ---
const API_BASE_URL = 'https://presensync.onrender.com';

// Constants for attendance logic
const QR_EXPIRATION_TIME_MS = 5 * 60 * 1000;
const GPS_RADIUS_METERS = 100;
const FACE_MATCH_THRESHOLD = 0.6;
const BLINK_THRESHOLD = 0.4;
const HEAD_TURN_THRESHOLD = 0.1;

// Helper function to calculate Haversine distance between two points
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c;
    return d;
}

// Optimized QR Scanner Component
const OptimizedQRScanner = ({ onScanSuccess, onScanError, isScanning, setIsScanning }) => {
    const [cameraError, setCameraError] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);
    const [scannerReady, setScannerReady] = useState(false);
    const qrCodeScannerRef = useRef(null);
    const scannerContainerRef = useRef(null);
    const lastScanTimeRef = useRef(0);
    const initTimeoutRef = useRef(null);
    const mountedRef = useRef(true);
    const isScannerReadyRef=useRef(false)

    // Cleanup function with better error handling
    const cleanupScanner = useCallback(async () => {
        console.log('Cleaning up QR scanner...');
        try {
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
                initTimeoutRef.current = null;
            }

            if (qrCodeScannerRef.current) {
                try {
                    // Try to clear the scanner safely
                    await qrCodeScannerRef.current.clear();
                } catch (clearError) {
                    console.warn('Error during scanner clear:', clearError);
                    // If clear() fails, try to manually clean up the DOM
                    const qrReaderElement = document.getElementById("qr-reader-camera");
                    if (qrReaderElement) {
                        // Remove all child nodes safely
                        while (qrReaderElement.firstChild) {
                            try {
                                qrReaderElement.removeChild(qrReaderElement.firstChild);
                            } catch (removeError) {
                                console.warn('Error removing child node:', removeError);
                                break; // Exit if we can't remove children
                            }
                        }
                    }
                }
                qrCodeScannerRef.current = null;
            }

            if (mountedRef.current) {
                setScannerReady(false);
            }
        } catch (error) {
            console.warn('Scanner cleanup warning:', error);
        }
    }, []);

    // Enhanced scan success handler with debouncing
    const handleScanSuccess = useCallback((decodedText, decodedResult) => {
        if (!mountedRef.current) return;
        
        const currentTime = Date.now();
        
        // Debounce scans - prevent multiple scans within 1 second
        if (currentTime - lastScanTimeRef.current < 1000) {
            console.log('Scan ignored due to debouncing');
            return;
        }
        
        lastScanTimeRef.current = currentTime;
        console.log('QR Code detected:', decodedText);
        
        // Immediately stop scanning to prevent multiple reads
        setIsScanning(false);
        
        // Cleanup scanner after successful scan
        setTimeout(() => {
            cleanupScanner();
        }, 100);
        
        onScanSuccess(decodedText);
    }, [onScanSuccess, cleanupScanner, setIsScanning]);

    // Enhanced error handler
    const handleScanError = useCallback((errorMessage) => {
        // Filter out frequent "not found" errors to reduce noise
        if (errorMessage.includes('QR code not found') || 
            errorMessage.includes('No QR code found')) {
            return; // Don't show these frequent errors
        }
        
        console.warn('QR Scan Error:', errorMessage);
        
        if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
            setCameraError('Camera access denied. Please allow camera permissions.');
            onScanError('Camera access denied. Please allow camera permissions.');
        } else if (errorMessage.includes('NotFoundError')) {
            setCameraError('No camera found. Please ensure a camera is connected.');
            onScanError('No camera found. Please ensure a camera is connected.');
        } else if (errorMessage.includes('NotReadableError')) {
            setCameraError('Camera is being used by another application.');
            onScanError('Camera is being used by another application.');
        }
    }, [onScanError]);

    // Initialize camera scanner with improved error handling
    const initializeCameraScanner = useCallback(async () => {
        if (!mountedRef.current || scannerReady || !isScanning) {
            console.log('Scanner init skipped - not mounted, already ready, or not scanning');
            return;
        }

        console.log('Starting QR scanner initialization...');
        setIsInitializing(true);
        setCameraError('');

        try {
            // Clean up any existing scanners first
            await cleanupScanner();

            // Wait for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 200));

            if (!mountedRef.current) return;

            const qrReaderElement = document.getElementById("qr-reader-camera");
            if (!qrReaderElement) {
                throw new Error('QR reader element not found in DOM');
            }

            // Ensure the element is empty before initializing
            qrReaderElement.innerHTML = '';

            // Simplified and more reliable scanner configuration
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false,
                videoConstraints: {
                    facingMode: "environment"
                }
            };

            // Add timeout for initialization
            initTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current && !scannerReady) {
                    console.error('Scanner initialization timeout');
                    setCameraError('Camera initialization timeout. Please refresh and try again.');
                    onScanError('Camera initialization timeout.');
                    setIsInitializing(false);
                }
            }, 15000); // 15 second timeout

            const scanner = new Html5QrcodeScanner("qr-reader-camera", config, false);

            const onScanSuccessWrapper = (decodedText, decodedResult) => {
                if (!mountedRef.current) return;
                
                if (initTimeoutRef.current) {
                    clearTimeout(initTimeoutRef.current);
                    initTimeoutRef.current = null;
                }
                console.log('Camera scan success:', decodedText);
                handleScanSuccess(decodedText, decodedResult);
            };

            const onScanErrorWrapper = (errorMessage) => {
                if (!mountedRef.current) return;
                handleScanError(errorMessage);
            };

            scanner.render(onScanSuccessWrapper, onScanErrorWrapper);

            if (!mountedRef.current) {
                // Component unmounted during initialization
                try {
                    await scanner.clear();
                } catch (e) {
                    console.warn('Error cleaning up scanner after unmount:', e);
                }
                return;
            }

            qrCodeScannerRef.current = scanner;
            setScannerReady(true);
            
            if (initTimeoutRef.current) {
                clearTimeout(initTimeoutRef.current);
                initTimeoutRef.current = null;
            }

            console.log('QR scanner initialized successfully');

        } catch (error) {
            console.error('Scanner initialization error:', error);
            if (mountedRef.current) {
                setCameraError(`Failed to initialize camera: ${error.message}`);
                onScanError(`Failed to initialize camera: ${error.message}`);
            }
        } finally {
            if (mountedRef.current) {
                setIsInitializing(false);
            }
        }
    }, [isScanning, scannerReady, cleanupScanner, handleScanSuccess, handleScanError, onScanError]);

    // Initialize scanner when component mounts and isScanning becomes true
    useEffect(() => {
        mountedRef.current = true;

        if (isScanning) {
            console.log('Starting QR scanner initialization...');
            // Small delay to ensure DOM is ready
            const timeoutId = setTimeout(() => {
                if (mountedRef.current) {
                    initializeCameraScanner();
                }
            }, 100);

            return () => {
                clearTimeout(timeoutId);
            };
        }

        return () => {
            // This return is for the outer useEffect
        };
    }, [isScanning, initializeCameraScanner]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('QR scanner component unmounting...');
            mountedRef.current = false;
            cleanupScanner();
        };
    }, [cleanupScanner]);

    // Restart camera scanner
    const restartScanner = useCallback(() => {
        if (!mountedRef.current) return;
        
        console.log('Restarting QR scanner...');
        setCameraError('');
        setScannerReady(false);
        
        cleanupScanner().then(() => {
            if (mountedRef.current) {
                setTimeout(() => {
                    if (mountedRef.current) {
                        initializeCameraScanner();
                    }
                }, 500);
            }
        });
    }, [cleanupScanner, initializeCameraScanner]);

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Scanner Container */}
            <div className="relative">
                <div className="relative">
                    <div 
                        id="qr-reader-camera" 
                        ref={scannerContainerRef}
                        className="w-full bg-gray-100 rounded-xl overflow-hidden shadow-inner min-h-[320px] flex items-center justify-center"
                    >
                        {(isInitializing || (!scannerReady && isScanning)) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 bg-opacity-90 z-10">
                                <Spinner message="Starting camera..." isVisible={true} />
                                <p className="text-sm text-gray-600 mt-4 px-4 text-center">
                                    Please allow camera access when prompted
                                </p>
                            </div>
                        )}
                        
                        {/* Scanning frame overlay */}
                        {!cameraError && isScanning && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                <div className="w-64 h-64 border-4 border-dashed border-blue-400 rounded-xl opacity-70 animate-pulse"></div>
                            </div>
                        )}
                    </div>
                    
                    {/* Camera Error Display */}
                    {cameraError && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm font-medium mb-3">{cameraError}</p>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={restartScanner}
                                    className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    Retry Camera
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                                >
                                    Refresh Page
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Scanning Indicator */}
                {isScanning && !cameraError && isScannerReadyRef.current && (
                    <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center z-30">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        Scanning...
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">📱 Scanning Tips:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensure good lighting conditions</li>
                    <li>• Hold the QR code steady and centered</li>
                    <li>• Keep the camera 6-12 inches from the code</li>
                    <li>• Allow camera permissions when prompted</li>
                    <li>• Make sure no other apps are using the camera</li>
                </ul>
            </div>
        </div>
    );
};

const StudentDashboardHome = ({ addNotification, studentProfile }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [qrScanResult, setQrScanResult] = useState(null);
    const [faceRecognitionStatus, setFaceRecognitionStatus] = useState({ status: 'idle', message: '' });
    const [locationStatus, setLocationStatus] = useState({ status: 'idle', message: '' });
    const [ipStatus, setIpStatus] = useState({ status: 'idle', message: '' });
    const [attendanceStatus, setAttendanceStatus] = useState({ status: 'idle', message: '' });
    const [overallLoading, setOverallLoading] = useState(false);
    const [sessionDetails, setSessionDetails] = useState(null);
    const [currentGeolocation, setCurrentGeolocation] = useState(null);
    const [faceAuthComplete, setFaceAuthComplete] = useState(false);
    const [isScanning, setIsScanning] = useState(true); // Control scanning state
    
    const videoRef = useRef();
    const canvasRef = useRef();
    const faceMatcherRef = useRef(null);
    const livenessBlinkCountRef = useRef(0);
    const livenessHeadTurnCountRef = useRef(0);
    const lastBlinkTimeRef = useRef(0);
    const lastHeadTurnTimeRef = useRef(0);
    const prevFaceDetectionRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const isModelsReadyRef = useRef(false);
    const isMountedRef = useRef(true);
    
    const verificationStatesRef = useRef({
        faceVerified: false,
        locationVerified: false,
        ipVerified: false
    });

    const { db, userId, idToken } = useFirebase();
    const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    // Step definitions for progress tracker
    const steps = [
        { name: 'Scan QR Code', icon: QrCode, status: qrScanResult ? 'completed' : 'pending' },
        { name: 'Face Authentication', icon: UserCheck, status: verificationStatesRef.current.faceVerified ? 'completed' : faceRecognitionStatus.status === 'failed' ? 'failed' : 'pending' },
        { name: 'Location Check', icon: MapPin, status: verificationStatesRef.current.locationVerified ? 'completed' : locationStatus.status === 'failed' ? 'failed' : 'pending' },
        { name: 'IP Check (Optional)', icon: Wifi, status: verificationStatesRef.current.ipVerified ? 'completed' : ipStatus.status === 'failed' ? 'failed' : 'pending' },
        { name: 'Submit Attendance', icon: Scan, status: attendanceStatus.status === 'success' ? 'completed' : attendanceStatus.status === 'failed' ? 'failed' : 'pending' },
    ];

    // Enhanced QR scan success handler
    const handleQrScanSuccess = useCallback(async (decodedText) => {
        setOverallLoading(true);
        setIsScanning(false); // Stop scanning immediately
        
        try {
            const qrData = JSON.parse(decodedText);
            const { sessionId, timestamp, classId, teacherId, classroomLat, classroomLon } = qrData;

            if (!sessionId || !timestamp || !classId || !teacherId) {
                throw new Error('Invalid QR Code data structure!');
            }
            
            console.log("QR Data:", qrData);
            const sessionPath = `artifacts/${appId}/users/${teacherId}/sessions/${sessionId}`;
            console.log("Attempting to fetch session from path:", sessionPath);

            const sessionDocRef = doc(db, `artifacts/${appId}/users/${teacherId}/sessions`, sessionId);
            const sessionSnap = await getDoc(sessionDocRef);

            if (!sessionSnap.exists()) {
                console.error("Session document does not exist at path:", sessionPath);
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
                setCurrentStep(1);
            }
        } catch (error) {
            console.error("Error processing QR code:", error);
            addNotification(error.message, 'error');
            setQrScanResult(null);
            setIsScanning(true); // Resume scanning on error
        } finally {
            if (isMountedRef.current) {
                setOverallLoading(false);
            }
        }
    }, [addNotification, db, appId]);

    // QR scan error handler
    const handleQrScanError = useCallback((errorMessage) => {
        console.warn('QR scan error:', errorMessage);
        addNotification(errorMessage, 'error');
    }, [addNotification]);

    // Reset to initial state
    const resetToInitialState = useCallback(() => {
        setCurrentStep(0);
        setQrScanResult(null);
        setFaceRecognitionStatus({ status: 'idle', message: '' });
        setLocationStatus({ status: 'idle', message: '' });
        setIpStatus({ status: 'idle', message: '' });
        setAttendanceStatus({ status: 'idle', message: '' });
        setOverallLoading(false);
        setSessionDetails(null);
        setFaceAuthComplete(false);
        setIsScanning(true);
        verificationStatesRef.current = {
            faceVerified: false,
            locationVerified: false,
            ipVerified: false
        };
    }, []);

    // Face recognition logic (keeping existing implementation)
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
        if (faceAuthComplete || !isModelsReadyRef.current || !videoRef.current || videoRef.current.paused || videoRef.current.ended || !faceMatcherRef.current) {
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
                        verificationStatesRef.current.faceVerified = true;
                        setFaceRecognitionStatus({ status: 'success', message: 'Face matched and liveness confirmed!' });
                        addNotification('Face authentication successful!', 'success');
                        setFaceAuthComplete(true);
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
    }, [addNotification, stopCamera, userId, faceAuthComplete]);

    const initializeFaceRecognition = useCallback(async () => {
        setOverallLoading(true);
        setFaceRecognitionStatus({ status: 'loading', message: 'Loading face models...' });

        if (!studentProfile || !studentProfile.faceDescriptor) {
            addNotification('Student face data not found. Please register your face first.', 'error');
            setFaceRecognitionStatus({ status: 'failed', message: 'Face data missing.' });
            setOverallLoading(false);
            return;
        }

        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

            if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceLandmark68Net.isLoaded || !faceapi.nets.faceRecognitionNet.isLoaded) {
                throw new Error("Face-API models failed to load completely. Check manifest files.");
            }
            isModelsReadyRef.current = true;

            const savedDescriptor = JSON.parse(studentProfile.faceDescriptor);

            const labeledDescriptors = new faceapi.LabeledFaceDescriptors(
                userId,
                [new Float32Array(Object.values(savedDescriptor))]
            );

            faceMatcherRef.current = new faceapi.FaceMatcher([labeledDescriptors]);

            setFaceRecognitionStatus({ status: 'idle', message: 'Models and face data loaded. Ready for face scan.' });
            setFaceAuthComplete(false);

            await startCamera();

            detectionIntervalRef.current = setInterval(() => {
                detectFaceAndLiveness();
            }, 100);

            setOverallLoading(false);
        } catch (error) {
            console.error("Error initializing face recognition:", error);
            addNotification('Failed to initialize face recognition. Ensure models are in public/models, face data is registered, and camera access is allowed.', 'error');
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

    // GPS Location Check Logic
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

                    console.log(`Classroom Coordinates: Lat=${CLASSROOM_LAT}, Lon=${CLASSROOM_LON}`);
                    console.log(`Student Coordinates: Lat=${studentLat}, Lon=${studentLon}`);
                    console.log(`Calculated Distance: ${distance} meters`);

                    if (distance <= GPS_RADIUS_METERS) {
                        verificationStatesRef.current.locationVerified = true;
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

    const checkPublicIP = useCallback(async () => {
        setOverallLoading(true);
        setIpStatus({ status: 'loading', message: 'Checking public IP...' });
        
        if (!sessionDetails || !sessionDetails.classroomIp) {
            setIpStatus({ status: 'failed', message: 'Classroom IP not available in session data.' });
            addNotification('Cannot perform IP check: missing classroom IP.', 'error');
            setOverallLoading(false);
            return;
        }

        try {
            const classroomIp = sessionDetails.classroomIp;
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            const studentIp = data.ip;

            const classroomIpPrefix = classroomIp.split('.').slice(0, 2).join('.');
            const studentIpPrefix = studentIp.split('.').slice(0, 2).join('.');

            console.log(`Classroom IP: ${classroomIp}`);
            console.log(`Student IP: ${studentIp}`);
            console.log(`Classroom IP Prefix: ${classroomIpPrefix}`);
            console.log(`Student IP Prefix: ${studentIpPrefix}`);

            if (studentIpPrefix === classroomIpPrefix) {
                verificationStatesRef.current.ipVerified = true;
                setIpStatus({ status: 'success', message: `IP prefix matched: ${studentIpPrefix}` });
                addNotification('Network check successful!', 'success');
                setCurrentStep(4);
            } else {
                setIpStatus({ status: 'failed', message: `Network mismatch. Your IP prefix: ${studentIpPrefix}` });
                addNotification('You are not on the correct Wi-Fi network.', 'error');
            }
        } catch (error) {
            console.error("Error fetching IP:", error);
            setIpStatus({ status: 'failed', message: 'Failed to retrieve public IP.' });
            addNotification('Could not check public IP.', 'warning');
        } finally {
            setOverallLoading(false);
        }
    }, [addNotification, sessionDetails]);

    useEffect(() => {
        if (currentStep === 3) {
            checkPublicIP();
        }
    }, [currentStep, checkPublicIP]);

    // Attendance Submission Logic
    const markAttendance = useCallback(async () => {
        setOverallLoading(true);
        setAttendanceStatus({ status: 'loading', message: 'Submitting attendance...' });
        
        if (
            !qrScanResult || 
            !sessionDetails || 
            !userId || 
            !idToken || 
            !currentGeolocation || 
            !verificationStatesRef.current.faceVerified || 
            !verificationStatesRef.current.locationVerified || 
            (sessionDetails.classroomIp && !verificationStatesRef.current.ipVerified)
        ) {
            console.error("Attendance submission failed. Prerequisites not met.", {
                qrScanResult: !!qrScanResult,
                sessionDetails: !!sessionDetails,
                userId: !!userId,
                idToken: !!idToken,
                currentGeolocation: !!currentGeolocation,
                faceVerified: verificationStatesRef.current.faceVerified,
                locationVerified: verificationStatesRef.current.locationVerified,
                ipVerified: verificationStatesRef.current.ipVerified,
            });

            setAttendanceStatus({ status: 'failed', message: 'One or more pre-requisite checks failed. Cannot submit.' });
            addNotification('Pre-requisite checks failed. Cannot mark attendance.', 'error');
            setOverallLoading(false);
            return;
        }
        
        const attendanceData = {
            sessionId: qrScanResult.sessionId,
            studentId: userId,
            timestamp: new Date().toISOString(),
            latitude: currentGeolocation.latitude,
            longitude: currentGeolocation.longitude,
            faceMatchConfidence: FACE_MATCH_THRESHOLD,
            ipAddress: ipStatus.message.includes('matched') ? ipStatus.message.split(': ')[1] : 'N/A',
            classId: qrScanResult.classId,
            className: qrScanResult.className,
            teacherId: qrScanResult.teacherId,
        };

        console.log("StudentDashboardHome: Sending attendance data to backend:", attendanceData);

        try {
            // Test backend connectivity
            console.log("Testing backend connectivity...");
            setAttendanceStatus({ status: 'loading', message: 'Testing server connection...' });
            
            try {
                const healthResponse = await fetch(`${API_BASE_URL}/`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(10000)
                });
                console.log("Backend health check response:", healthResponse.status, healthResponse.statusText);
                
                if (!healthResponse.ok) {
                    throw new Error(`Backend server returned ${healthResponse.status}: ${healthResponse.statusText}`);
                }
                
                const healthData = await healthResponse.json();
                console.log("Backend health data:", healthData);
                
            } catch (healthError) {
                console.error("Backend health check failed:", healthError);
                
                if (healthError.name === 'TimeoutError') {
                    throw new Error('Backend server timeout - please check if the server is running');
                } else if (healthError.message.includes('fetch')) {
                    throw new Error('Cannot reach backend server - please check your internet connection');
                } else {
                    throw new Error(`Backend connectivity issue: ${healthError.message}`);
                }
            }

            // Submit attendance
            console.log("Submitting attendance...");
            setAttendanceStatus({ status: 'loading', message: 'Submitting attendance data...' });
            
            const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                    'Accept': 'application/json',
                },
                body: JSON.stringify(attendanceData),
                signal: AbortSignal.timeout(15000)
            });

            console.log("Attendance submission response status:", response.status);

            const result = await response.json();
            console.log("StudentDashboardHome: Backend response:", result);

            if (response.ok) {
                setAttendanceStatus({ status: 'success', message: result.message });
                addNotification(result.message, 'success');
                setCurrentStep(5);
            } else {
                let errorMessage = result.detail || 'Failed to submit attendance.';
                
                switch (response.status) {
                    case 400:
                        errorMessage = `Bad Request: ${result.detail || 'Invalid attendance data'}`;
                        break;
                    case 401:
                        errorMessage = 'Authentication failed - please log in again';
                        break;
                    case 403:
                        errorMessage = 'Access denied - insufficient permissions';
                        break;
                    case 404:
                        errorMessage = 'Attendance endpoint not found';
                        break;
                    case 409:
                        errorMessage = result.detail || 'Attendance already marked for this session';
                        break;
                    case 422:
                        errorMessage = `Validation Error: ${result.detail || 'Invalid data format'}`;
                        break;
                    case 500:
                        errorMessage = 'Server error - please try again later';
                        break;
                    default:
                        errorMessage = `Server returned ${response.status}: ${result.detail || response.statusText}`;
                }
                
                setAttendanceStatus({ status: 'failed', message: errorMessage });
                addNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error("StudentDashboardHome: Error submitting attendance to backend:", error);
            
            let userFriendlyMessage;
            
            if (error.name === 'TimeoutError') {
                userFriendlyMessage = 'Request timeout - server is taking too long to respond';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                userFriendlyMessage = 'Network error - please check your internet connection and try again';
            } else if (error.message.includes('CORS')) {
                userFriendlyMessage = 'Server configuration error - please contact support';
            } else if (error.message.includes('Cannot reach backend')) {
                userFriendlyMessage = error.message;
            } else if (error.message.includes('Backend server timeout')) {
                userFriendlyMessage = error.message;
            } else {
                userFriendlyMessage = `Connection error: ${error.message}`;
            }
            
            setAttendanceStatus({ status: 'failed', message: userFriendlyMessage });
            addNotification(userFriendlyMessage, 'error');
        } finally {
            setOverallLoading(false);
        }
    }, [addNotification, qrScanResult, sessionDetails, userId, idToken, currentGeolocation, ipStatus.message]);

    useEffect(() => {
        if (currentStep === 4) {
            markAttendance();
        }
    }, [currentStep, markAttendance]);

    // UI Components
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

    const ProgressBar = ({ steps, currentStep }) => {
        return (
            <div className="flex justify-between items-center w-full mb-8">
                <div className="flex flex-wrap justify-between items-center w-full sm:flex-nowrap">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.name}>
                            <div className="flex flex-col items-center flex-1 min-w-[80px] sm:min-w-0 px-1">
                                <motion.div
                                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                        index <= currentStep ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: index === currentStep ? 1.1 : 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                    <step.icon size={16} className="sm:size-[20px]" />
                                </motion.div>
                                <p className={`text-xs mt-1 text-center ${index <= currentStep ? 'text-indigo-700 font-medium' : 'text-gray-500'} hidden sm:block`}>
                                    {step.name}
                                </p>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="flex-1 h-1 bg-gray-200 mx-1 sm:mx-2 relative hidden sm:block">
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
        <AnimatePresence mode="wait">
            <motion.div
                key="dashboardHome-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex flex-col items-start justify-start relative"
            >
                <div className="min-h-full bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4 font-inter w-full">
                    <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-8 w-full max-w-4xl transform transition-all duration-500 ease-in-out scale-95 md:scale-100 relative">
                        <h2 className="text-2xl sm:text-3xl font-bold text-center text-indigo-800 mb-6 sm:mb-8">Mark Your Attendance</h2>

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
                                    <p className="text-sm sm:text-base text-gray-500 mb-6 text-center">Position the QR code within the scanning area or upload an image.</p>
                                    
                                    <OptimizedQRScanner
                                        onScanSuccess={handleQrScanSuccess}
                                        onScanError={handleQrScanError}
                                        isScanning={isScanning}
                                        setIsScanning={setIsScanning}
                                    />
                                    
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
                                    <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
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
                                                verificationStatesRef.current.faceVerified = false;
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
                                            onClick={() => {
                                                verificationStatesRef.current.locationVerified = false;
                                                checkGPSLocation();
                                            }}
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
                                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Step 4: IP Address Check</h3>
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
                                            onClick={() => {
                                                verificationStatesRef.current.ipVerified = false;
                                                checkPublicIP();
                                            }}
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
                                        onClick={resetToInitialState}
                                        className="px-6 py-3 sm:px-8 sm:py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors transform hover:scale-105 text-sm sm:text-base"
                                    >
                                        Mark New Attendance
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default StudentDashboardHome;