import { useContext, useEffect, useState ,useRef} from "react"
import Logo from "./Logo";
import { UserContext } from "../Context/ContextUser";
import {uniqBy} from "lodash";
import axios from "axios";
import Contact from "./contact";
export default function Chat(){
    const[ws,setWs]=useState(null);
    const[onlinePeople,setOnlinePeople]=useState({});
    const[selectedUserId,setSelectedUserId]=useState(null);
    const{username,id,setId,setUsername}=useContext(UserContext);
    const[newMessageText,setNewMessageText]=useState('');
    const divUnderMessages=useRef();
    const[messages,setMessages]=useState([]);
    const[offlinePeople,setOfflinePeople]=useState({})
    useEffect(()=>{
        connectToWs();

    },[]);

    function connectToWs(){
        const ws=  new WebSocket('ws://localhost:4040')
        setWs(ws);
        ws.addEventListener('message',handleMessage);
        ws.addEventListener('close',()=>{
            setTimeout(()=>{
                connectToWs();
            },1000)
            });

    }
    function showOnlinePeople(peopleArray){
        const people={};
      
        peopleArray.forEach(({userId,username}) => {
            if(userId!==undefined && username !==undefined)
            people[userId]=username;
        });
        setOnlinePeople(people); 

    }
    function handleMessage(e){
        const messageData=JSON.parse(e.data);
        if('online' in messageData){
            showOnlinePeople(messageData.online);

        }
        else if('text' in messageData){
            if(messageData.sender===selectedUserId){
                setMessages(prev=>([...prev,{...messageData}]))
            }
        
        }
        
    }

    function logout(){
        axios.post('/logout').then(()=>{
            setWs(null);
            setId(null);
            setUsername(null);
        })

    }
    function sendMessage(ev,file=null){
        if(ev) ev.preventDefault();
        ws.send(JSON.stringify({
                recipient:selectedUserId,
                text:newMessageText,
                file,
        }))
        
        if(file){
            axios.get('/messages/'+selectedUserId).then(res=>{
                setMessages(res.data);
            })
        }
        else{
        setNewMessageText('');
        setMessages(prev=>([...prev,{text:newMessageText,sender:id,recipient:selectedUserId,_id:Date.now()}]));

        }
    }

    function sendFile(ev){
        const reader=new FileReader();
        reader.readAsDataURL(ev.target.files[0]);
        reader.onload=()=>{
            sendMessage(null,{
                info:ev.target.files[0].name,
                data:reader.result,
                mimeType:ev.target.files[0].type,
            })
        }
        

    }

    useEffect(()=>{
        const div=divUnderMessages.current;
        if(div){
            div.scrollIntoView({behaviour:'smooth',block:'end'});
        }
     
    },[messages]);

    useEffect(()=>{
        if(selectedUserId){
            axios.get('/messages/'+selectedUserId).then(res=>{
                setMessages(res.data);
            })
        }

    },[selectedUserId]);

    useEffect(()=>{
        axios.get('/people').then(res=>{
            const offlinePeopleArr=res.data.filter(p=>p._id !==id).filter(p=>!Object.keys(onlinePeople).includes(p._id));
            const offlinePeople={};
            offlinePeopleArr.forEach(p=>{
                offlinePeople[p._id]=p;
            })
            setOfflinePeople(offlinePeople);
        })
    },[onlinePeople])
    const onlinePeopleExclOurUser={...onlinePeople};
    delete onlinePeopleExclOurUser[id];

    const messageWithoutDupes=uniqBy(messages,'_id');
    console.log(messageWithoutDupes);

    return(
       <div className="flex h-screen">
         <div className="bg-white w-1/3 flex flex-col">
            <div className="flex-grow">
          <Logo/>
            {Object.keys(onlinePeopleExclOurUser).map(userId=>(
            <Contact key={userId} id={userId} online={true} username={onlinePeopleExclOurUser[userId]} onClick={()=>setSelectedUserId(userId)} selected={userId===selectedUserId}/>

              ))}

               {Object.keys(offlinePeople).map(userId=>(
        
        <Contact key={userId} id={userId} online={false} username={offlinePeople[userId].username} onClick={()=>setSelectedUserId(userId)} selected={userId===selectedUserId}/>

          ))}


          </div>
          <div className="p-2 text-center flex items-center justify-center">
           <span className="mr-2 text-sm text-gray-600 flex items-center">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
  <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clip-rule="evenodd" />
</svg>

             {username}</span> 
            <button onClick={logout} className="text-sm text-gray-500 bg-blue-100 py-1 px-2 border rounded-sm">Logout</button></div>

         </div>
         <div className=" flex flex-col bg-blue-50 w-2/3 p-2">
            <div className="flex-grow">{
                !selectedUserId&&(
                <div className="flex items-center h-full justify-center">
                    <div className="text-gray-300"> &larr; Select a person from the sidebar</div>

                    </div>
                )}
                {!!selectedUserId &&(
                    <div className="relative h-full">
                    <div  className="overflow-y-scroll absolute inset-0">
              
                            
              {messageWithoutDupes.map(message=>(
                            <div key={message._id} className={(message.sender===id? 'text-right':'text-left')}> 
                  <div className={" text-left inline-block p-2 my-2 rounded-md text-sm " +(message.sender===id? 'bg-blue-500 text-white':'bg-white text-gray-500')}>
                      {message.text}
                      {message.filename&&(
                      
                        <div >           
                            <a target="_blank" className="flex items-center gap-1underline border-b" href={message.fileurl} >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
  <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
</svg>
<p>hello</p>
                                {message.filename}
                            </a>
                        </div>

                      )}
                      </div>
                      </div>
              ))}   
              <div ref={divUnderMessages}></div>
              
    
          </div>
                    </div>
            

                )}
                  </div>
                {!!selectedUserId&&(  
                        <form className="flex gap-2" onSubmit={sendMessage}>
                    <label  className="bg-blue-200 text-gray-600 cursor-pointer py-2  rounded-md border border-blue-200">
                        <input type="file" className="hidden" onChange={sendFile}/>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
  <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
</svg>
                            </label>
                        <input value={newMessageText}
                        onChange={ev=>setNewMessageText(ev.target.value)} type="text" placeholder="Type your message here" className="bg-white flex-grow border pd-2 rounded-sm"/>
                        <button className="bg-blue-500 p-2 text-white rounded-sm">

                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
        </svg>
        </button>
                    </form>

                    )}
              

         </div>

       </div>
    )
}
