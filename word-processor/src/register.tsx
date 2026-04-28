import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!username || !password || !password2) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }

    const res = await fetch("http://localhost:3001/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Unable to register.");
      return;
    }

    localStorage.setItem("username", username);
    setError(null);
    navigate("/dashboard");
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
      {error ? <div style={errorStyle}><span>{error}</span></div> : null}
      <h1 style={{ marginBottom: "100px", fontSize: "75px" }}>Copybara|</h1>

      <input
        type="text"
        placeholder="Email"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        style={inputStyle}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        style={inputStyle}
      />

      <input
        type="password"
        placeholder="Verify Password"
        value={password2}
        onChange={(event) => setPassword2(event.target.value)}
        style={inputStyle}
      />

      <button style={buttonStyle} onClick={handleRegister}>
        Register
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
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

const inputStyle: React.CSSProperties = {
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
