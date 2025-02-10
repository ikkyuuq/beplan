import React from "react";
import "./Donate.css";

const Donate = () => {
  return (
    <div className="donate-container">
      <h1>Support Our Project 💖</h1>
      <p>
        If you find our project helpful, consider making a donation to support further development.
        Your generosity will help us continue improving and providing quality services.
      </p>

      <h2>Ways to Donate</h2>
      <div className="donate-options">
        <div className="donate-card">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png" alt="PayPal" />
          <h3>PayPal</h3>
          <p>Quick and secure donations via PayPal.</p>
          <form action="https://www.paypal.com/donate" method="post" target="_blank">
        <input type="hidden" name="business" value="poopazizi16@gmail.com" />
        <input type="hidden" name="currency_code" value="THB" />
        <button type="submit">Donate via PayPal</button>
        </form>
        </div>

        <div className="donate-card">
          <img src="https://cdn-icons-png.flaticon.com/512/733/733609.png" alt="github" />
          <h3>GitHub</h3>
          <p>Support us by visiting our github.</p>
          <a href="https://github.com/ikkyuuq/beplan.git">
          <button>View Details</button>
          </a>
        </div>

        <div className="donate-card">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/1024px-MasterCard_Logo.svg.png" alt="Mastercard" />
          <h3>MasterCard</h3>
          <p>Support us with MasterCard and more.</p>
          <button>Donate MasterCard</button>
        </div>
      </div>

      <footer className="donate-footer">
        <p>Thank you for your support! 💙</p>
      </footer>
    </div>
  );
};

export default Donate;
