import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./dashboard";
import EditorPage from "./editor/EditorPage";
import LoginPage from "./login";
import RegisterPage from "./register";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/editor/:id" element={<EditorPage />} />
    </Routes>
  );
}
