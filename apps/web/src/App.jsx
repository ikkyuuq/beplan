import { BrowserRouter as Router, Route, Routes, Link, Outlet } from "react-router-dom";
import Home from "./Home";
import AboutMe from "./AboutMe";
import Donate from "./Donate";
import FAQ from "./FAQ";
import "./Home.css"; // ใช้กับ Layout หลัก
import AdminDashboard from "./Admindashboard";

const Layout = () => {
  return (
    <div>
      <header className="App-header">
        <nav>
          <ul>
            <div className="logo-container">
              <img src="https://img2.pic.in.th/pic/Screenshot-2025-02-11-215739.png" alt="Logo" border="0" />
              <a href="/">SMART GOAL</a>
            </div>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/aboutme">About Me</Link></li>
            <li><Link to="/donate">Donate</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <button className="start">GET STARTED!</button>
          </ul>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Layout หลักสำหรับ User */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="aboutme" element={<AboutMe />} />
          <Route path="donate" element={<Donate />} />
          <Route path="faq" element={<FAQ />} />
        </Route>

        {/* Route สำหรับ Admin แยกออกมา */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
