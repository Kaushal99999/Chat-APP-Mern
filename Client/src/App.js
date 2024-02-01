
import axios from 'axios';
import UserContextProvider from './Context/ContextUser';
import Routes from './Routes';

function App() {
  axios.defaults.baseURL='https://chat-app-mern-f58s.vercel.app';
axios.defaults.withCredentials=true; 
  return (
    <UserContextProvider>
   <Routes/>
   </UserContextProvider>
  );
}

export default App;
