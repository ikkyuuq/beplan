import React, { useState } from "react";
import "./FAQ.css";

const faqs = [
    { question: "What is Planner?", answer: "Planner is an app that allows you to plan and track your goals effectively." },
    { question: "How does a planner use SMART Goals?", answer: "Planner uses the SMART concept to help make your goals clear and measurable, and your goals are analyzed by AI." },
    { question: "Can I use Planner for free?", answer: "Planner has a free version, and you can use the features for free, but if you want to have fun, you can press Donate so we can use the money to continue developing the app." },
    { question: "Can I share my plan with others?", answer: "Yes, you can share your plan with your team or others through the app's share feature." },
];

const FAQ = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggleFAQ = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="faq-container">
            <h1>Frequently Asked Questions</h1>
            {faqs.map((faq, index) => (
                <div key={index} className="faq-item">
                    <div className="faq-question" onClick={() => toggleFAQ(index)}>
                        <span>{faq.question}</span>
                        <span className="faq-icon">{activeIndex === index ? "-" : "+"}</span>
                    </div>
                    {activeIndex === index && <div className="faq-answer">{faq.answer}</div>}
                </div>
            ))}

            <footer class="footer">
                <div class="footer-container">
                    <p>© 2025 Planner. All Rights Reserved.</p>
                    <p>Designed & Developed by <strong>BE PLANNER</strong></p>
                </div>
            </footer>
        </div>
    );
};

export default FAQ;
