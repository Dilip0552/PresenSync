import React, { useState, useEffect } from "react";
import Lottie from "react-lottie-player";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpCircle } from 'lucide-react';
import { useFirebase } from './FirebaseContext';
import { doc, getDoc } from 'firebase/firestore';
import Spinner from './Spinner';
import faceID from "./assets/Face ID.json";
import qr from "./assets/QR Scan Successful.json";
import location from "./assets/Location Pin.json";
function LandingPage() {
  const navigate = useNavigate();
  const { userId, loadingAuth, db } = useFirebase();
  const [userRole, setUserRole] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  // Fetch user role if logged in
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!loadingAuth) {
        if (userId && db) {
          try {
            const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'userProfile');
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              setUserRole(userDocSnap.data().role);
            } else {
              setUserRole(null); // No profile found for authenticated user, treat as unknown
              console.warn(`Authenticated user ${userId} has no profile.`)
            }
          } catch (error) {
            console.error("Error fetching user role on landing page:", error);
            setUserRole(null);
          }
        } else {
          setUserRole(null); // No user ID, so no role
        }
        setCheckingRole(false);
      }
    };
    fetchUserRole();
  }, [userId, loadingAuth, db]);

  const handleDashboardRedirect = (targetRole) => {
    if (loadingAuth || checkingRole) {
      // Still authenticating or checking role, do nothing yet
      return;
    }

    if (userId && userRole) {
      // User is logged in AND has a role
      if (userRole === targetRole || userRole === 'admin') { // Admin can go anywhere
        switch (userRole) {
          case 'student': navigate('/student/dashboard'); break;
          case 'teacher': navigate('/teacher/dashboard'); break;
          case 'admin': navigate('/admin/dashboard'); break;
          default: navigate('/login'); // Should not happen if roles are well-defined
        }
      } else {
        // Logged in, but trying to access a different role's dashboard
        // Or if their role is null/unknown, redirect to login
        navigate('/login');
      }
    } else {
      // Not logged in at all, always redirect to login
      navigate('/login');
    }
  };


  const features = [
    {
      title: "QR Code Attendance",
      desc: "Quick scan to mark your attendance securely and efficiently.",
      animationData: qr,
    },
    {
      title: "Face Recognition",
      desc: "AI-powered real-time face detection for enhanced security.",
      animationData: faceID,
    },
    {
      title: "GPS Verification",
      desc: "Verify your presence within the designated classroom location.",
      animationData: location,
    },
  ];

  const Feature = ({ title, desc, animationData }) => (
    <motion.div
      className="bg-white rounded-2xl shadow-xl p-6 text-center text-gray-800 border border-gray-100 flex flex-col items-center justify-start h-full"
      whileHover={{ scale: 1.03, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Lottie
        animationData={animationData}
        loop
        play
        className="h-40 w-full max-w-[200px] mx-auto mb-4"
      />
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm flex-grow">{desc}</p>
    </motion.div>
  );

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-white font-inter">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/10 sticky top-0 z-50 shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-wide text-white">PresenSync</h1>
          <nav className="space-x-3 sm:space-x-4">
            <button
              onClick={() => navigate("/login")}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 hover:bg-white/30 transition-all duration-200 rounded-lg text-sm sm:text-base font-medium"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 transition-all duration-200 rounded-lg text-sm sm:text-base font-medium shadow-md"
            >
              Sign Up
            </button>
          </nav>
        </div>
      </header>

      <main className="flex flex-col-reverse md:flex-row items-center justify-between px-6 md:px-12 max-w-7xl mx-auto py-16 md:py-20 gap-12">
        {/* Left Text */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full md:w-1/2 text-center md:text-left"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
            Say Goodbye to <span className="text-blue-400">Proxies</span><br />
            with <span className="text-purple-400">PresenSync</span>
          </h2>
          <p className="text-base sm:text-lg mt-4 text-gray-300 max-w-lg mx-auto md:mx-0">
            A seamless, secure, and smart attendance management system utilizing cutting-edge face recognition, live verification, and precise GPS tracking.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDashboardRedirect('student')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 px-7 py-3 rounded-full hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg font-semibold text-lg"
              disabled={loadingAuth || checkingRole}
            >
              {(loadingAuth || checkingRole) ? <Spinner size="small" color="white" isVisible={true} /> : "I'm a Student"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDashboardRedirect('teacher')}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-7 py-3 rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-lg font-semibold text-lg"
              disabled={loadingAuth || checkingRole}
            >
              {(loadingAuth || checkingRole) ? <Spinner size="small" color="white" isVisible={true} /> : "I'm a Teacher"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDashboardRedirect('admin')}
              className="bg-gradient-to-r from-gray-700 to-gray-800 px-7 py-3 rounded-full hover:from-gray-800 hover:to-gray-900 transition-all duration-300 shadow-lg font-semibold text-lg"
              disabled={loadingAuth || checkingRole}
            >
              {(loadingAuth || checkingRole) ? <Spinner size="small" color="white" isVisible={true} /> : "I'm an Admin"}
            </motion.button>
          </div>
        </motion.div>

        {/* Right Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="w-full md:w-1/2 flex justify-center"
        >
          <Lottie
            loop
            play
            path="https://assets1.lottiefiles.com/packages/lf20_bdlrkrqv.json"
            style={{ maxHeight: "450px", width: "100%", maxWidth: "450px" }}
          />
        </motion.div>
      </main>

      {/* Features Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 text-gray-800">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-purple-700">Key Features</h2>
        <div className="grid gap-8 md:grid-cols-3 max-w-7xl mx-auto">
          {features.map((feature, idx) => (
            <Feature
              key={idx}
              title={feature.title}
              desc={feature.desc}
              animationData={feature.animationData}
            />
          ))}
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 py-16 px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to Simplify Attendance?</h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">Join PresenSync today and experience the future of smart attendance management for your institution.</p>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 8px 16px rgba(0,0,0,0.3)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/signup")}
          className="bg-white text-blue-700 px-10 py-4 rounded-full font-bold text-xl shadow-lg hover:bg-gray-100 transition-all duration-300"
        >
          Get Started Now
        </motion.button>
      </div>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-6 border-t border-gray-800 text-center ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} <span className="font-semibold text-white">PresenSync</span>. All rights reserved.
          </p>
          <p className="mt-2 text-sm">
            Built with 💙 by the PresenSync Team
          </p>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <motion.button
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        onClick={scrollToTop}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Scroll to top"
      >
        <ArrowUpCircle size={24} />
      </motion.button>
    </div>
  );
}

export default LandingPage;
