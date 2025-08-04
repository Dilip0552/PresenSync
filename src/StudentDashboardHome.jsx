import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as faceapi from 'face-api.js';
import { CheckCircle, XCircle, MapPin, QrCode, Scan, UserCheck, Wifi } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const StudentDashboardHome = () => {
  const [qrResult, setQrResult] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [location, setLocation] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const videoRef = useRef();

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    };
    loadModels();
  }, []);

  // Initialize QR code scanner
  const initScanner = useCallback(() => {
    const html5QrcodeScanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: 250,
    });
    html5QrcodeScanner.render(
      (decodedText) => {
        setQrResult(decodedText);
        html5QrcodeScanner.clear();
      },
      (errorMessage) => {
        console.warn(errorMessage);
      }
    );
    setScanner(html5QrcodeScanner);
  }, []);

  // Start face detection
  const startFaceDetection = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    videoRef.current.srcObject = stream;
    videoRef.current.play();

    const detect = async () => {
      if (videoRef.current) {
        const result = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
        setFaceDetected(!!result);
      }
    };

    const intervalId = setInterval(detect, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Get user's GPS location
  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.error('Error fetching location:', err);
        }
      );
    }
  };

  const handleStart = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' });
      setCameraPermission(permissionStatus.state);
      if (permissionStatus.state === 'granted') {
        initScanner();
        startFaceDetection();
        fetchLocation();
        setIsScanning(true);
      } else {
        alert('Please allow camera access!');
      }
    } catch (error) {
      console.error('Permission check failed:', error);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center space-x-4">
            <QrCode className="w-8 h-8 text-blue-500" />
            <div>
              <h2 className="font-semibold">QR Scan</h2>
              <p>{qrResult || 'Scan a QR Code'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <UserCheck className="w-8 h-8 text-green-500" />
            <div>
              <h2 className="font-semibold">Face Detection</h2>
              <p>{faceDetected ? 'Face Detected ✅' : 'No Face Detected ❌'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center space-x-4">
            <MapPin className="w-8 h-8 text-red-500" />
            <div>
              <h2 className="font-semibold">GPS Location</h2>
              <p>
                {location
                  ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`
                  : 'Fetching location...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <button
          onClick={handleStart}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-all"
        >
          {isScanning ? 'Scanning...' : 'Start Attendance'}
        </button>
      </div>

      <div id="qr-reader" className="w-full max-w-md mx-auto mt-6" />

      <video
        ref={videoRef}
        className="w-full max-w-md mx-auto mt-6 rounded-lg shadow"
        autoPlay
        muted
      />
    </div>
  );
};

export default StudentDashboardHome;
