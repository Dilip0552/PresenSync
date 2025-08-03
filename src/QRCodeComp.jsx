import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Spinner from "./Spinner";

// QR code refresh interval in milliseconds (e.g., 30 seconds)
const QR_REFRESH_INTERVAL_MS = 30 * 1000;

function QRCodeComp({ sessionData, handleBack, addNotification, onEndSession }) {
  const [qrValue, setQrValue] = useState("");
  const [showEndingSpinner, setShowEndingSpinner] = useState(false);
  const [countdown, setCountdown] = useState(QR_REFRESH_INTERVAL_MS / 1000); // Countdown in seconds
  const intervalRef = useRef(null);

  // Function to generate and update QR code data
  const generateNewQrData = () => {
    if (sessionData && sessionData.sessionId) {
      const newTimestamp = Date.now(); // Get current time for QR code "liveness"
      const dataToEncode = JSON.stringify({
        sessionId: sessionData.sessionId,
        timestamp: newTimestamp, // This timestamp will now constantly update
        classId: sessionData.classId,
        className: sessionData.className,
        teacherId: sessionData.teacherId,
        classroomLat: sessionData.classroomLat,
        classroomLon: sessionData.classroomLon,
      });
      setQrValue(dataToEncode);
      setCountdown(QR_REFRESH_INTERVAL_MS / 1000); // Reset countdown
    } else {
      addNotification("Error: Missing session ID for QR code generation.", "error");
      setQrValue("Error: Invalid session data.");
    }
  };

  useEffect(() => {
    // Initial QR code generation
    generateNewQrData();

    // Set up interval for refreshing QR code
    intervalRef.current = setInterval(() => {
      generateNewQrData();
    }, QR_REFRESH_INTERVAL_MS);

    // Set up interval for countdown display
    const countdownInterval = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : QR_REFRESH_INTERVAL_MS / 1000));
    }, 1000);

    // Cleanup function: clear intervals when component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [sessionData, addNotification]); // Re-run effect if sessionData changes

  const handleEndSession = async () => {
    if (!sessionData || !sessionData.sessionId) {
      addNotification("No active session to end.", "error");
      return;
    }
    setShowEndingSpinner(true);
    // Clear the QR refresh interval immediately when session ends
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    await onEndSession(sessionData.sessionId); // Call the prop function to update Firestore
    setShowEndingSpinner(false);
    handleBack(); // Go back to create session form
  };

  if (!sessionData || !sessionData.sessionId) {
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

  return (
    <div
      className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-gray-100 p-6 flex flex-col items-center gap-6"
    >
      <div className="text-3xl font-bold text-blue-800 text-center">Live Session QR Code</div>

      <div className="flex flex-col md:flex-row items-center md:items-start justify-center w-full gap-8">
        <div className="w-full md:w-1/2 flex flex-col justify-start items-start px-2 py-2">
          <div className="w-full text-left space-y-2 mb-8">
            <span className="block text-lg font-medium text-gray-700">Class: <span className="font-semibold text-gray-900">{sessionData.className}</span></span>
            <span className="block text-lg font-medium text-gray-700">Session ID: <span className="font-semibold text-gray-900 break-all">{sessionData.sessionId}</span></span>
            <span className="block text-lg font-medium text-gray-700">Generated At: <span className="font-semibold text-gray-900">{new Date(JSON.parse(qrValue || '{}').timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></span>
            <span className="block text-sm text-gray-500 italic">on {new Date(JSON.parse(qrValue || '{}').timestamp || Date.now()).toLocaleDateString()}</span>
            <span className="block text-base font-semibold text-gray-700 mt-4">QR refreshes in: <span className="text-blue-600">{countdown}s</span></span>
          </div>

          <button
            className={`flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold border-2 border-red-400 cursor-pointer transition-colors duration-300 shadow-md
              ${showEndingSpinner ? "bg-red-100 text-red-700 opacity-70 cursor-not-allowed" : "bg-red-500 text-white hover:bg-red-600 active:bg-red-700"}
            `}
            onClick={handleEndSession}
            disabled={showEndingSpinner}
          >
            {showEndingSpinner ? "Ending..." : "End Session"}
            {showEndingSpinner && <div className="ml-3 w-6 h-6"><Spinner isVisible={true} /></div>}
          </button>
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-center pr-2">
          <div className="p-4 bg-gray-50 rounded-lg shadow-inner border border-gray-200">
            {qrValue ? (
              <QRCodeSVG value={qrValue} size={256} level="H" includeMargin={true} />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                <Spinner message="Generating QR..." isVisible={true} />
              </div>
            )}
          </div>
          <span className="pt-4 text-gray-600 text-center text-base font-medium">Scan the QR Code to mark attendance</span>
        </div>
      </div>
    </div>
  );
}

export default QRCodeComp;
