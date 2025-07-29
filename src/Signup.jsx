import React from "react";
import Lottie from "lottie-react";
import signupAnimation from "./assets/Login and Sign up.json"; 

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 px-4">
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
          <form className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Password</label>
              <input
                type="password"
                placeholder="Create a password"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-400 focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-md font-semibold hover:bg-purple-700 transition"
            >
              Sign Up
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
