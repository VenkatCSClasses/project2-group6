import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./login";
import Dashboard from "./dashboard";
import RegisterPage from "./register";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
};

export default App;