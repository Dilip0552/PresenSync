import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import Login from "./Login";
import Signup from "./Signup";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Teacher routes */}
      <Route path="/teacher/*" element={<TeacherDashboard />} />

      {/* Student routes */}
      <Route path="/student/*" element={<StudentDashboard />} />
    </Routes>
  );
}

export default App;
