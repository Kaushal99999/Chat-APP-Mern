
import axios from 'axios';
import UserContextProvider from './Context/ContextUser';
import Routes from './Routes';

function App() {
  axios.defaults.baseURL='https://chat-back-hzmz.onrender.com';
axios.defaults.withCredentials=true; 
  return (
    <UserContextProvider>
   <Routes/>
   </UserContextProvider>
  );
}

export default App;
