import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AttendanceReportsTab({ totalSessions, classes }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [showClassesList, setShowClassesList] = useState(true);
  const [showAllStudentAttendance, setShowAllStudentAttendance] = useState(false);
  const [showClassReport, setShowClassReport] = useState(false);
  const [studentsReports, SetStudentReports] = useState([
    { name: "Dilip Suthar", rollNo: "24041", status: "Present", time: "10:04 AM" },
    { name: "Chandan Giri", rollNo: "24042", status: "Present", time: "10:05 AM" },
    { name: "Amit Shah", rollNo: "24043", status: "Absent", time: "-" },
    { name: "Kuldeep Saraswat", rollNo: "24044", status: "Absent", time: "-" },
    { name: "Pranjal Dubey", rollNo: "24045", status: "Present", time: "10:07 AM" },
    { name: "Divyanshi Sahu", rollNo: "24046", status: "Present", time: "10:04 AM" },
  ]);

  const filteredSession = (cls) => totalSessions.filter((item) => item.className === cls);
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col px-6 py-3 bg-gray-50 rounded-2xl">
      <h1 className="text-2xl font-medium mb-4 text-blue-700">Attendance Reports</h1>

      <div className="flex flex-col items-center overflow-y-auto gap-3">
        {showClassesList && totalSessions.map((session, index) => (
          <div
            key={index}
            className="w-full md:w-2/3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl px-6 py-4 shadow-sm cursor-pointer transition-all"
            onClick={() => {
              setShowClassesList(false);
              setSelectedClass(session.className);
              setShowClassReport(true);
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">{session.className}</span>
              <img className="w-4 h-4 opacity-60" src="/src/assets/next.png" alt="next" />
            </div>
          </div>
        ))}

        {!showClassesList && showClassReport && selectedClass !== "" && (
          <div className="w-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/src/assets/back.png"
                alt="back"
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  setShowClassesList(true);
                  setSelectedClass("");
                }}
              />
              <h2 className="text-2xl font-semibold text-blue-700">{selectedClass}</h2>
            </div>

            <div className="overflow-x-auto rounded-lg shadow-md bg-white">
              <table className="min-w-full text-sm text-left text-gray-600">
                <thead className="text-xs bg-blue-100 text-blue-800 uppercase">
                  <tr>
                    <th className="px-6 py-3">Session</th>
                    <th className="px-6 py-3">Total Present</th>
                    <th className="px-6 py-3">Total Absent</th>
                    <th className="px-6 py-3">Total Students</th>
                    <th className="px-6 py-3">%</th>
                    <th className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSession(selectedClass).map((session, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{session.dateAndTime}</td>
                      <td className="px-6 py-4">{session.totalPresent}</td>
                      <td className="px-6 py-4">{session.totalAbsent}</td>
                      <td className="px-6 py-4">{session.totalStudents}</td>
                      <td className="px-6 py-4">{session.presentPercent}</td>
                      <td className="px-6 py-4">
                        <button
                          className="text-blue-600 hover:underline cursor-pointer"
                          onClick={() => {
                            setShowClassReport(false);
                            setShowAllStudentAttendance(true);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!showClassesList && selectedClass !== "" && showAllStudentAttendance && (
          <div className="w-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/src/assets/back.png"
                alt="back"
                className="w-5 h-5 cursor-pointer"
                onClick={() => {
                  setShowAllStudentAttendance(false);
                  setShowClassReport(true);
                }}
              />
              <h2 className="text-2xl font-semibold text-blue-700">{selectedClass}</h2>
            </div>

            <div className="overflow-x-auto rounded-lg shadow-md bg-white">
              <table className="min-w-full text-sm text-left text-gray-600">
                <thead className="text-xs bg-blue-100 text-blue-800 uppercase">
                  <tr>
                    <th className="px-6 py-3">S. No.</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Roll No.</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsReports.map((student, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{index + 1}</td>
                      <td className="px-6 py-4">{student.name}</td>
                      <td className="px-6 py-4">{student.rollNo}</td>
                      <td className={`px-6 py-4 font-semibold ${student.status === "Present" ? "text-green-600" : "text-red-500"}`}>{student.status}</td>
                      <td className="px-6 py-4">{student.time}</td>
                      <td className="px-6 py-4">
                        <button className="text-blue-600 hover:underline cursor-pointer">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceReportsTab;
