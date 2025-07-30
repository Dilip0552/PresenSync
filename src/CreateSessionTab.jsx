import { useState } from 'react';
import QRCodeComp from "./QRCodeComp";

function CreateSessionTab({ classes, totalSessions, setTotalSessions, addNotification }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState('min'); 
  const [startTime, setStartTime] = useState('');

  const [currentView, setCurrentView] = useState("form");

  const [sessionDetailsForQR, setSessionDetailsForQR] = useState(null);

  const handleCreateSession = () => {
    if (!selectedClass) {
      addNotification("Please select a class.", "error");
      return;
    }
    if (!durationValue || isNaN(durationValue) || parseInt(durationValue) <= 0) {
      addNotification("Please enter a valid session duration (e.g., 30).", "error");
      return;
    }
    if (!startTime) {
      addNotification("Please select a start date and time.", "error");
      return;
    }

    const sessionData = {
      class: selectedClass,
      duration: `${durationValue} ${durationUnit}`,
      startTime: startTime,
    };

    const newSession = {
      className: selectedClass,
      dateAndTime: new Date(startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      totalPresent: 0,
      totalAbsent: 0,
      totalStudents: 0, 
      presentPercent: 0,
      classID: selectedClass + "-" + Date.now(), 
      duration: parseInt(durationValue),
      durationUnit: durationUnit,
      rawStartTime: startTime
    };

    setTotalSessions(prev => [...prev, newSession]);

    setSessionDetailsForQR(sessionData);
    setCurrentView("qrCode");

    addNotification("Session created successfully! QR code is now displayed.", "success");
  };

  const handleBackToCreateSession = () => {
    setCurrentView("form");
    setSessionDetailsForQR(null);
    setSelectedClass('');
    setDurationValue('');
    setStartTime('');
  };


  return (
    <div className="w-full h-full flex flex-col items-center justify-start">
      {currentView === "form" && (
        <div className="w-full h-full flex flex-col items-start justify-start transition-all duration-300 ">
          <h2 className="text-2xl font-semibold  text-blue-700 mb-6">Create New Session</h2>

          <div className="w-full space-y-6 flex-grow overflow-y-auto px-1">
            <div className="flex flex-col items-start">
              <label htmlFor="selectClass" className="text-lg font-semibold text-gray-700 mb-2">Class</label>
              <select
                name="class"
                id="selectClass"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full md:w-80 px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
              >
                <option value="">-- Select a class --</option>
                {classes.map((myclass, index) => (
                  <option key={index} value={myclass}>{myclass}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-start">
              <label className="text-lg font-semibold text-gray-700 mb-2">Time Duration</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  className="w-28 px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                  placeholder="e.g., 30"
                  min="1"
                />
                <select
                  name="timeDurationUnit"
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="w-fit px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
                >
                  <option value="min">minutes</option>
                  <option value="hrs">hours</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col items-start">
              <label className="text-lg font-semibold text-gray-700 mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full md:w-80 px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer transition-shadow"
              />
            </div>

            <button
              onClick={handleCreateSession}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-md mt-4"
            >
              Create Session
            </button>
          </div>
        </div>
      )}

      {currentView === "qrCode" && (
        <div className="flex flex-col items-center justify-center h-full w-full py-4 transition-all duration-300">
          <p className="text-gray-600 mb-4 text-center">Share this QR code with students for attendance.</p>
          <div className="w-full flex items-center justify-center flex-grow">
            <QRCodeComp
              sessionData={sessionDetailsForQR}
              handleBack={handleBackToCreateSession}
              addNotification={addNotification}
            />
          </div>
          <button
            onClick={handleBackToCreateSession}
            className="mt-8 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold shadow-md"
          >
            Back to Create Session
          </button>
        </div>
      )}
    </div>
  );
}

export default CreateSessionTab;