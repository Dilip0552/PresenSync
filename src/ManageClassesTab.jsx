import {useState} from "react"
import {useNavigate} from "react-router-dom"

function ManageClassesTab({classes,setClasses}){
    const [students,SetStudents]=useState(
        [
            {
                name:"Dilip Suthar",
                rollNo:"24041",
                batch:"2028"
            },
            {
                name:"Chandan Giri",
                rollNo:"24042",
                batch:"2028"
            },
            {
                name:"Amit Shah",
                rollNo:"24043",
                batch:"2028"
            },
            {
                name:"Pranjal Dubey",
                rollNo:"24044",
                batch:"2028"
            },
            {
                name:"Kuldeep Saraswat",
                rollNo:"24045",
                batch:"2028"
            },
            {
                name:"Divyanshi Sahu",
                rollNo:"24046",
                batch:"2028"
            },
        ]
    )
    const [currClass,setCurrClass]=useState()
    const [showClassList,setShowClassList]=useState(true)
    const [showAllStudents,setShowAllStudents]=useState(false)
    const [showAddNewClass,setShowAddNewClass]=useState(false)
    const [studentsToAdd,setStudentsToAdd]=useState(
        [
            {
                name:"Dilip Suthar",
                rollNo:"24041",
            },
            {
                name:"Chandan Giri",
                rollNo:"24042",
            },
            {
                name:"Amit Shah",
                rollNo:"24043",
            },
            {
                name:"Pranjal Dubey",
                rollNo:"24044",
            },
            {
                name:"Kuldeep Saraswat",
                rollNo:"24045",
            },
            {
                name:"Divyanshi Sahu",
                rollNo:"24046",
            },
        ]
    )
    return (
        <div className="w-full h-full flex flex-col items-left justify-start px-6 ">
            <div className="w-full text-2xl font-medium my-2">
                Active Classes
            </div>
            {showClassList && !showAllStudents &&
                <div>
                    <div className="flex flex-col items-left justify-center">
                        {classes.map((myclass,index)=>{
                            return (
                                <div key={index} className="w-75 my-1 flex flex-row items-center justify-between rounded-lg px-5 py-2 border-2 border-blue-200 cursor-pointer hover:bg-blue-100 active:bg-blue-200 transition-color duration-200" onClick={()=>{
                                    setShowClassList(false);
                                    setCurrClass(myclass);
                                    setShowAllStudents(true);
                                }}>
                                    <span >{myclass}</span>
                                    <img className="w-4 h-4 opacity-60" src="src/assets/next.png" alt="" />
                                </div>
                            )
                        })}
                    </div>
                    <button className="w-lg border-2 border-blue-200 text-blue-500 px-3 py-2 my-5 rounded-lg cursor-pointer hover:bg-blue-200 hover:border-blue-300 active:bg-blue-300 transition-color duration-200 text-lg font-medium" onClick={()=>{
                        setShowAllStudents(false)
                        setShowClassList(false)
                        setShowAddNewClass(true)
                    }}>+ Add New Class</button>
                </div>
            }
            {showAllStudents && !showClassList && (
                <div className="w-full h-full flex flex-col items-left justify-top transition-all duration-200">
                        <div className="flex flex-row item-center justify-left text-2xl font-medium my-2">
                            <img src="src/assets/back.png" alt="back" className="w-5 h-5 mr-3 translate-y-2 cursor-pointer" onClick={()=>{
                                setShowAllStudents(false);
                                setShowAddNewClass(false)
                                setShowClassList(true);
                            }}/>
                            <span>{currClass}</span>
                        </div>
                        <div  className="w-full overflow-x-auto rounded-lg shadow-md mt-4">
                                    <table className="min-w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs uppercase bg-blue-100 text-blue-800">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">S. No.</th>
                                            <th scope="col" className="px-6 py-3">Name</th>
                                            <th scope="col" className="px-6 py-3">Roll No.</th>
                                            <th scope="col" className="px-6 py-3">Batch</th>
                                            <th scope="col" className="px-6 py-3">Action</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {students.map((student, index) => (
                                            <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">{index+1}</td>
                                            <td className="px-6 py-4">{student.name}</td>
                                            <td className="px-6 py-4">{student.rollNo}</td>
                                            <td className="px-6 py-4">{student.batch}</td>
                                            <td className="px-6 py-4"><button className="text-blue-500  active:text-blue-600 cursor-pointer">Edit</button></td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                                </div>
            )}
            {
                !showAllStudents && !showClassList && showAddNewClass && (
                    <div className="w-full h-full flex flex-col items-left justify-top py-4">
                        <div className="w-full grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-left justify-top">
                                <span className="font-medium">Year</span>
                                <select name="year" id="year" className="w-fit cursor-pointer px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 active:outline-blue-100">
                                    <option value="">-- Select a Year --</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                            </div>
                            <div className="flex flex-col items-left justify-top">
                                <span className="font-medium">Batch</span>
                                <input type="text" placeholder="Ex: 2028" className="w-fit  px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 active:outline-blue-100"/>
                            </div>
                            <div className="w-full  px-3 py-1.5 my-3 rounded-2xl border-2 border-blue-200">
                                <span className="text-lg font-medium">Students</span>
                                <ul className="my-3 h-[370px] overflow-y-auto">

                                {studentsToAdd.length===0? <div className="text-gray-500">No Students Added</div>:
                                    studentsToAdd.map((student,index)=>{
                                        
                                        return (
                                            <li key={index} className="px-5 text-lg flex flex-row align-center justify-between rounded-2xl hover:bg-blue-100 py-2 cursor-pointer" >
                                                {student.name}
                                                <img src="src/assets/remove.png" alt="delete" className="w-5 h-5 translate-y-1" onClick={()=>{
                                                    const idx=studentsToAdd.findIndex((item)=>item.name===student.name);
                                                    if (idx!==-1){
                                                        const updatedList = [...studentsToAdd];
                                                        updatedList.splice(idx, 1);
                                                        setStudentsToAdd(updatedList);
                                                    }
                                                }}/>
                                            </li>
                                        )
                                    })
                                }
                                </ul>
                            </div>
                            <div className="w-full h-[430px] px-3 py-1.5 my-3 rounded-2xl border-2 border-blue-200">
                                <span className="text-lg font-medium">Add Students</span>
                            </div>
                        </div>
                    </div>
                )
            }
            
        </div>
    )
}
export default ManageClassesTab