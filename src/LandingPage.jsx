// src/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, BarChart3, Users, Zap } from 'lucide-react'; // Using lucide-react for icons

const LandingPage = () => {
  const navigate = useNavigate();

  const FeatureCard = ({ icon, title, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-blue-600">PresenSync</h1>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-blue-600">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600">How It Works</a>
            <a href="#about" className="text-gray-600 hover:text-blue-600">About</a>
          </nav>
          <div>
            <button onClick={() => navigate('/login')} className="text-blue-600 font-semibold mr-4">Login</button>
            <button onClick={() => navigate('/signup')} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors">
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="container mx-auto px-6 py-24 text-center">
          <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            The Future of Attendance is Here.
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Secure, effortless, and proxy-proof attendance tracking powered by face recognition and geolocation. Eliminate manual errors and ensure academic integrity.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="mt-8 bg-blue-600 text-white font-bold px-8 py-4 rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105 text-lg"
          >
            Get Started for Free
          </button>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-white py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800">Why Choose PresenSync?</h2>
              <p className="text-gray-600 mt-2">Everything you need for a modern attendance system.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<ShieldCheck size={24} />}
                title="Proxy-Proof Security"
                description="Combines face recognition and geolocation to verify student identity and location, making proxy attendance impossible."
              />
              <FeatureCard
                icon={<Zap size={24} />}
                title="Effortless & Fast"
                description="Students can mark their attendance in seconds. Teachers can create sessions with a single click. No more paper, no more hassle."
              />
              <FeatureCard
                icon={<BarChart3 size={24} />}
                title="Real-time Reporting"
                description="Instantly view and analyze attendance data. Track trends, generate reports, and get valuable insights effortlessly."
              />
              <FeatureCard
                icon={<Users size={24} />}
                title="Easy Class Management"
                description="Teachers can easily create classes, manage student enrollment, and track attendance for multiple courses in one place."
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-800">Simple Steps to Get Started</h2>
                    <p className="text-gray-600 mt-2">A straightforward process for both teachers and students.</p>
                </div>
                <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
                    <div className="text-center">
                        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-blue-600 text-white text-3xl font-bold mx-auto mb-4">1</div>
                        <h3 className="text-xl font-semibold">Teachers Create Classes</h3>
                        <p className="text-gray-600 max-w-xs mx-auto mt-2">Set up your subjects and enroll students with a few simple clicks.</p>
                    </div>
                     <div className="text-center">
                        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-blue-600 text-white text-3xl font-bold mx-auto mb-4">2</div>
                        <h3 className="text-xl font-semibold">Start an Attendance Session</h3>
                        <p className="text-gray-600 max-w-xs mx-auto mt-2">Begin a secure session from your dashboard, capturing your current location.</p>
                    </div>
                     <div className="text-center">
                        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-blue-600 text-white text-3xl font-bold mx-auto mb-4">3</div>
                        <h3 className="text-xl font-semibold">Students Mark Attendance</h3>
                        <p className="text-gray-600 max-w-xs mx-auto mt-2">Students verify their identity via face scan and are checked against the session's location.</p>
                    </div>
                </div>
            </div>
        </section>

      </main>

      {/* Footer */}
      <footer id="about" className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold">PresenSync</h2>
          <p className="mt-2">Revolutionizing attendance for the modern classroom.</p>
          <div className="mt-6">
            <p>&copy; {new Date().getFullYear()} PresenSync. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
