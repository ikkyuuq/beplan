import React from "react";
import "./AboutMe.css";

const AboutMe = () => {
  return (
    <div className="about-container">
      <h1>About Me</h1>
      <p>
        This software is designed to help users plan and achieve their goals effectively, 
        using the SMART Goal Framework to make goals actionable and measurable.
      </p>

      <h2>Objectives</h2>
      <p>
        Offering ready-made templates and tips to assist users in planning and achieving their goals efficiently.
      </p>

      <h2>5W1H Framework</h2>
      <h3>What</h3>
      <p><strong>What is Planning?</strong> Planning is the process of identifying and organizing activities to achieve a desired goal.</p>
      <p><strong>What is Goal?</strong> A goal is a desired outcome or result that one aims to achieve.</p>

      <h3>Who</h3>
      <p><strong>Who benefits from planning tools?</strong> Individuals, professionals, and students aiming for personal, career, or educational success.</p>

      <h3>When</h3>
      <p><strong>When should users plan for their goals?</strong> During low-stress periods to allow clear thinking and focused decision-making.</p>

      <div className="button-download">
        <button className="Download">Download</button>
      </div>
    </div>
  );
};

export default AboutMe;
