// src/FaceRegistration.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useFirebase } from './FirebaseContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useNavigate } from 'react-router-dom';

const FaceRegistration = () => {
  const videoRef = useRef();
  const { user, modelsLoaded } = useFirebase();
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!modelsLoaded) {
      setStatus('Loading face models, please wait...');
      return;
    }
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        videoRef.current.srcObject = stream;
        setStatus('Position your face in the frame.');
      } catch (err) {
        setError('Camera access denied. Please enable permissions.');
      }
    };
    startVideo();
  }, [modelsLoaded]);

  const handleCapture = async () => {
    if (!user) {
      setError('You are not logged in.');
      return;
    }
    setLoading(true);
    setError('');
    setStatus('Analyzing face...');

    const { faceapi } = await import('./firebase');
    const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
      setError('No face detected. Please try again.');
      setLoading(false);
      return;
    }

    setStatus('Face captured! Saving profile...');
    const faceDescriptor = Array.from(detection.descriptor);
    const userDocRef = doc(db, 'users', user.uid);

    try {
      await updateDoc(userDocRef, { faceDescriptor });
      // Stop the camera track
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      navigate('/student-dashboard');
    } catch (err) {
      setError('Failed to save face data.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold mb-4">Face Registration</h2>
        <p className="text-gray-600 mb-4">This is a one-time setup for security.</p>
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}
        <div className="w-full max-w-md bg-black rounded-lg overflow-hidden shadow-lg">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-auto"></video>
        </div>
        <p className="my-4 font-semibold">{status}</p>
        <button onClick={handleCapture} disabled={loading || !modelsLoaded} className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400">
            {loading ? 'Saving...' : 'Capture and Complete'}
        </button>
    </div>
  );
};

export default FaceRegistration;
