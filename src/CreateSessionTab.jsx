import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import QRCodeComp from "./QRCodeComp";

function CreateSessionTab({ classes }) {
  const navigate = useNavigate();
  const [showCreateSession, setShowCreateSession] = useState(true);
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="w-full h-full bg-gray-50 rounded-2xl">
      {showCreateSession && !showQR && (
        <div className="w-full h-full flex flex-col items-start justify-start px-6 transition-all duration-300">
          <div className="w-full text-2xl font-semibold text-blue-700 my-2 pt-1">Create Session</div>

          <div className="w-full flex flex-col items-start justify-center mb-4">
            <label htmlFor="selectClass" className="text-lg font-medium mb-1">Class</label>
            <select
              name="class"
              id="selectClass"
              className="w-60 px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">-- Select a class --</option>
              {classes.map((myclass, index) => (
                <option key={index} value={myclass}>{myclass}</option>
              ))}
            </select>
          </div>

          <div className="w-full flex flex-col items-start justify-center mb-4">
            <label className="text-lg font-medium mb-1">Time Duration</label>
            <div className="flex flex-row items-center gap-3">
              <input
                type="text"
                className="w-28 px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="Ex: 30"
              />
              <select
                name="timeDuration"
                id="selectTimeDuration"
                className="w-fit px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="min">min</option>
                <option value="hrs">hrs</option>
              </select>
            </div>
          </div>

          <div className="w-full flex flex-col items-start justify-center mb-4">
            <label className="text-lg font-medium mb-1">Start Date & Time</label>
            <input
              type="datetime-local"
              className="w-fit px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
            />
          </div>

          <button
            className="px-6 py-2 mt-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 font-semibold shadow-md cursor-pointer"
            onClick={() => {
              setShowQR(true);
              setShowCreateSession(false);
            }}
          >
            Create Session
          </button>
        </div>
      )}

      {showQR && !showCreateSession && (
        <div className="flex flex-col items-start justify-start py-4 px-6 transition-all duration-300">
          <span className="text-2xl font-semibold text-blue-700">Teacher Dashboard</span>
          <div className="w-full flex items-center justify-center mt-6">
            <QRCodeComp setShowCreateSession={setShowCreateSession} setShowQR={setShowQR} />
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateSessionTab;
