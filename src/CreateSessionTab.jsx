import React, { useState } from 'react';
import QRCodeComp from "./QRCodeComp";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from './Spinner';
import { MapPin, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

function CreateSessionTab({ classes, addNotification }) {
  const [selectedClassId, setSelectedClassId] = useState(''); // Store class ID
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('min');
  const [startTime, setStartTime] = useState('');

  const [currentView, setCurrentView] = useState("form");
  const [sessionDetailsForQR, setSessionDetailsForQR] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // NEW STATE FOR LOCATION
  const [location, setLocation] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const { db, userId } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  const handleGetLocation = () => {
    setIsFetchingLocation(true);
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                addNotification('Location retrieved successfully!', 'success');
                setIsFetchingLocation(false);
            },
            (error) => {
                console.error("Geolocation error:", error);
                addNotification('Failed to get location. Please enable GPS and allow permissions.', 'error');
                setIsFetchingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        addNotification('Geolocation not supported by this browser.', 'error');
        setIsFetchingLocation(false);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedClassId) {
      addNotification("Please select a class.", "error");
      return;
    }
    if (!durationValue || isNaN(durationValue) || parseInt(durationValue) <= 0) {
      addNotification("Please enter a valid session duration (e.g., 30).", "error");
      return;
    }
    if (!startTime) {
      addNotification("Please select a start date and time.", "error");
      return;
    }
    // ADDED CHECK FOR LOCATION
    if (!location) {
        addNotification("Please get the classroom location first.", "error");
        return;
    }

    setLoading(true);
    try {
      const selectedClass = classes.find(cls => cls.id === selectedClassId);
      if (!selectedClass) {
        addNotification("Selected class not found.", "error");
        setLoading(false);
        return;
      }

      const sessionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sessions`);
      const newSessionDoc = await addDoc(sessionsCollectionRef, {
        classId: selectedClass.id,
        className: selectedClass.name, // Store class name for easier display
        teacherId: userId,
        duration: parseInt(durationValue),
        durationUnit: durationUnit,
        startTime: new Date(startTime).toISOString(), // Store as ISO string for consistency
        createdAt: new Date().toISOString(),
        status: 'active', // 'active', 'ended'
        totalStudents: selectedClass.students ? selectedClass.students.length : 0,
        totalPresent: 0,
        totalAbsent: 0,
        // Using the live fetched location
        classroomLat: location.latitude,
        classroomLon: location.longitude,
      });

      const qrData = {
        sessionId: newSessionDoc.id,
        timestamp: Date.now(), // Current time for QR expiration
        classId: selectedClass.id,
        className: selectedClass.name,
        teacherId: userId,
        // Include location for student side validation
        classroomLat: location.latitude,
        classroomLon: location.longitude,
      };

      setSessionDetailsForQR(qrData);
      setCurrentView("qrCode");
      addNotification("Session created successfully! QR code is now displayed.", "success");

    } catch (error) {
      console.error("Error creating session:", error);
      addNotification("Failed to create session. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEndSessionInFirestore = async (sessionId) => {
    setLoading(true);
    try {
      const sessionDocRef = doc(db, `artifacts/${appId}/users/${userId}/sessions`, sessionId);
      await updateDoc(sessionDocRef, {
        status: 'ended',
        endTime: new Date().toISOString(),
      });
      addNotification("Session ended successfully!", "success");
    } catch (error) {
      console.error("Error ending session in Firestore:", error);
      addNotification("Failed to end session. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCreateSession = () => {
    setCurrentView("form");
    setSessionDetailsForQR(null);
    setSelectedClassId('');
    setDurationValue('');
    setStartTime('');
    setLocation(null); // Reset location
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start">
      {loading && <Spinner message="Creating session..." />}

      {currentView === "form" && (
        <div className="w-full h-full flex flex-col items-start justify-start transition-all duration-300 ">
          <h2 className="text-2xl font-semibold text-blue-700 mb-6">Create New Session</h2>

          <div className="w-full space-y-6 flex-grow overflow-y-auto px-1">
            <div className="flex flex-col items-start">
              <label htmlFor="selectClass" className="text-lg font-semibold text-gray-700 mb-2">Class</label>
              <select
                name="class"
                id="selectClass"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full md:w-80 px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
              >
                <option value="">-- Select a class --</option>
                {classes.map((myclass) => (
                  <option key={myclass.id} value={myclass.id}>{myclass.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-start">
              <label className="text-lg font-semibold text-gray-700 mb-2">Time Duration</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  className="w-28 px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  placeholder="e.g., 30"
                  min="1"
                />
                <select
                  name="timeDurationUnit"
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="w-fit px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                >
                  <option value="min">minutes</option>
                  <option value="hrs">hours</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col items-start">
              <label className="text-lg font-semibold text-gray-700 mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full md:w-80 px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer transition-shadow"
              />
            </div>
            
            {/* NEW LOCATION SECTION */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Classroom Location</label>
                <div className="mt-1 flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={isFetchingLocation}
                        className={`flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                            isFetchingLocation ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    >
                        <AnimatePresence mode="wait">
                            {isFetchingLocation ? (
                                <motion.span
                                    key="spinner"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <Spinner isVisible={true} size="small" />
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="icon"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center"
                                >
                                    <MapPin className="mr-2" size={16} />
                                    Get Current Location
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                    {location && (
                        <span className="text-sm text-gray-500 flex items-center">
                            <CheckCircle size={16} className="text-green-500 mr-1" />
                            Location retrieved
                        </span>
                    )}
                </div>
            </div>

            <button
              onClick={handleCreateSession}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md mt-4"
              disabled={loading || !location}
            >
              {loading ? <Spinner size="small" color="white" /> : 'Create Session'}
            </button>
          </div>
        </div>
      )}

      {currentView === "qrCode" && sessionDetailsForQR && (
        <div className="flex flex-col items-center justify-center h-full w-full py-4 transition-all duration-300">
          <p className="text-gray-600 mb-4 text-center">Share this QR code with students for attendance.</p>
          <div className="w-full flex items-center justify-center flex-grow">
            <QRCodeComp
              sessionData={sessionDetailsForQR}
              handleBack={handleBackToCreateSession}
              addNotification={addNotification}
              onEndSession={handleEndSessionInFirestore} // Pass the Firestore end session handler
            />
          </div>
          <button
            onClick={handleBackToCreateSession}
            className="mt-8 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold shadow-md"
            disabled={loading}
          >
            Back to Create Session
          </button>
        </div>
      )}
    </div>
  );
}

export default CreateSessionTab;
