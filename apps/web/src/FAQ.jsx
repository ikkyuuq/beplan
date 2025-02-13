import React, { useState } from "react";
import "./FAQ.css";

const faqCategories = [
    {
        category: "How to use the application",
        questions: [
            { question: "What is Planner?", answer: "Planner is an app that allows you to plan and track your goals effectively." },
            { question: "Who is this app for?", answer: "Suitable for those who want to set goals. Track your progress and build good habits." },
        ],
    },
    {
        category: "How to use the application",
        questions: [
            { question: "What goals can be set?", answer: "You can set goals in categories such as health, finance, etc. Learning and self-development." },
            { question: "Can I change my goal after setting it?", answer: "Of course! You can change the schedule and customize the details." },
        ],
    },
    {
        category: "AI and SMART Goal in action",
        questions: [
            { question: "How does a planner use SMART Goals?", answer: "Planner uses the SMART concept to help make your goals clear and measurable." },
            { question: "How does in-app AI help?", answer: "AI helps you set possible goals Introduce guidelines and monitor progress." },
        ],
    },
    {
        category: "Goal Tracking and Analysis",
        questions: [
            { question: "Does the app have a notification system?", answer: "Have! You can set reminders for your goals." },
            { question: "Can I opt for a goal template?", answer: "Have! Goal templates are available, such as health goals. Saving money and developing yourself." },
        ],
    },
];

const FAQ = () => {
    const [activeCategory, setActiveCategory] = useState(null);

    const scrollToCategory = (index) => {
        setActiveCategory(index);
        document.getElementById(`faq-category-${index}`).scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="faq-container">
            <div className="faq-sidebar">
                {faqCategories.map((item, index) => (
                    <button key={index} className="faq-sidebar-item" onClick={() => scrollToCategory(index)}>
                        {item.category}
                    </button>
                ))}
            </div>

            <div className="faq-content">
                <h1>Frequently asked questions</h1>
                {faqCategories.map((category, index) => (
                    <div key={index} id={`faq-category-${index}`} className="faq-category">
                        <h2>{category.category}</h2>
                        {category.questions.map((faq, idx) => (
                            <div key={idx} className="faq-item">
                                <div className="faq-question">{faq.question}</div>
                                <div className="faq-answer">{faq.answer}</div>
                            </div>
                        ))}
                    </div>
                ))}
                <footer class="footer">
                    <div class="footer-container">
                        <p>© 2025 Planner. All Rights Reserved.</p>
                        <p>Designed & Developed by <strong>BE PLANNER</strong></p>
                    </div>
                </footer>
            </div>


        </div>
    );
};

export default FAQ;
