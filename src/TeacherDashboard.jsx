import { useState, useEffect } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";

import CreateSessionTab from "./CreateSessionTab";
import ManageClassesTab from "./ManageClassesTab";
import AttendanceReportsTab from "./AttendanceReportsTab";
import ProfileSettingsModal from "./ProfileSettingsModal";

import Sidebar from "./Sidebar";
import Header from "./Header";
import DashboardOverview from "./DashboardOverview"; 
import NotificationSystem from "./NotificationSystem"; 

function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [classes, setClasses] = useState([
    "CS1-A", "CS1-B", "CS1-C", "CS2-A", "CS3-A",
    "CS1-A", "CS1-B", "CS1-C", "CS2-A", "CS3-A",
    "CS1-A", "CS1-B", "CS1-C", "CS2-A", "CS3-A",
    "CS1-A", "CS1-B", "CS1-C", "CS2-A", "CS3-A",
    "CS1-A", "CS1-B", "CS1-C", "CS2-A", "CS3-A"
  ]);
  const [totalSessions, setTotalSessions] = useState([
    {
      className: "CS1-A",
      dateAndTime: "Apr 20, 10:00 AM",
      totalPresent: 18,
      totalAbsent: 2,
      totalStudents: 20,
      presentPercent: 90,
      classID: "abc"
    },
    {
      className: "CS1-A",
      dateAndTime: "Apr 21, 11:00 AM",
      totalPresent: 10,
      totalAbsent: 10,
      totalStudents: 20,
      presentPercent: 50,
      classID: "abc2" 
    },
    {
      className: "CS1-B",
      dateAndTime: "Apr 21, 10:00 AM",
      totalPresent: 18,
      totalAbsent: 2,
      totalStudents: 20,
      presentPercent: 90,
      classID: "def"
    },
    {
      className: "CS1-C",
      dateAndTime: "Apr 23, 10:00 AM",
      totalPresent: 18,
      totalAbsent: 2,
      totalStudents: 20,
      presentPercent: 90,
      classID: "ghi"
    },
    {
      className: "CS2-A",
      dateAndTime: "Apr 23, 10:00 AM",
      totalPresent: 18,
      totalAbsent: 2,
      totalStudents: 20,
      presentPercent: 90,
      classID: "jkl"
    },
    {
      className: "CS3-A",
      dateAndTime: "Apr 24, 10:00 AM",
      totalPresent: 18,
      totalAbsent: 2,
      totalStudents: 20,
      presentPercent: 90,
      classID: "mno"
    }
  ]);

  const navigate = useNavigate();
  const location = useLocation();

  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]); 

  // Function to add a new notification
  const addNotification = (message, type = "info") => {
    setNotifications(prev => [...prev, { id: Date.now(), message, type }]);
  };

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/teacher/dashboard")) setActiveTab("dashboard");
    else if (path.includes("/teacher/create-session")) setActiveTab("createSession");
    else if (path.includes("/teacher/manage-classes")) setActiveTab("manageClasses");
    else if (path.includes("/teacher/attendance-reports")) setActiveTab("attendanceReports");
    else setActiveTab("dashboard");
  }, [location.pathname]);

  useEffect(() => {
    
    const currentPathSegment = location.pathname.split('/').pop();
    if (activeTab === "dashboard" && currentPathSegment !== "dashboard") {
      navigate("/teacher/dashboard", { replace: true });
    } else if (activeTab === "createSession" && currentPathSegment !== "create-session") {
      navigate("/teacher/create-session", { replace: true });
    } else if (activeTab === "manageClasses" && currentPathSegment !== "manage-classes") {
      navigate("/teacher/manage-classes", { replace: true });
    } else if (activeTab === "attendanceReports" && currentPathSegment !== "attendance-reports") {
      navigate("/teacher/attendance-reports", { replace: true });
    }
  }, [activeTab, navigate, location.pathname]);


  return (
    <div className="min-h-screen w-screen bg-gray-100 font-sans flex items-center justify-center p-4 md:p-8 overflow-hidden">
      <div className="w-full max-w-8xl h-[calc(100vh-64px)] rounded-3xl shadow-2xl grid grid-cols-5 bg-white overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setShowSettings={setShowSettings}
        />

        <div className="col-span-4 flex flex-col h-full rounded-tr-3xl rounded-br-3xl overflow-hidden">
          <Header notifications={notifications} />

          <div className="flex-grow p-6 bg-gray-50 rounded-br-3xl overflow-y-auto">
            <Routes>
              <Route path="dashboard" element={<DashboardOverview classes={classes} totalSessions={totalSessions} />} />
              <Route path="create-session" element={<CreateSessionTab classes={classes} totalSessions={totalSessions} setTotalSessions={setTotalSessions} addNotification={addNotification} />} />
              <Route path="manage-classes" element={<ManageClassesTab classes={classes} setClasses={setClasses} addNotification={addNotification} />} />
              <Route path="attendance-reports" element={<AttendanceReportsTab totalSessions={totalSessions} classes={classes} addNotification={addNotification} />} />
              <Route path="*" element={<DashboardOverview classes={classes} totalSessions={totalSessions} />} />
            </Routes>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <ProfileSettingsModal setShowSettings={setShowSettings} />
          </div>
        )}

        <NotificationSystem notifications={notifications} setNotifications={setNotifications} />
      </div>
    </div>
  );
}

export default TeacherDashboard;