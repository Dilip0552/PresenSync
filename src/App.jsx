import { Routes, Route } from "react-router-dom";
import React, { useState, useCallback } from "react"; 

import AdminDashboard from "./AdminDashboard";
import LandingPage from "./LandingPage";
import Login from "./Login";
import Signup from "./Signup";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard"; 
import NotificationSystem from "./NotificationSystem"; 

function App() {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type) => {
    const id = Date.now() + Math.random(); 
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    }, 5000);
  }, []); 

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route path="/teacher/*" element={<TeacherDashboard addNotification={addNotification} />} />

        <Route path="/student/*" element={<StudentDashboard addNotification={addNotification} />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>

      <NotificationSystem notifications={notifications} />
    </>
  );
}

export default App;