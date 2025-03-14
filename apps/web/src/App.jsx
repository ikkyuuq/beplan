import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Outlet,
  Navigate,
} from "react-router-dom";
import Home from "./Home";
import AboutMe from "./AboutMe";
import Donate from "./Donate";
import FAQ from "./FAQ";
import Login from "./Login";
import AdminDashboard from "./AdminDashboard";
import "./Home.css";

const Layout = () => {
  return (
    <div>
      <header className="App-header">
        <nav>
          <ul>
            <div className="logo-container">
              <img
                src="https://img2.pic.in.th/pic/Screenshot-2025-02-11-215739.png"
                alt="Logo"
              />
              <a href="/">SMART GOAL</a>
            </div>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/aboutme">About Me</Link>
            </li>
            <li>
              <Link to="/donate">Donate</Link>
            </li>
            <li>
              <Link to="/faq">FAQ</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

// สร้าง ProtectedRoute สำหรับตรวจสอบสิทธิ์
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  // หากผู้ใช้ไม่มีสิทธิ์เป็น Admin ให้ Redirect ไปหน้า Login
  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="aboutme" element={<AboutMe />} />
          <Route path="donate" element={<Donate />} />
          <Route path="faq" element={<FAQ />} />
        </Route>
        <Route path="login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;