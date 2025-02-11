import React from "react";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-container">
      <h2>Schedule with Planner</h2>
      <p>
        This software is designed to help users plan and achieve their goals effectively using SMART GOAL.
      </p>
      <h2>SMART GOAL</h2>
      <p>
        SMART system to make goals actionable and measurable, avoiding users having to use multiple apps.
      </p>
      <h2>Template & Tracker</h2>
      <p>
        We provide templates and ready-made tips to make goal creation easier and track user behavior, presenting progress through visual graphs to ensure goal achievement continuously.
      </p>
      <div className="button-download">
        <button className="Download">Download</button>
      </div>
      <footer class="footer">
        <div class="footer-container">
          <p>© 2025 Planner. All Rights Reserved.</p>
          <p>Designed & Developed by <strong>BE PLANNER</strong></p>
        </div>
      </footer>
    </div>

  );
};

export default Home;
