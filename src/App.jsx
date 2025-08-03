import React, { useState, useCallback, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useFirebase } from './FirebaseContext';
import { getDoc, doc } from 'firebase/firestore';

import AdminDashboard from "./AdminDashboard";
import LandingPage from "./LandingPage";
import Login from "./Login";
import Signup from "./Signup";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import NotificationSystem from "./NotificationSystem";
import Spinner from "./Spinner";

// ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { userId, loadingAuth, db } = useFirebase();
  const [userRole, setUserRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!loadingAuth) { // Only fetch role if Firebase Auth state is determined
        if (userId && db) {
          try {
            const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              setUserRole(userDocSnap.data().role);
              console.log("ProtectedRoute: Fetched role for UID", userId, ":", userDocSnap.data().role); // Log fetched role
            } else {
              setUserRole(null); // No profile found for authenticated user, treat as unknown/unprivileged
              console.warn(`ProtectedRoute: User ${userId} authenticated but profile missing. Setting role to null.`);
            }
          } catch (error) {
            console.error("ProtectedRoute: Error fetching user role:", error);
            setUserRole(null);
          } finally {
            setLoadingRole(false);
          }
        } else {
          // No userId, so no role to fetch, and we are not loading auth anymore
          setUserRole(null);
          setLoadingRole(false);
          console.log("ProtectedRoute: No userId found. Setting role to null.");
        }
      }
    };
    fetchUserRole();
  }, [userId, loadingAuth, db]); // Dependencies ensure this runs when userId or loadingAuth changes

  if (loadingAuth || loadingRole) {
    console.log("ProtectedRoute: Loading Auth or Role...");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner message="Loading application..." isVisible={true} />
      </div>
    );
  }

  console.log("ProtectedRoute: Final check - userId:", userId, "userRole:", userRole, "allowedRoles:", allowedRoles);

  // If no user is logged in, redirect to login
  if (!userId) {
    console.log("ProtectedRoute: No userId, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  // If user is logged in but their role is not allowed, redirect to landing or a forbidden page
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn(`ProtectedRoute: User ${userId} with role '${userRole}' attempted to access restricted route. Redirecting to /.`);
    return <Navigate to="/" replace />; // Redirect to landing page
  }

  // If all checks pass, render children
  return children;
};

function App() {
  const [notifications, setNotifications] = useState([]);
  const { loadingAuth } = useFirebase();

  const addNotification = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    }, 5000);
  }, []);

  if (loadingAuth) {
    console.log("App.jsx: Initial authentication loading...");
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner message="Authenticating..." isVisible={true} />
      </div>
    );
  }

  console.log("App.jsx: Authentication loaded. Rendering routes.");
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login addNotification={addNotification} />} />
        <Route path="/signup" element={<Signup addNotification={addNotification} />} />

        <Route
          path="/teacher/*"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherDashboard addNotification={addNotification} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentDashboard addNotification={addNotification} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard addNotification={addNotification} />
            </ProtectedRoute>
          }
        />

        {/* Catch-all for undefined routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <NotificationSystem notification={notifications.length > 0 ? notifications[notifications.length - 1] : null} />
    </>
  );
}

export default App;
