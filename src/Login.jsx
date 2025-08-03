import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from 'lottie-react';
import loginAnimation from './assets/login success.json';
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";

export default function Login({ addNotification }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { auth, db } = useFirebase();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Login.jsx: User logged in, UID:", user.uid); // Log UID

      // Fetch user role from Firestore
      const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'userProfile');
      const userDocSnap = await getDoc(userDocRef);

      let role = 'student'; // Default role
      if (userDocSnap.exists()) {
        role = userDocSnap.data().role;
        console.log("Login.jsx: Fetched role from Firestore for redirect:", role); // Log fetched role
      } else {
        console.log("Login.jsx: User profile NOT found in Firestore after login. Defaulting role to student."); // Log if profile missing
      }

      addNotification('Login successful!', 'success');

      // Redirect based on role to the specific dashboard default route
      switch (role) {
        case 'admin':
          navigate('/admin/dashboard'); // Redirect directly to admin dashboard overview
          break;
        case 'teacher':
          navigate('/teacher/dashboard'); // Redirect directly to teacher dashboard overview
          break;
        case 'student':
        default:
          navigate('/student/dashboard'); // Redirect directly to student dashboard overview
          break;
      }
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed login attempts. Please try again later.";
      }
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 px-4 font-inter">
      <div className="bg-white shadow-2xl rounded-2xl flex flex-col md:flex-row w-full max-w-4xl overflow-hidden">

        {/* Left Side */}
        <div className="hidden md:flex md:w-1/2 bg-blue-50 items-center justify-center p-8">
          <Lottie
            animationData={loginAnimation}
            loop={true}
            autoplay={true}
            style={{ height: 300, width: 300 }}
          />
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 p-10">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Welcome Back!</h2>
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-1">Password</label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="text-right">
              <a href="#" className="text-sm text-blue-600 hover:underline">Forgot password?</a>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 transition relative"
              disabled={loading}
            >
              <Spinner size="small" color="white" isVisible={loading} />
              <span className={loading ? 'opacity-0' : ''}>Login</span>
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account? <a href="/signup" className="text-blue-600 hover:underline">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
