// src/StudentDashboardHome.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useFirebase } from './FirebaseContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, faceapi } from './firebase'; // Use our central firebase export
import { CheckCircle, MapPin, QrCode, UserCheck, Scan } from 'lucide-react';
import Spinner from './Spinner';

// Helper function to calculate distance
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const StudentDashboardHome = () => {
    const { user, userData, modelsLoaded } = useFirebase();
    const [step, setStep] = useState(0); // 0: QR, 1: Face, 2: GPS, 3: Submit, 4: Done
    const [sessionData, setSessionData] = useState(null);
    const [status, setStatus] = useState({ qr: 'pending', face: 'pending', gps: 'pending', submit: 'pending' });
    const [statusMessage, setStatusMessage] = useState('Waiting to scan QR code...');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const videoRef = useRef();
    const scannerRef = useRef(null); // Ref to hold the scanner instance

    const resetState = () => {
        setStep(0);
        setSessionData(null);
        setStatus({ qr: 'pending', face: 'pending', gps: 'pending', submit: 'pending' });
        setStatusMessage('Waiting to scan QR code...');
        setIsLoading(false);
        setError('');
    };

    // --- QR Code Scanning ---
    useEffect(() => {
        // Only initialize scanner if we are on the QR step
        if (step !== 0) return;

        // Ensure the container exists
        const qrReaderElement = document.getElementById('qr-reader');
        if (!qrReaderElement) return;

        // FIX: Initialize the scanner and store its instance in a ref
        const scanner = new Html5QrcodeScanner(
            'qr-reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false // verbose = false
        );

        const onScanSuccess = async (decodedText) => {
            setIsLoading(true);
            setStatusMessage('QR Code scanned. Verifying session...');
            setError('');

            // FIX: Stop the scanner correctly before proceeding
            if (scannerRef.current) {
                try {
                    await scannerRef.current.clear();
                    scannerRef.current = null;
                } catch (e) {
                    console.error("Failed to clear scanner on success:", e);
                }
            }
            
            try {
                const qrData = JSON.parse(decodedText);
                if (!qrData.sessionId || !qrData.teacherId) {
                    throw new Error("Invalid QR code data.");
                }

                // FIX: Removed backend API call, now using Firebase directly.
                const sessionDocRef = doc(db, 'sessions', qrData.sessionId);
                const sessionSnap = await getDoc(sessionDocRef);

                if (!sessionSnap.exists() || !sessionSnap.data().active) {
                    throw new Error("Session is not active or does not exist.");
                }

                setSessionData({ id: sessionSnap.id, ...sessionSnap.data() });
                setStatus(prev => ({ ...prev, qr: 'completed' }));
                setStatusMessage('Session verified. Proceeding to face recognition...');
                setStep(1);

            } catch (err) {
                console.error("Error processing QR code:", err);
                setError(err.message || 'Invalid QR Code. Please try again.');
                resetState(); // Reset to allow re-scanning
            } finally {
                setIsLoading(false);
            }
        };

        const onScanFailure = (err) => {
            // This callback is often noisy, so we can choose to ignore most errors
            // console.warn(`QR scan failure: ${err}`);
        };

        // Store the instance and start scanning
        scannerRef.current = scanner;
        scanner.render(onScanSuccess, onScanFailure);

        // FIX: Cleanup function to ensure scanner is stopped on unmount
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(e => console.error("Cleanup failed:", e));
                scannerRef.current = null;
            }
        };
    }, [step]); // Rerun this effect only when the 'step' changes

    // --- Face Recognition ---
    const handleFaceRecognition = useCallback(async () => {
        if (!modelsLoaded || !videoRef.current) return;

        setIsLoading(true);
        setStatusMessage('Starting camera for face verification...');
        setError('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            videoRef.current.srcObject = stream;

            await new Promise(resolve => videoRef.current.onloadedmetadata = resolve);

            setStatusMessage('Please look at the camera...');
            const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

            // Stop camera tracks immediately after detection
            stream.getTracks().forEach(track => track.stop());

            if (!detection) {
                throw new Error("No face detected. Please try again in a well-lit area.");
            }

            if (!userData?.faceDescriptor) {
                throw new Error("Your face profile is not set up. Please contact support.");
            }

            const registeredDescriptor = new Float32Array(userData.faceDescriptor);
            const faceMatcher = new faceapi.FaceMatcher([new faceapi.LabeledFaceDescriptors('user', [registeredDescriptor])]);
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

            if (bestMatch.label === 'user' && bestMatch.distance < 0.5) {
                setStatus(prev => ({ ...prev, face: 'completed' }));
                setStatusMessage('Face verified. Checking location...');
                setStep(2);
            } else {
                throw new Error("Face not recognized. Please try again.");
            }
        } catch (err) {
            setError(err.message);
            setStatus(prev => ({ ...prev, face: 'failed' }));
            setStatusMessage('Face verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [modelsLoaded, userData]);

    useEffect(() => {
        if (step === 1) {
            handleFaceRecognition();
        }
    }, [step, handleFaceRecognition]);

    // --- GPS Location Check ---
    const handleLocationCheck = useCallback(() => {
        setIsLoading(true);
        setStatusMessage('Getting your location...');
        setError('');

        if (!sessionData?.location) {
            setError("Session location is missing.");
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const distance = haversineDistance(
                    sessionData.location.latitude,
                    sessionData.location.longitude,
                    latitude,
                    longitude
                );

                if (distance <= 200) { // 200-meter radius
                    setStatus(prev => ({ ...prev, gps: 'completed' }));
                    setStatusMessage('Location verified. Submitting attendance...');
                    setStep(3);
                } else {
                    setError(`You are too far from the class location (${Math.round(distance)}m).`);
                    setStatus(prev => ({ ...prev, gps: 'failed' }));
                }
                setIsLoading(false);
            },
            (err) => {
                setError("Could not access your location. Please enable location services.");
                setStatus(prev => ({ ...prev, gps: 'failed' }));
                setIsLoading(false);
            },
            { enableHighAccuracy: true }
        );
    }, [sessionData]);

    useEffect(() => {
        if (step === 2) {
            handleLocationCheck();
        }
    }, [step, handleLocationCheck]);

    // --- Submit Attendance ---
    const handleSubmitAttendance = useCallback(async () => {
        if (status.qr !== 'completed' || status.face !== 'completed' || status.gps !== 'completed') {
            setError("Cannot submit: Not all verification steps were successful.");
            return;
        }

        setIsLoading(true);
        setStatusMessage('Submitting your attendance...');
        setError('');

        try {
            const sessionDocRef = doc(db, 'sessions', sessionData.id);
            // Atomically update the specific student's attendance in the map
            await updateDoc(sessionDocRef, {
                [`attendees.${user.uid}`]: {
                    status: 'present',
                    timestamp: new Date(),
                    name: userData.name,
                }
            });
            setStatus(prev => ({ ...prev, submit: 'completed' }));
            setStatusMessage('Attendance marked successfully!');
            setStep(4);
        } catch (err) {
            console.error("Error submitting attendance:", err);
            setError("A server error occurred while submitting. Please try again.");
            setStatus(prev => ({ ...prev, submit: 'failed' }));
        } finally {
            setIsLoading(false);
        }
    }, [status, sessionData, user, userData]);

    useEffect(() => {
        if (step === 3) {
            handleSubmitAttendance();
        }
    }, [step, handleSubmitAttendance]);


    const renderStepContent = () => {
        switch (step) {
            case 0:
                return (
                    <div className="text-center">
                        <h3 className="text-xl font-semibold mb-4">Scan Session QR Code</h3>
                        <div id="qr-reader" className="w-full max-w-sm mx-auto aspect-square bg-gray-100 rounded-lg shadow-inner"></div>
                    </div>
                );
            case 1:
                return (
                    <div className="text-center">
                        <h3 className="text-xl font-semibold mb-4">Face Verification</h3>
                        <div className="w-full max-w-sm mx-auto aspect-video bg-black rounded-lg overflow-hidden shadow-inner">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="text-center">
                        <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-800">Attendance Marked!</h3>
                        <p className="text-gray-600 mt-2">You have been successfully marked as present.</p>
                        <button onClick={resetState} className="mt-6 bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700">
                            Mark Another
                        </button>
                    </div>
                );
            default:
                return (
                    <div className="text-center">
                        <Spinner />
                    </div>
                );
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Mark Attendance</h2>
            
            <div className="mb-6 space-y-3">
                <StatusItem icon={QrCode} text="Scan QR Code" status={status.qr} />
                <StatusItem icon={UserCheck} text="Verify Face" status={status.face} />
                <StatusItem icon={MapPin} text="Verify Location" status={status.gps} />
                <StatusItem icon={Scan} text="Submit Record" status={status.submit} />
            </div>

            <div className="p-6 bg-gray-50 rounded-lg min-h-[300px] flex flex-col items-center justify-center">
                {error && <p className="text-red-600 mb-4 font-semibold">{error}</p>}
                <p className="text-blue-600 mb-4 font-medium h-6">{!error && statusMessage}</p>
                {renderStepContent()}
            </div>
        </div>
    );
};

const StatusItem = ({ icon: Icon, text, status }) => {
    const statusStyles = {
        pending: { bg: 'bg-gray-100', text: 'text-gray-500', icon: 'text-gray-400' },
        loading: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-500' },
        completed: { bg: 'bg-green-100', text: 'text-green-700', icon: 'text-green-500' },
        failed: { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-500' },
    };
    const styles = statusStyles[status] || statusStyles.pending;

    return (
        <div className={`flex items-center p-3 rounded-lg transition-all duration-300 ${styles.bg}`}>
            <Icon className={`w-6 h-6 mr-4 ${styles.icon}`} />
            <span className={`font-semibold ${styles.text}`}>{text}</span>
            <div className="ml-auto">
                {status === 'loading' && <Spinner />}
                {status === 'completed' && <CheckCircle className="w-6 h-6 text-green-500" />}
            </div>
        </div>
    );
};

export default StudentDashboardHome;
