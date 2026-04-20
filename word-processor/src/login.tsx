import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to log in.");
        return;
      }

      localStorage.setItem("username", username);
      setError(null);
      navigate("/dashboard");
    } catch {
      setError("Server error. Try again.");
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
      {error ? (
        <div style={errorStyle}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={closeButtonStyle}>x</button>
        </div>
      ) : null}
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

      <button style={buttonStyle} onClick={handleLogin}>
        Login
      </button>

      <Link to="/register" style={linkStyle}>
        Sign Up
      </Link>
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

const linkStyle: React.CSSProperties = {
  marginTop: "10px",
  fontSize: "14px",
  justifyContent: "center",
  alignItems: "center",
  color: "blue",
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

const closeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: "16px",
  cursor: "pointer",
};
