import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const adminCredentials = {
  username: "admin",
  password: "admin123",
};

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (username === adminCredentials.username && password === adminCredentials.password) {
      const userData = { username, role: "admin" };
      localStorage.setItem("user", JSON.stringify(userData));
      navigate("/admin"); // ไปที่หน้า Admin Dashboard
    } else {
      setError("❌ Invalid username or password!");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Login</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="login-btn">Login</button>
        </form>
        <button className="back-btn" onClick={() => navigate("/")}>⬅ Back to Home</button>
      </div>
    </div>
  );
};

export default Login;
