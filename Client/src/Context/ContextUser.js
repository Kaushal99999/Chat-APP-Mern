
import { createContext, useEffect, useState } from "react";
import axios from "axios";
export const UserContext=createContext({});


function UserContextProvider({children}){
    const[username,setUsername]=useState(null);
    const[id,setId]=useState(null);
    useEffect(()=>{
        axios.get('/profile').then((response)=>{
            // if(err) throw  err;
            setId(response.data.userId);
            setUsername(response.data.username);
        })
    },[])
    return(
        <UserContext.Provider value={{username,setUsername,id,setId}}>
            {children}
        </UserContext.Provider>
    )
}

export default UserContextProvider;