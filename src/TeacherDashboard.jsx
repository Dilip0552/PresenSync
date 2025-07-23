import {useState, useEffect} from "react"
import CreateSessionTab from "./CreateSessionTab"
import ManageClassesTab from "./ManageClassesTab"
import AttendanceReportsTab from "./AttendanceReportsTab"
import {useNavigate, useLocation} from "react-router-dom"

function TeacherDashboard(){
    const [activeTab,setActiveTab]=useState("createSession")
    const [classes,setClasses]=useState(
        ["CS1-A","CS1-B","CS1-C","CS2-A","CS3-A"]
    )
    const navigate=useNavigate()

    const [totalSessions,setTotalSessions]=useState(
        [
            {
            className:"CS1-A",
            dateAndTime:"Apr 20, 10:00 AM",
            totalPresent:18,
            totalAbsent:2,
            totalStudents:20,
            presentPercent:90,
            classID:"abc"
            
        },
            {
            className:"CS1-A",
            dateAndTime:"Apr 21, 11:00 AM",
            totalPresent:10,
            totalAbsent:10,
            totalStudents:20,
            presentPercent:50,
            classID:"abc"
            
        },
            {
            className:"CS1-b",
            dateAndTime:"Apr 21, 10:00 AM",
            totalPresent:18,
            totalAbsent:2,
            totalStudents:20,
            presentPercent:90,
            classID:"def"
            
        },
            {
            className:"CS1-C",
            dateAndTime:"Apr 23, 10:00 AM",
            totalPresent:18,
            totalAbsent:2,
            totalStudents:20,
            presentPercent:90,
            classID:"ghi"
            
        },
            {
            className:"CS2-A",
            dateAndTime:"Apr 23, 10:00 AM",
            totalPresent:18,
            totalAbsent:2,
            totalStudents:20,
            presentPercent:90,
            classID:"jkl"
            
        },
            {
            className:"CS3-A",
            dateAndTime:"Apr 24, 10:00 AM",
            totalPresent:18,
            totalAbsent:2,
            totalStudents:20,
            presentPercent:90,
            classID:"mno"
            
        },
    ]
    )
    const location = useLocation()
    useEffect(() => {
    if (location.pathname === "/create-session") setActiveTab("createSession")
    else if (location.pathname === "/manage-classes") setActiveTab("manageClasses")
    else if (location.pathname === "/attendance-reports") setActiveTab("attendanceReports")
  }, [location.pathname])
    useEffect(() => {
        if (activeTab === "createSession") {
            navigate("/create-session", { replace: true });
        } else if (activeTab === "manageClasses") {
            navigate("/manage-classes", { replace: true });
        } else if (activeTab === "attendanceReports") {
            navigate("/attendance-reports", { replace: true });
        }
    }, [activeTab]);
    const getPage=()=>{
        if (activeTab==="createSession"){
            return (<CreateSessionTab classes={classes} totalSessions={totalSessions} setTotalSessions={setTotalSessions}/>)
        }
        else if (activeTab==="manageClasses"){
            return (<ManageClassesTab classes={classes} setClasses={setClasses}/>)
        }
        else if (activeTab==="attendanceReports"){
            return (<AttendanceReportsTab totalSessions={totalSessions} classes={classes}/>)
        }
        else{
            return (<CreateSessionTab classes={classes} totalSessions={totalSessions} setTotalSessions={setTotalSessions}/>)
        }
    }
    
    return (
        <div className="w-screen h-screen p-8 " style={{backgroundColor:"#EAEEF7"}}>
            <div className="w-full h-full rounded-3xl border-2 border-white  grid grid-cols-5 " style={{backgroundColor:"#F6F9FE"}}>
                {/* Sidebar */}
                <div className="col-span-1 p-4 border-2 border-white rounded-tl-3xl rounded-bl-3xl relative" style={{backgroundColor:"#F3F8FF"}}>
                    <div className="flex flex-col items-left justify-center my-2">
                        <p className="text-2xl font-medium">PresenSync</p>
                    </div>
                    <div className="w-full flex flex-col items-center justify-center my-4">
                        <button onClick={()=>{setActiveTab("createSession")}} className={`w-full px-4 py-3 flex flex-row items-center justify-left rounded-2xl  cursor-pointer transition-colors duration-200 ${activeTab === "createSession" ? "bg-blue-200" : "hover:bg-blue-100"}`}>
                            <img src="src/assets/plus.png" alt="" className="w-4 h-4" />
                            <span className="mx-3 font-mono">Create Session</span>
                        </button>
                        <button onClick={()=>{setActiveTab("manageClasses")}} className={`w-full px-4 py-3 flex flex-row items-center justify-left rounded-2xl  cursor-pointer transition-colors duration-200 ${activeTab === "manageClasses" ? "bg-blue-200" : "hover:bg-blue-100"}`}>
                            <img src="src/assets/presentation.png" alt="" className="w-4 h-4"/>
                            <span className="mx-3 font-mono">Manage Classes</span>
                        </button>
                        <button onClick={()=>{setActiveTab("attendanceReports")}} className={`w-full px-4 py-3 flex flex-row items-center justify-left rounded-2xl  cursor-pointer transition-colors duration-200 ${activeTab === "attendanceReports" ? "bg-blue-200" : "hover:bg-blue-100"}`}>
                            <img src="src/assets/clock.png" alt="" className="w-4 h-4"/>
                            <span className="mx-3 font-mono">Attendance Reports</span>
                        </button>
                    </div>
                    <div className="w-fit absolute bottom-1 left-0 flex flex-row items-center justify-left px-5 py-3 mx-2 my-2 gap-2 cursor-pointer hover:bg-blue-100 active:bg-blue-200 rounded-2xl">
                        <img src="src/assets/user.png" alt="my-account" className="w-6 h-6"/>
                        <span className="text-lg">Profile & Settings</span>
                    </div>
                </div>


                {/* Main Content */}
                <div className=" w-full h-full col-span-4 p-4 border-2 border-white rounded-tr-3xl rounded-br-3xl" style={{backgroundColor:"#FFFFFF"}}>
                    {getPage()}
                </div>                    
            </div>
        </div>
    )
}
export default TeacherDashboard