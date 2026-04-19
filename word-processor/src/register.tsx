import { useState } from "react";
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [password2, setPassword2] = useState<string>("");

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
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok) {
            setError(null);
            navigate("/dashboard");
        } else {
            setError(data.error);
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

            <input
                type="password"
                placeholder="Verify Password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                style={input}
            />

            <button style={button} onClick={handleRegister}>
                Register
            </button>
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

export default RegisterPage;