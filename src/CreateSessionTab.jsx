import React, { useState, useEffect, useCallback } from 'react';
import QRCodeComp from "./QRCodeComp";
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from './Spinner';
import { MapPin, CheckCircle, Wifi } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

function CreateSessionTab({ classes, addNotification }) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('min');
  const [startTime, setStartTime] = useState('');
  const [currentView, setCurrentView] = useState("form");
  const [sessionDetailsForQR, setSessionDetailsForQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false); // New state to handle loading for session resumption
  const [location, setLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [publicIp, setPublicIp] = useState(null);
  const [isFetchingIp, setIsFetchingIp] = useState(false);
  const [extendTime, setExtendTime] = useState(30);

  const { db, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'presensync-app';

  // Resume active session on component mount
  useEffect(() => {
    if (db && userId) {
      setIsLoadingSession(true); // Start loading
      const q = query(collection(db, `artifacts/${appId}/users/${userId}/sessions`), where("status", "==", "active"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const activeSession = snapshot.docs[0];
          const sessionData = { id: activeSession.id, ...activeSession.data() };
          setSessionDetailsForQR(sessionData);
          setCurrentView("qrCode");
          addNotification(`Resuming active session for ${sessionData.className}.`, 'info');
        } else if (currentView === "qrCode") {
          // If no active session is found but we're in QR code view, switch back to form
          setCurrentView("form");
          setSessionDetailsForQR(null);
        }
        setIsLoadingSession(false); // End loading after snapshot
      }, (error) => {
        console.error("Error fetching active session:", error);
        addNotification("Failed to check for active sessions.", "error");
        setIsLoadingSession(false); // End loading on error
      });
      return () => unsubscribe();
    }
  }, [db, userId, appId, addNotification]);

  const fetchTeacherIp = async () => {
    setIsFetchingIp(true);
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setPublicIp(data.ip);
        addNotification("Public IP fetched successfully!", "success");
    } catch (error) {
        console.error("Error fetching IP:", error);
        addNotification("Failed to fetch public IP. Using a placeholder.", "warning");
        setPublicIp('127.0.0.1');
    } finally {
        setIsFetchingIp(false);
    }
  };

  const fetchTeacherLocation = () => {
    setIsFetchingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          addNotification("Location fetched successfully!", "success");
          setIsFetchingLocation(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          addNotification("Failed to get location. Please enable GPS.", "warning");
          setIsFetchingLocation(false);
        }
      );
    } else {
      addNotification("Geolocation not supported by this browser.", "warning");
      setIsFetchingLocation(false);
    }
  };
  
  // Fetch initial location and IP on component load
  useEffect(() => {
    fetchTeacherIp();
    fetchTeacherLocation();
  }, []);

  const handleCreateSession = async () => {
    if (!selectedClassId || !durationValue || !startTime || !location || !publicIp) {
      addNotification("Please fill in all required fields and fetch location/IP.", "error");
      return;
    }
    
    setLoading(true);
    const selectedClass = classes.find(cls => cls.id === selectedClassId);
    
    try {
      const newSessionData = {
        classId: selectedClassId,
        className: selectedClass.name,
        teacherId: userId,
        startTime: new Date(startTime).toISOString(),
        duration: parseInt(durationValue),
        durationUnit: durationUnit,
        classroomLat: location.latitude,
        classroomLon: location.longitude,
        classroomIp: publicIp,
        totalStudents: selectedClass.enrollmentCount || 0,
        totalPresent: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const sessionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sessions`);
      const docRef = await addDoc(sessionsCollectionRef, newSessionData);
      
      setSessionDetailsForQR({
        sessionId: docRef.id,
        ...newSessionData
      });
      
      setCurrentView("qrCode");
      addNotification("Session created successfully! Share the QR code with your students.", "success");
    } catch (error) {
      console.error("Error creating session:", error);
      addNotification("Failed to create session.", "error");
    } finally {
      setLoading(false);
    }
  };
  
  const handleEndSessionInFirestore = useCallback(async (sessionId) => {
    if (!sessionId) {
      addNotification("Session ID is missing.", "error");
      return;
    }
    setLoading(true);
    try {
      const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/sessions`, sessionId);
      await updateDoc(sessionRef, {
        status: 'ended',
        endTime: new Date().toISOString(),
      });
      addNotification("Session ended successfully!", "success");
    } catch (error) {
      console.error("Error ending session:", error);
      addNotification("Failed to end session.", "error");
    } finally {
      setLoading(false);
      setCurrentView("form");
      setSessionDetailsForQR(null);
    }
  }, [db, userId, appId, addNotification]);

  const handleExtendSession = async () => {
    if (!sessionDetailsForQR?.sessionId) {
      addNotification("No active session to extend.", "error");
      return;
    }
    if (!extendTime || extendTime <= 0) {
      addNotification("Please enter a valid duration to extend.", "error");
      return;
    }

    setLoading(true);
    try {
      const sessionRef = doc(db, `artifacts/${appId}/users/${userId}/sessions`, sessionDetailsForQR.sessionId);
      const newDuration = sessionDetailsForQR.duration + parseInt(extendTime);

      await updateDoc(sessionRef, {
        duration: newDuration,
        lastUpdated: new Date().toISOString(),
      });
      
      setSessionDetailsForQR(prev => ({
        ...prev,
        duration: newDuration
      }));
      addNotification(`Session extended by ${extendTime} minutes.`, "success");
    } catch (error) {
      console.error("Error extending session:", error);
      addNotification("Failed to extend session.", "error");
    } finally {
      setLoading(false);
    }
  };


  const renderSessionForm = () => (
    <motion.div
      key="session-form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full flex flex-col h-full items-start justify-start relative"
    >
      <h2 className="text-2xl font-bold text-blue-800 mb-6">Create New Session</h2>
      <div className="w-full flex-grow flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <label htmlFor="class-select" className="block text-sm font-medium text-gray-700">
              Select Class *
            </label>
            <select
              id="class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
            >
              <option value="">-- Select a class --</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.enrollmentCount} students)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">
              Session Start Time *
            </label>
            <input
              type="datetime-local"
              id="start-time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
              Duration *
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="number"
                id="duration"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className="flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                min="1"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value)}
                className="rounded-none rounded-r-md pl-3 pr-10 py-2 border border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
              >
                <option value="min">Minutes</option>
                <option value="hrs">Hours</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white p-6 rounded-lg shadow-sm space-y-4 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Verification Settings</h3>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
            <MapPin size={20} className="text-blue-500" />
            <div className="flex-grow">
              <p className="font-semibold text-gray-700">Classroom Location</p>
              {location ? (
                <p className="text-sm text-green-600">Fetched: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
              ) : (
                <p className="text-sm text-red-600">Not set. Click to fetch.</p>
              )}
            </div>
            <button
              onClick={fetchTeacherLocation}
              disabled={isFetchingLocation || loading}
              className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              {isFetchingLocation ? <Spinner size="small" /> : 'Fetch'}
            </button>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
            <Wifi size={20} className="text-blue-500" />
            <div className="flex-grow">
              <p className="font-semibold text-gray-700">Public IP Address</p>
              {publicIp ? (
                <p className="text-sm text-green-600">Fetched: {publicIp}</p>
              ) : (
                <p className="text-sm text-red-600">Not set. Click to fetch.</p>
              )}
            </div>
            <button
              onClick={fetchTeacherIp}
              disabled={isFetchingIp || loading}
              className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              {isFetchingIp ? <Spinner size="small" /> : 'Fetch'}
            </button>
          </div>
        </div>
      </div>
      <button
        onClick={handleCreateSession}
        className={`px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md mt-6 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
        disabled={loading || !location || !publicIp || !selectedClassId || !durationValue || !startTime}
      >
        {loading ? <Spinner size="small" color="white" /> : 'Create Session'}
      </button>
    </motion.div>
  );

  const renderQRCodeSection = () => (
    <div className="flex flex-col items-center justify-center h-full w-full py-4 transition-all duration-300">
      <p className="text-gray-600 mb-4 text-center">Share this QR code with students for attendance.</p>
      {isLoadingSession ? (
        <Spinner message="Loading session details..." />
      ) : (
        sessionDetailsForQR ? (
          <>
            <div className="w-full flex items-center justify-center flex-grow">
              <QRCodeComp
                sessionData={sessionDetailsForQR}
                addNotification={addNotification}
                onEndSession={handleEndSessionInFirestore}
                onExtendSession={handleExtendSession}
              />
            </div>
            <div className="mt-6 flex flex-col items-center space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Extend Session</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={extendTime}
                  onChange={(e) => setExtendTime(parseInt(e.target.value))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center"
                  min="1"
                />
                <span className="text-gray-600">minutes</span>
                <button
                  onClick={handleExtendSession}
                  className={`px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                  disabled={loading}
                >
                  Extend
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-red-500 text-center">No session data available to generate QR code. Please create a new session.</p>
        )
      )}
    </div>
  );

  return (
    <div className="w-full h-full p-4 sm:p-6 bg-white rounded-lg shadow-md flex flex-col">
      <AnimatePresence mode="wait">
        {currentView === "form" && renderSessionForm()}
        {currentView === "qrCode" && renderQRCodeSection()}
      </AnimatePresence>
    </div>
  );
}

export default CreateSessionTab;