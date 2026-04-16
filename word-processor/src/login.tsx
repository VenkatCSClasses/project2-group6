import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import data from "./accounts.json"; // Temporary import for accounts data (replace with backend later)

const LoginPage = () => {
   const navigate = useNavigate();

   const [username, setUsername] = useState<string>("");
   const [password, setPassword] = useState<string>("");

   const [error, setError] = useState<string | null>(null);

   const handleLogin = () => {
      console.log("Username:", username);
      console.log("Password:", password);

      if (!username || !password) {
      setError("Please fill in all fields");
      return;
   }

      if (username && password) {
         const user = data.users.find(u => u.username === username);
         
         if (user) {
            if (password === user.password) {
               setError(null);
               navigate("/dashboard");
            } else {
               setError("Incorrect password");
               return;
            }
         } else {
            setError("User not found");
            return;
         }
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
         {error && (
            <div style={errorStyle}>
               <span>{error}</span>
               <button onClick={() => setError(null)} style={closeButtonStyle}>✕</button>
            </div>
         )}
         <h1 style={{ marginBottom: "100px", fontSize: "75px" }}>Copybara|</h1>

         <input
            type="text"
            placeholder="Email"
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

const errorStyle: React.CSSProperties = {
   position: "fixed",
   top: "20px",
   right: "20px",
   backgroundColor: "#ef4444",
   color: "white",
   padding: "12px 16px",
   borderRadius: "8px",
   display: "flex",
   alignItems: "center",
   gap: "10px",
   boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
};

const closeButtonStyle: React.CSSProperties = {
   background: "transparent",
   border: "none",
   color: "white",
   fontSize: "16px",
   cursor: "pointer",
};

export default LoginPage;