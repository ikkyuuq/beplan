import { SignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

// Admin sign-in goes through Clerk. Access to /admin additionally requires the
// Clerk user's publicMetadata.role to be "admin" (enforced by the backend).
const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Login</h2>
        <SignIn routing="hash" forceRedirectUrl="/admin" />
        <button className="back-btn" onClick={() => navigate("/")}>⬅ Back to Home</button>
      </div>
    </div>
  );
};

export default Login;
