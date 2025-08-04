import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useFirebase } from './FirebaseContext';

import StudentDashboardHome from "./StudentDashboardHome";
import StudentProfile from "./StudentProfile";
import StudentNotifications from "./StudentNotifications";
import StudentAttendanceReport from "./StudentAttendanceReport";

import Sidebar from "./Sidebar";
import Header from "./Header";
import NotificationSystem from "./NotificationSystem";
import Spinner from "./Spinner";

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [studentProfile, setStudentProfile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  const navigate = useNavigate();
  const location = useLocation();
  const { db, auth, userId } = useFirebase();
  const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Function to add a new notification
  const addNotification = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Fetch student profile
  useEffect(() => {
    if (userId && db) {
      const fetchProfile = async () => {
        try {
          const profileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
          const profileSnap = await getDoc(profileDocRef);
          if (profileSnap.exists()) {
            setStudentProfile(profileSnap.data());
          } else {
            addNotification("Student profile not found.", "warning");
          }
        } catch (error) {
          console.error("Error fetching student profile:", error);
          addNotification("Failed to load student profile.", "error");
        } finally {
          setLoadingData(false);
        }
      };
      fetchProfile();
    }
  }, [userId, db, appId, addNotification]);


  // Sync active tab with URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/student/dashboard")) setActiveTab("dashboard");
    else if (path.includes("/student/profile")) setActiveTab("profile");
    else if (path.includes("/student/notifications")) setActiveTab("notifications");
    else if (path.includes("/student/attendance-report")) setActiveTab("attendanceReport");
    else setActiveTab("dashboard"); // Default to dashboard if path doesn't match
  }, [location.pathname]);

  // Navigate to default tab if path is just /student
  useEffect(() => {
    if (location.pathname === "/student") {
      navigate("/student/dashboard", { replace: true });
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

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner message="Loading student dashboard data..." isVisible={true} />
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
          userRole={studentProfile?.role || 'student'}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />

        {/* Main content area takes remaining width on desktop */}
        <div className="col-span-full md:col-span-auto flex flex-col h-full rounded-tr-3xl rounded-br-3xl overflow-hidden">
          <Header
            notifications={notifications}
            userProfile={studentProfile}
            setIsSidebarOpen={setIsSidebarOpen}
          />

          <div className="flex-grow p-6 bg-gray-50 rounded-br-3xl overflow-y-auto">
            <Routes>
              <Route path="dashboard" element={<StudentDashboardHome addNotification={addNotification} studentProfile={studentProfile} />} />
              <Route path="profile" element={<StudentProfile addNotification={addNotification} studentProfile={studentProfile} />} />
              <Route path="notifications" element={<StudentNotifications addNotification={addNotification} />} />
              <Route path="attendance-report" element={<StudentAttendanceReport addNotification={addNotification} studentProfile={studentProfile} />} />
              <Route path="*" element={<StudentDashboardHome addNotification={addNotification} studentProfile={studentProfile} />} />
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

export default StudentDashboard;
