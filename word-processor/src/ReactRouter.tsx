import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./login";
import Dashboard from "./dashboard";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

export default App;