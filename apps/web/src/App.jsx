// App.js
import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css';
import Home from './Home.jsx';
import AboutMe from './Aboutme.jsx';

function App() {
  const [count, setCount] = useState(0);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav role='navigation'>
            <div className='Menu'>
              <ul>
                <li><Link to="/home" className='Home'>Home page</Link></li>
                <li><Link to="/aboutme" className='AboutMe'>About page</Link></li>
                <li><a href="" className='Home'>Donation</a></li>
                <li><a href="" className='FAQ'>FAQ</a></li>
                <li><button className="Download-page">เปิด Planner</button></li>
              </ul>
            </div>
          </nav>
        </header>

        <div className='body-header'>
          <h1>จัดตารางเวลาด้วย Planner</h1>
          <h2>ซอฟต์แวร์นี้ออกแบบมาเพื่อช่วยให้ผู้ใช้วางแผนและบรรลุเป้าหมายได้อย่างมีประสิทธิภาพโดยใช้ SMART GOAL</h2>
          <h1>SMART GOAL</h1>
          <h2>ระบบ SMART เพื่อให้เป้าหมายสามารถนําไปใช้ได้จริงและวัดผลได้ หลีกเลี่ยงไม่ให้ผู้ใช้ต้องใช้หลายแอพ</h2>
          <h1>Template & Tracker</h1>
          <h2>เรามี เทมเพลต และ เคล็ดลับสําเร็จรูป เพื่อสร้างเป้าหมายได้ง่ายขึ้น</h2>
          <h2>และติดตามพฤติกรรมของผู้ใช้เพื่อนําเสนอความคืบหน้าผ่านกราฟที่แสดงภาพเพื่อให้แน่ใจว่ามีการบรรลุเป้าหมายอย่างต่อเนื่อง</h2>
        </div>
        <div className="button-download">
          <button href="" className="Download">Download</button>
          <button href="" className="sign-in">เข้าสู่ระบบ</button>
        </div>

        {/* เพิ่ม Routes สำหรับหน้า Home */}
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/aboutme" element={<AboutMe />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;