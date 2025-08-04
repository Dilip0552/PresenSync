import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { collection, query, onSnapshot, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useFirebase } from './FirebaseContext';

import CreateSessionTab from "./CreateSessionTab";
import ManageClassesTab from "./ManageClassesTab";
import AttendanceReportsTab from "./AttendanceReportsTab";
import ProfileSettingsModal from "./ProfileSettingsModal";

import Sidebar from "./Sidebar";
import Header from "./Header";
import NotificationSystem from "./NotificationSystem";
import Spinner from "./Spinner";

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]); // Renamed from totalSessions for clarity
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState(null); // This holds the user's profile data

  const navigate = useNavigate();
  const location = useLocation();
  const { db, auth, userId } = useFirebase(); // Get db, auth, userId
  const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID; // Get appId from env

  // Function to add a new notification
  const addNotification = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Fetch teacher profile
  useEffect(() => {
    if (userId && db) {
      console.log("TeacherDashboard: Attempting to fetch teacher profile...");
      console.log("TeacherDashboard: userId:", userId);
      console.log("TeacherDashboard: appId:", appId);
      const fetchProfile = async () => {
        try {
          const profileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
          const profileSnap = await getDoc(profileDocRef);
          if (profileSnap.exists()) {
            setTeacherProfile(profileSnap.data());
            console.log("TeacherDashboard: Teacher profile found:", profileSnap.data());
          } else {
            addNotification("Teacher profile not found in Firebase.", "warning");
            console.warn("TeacherDashboard: Teacher profile document does not exist at path:", profileDocRef.path);
          }
        } catch (error) {
          console.error("TeacherDashboard: Error fetching teacher profile:", error);
          addNotification("Failed to load teacher profile.", "error");
        } finally {
          // This setLoadingData is managed by other effects now, so we'll remove it here
        }
      };
      fetchProfile();
    } else {
      console.log("TeacherDashboard: userId or db not available for profile fetch. userId:", userId, "db:", db);
    }
  }, [userId, db, appId, addNotification]);


  // Fetch classes from Firestore
  useEffect(() => {
    if (db && userId) {
      setLoadingData(true);
      console.log("TeacherDashboard: Setting up classes listener for userId:", userId, "path:", `artifacts/${appId}/users/${userId}/classes`);
      const classesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/classes`);
      const q = query(classesCollectionRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClasses(fetchedClasses);
        console.log("TeacherDashboard: onSnapshot received classes data. Count:", fetchedClasses.length, "Data:", fetchedClasses);
        setLoadingData(false);
      }, (error) => {
        console.error("TeacherDashboard: Error fetching classes with onSnapshot:", error);
        addNotification("Failed to load classes.", "error");
        setLoadingData(false);
      });

      return () => unsubscribe();
    } else {
      console.log("TeacherDashboard: userId or db not available for classes listener setup. userId:", userId, "db:", db);
    }
  }, [db, userId, appId, addNotification]);

  // Fetch sessions from Firestore
  useEffect(() => {
    if (db && userId) {
      setLoadingData(true);
      console.log("TeacherDashboard: Setting up sessions listener for userId:", userId, "path:", `artifacts/${appId}/users/${userId}/sessions`);
      const sessionsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sessions`);
      const q = query(sessionsCollectionRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessions(fetchedSessions);
        console.log("TeacherDashboard: onSnapshot received sessions data. Count:", fetchedSessions.length, "Data:", fetchedSessions);
        setLoadingData(false);
      }, (error) => {
        console.error("TeacherDashboard: Error fetching sessions with onSnapshot:", error);
        addNotification("Failed to load sessions.", "error");
        setLoadingData(false);
      });

      return () => unsubscribe();
    } else {
      console.log("TeacherDashboard: userId or db not available for sessions listener setup. userId:", userId, "db:", db);
    }
  }, [db, userId, appId, addNotification]);


  // Sync active tab with URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/teacher/dashboard")) setActiveTab("dashboard");
    else if (path.includes("/teacher/create-session")) setActiveTab("createSession");
    else if (path.includes("/teacher/manage-classes")) setActiveTab("manageClasses");
    else if (path.includes("/teacher/attendance-reports")) setActiveTab("attendanceReports");
    else setActiveTab("dashboard"); // Default to dashboard if path doesn't match
  }, [location.pathname]);

  // Navigate to default tab if path is just /teacher
  useEffect(() => {
    if (location.pathname === "/teacher") {
      navigate("/teacher/dashboard", { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      addNotification("Logged out successfully!", "success");
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
      addNotification("Failed to log out.", "error");
    }
  };

  if (loadingData || teacherProfile === null) {
    console.log("TeacherDashboard: Overall loading or profile not yet loaded. loadingData:", loadingData, "teacherProfile:", teacherProfile);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner message="Loading teacher dashboard data..." isVisible={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-gray-100 font-sans flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className="w-full max-w-8xl h-[calc(100vh-64px)] rounded-3xl shadow-2xl grid grid-cols-1 md:grid-cols-[256px_1fr] bg-white overflow-hidden">
        {/* Sidebar is now always rendered, its visibility controlled by Sidebar component's internal logic */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setShowSettings={setShowSettings}
          handleLogout={handleLogout}
          userRole={teacherProfile?.role || 'teacher'}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        {/* Main content area takes remaining width on desktop */}
        <div className="col-span-full md:col-span-auto flex flex-col h-full rounded-tr-3xl rounded-br-3xl overflow-hidden">
          <Header
            notifications={notifications}
            userProfile={teacherProfile}
            setIsSidebarOpen={setIsSidebarOpen}
          />

          <div className="flex-grow p-6 bg-gray-50 rounded-br-3xl overflow-y-auto">
            <Routes>
              <Route path="dashboard" element={<DashboardOverview classes={classes} totalSessions={sessions} />} />
              <Route
                path="create-session"
                element={<CreateSessionTab classes={classes} addNotification={addNotification} />}
              />
              <Route
                path="manage-classes"
                element={<ManageClassesTab classes={classes} addNotification={addNotification} />}
              />
              <Route
                path="attendance-reports"
                element={<AttendanceReportsTab totalSessions={sessions} classes={classes} addNotification={addNotification} />}
              />
              <Route path="*" element={<DashboardOverview classes={classes} totalSessions={sessions} />} />
            </Routes>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <ProfileSettingsModal setShowSettings={setShowSettings} addNotification={addNotification} />
          </div>
        )}

        <NotificationSystem notification={notifications.length > 0 ? notifications[notifications.length - 1] : null} />
      </div>
    </div>
  );
}

export default TeacherDashboard;
