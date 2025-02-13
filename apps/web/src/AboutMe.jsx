import React from "react";
import "./AboutMe.css";

const AboutMe = () => {
  return (
    <div className="about-container">
      <h1>About Me</h1>
      <p>
        Planner is an intelligent goal-setting application designed to help users plan, track, and achieve their goals effectively. By incorporating the SMART Goal Framework, the app ensures that every goal is specific, measurable, achievable, relevant, and time-bound.
      </p>

      <h2>Our Mission</h2>
      <p>
        Our mission is to empower individuals with a structured yet flexible tool that simplifies goal management, promotes self-improvement, and enhances productivity.
      </p>

      <h2>Key Features</h2>
      <ul>
        <li>📌 <strong>Goal Templates:</strong> Pre-designed templates for various life aspects like health, career, and personal growth.</li>
        <li>📊 <strong>Progress Tracking:</strong> Visual charts and habit trackers to monitor your progress.</li>
        <li>⏰ <strong>Reminders & Notifications:</strong> Stay on track with automated reminders.</li>
        <li>📅 <strong>Flexible Planning:</strong> Customize your goals with milestones and deadlines.</li>
        <li>🤖 <strong>AI-Powered Insights:</strong> Get personalized suggestions to improve goal achievement.</li>
      </ul>

      <h2>Why Choose Planner?</h2>
      <p>
        Unlike traditional to-do lists, Planner provides a structured approach to goal-setting, ensuring clarity, motivation, and accountability. Whether you're working on self-improvement, career growth, or personal projects, Planner adapts to your needs and helps you stay focused on success.
      </p>

      <footer className="footer">
        <div className="footer-container">
          <p>© 2025 Planner. All Rights Reserved.</p>
          <p>Designed & Developed by <strong>BE PLANNER</strong></p>
        </div>
      </footer>
    </div>
  );
};

export default AboutMe;
