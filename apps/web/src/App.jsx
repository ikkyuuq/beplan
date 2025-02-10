import { BrowserRouter as Router, Route, Routes, Link, Outlet } from "react-router-dom";
import Home from "./Home";
import AboutMe from "./AboutMe";
import Donate from "./Donate";

const Layout = () => {
  return (
    <div>
      <header className="App-header">
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/aboutme">About Me</Link></li>
            <li><Link to="/donate">Donate</Link></li>
            <li><Link to="/aboutme">FAQ</Link></li>
            <button className="start">Open Planner</button>
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="aboutme" element={<AboutMe />} />
          <Route path="donate" element={<Donate />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
