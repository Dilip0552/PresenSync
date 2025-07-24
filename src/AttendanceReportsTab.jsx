import {useState} from "react"
import {useNavigate} from "react-router-dom"

function AttendanceReportsTab({totalSessions,classes}){
    const [selectedClass,setSelectedClass]=useState("")
    const [showClassesList,setShowClassesList]=useState(true)
    const [showAllStudentAttendance, setShowAllStudentAttendance]=useState(false)
    const [showClassReport, setShowClassReport]=useState(false)
    const [studentsReports,SetStudentReports]=useState(
        [
            {
                name:"Dilip Suthar",
                rollNo:"24041",
                status:"Present",
                time:"10:04 AM"
            },
            {
                name:"Chandan Giri",
                rollNo:"24042",
                status:"Present",
                time:"10:05 AM"
            },
            {
                name:"Amit Shah",
                rollNo:"24043",
                status:"Absent",
                time:"-"
            },
            {
                name:"Kuldeep Saraswat",
                rollNo:"24044",
                status:"Absent",
                time:"-"
            },
            {
                name:"Pranjal Dubey",
                rollNo:"24045",
                status:"Present",
                time:"10:07 AM"
            },
            {
                name:"Divyanshi Sahu",
                rollNo:"24046",
                status:"Present",
                time:"10:04 AM"
            },
        ]
    )
    const filteredSession = (cls) => totalSessions.filter((item) => item.className === cls);
    const navigate=useNavigate()
    return (
        <div className="w-full h-full flex flex-col items-left justify-start px-6 ">
            <div className="w-full flex flex-row item-center justify-left text-2xl font-medium my-2">
                <span>Attendance Reports</span>
            </div>
            <div className="flex flex-col items-center justify-top h-[calc(100vh-220px) overflow-y-auto">
                {showClassesList && totalSessions.map((session,index)=>{
                    return (
                    <div key={index} className="w-lg my-1 flex flex-row items-center justify-between rounded-lg px-5 py-2 border-2 border-blue-200 cursor-pointer hover:bg-blue-100 active:bg-blue-200 transition-all duration-200 " onClick={()=>{
                        setShowClassesList(false)
                        setSelectedClass(session.className)
                        setShowClassReport(true)
                    }}>
                        <span className="text-lg">{session.className}</span>
                        <img className="w-4 h-4 opacity-60" src="src/assets/next.png" alt="" />
                    </div>
                    )
                })}
                {
                    !showClassesList && showClassReport && selectedClass!=="" && 
                    <div className="w-full h-full flex flex-col items-left justify-top transition-all duration-200">
                        <div className="flex flex-row item-center justify-left text-2xl font-medium my-2">
                            <img src="src/assets/back.png" alt="back" className="w-5 h-5 mr-3 translate-y-2 cursor-pointer" onClick={()=>{
                                setShowClassesList(true);
                                setSelectedClass("")
                            }}/>
                            <span>{selectedClass}</span>
                        </div>
                        <div>
                            
                    
                                <div  className="w-full overflow-x-auto rounded-lg shadow-md mt-4">
                                    <table className="min-w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs uppercase bg-blue-100 text-blue-800">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Session</th>
                                            <th scope="col" className="px-6 py-3">Total Present</th>
                                            <th scope="col" className="px-6 py-3">Total Absent</th>
                                            <th scope="col" className="px-6 py-3">Total Students</th>
                                            <th scope="col" className="px-6 py-3">%</th>
                                            <th scope="col" className="px-6 py-3">Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {filteredSession(selectedClass).map((session, index) => (
                                            <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">{session.dateAndTime}</td>
                                            <td className="px-6 py-4">{session.totalPresent}</td>
                                            <td className="px-6 py-4">{session.totalAbsent}</td>
                                            <td className="px-6 py-4">{session.totalStudents}</td>
                                            <td className="px-6 py-4">{session.presentPercent}</td>
                                            <td className="px-6 py-4"><button className="text-blue-500  active:text-blue-600 cursor-pointer" onClick={()=>{
                                                setShowClassReport(false)
                                                setShowAllStudentAttendance(true)
                                            }}>View</button></td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                         
                        </div>
                    </div>
                }
                {
                    !showClassesList && selectedClass!=="" && showAllStudentAttendance && (
                        <div className="w-full h-full flex flex-col items-left justify-top transition-all duration-200">
                        <div className="flex flex-row item-center justify-left text-2xl font-medium my-2">
                            <img src="src/assets/back.png" alt="back" className="w-5 h-5 mr-3 translate-y-2 cursor-pointer" onClick={()=>{
                                setShowAllStudentAttendance(false);
                                setShowClassReport(true)
                            }}/>
                            <span>{selectedClass}</span>
                        </div>
                        <div  className="w-full overflow-x-auto rounded-lg shadow-md mt-4">
                                    <table className="min-w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs uppercase bg-blue-100 text-blue-800">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">S. No.</th>
                                            <th scope="col" className="px-6 py-3">Name</th>
                                            <th scope="col" className="px-6 py-3">Roll No.</th>
                                            <th scope="col" className="px-6 py-3">Status</th>
                                            <th scope="col" className="px-6 py-3">Time</th>
                                            <th scope="col" className="px-6 py-3">Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {studentsReports.map((student, index) => (
                                            <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">{index+1}</td>
                                            <td className="px-6 py-4">{student.name}</td>
                                            <td className="px-6 py-4">{student.rollNo}</td>
                                            <td className="px-6 py-4">{student.status}</td>
                                            <td className="px-6 py-4">{student.time}</td>
                                            <td className="px-6 py-4"><button className="text-blue-500  active:text-blue-600 cursor-pointer">View</button></td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                                </div>
                    )
                }
            </div>
    
            
            
        </div>
    )
}
export default AttendanceReportsTab