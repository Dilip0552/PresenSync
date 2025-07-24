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
    const [name,setName]=useState("")
    const handleName=(e)=>{
        setName(e.target.value)
    }
    const [rollNo,setRollNo]=useState("")
    const handleRollNo=(e)=>{
        setRollNo(e.target.value)
    }
    const [year,setYear]=useState()
    const handleYear=(e)=>{
        setYear(e.target.value)
    }
    const [batch,setBatch]=useState("")
    const handleBatch = (e) => {
    const re = /^[0-9\b]+$/; 
    if (e.target.value === "" || re.test(e.target.value) && e.target.value.length<=4) {
      setBatch(e.target.value);
    }
  };
    const [section,setSection]=useState("")
    const handleSection=(e)=>{
        const re = /^[a-z\b]+$/; 
        if (e.target.value === "" || re.test(e.target.value) && e.target.value.length<=1) {
            setSection(e.target.value);
    }
    }
    return (
        <div className="w-full h-full flex flex-col items-left justify-start px-6 ">
            <div className="w-full text-2xl font-medium my-2">
                Active Classes
            </div>
            {showClassList && !showAllStudents &&
                <div>
                    <div className="flex flex-col items-left justify-top h-[510px] overflow-y-auto">
                        {classes.map((myclass,index)=>{
                            return (
                                <div key={index} className="w-lg my-1 flex flex-row items-center justify-between rounded-lg px-5 py-2 border-2 border-blue-200 cursor-pointer hover:bg-blue-100 active:bg-blue-200 transition-color duration-200" onClick={(e)=>{
                                    if (e.target.id!=="delete"){
                                    setShowClassList(false);
                                    setCurrClass(myclass);
                                    setShowAllStudents(true);}
                                }}>
                                    <span className="w-1/6 text-lg">{myclass}</span>
                                    <div className="w-full flex flex-row items-center justify-between">
                                        <img className="w-4 h-4 opacity-60" id="next" src="src/assets/next.png" alt="" />
                                        <img src="src/assets/delete.png" alt="delete" id="delete" className="w-9 h-9 px-2 py-2 bg-gray-100 hover:bg-gray-300 active:bg-gray-400 rounded-full" onClick={(e)=>{
                                            if (e.target.id=="delete"){
                                                console.log("img clicked")
                                            }
                                        }}/>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <button className="w-1/2 border-2 border-blue-200 text-blue-500 px-3 py-2 mt-2 rounded-lg cursor-pointer hover:bg-blue-200 hover:border-blue-300 active:bg-blue-300 transition-color duration-200 text-lg font-medium translate-x-[50%] "  onClick={()=>{
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
                        <div className="w-full grid grid-cols-3 gap-4">
                            <div className="flex flex-col items-left justify-top col-span-1">
                                <span className="font-medium">Year</span>
                                <select name="year" id="year" className="w-fit cursor-pointer px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 active:outline-blue-100" value={year} onChange={handleYear}>
                                    <option value="">-- Select a Year --</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                            </div>
                            <div className="flex flex-col items-left justify-top col-span-1">
                                <span className="font-medium">Batch</span>
                                <input type="text" onChange={handleBatch} value={batch} placeholder="Ex: 2028" className="w-fit  px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 focus:outline-blue-200"/>
                            </div>
                            <div className="flex flex-col items-left justify-top col-span-1">
                                <span className="font-medium">Section</span>
                                <input type="text" onChange={handleSection} value={section} placeholder="Ex: B" className="w-fit  uppercase px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 focus:outline-blue-200"/>
                            </div>
                            <div className="w-full  h-fit px-4 py-3 my-3 rounded-2xl border-2 border-blue-200 col-span-1">
                                <span className="text-lg font-medium">Students Added</span>
                                <ul className="my-3 h-[280px] overflow-y-auto">

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
                            <div className="w-full h-[355px] px-4 py-3 my-3 rounded-2xl border-2 border-blue-200 col-span-2 relative">
                                <span className="text-lg font-medium">Add Students</span>

                                <div className="w-full grid grid-cols-2 my-4">

                                    <div className="ml-4 mr-4 col-span-1 flex flex-col items-left justify-top">
                                        <span className="font-medium">Name</span>
                                        <input type="text" placeholder="Enter Student name" className="w-full  px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 focus:outline-blue-200" value={name} onChange={handleName}/>
                                    </div>
                                    <div className="ml-4 col-span-1 flex flex-col items-left justify-top">
                                        <span className="font-medium">Roll No.</span>
                                        <input type="text" placeholder="Enter Roll No." className=" w-full  px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 focus:outline-blue-200" value={rollNo} onChange={handleRollNo}/>
                                    </div>
                                    
                                </div>
                                <div className="w-full px-10 flex flex-row align-center justify-between absolute bottom-4 left-2">
                                    <button className="bg-white w-1/3 rounded-lg py-2  text-gray-800  font-normal text-lg hover:bg-blue-100 active:bg-blue-200 cursor-pointer " onClick={()=>{
                                        setName("");
                                        setRollNo("");  
                                    }}>Cancel</button>
                                    <button className="bg-blue-500 w-1/3 rounded-lg py-2  text-white font-medium text-lg cursor-pointer hover:bg-blue-600 active:bg-blue-700" onClick={()=>{
                                        const updated=[...studentsToAdd]
                                        if (name!=="" || rollNo!==""){

                                            updated.push({name:name,rollNo:rollNo})
                                            setStudentsToAdd(updated)
                                        }
                                    }}>Add Student</button>
                                </div>


                            </div>
                        </div>
                        <div className=" px-10 w-full flex flex-row items-center justify-between my-3">
                            <button className="w-1/3 bg-white  rounded-lg py-2  text-gray-800  font-normal text-lg hover:bg-blue-100 active:bg-blue-200 cursor-pointer " onClick={()=>{
                                setShowClassList(true);
                                setShowAddNewClass(false);
                            }}>Cancel</button>
                            <button className="w-1/3 bg-blue-500 rounded-lg py-2  text-white font-medium text-lg hover:bg-blue-600 active:bg-blue-700 cursor-pointer" onClick={(e)=>{
                                if (section!=="" && year!=="" && batch!==""){
                                    e.target.innerText="Saving..."
                                    const temp=`CS${year}-${section.toUpperCase()}`
                                    const updatedSection=[...classes]
                                    updatedSection.push(temp);
                                    setClasses(updatedSection);
                                    setShowClassList(true);
                                    setShowAddNewClass(false);
                                }
                            }}>Add Class</button>
                        </div>
                    </div>
                )
            }
            
        </div>
    )
}
export default ManageClassesTab