import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const LoginPage = () => {
   const navigate = useNavigate();

   const [username, setUsername] = useState<string>("");
   const [password, setPassword] = useState<string>("");

   const handleLogin = () => {
      console.log("Username:", username);
      console.log("Password:", password);

      // Temporary login (replace with backend later)
      if (username && password) {
         navigate("/dashboard");
      }
   };

   return (
      <div
         style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "75vh",
         }}
      >
         <h1 style={{marginBottom: "100px", fontSize: "75px"}}>Capybara|</h1>

         <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={input}
         />

         <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
         />

         <button style={button} onClick={handleLogin}>
            Login
         </button>

         <Link to="/register" style={signUp}>
            Sign Up
         </Link>
      </div>
   );
};

const button: React.CSSProperties = {
   padding: "10px 16px",
   marginTop: "10px",
   fontSize: "16px",
   width: "140px",
   height: "40px",
   justifyContent: "center",
   alignItems: "center",
   backgroundColor: "#2563eb",
   color: "white",
   border: "none",
   borderRadius: "6px",
   cursor: "pointer",
};

const signUp: React.CSSProperties = {
   marginTop: "10px",
   fontSize: "14px",
   justifyContent: "center",
   alignItems: "center",
   color: "blue",
   border: "none",
   borderRadius: "6px",
   cursor: "pointer",
};

const input: React.CSSProperties = {
   display: "block",
   marginBottom: "10px",
   padding: "8px",
   justifyContent: "center",
   alignItems: "center",
};

export default LoginPage;