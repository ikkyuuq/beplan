import React from 'react';
import './AboutMe.css'; // นำเข้าไฟล์ CSS สำหรับตกแต่ง

const AboutMe = () => {
  return (
    <div className="about-me-container">
      {/* ส่วนหัว */}
      <header className="about-me-header">
        <h1>About Me</h1>
        <p>
          The software is designed to help users plan and achieve their goals effectively, using the SMART Goal Framework to make goals actionable and measurable. It avoids the need for multiple apps by offering ready-made templates, tracking user habits, and presenting progress via visualized graphs.
        </p>
      </header>

      {/* ส่วนเนื้อหา */}
      <section className="about-me-content">
        {/* Objectives */}
        <div className="section">
          <h2>Objectives</h2>
          <p>
            The software is designed to help users plan and achieve their goals effectively, using the SMART Goal Framework to make goals actionable and measurable. It avoids the need for multiple apps by:
          </p>
          <ul>
            <li>Offering ready-made templates and tips.</li>
            <li>Tracking user habits and presenting progress via visualized graphs to ensure continuous improvement and keep users motivated.</li>
          </ul>
        </div>

        {/* 5W1H Framework */}
        <div className="section">
          <h2>5W1H Framework</h2>
          <div className="subsection">
            <h3>What</h3>
            <p>
              <strong>What is Planning?</strong> Planning is the process of identifying and organizing activities to achieve a desired goal.
            </p>
            <p>
              <strong>What is Goal?</strong> A goal is a desired outcome or result that one aims to achieve.
            </p>
            <p>
              <strong>What is the best way to plan effectively?</strong> The SMART Goal Framework provides structure by ensuring goals are Specific, Measurable, Achievable, Relevant, and Time-Bound.
            </p>
          </div>
          <div className="subsection">
            <h3>Who</h3>
            <p>
              <strong>Who benefits from planning tools?</strong> Individuals, professionals, and students aiming for personal, career, or educational success.
            </p>
          </div>
          <div className="subsection">
            <h3>When</h3>
            <p>
              <strong>When should users plan for their goals?</strong> During low-stress periods to allow clear thinking and focused decision-making.
            </p>
          </div>
          <div className="subsection">
            <h3>Where</h3>
            <p>
              <strong>Where do users typically plan?</strong> At home, workplaces, or schools.
            </p>
          </div>
          <div className="subsection">
            <h3>Why</h3>
            <p>
              <strong>Why is planning critical?</strong> Planning provides clarity, reduces stress, and improves the chances of success.
            </p>
          </div>
          <div className="subsection">
            <h3>How</h3>
            <p>
              <strong>How does the software integrate SMART Goals?</strong> Users input goal details, and the system provides suggestions, metrics, and timelines.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="section">
          <h2>Features</h2>
          <ul>
            <li>Ready-made templates for various goal types (financial, health, career, etc.).</li>
            <li>Habit tracking with visualized progress graphs.</li>
            <li>Gamification elements like rewards, badges, and streak tracking.</li>
            <li>Expert advice and FAQs in the "Help & Guidance" section.</li>
          </ul>
        </div>
      </section>

      {/* ส่วนท้าย */}
      <footer className="about-me-footer">
        <p>Contact us: <a href="mailto:support@beplan.com">support@beplan.com</a></p>
        <p>Follow us on <a href="https://twitter.com/beplan" target="_blank" rel="noopener noreferrer">Twitter</a></p>
      </footer>
    </div>
  );
};

export default AboutMe;