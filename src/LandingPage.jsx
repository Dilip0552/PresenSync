import React from "react";
import Lottie from "react-lottie-player";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import faceID from "./assets/Face ID.json";
import qr from "./assets/QR Scan Successful.json";
import location from "./assets/Location Pin.json";

function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      title: "QR Code Attendance",
      desc: "Quick scan to mark your attendance securely.",
      animationData: qr,
    },
    {
      title: "Face Recognition",
      desc: "AI-powered real-time face detection.",
      animationData: faceID,
    },
    {
      title: "GPS Verification",
      desc: "Verify your presence in the right location.",
      animationData: location,
    },
  ];

  const Feature = ({ title, desc, animationData }) => (
    <div className="bg-white rounded-2xl shadow-lg p-6 text-center text-gray-800 hover:scale-105 transform transition duration-300">
      <Lottie
        animationData={animationData}
        loop
        play
        className="h-40 mx-auto mb-4"
      />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p>{desc}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white font-sans">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/10 sticky top-0 z-50 shadow-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-wide ">PresenSync</h1>
          <nav className="space-x-4 hidden md:block">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 transition rounded-xl"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition rounded-xl"
            >
              Sign Up
            </button>
          </nav>
        </div>
      </header>

      <main className="flex flex-col-reverse md:flex-row items-center justify-between px-6 md:px-12 max-w-7xl mx-auto py-20 gap-12">
        {/* Left Text */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="w-full md:w-1/2"
        >
          <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
            Say Goodbye to <span className="text-blue-500">Proxies</span><br />
            with <span className="text-purple-400">PresenSync</span>
          </h2>
          <p className="text-lg mt-4 text-gray-300 max-w-lg">
            Seamless, secure, and smart attendance management system using face recognition, live verification, GPS, and more.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate("/student/dashboard")}
              className="bg-blue-600 px-6 py-3 rounded-full hover:bg-blue-700 transition-all duration-300 shadow-lg"
            >
              I'm a Student
            </button>
            <button
              onClick={() => navigate("/teacher/dashboard")}
              className="bg-indigo-600 px-6 py-3 rounded-full hover:bg-indigo-700 transition-all duration-300"
            >
              I'm a Teacher
            </button>
            <button
              onClick={() => navigate("/admin/")}
              className="bg-gray-700 px-6 py-3 rounded-full hover:bg-gray-800 transition-all duration-300"
            >
              I'm a Admin
            </button>
          </div>
        </motion.div>

        {/* Right Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="w-full md:w-1/2 flex justify-center"
        >
          <Lottie
            loop
            play
            path="https://assets1.lottiefiles.com/packages/lf20_bdlrkrqv.json"
            style={{ maxHeight: "400px", width: "100%" }}
          />
        </motion.div>
      </main>

      {/* Features Section */}
      <div className="py-16 px-8 bg-white text-gray-800">
        <h2 className="text-4xl font-bold text-center mb-12 text-purple-700">Features</h2>
        <div className="grid gap-8 md:grid-cols-3">
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
        {/* Footer */}
      <footer className="bg-[#0f172a] text-gray-400 py-6 border-t border-white/10 text-center ">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            © {new Date().getFullYear()} <span className="font-semibold text-white">PresenSync</span>. All rights reserved.
          </p>
          <p className="mt-2 text-sm">
            Built with 💙 by the PresenSync Team
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
