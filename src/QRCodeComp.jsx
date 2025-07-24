import { useState } from "react"
function QRCodeComp({setShowCreateSession,setShowQR}){
    const [qrDisplayDetails,setQRDisplayDetails]=useState({
        class:"CS1-A",
        duration:"60 min",
        startsAt:"10:30 AM"
    })
    return (
        <div className="w-fit h-fit rounded-2xl flex flex-col items-center justify-top outline-2 outline-blue-200 px-5 py-2 gap-3 transition-all duration-300" style={{backgroundColor:"#F3F8FF"}}>
            <div className="py-2"><span className="text-2xl font-medium">Rotating QR Code</span></div>
            <div className="flex flex-row items-start justify-center">

                <div className="w-full flex flex-col justify-center px-4 py-5">
                    <div className="w-full flex flex-col text-left">
                        <span className="font-medium">Class: {qrDisplayDetails.class}</span>
                        <span className="font-medium">Duration: {qrDisplayDetails.duration}</span>
                        <span className="font-medium">Starts At: {qrDisplayDetails.startsAt}</span>
                    </div>
                    <div><button className="px-6 py-1 text-red-600 rounded-lg text-lg border-2 border-red-400 cursor-pointer my-7 hover:bg-red-50  active:bg-red-100 transition-colors duration-300" onClick={(e)=>{
                        e.target.innerText="Ending..."
                        setTimeout(()=>{
                            setShowCreateSession(true);
                            setShowQR(false);
                        },2000)
                        
                    }}>End Session</button></div>
                </div>
                <div className="w-full my-4 flex flex-col items-center pr-4 ">
                    <div className="w-full rounded-lg bg-white px-4 py-4 ">
                        <img src="src/assets/qr.png" alt="qr code" className="w-fit"/>
                    </div>
                        <span className="pt-2">Scan the QR Code to mark attendance</span>
                </div>
            </div>
            
        </div>
    )
}
export default QRCodeComp