import React, { useState, useEffect } from 'react';
import Spinner from "./Spinner";

function QRCodeComp({ sessionData, handleBack, addNotification }) {
  const [qrDisplayValue, setQrDisplayValue] = useState("Loading session details...");
  const [showEndingSpinner, setShowEndingSpinner] = useState(false);

  useEffect(() => {
    if (sessionData) {
      const dataForDisplay = JSON.stringify({
        class: sessionData.class,
        sessionId: sessionData.classID,
        startTime: sessionData.rawStartTime,
        duration: sessionData.duration,
        durationUnit: sessionData.durationUnit,
      }, null, 2);
      setQrDisplayValue(dataForDisplay);
    } else {
      addNotification("Error: No session data provided for QR code display.", "error");
      setQrDisplayValue("Error: No session data to display.");
    }
  }, [sessionData, addNotification]);

  if (!sessionData) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-md border border-gray-100 text-gray-600 text-lg">
        <p className="mb-4">No session data available to generate QR code.</p>
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold shadow-sm"
        >
          Go Back
        </button>
      </div>
    );
  }

  const handleEndSession = () => {
    setShowEndingSpinner(true);
    addNotification("Ending session...", "info"); 
    setTimeout(() => {
      setShowEndingSpinner(false);
      addNotification("Session ended successfully!", "success"); 
      handleBack();
    }, 2000);
  };

  return (
    <div
      className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-gray-100 p-6 flex flex-col items-center gap-6"
    >
      <div className="text-3xl font-bold text-blue-800 text-center">Rotating QR Code</div>

      <div className="flex flex-col md:flex-row items-center md:items-start justify-center w-full gap-8">
        <div className="w-full md:w-1/2 flex flex-col justify-start items-start px-2 py-2">
          <div className="w-full text-left space-y-2 mb-8">
            <span className="block text-lg font-medium text-gray-700">Class: <span className="font-semibold text-gray-900">{sessionData.class}</span></span>
            <span className="block text-lg font-medium text-gray-700">Duration: <span className="font-semibold text-gray-900">{sessionData.duration}</span></span>
            <span className="block text-lg font-medium text-gray-700">Starts At: <span className="font-semibold text-gray-900">{new Date(sessionData.rawStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
            <span className="block text-sm text-gray-500 italic">on {new Date(sessionData.rawStartTime).toLocaleDateString()}</span>
          </div>

          <button
            className={`flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold border-2 border-red-400 cursor-pointer transition-colors duration-300 shadow-md
              ${showEndingSpinner ? "bg-red-100 text-red-700 opacity-70 cursor-not-allowed" : "bg-red-500 text-white hover:bg-red-600 active:bg-red-700"}
            `}
            onClick={handleEndSession}
            disabled={showEndingSpinner}
          >
            {showEndingSpinner ? "Ending..." : "End Session"}
            {showEndingSpinner && <div className="ml-3 w-6 h-6"><Spinner /></div>}
          </button>
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-center pr-2">
          <div className="p-4 bg-gray-50 rounded-lg shadow-inner border border-gray-200">
            <img src="/src/assets/qr.png" alt="QR Code for attendance" className="w-full max-w-[250px] h-auto" />
          </div>
          <span className="pt-4 text-gray-600 text-center text-base font-medium">Scan the QR Code to mark attendance</span>
        </div>
      </div>
    </div>
  );
}

export default QRCodeComp;