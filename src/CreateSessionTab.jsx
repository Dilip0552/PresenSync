import {useNavigate} from "react-router-dom"

function CreateSessionTab({classes}){
    const navigate=useNavigate()

    return (
        <div className="w-full h-full flex flex-col items-left justify-start px-6 ">
            <div className="w-full text-2xl font-medium my-2">
                Create Session
            </div>
            <div className="w-full flex flex-col items-left justify-center my-2">
                <span className="text-lg font-medium">Class</span>
                <select name="class" id="selectClass" className="w-fit cursor-pointer px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 active:outline-blue-100">
                    <option value="" >-- Select a class --</option>
                    {classes.map((myclass,index)=>{
                        return (<option key={index} value={myclass}>{myclass}</option>)
                    })}
                </select>
            </div>
            <div className="w-full flex flex-col items-left justify-center my-2">
                <span className="text-lg font-medium">Time Duration</span>

                <div className="w-full flex flex-row items-center justify-left my-2 gap-3">
                    <input type="text" className="w-28 px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 active:outline-blue-50" placeholder="Ex: 30 min"/>
                    <select name="timeDuration" id="selectTimeDuration" className="w-fit cursor-pointer px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 active:outline-blue-50">
                        <option value="min">min</option>
                        <option value="hrs">hrs</option>
                    </select>
                </div>
            </div>
            <div className="w-full flex flex-col items-left justify-center my-2">
                <span className="text-lg font-medium">Start Date & Time</span>
                <input type="date" className="w-fit px-2 py-2 rounded-lg border-2 border-blue-50 outline-blue-50 active:outline-blue-50 cursor-pointer"/>
            </div>
            <button className="w-2xs py-2 my-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 active:bg-blue-700">Create Session</button>
            
        </div>
    )
}
export default CreateSessionTab