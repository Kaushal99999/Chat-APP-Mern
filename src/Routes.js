import { useContext } from "react";
import RegisterandLogin from "./Components/RegisterandLogin";
import { UserContext } from "./Context/ContextUser";
import Chat from "./Components/Chat";
export default function Routes(){
    const{username,id}=useContext(UserContext);
    if(username){
        return <Chat/>;

    }
    return(
        <RegisterandLogin/>
    )
}