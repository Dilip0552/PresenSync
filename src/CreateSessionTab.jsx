import React, { useState } from 'react';
import { useFirebase } from './FirebaseContext';
import { collection, addDoc } from 'firebase/firestore';
import NotificationSystem from './NotificationSystem';
import QRCodeComp from './QRCodeComp';
import Spinner from './Spinner';
import { MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const CreateSessionTab = ({ userId, userProfile, addNotification }) => {
    const { db } = useFirebase();
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const [className, setClassName] = useState('');
    const [duration, setDuration] = useState(30);
    const [durationUnit, setDurationUnit] = useState('min');
    const [location, setLocation] = useState(null); // Stores { latitude, longitude }
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [newSessionQR, setNewSessionQR] = useState(null);

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!className || !location) {
            addNotification('Please enter class name and get location.', 'error');
            return;
        }

        setIsCreatingSession(true);

        const sessionData = {
            teacherId: userId,
            teacherName: userProfile?.fullName || 'N/A',
            className: className,
            duration: parseInt(duration),
            durationUnit: durationUnit,
            classroomLat: location.latitude,
            classroomLon: location.longitude,
            startTime: new Date().toISOString(),
            status: 'active',
        };

        try {
            const sessionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sessions`);
            const docRef = await addDoc(sessionsCollectionRef, sessionData);

            const qrData = {
                sessionId: docRef.id,
                timestamp: Date.now(),
                classId: className, // Using class name as a simple ID for now
                className: className,
                teacherId: userId,
                classroomLat: location.latitude,
                classroomLon: location.longitude,
            };
            setNewSessionQR(JSON.stringify(qrData));
            addNotification('Session created successfully!', 'success');
        } catch (error) {
            console.error("Error creating session:", error);
            addNotification('Failed to create session.', 'error');
        } finally {
            setIsCreatingSession(false);
        }
    };

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

    return (
        <div className="p-4 md:p-8 bg-white rounded-3xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Session</h2>
            
            {newSessionQR ? (
                <div className="flex flex-col items-center justify-center space-y-6">
                    <h3 className="text-xl font-semibold text-green-600">Session Active!</h3>
                    <p className="text-gray-600 text-center">Share this QR code with your students for them to mark their attendance.</p>
                    <div className="p-4 bg-gray-100 rounded-xl shadow-inner">
                        <QRCodeComp value={newSessionQR} size={256} />
                    </div>
                    <button
                        onClick={() => setNewSessionQR(null)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                    >
                        Create Another Session
                    </button>
                </div>
            ) : (
                <form onSubmit={handleCreateSession} className="space-y-6">
                    <div>
                        <label htmlFor="className" className="block text-sm font-medium text-gray-700">Class Name</label>
                        <input
                            type="text"
                            id="className"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration</label>
                            <input
                                type="number"
                                id="duration"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                required
                                min="1"
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="durationUnit" className="block text-sm font-medium text-gray-700">Unit</label>
                            <select
                                id="durationUnit"
                                value={durationUnit}
                                onChange={(e) => setDurationUnit(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="min">Minutes</option>
                                <option value="hr">Hours</option>
                            </select>
                        </div>
                    </div>

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
                                <span className="text-sm text-gray-500">
                                    Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isCreatingSession || !location}
                        className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
                            isCreatingSession || !location ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                    >
                        {isCreatingSession ? 'Creating...' : 'Create Session'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default CreateSessionTab;
