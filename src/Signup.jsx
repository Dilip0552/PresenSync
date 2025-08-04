// src/Signup.jsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useNavigate, Link } from 'react-router-dom';
import Spinner from './Spinner'; // Ensure you have a Spinner component

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
        setError('Please fill out all fields.');
        return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        uid: user.uid,
        name,
        email,
        role,
        createdAt: new Date(),
      };

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), userData);

      // Redirect based on role
      if (role === 'student') {
        navigate('/face-registration');
      } else {
        navigate('/teacher-dashboard');
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.');
      } else {
        setError('Failed to create account. Please try again.');
      }
      console.error('Signup Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-blue-600">PresenSync</h1>
                <p className="text-gray-500">Join us to streamline attendance tracking.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Create an Account</h2>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
                <form onSubmit={handleSignup}>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-semibold mb-2" htmlFor="name">Full Name</label>
                        <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-semibold mb-2" htmlFor="email">Email Address</label>
                        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-semibold mb-2" htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" required className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 font-semibold mb-2" htmlFor="role">I am a...</label>
                        <select id="role" value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2 border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 flex items-center justify-center">
                        {loading ? <Spinner /> : 'Create Account'}
                    </button>
                </form>
                <p className="text-center mt-6 text-gray-600">
                    Already have an account? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Login</Link>
                </p>
            </div>
        </div>
    </div>
  );
};

export default Signup;
