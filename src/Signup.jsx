import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import signupAnimation from "./assets/Login and Sign up.json";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";

export default function Signup({ addNotification }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // Default role state, correctly updated by select
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { auth, db } = useFirebase();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

      // Data to save for the user profile
      const userProfileData = {
        uid: user.uid,
        fullName: fullName, // Ensure this is explicitly saved
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
        // displayName: user.displayName || fullName, // You might want to save displayName too, but fullName is primary
      };

      // Store user profile in their private location
      const privateUserProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'userProfile');
      await setDoc(privateUserProfileRef, userProfileData);

      // Store user profile in the public collection for admin access
      const publicUserProfileRef = doc(db, `artifacts/${appId}/public/data/allUserProfiles`, user.uid);
      await setDoc(publicUserProfileRef, userProfileData);

      addNotification('Account created successfully! Please log in.', 'success');
      navigate('/login');
    } catch (error) {
      console.error("Signup error:", error);
      let errorMessage = "Failed to create account.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email already in use. Please use a different email.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address.";
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
        <div className="hidden md:flex md:w-1/2 bg-purple-50 items-center justify-center p-8">
          <Lottie
            animationData={signupAnimation}
            loop={true}
            autoplay={true}
            style={{ height: 300, width: 300 }}
          />
        </div>

        {/* Right Side*/}
        <div className="w-full md:w-1/2 p-10">
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Create an Account</h2>
          <form className="space-y-5" onSubmit={handleSignup}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold mb-1">Full Name</label>
              <input
                type="text"
                id="fullName"
                placeholder="Your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
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
                placeholder="Create a password"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-semibold mb-1">Register as</label>
              <select
                id="role"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-md font-semibold hover:bg-purple-700 transition relative"
              disabled={loading}
            >
              <Spinner size="small" color="white" isVisible={loading} />
              <span className={loading ? 'opacity-0' : ''}>Sign Up</span>
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <a href="/login" className="text-purple-600 hover:underline">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
