import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";

const AdminDashboard = () => {
    const [templates, setTemplates] = useState([
        { id: 1, name: "Health Goal", description: "Track your daily habits for better health.", image: null },
        { id: 2, name: "Career Planning", description: "Set milestones for your career growth.", image: null },
    ]);

    const [editingTemplate, setEditingTemplate] = useState(null);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newImage, setNewImage] = useState(null);

    const [userAccount, setUserAccount] = useState({
        name: "Admin",
        profilePic: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    });

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser && storedUser.username) {
            setUserAccount({ ...userAccount, name: storedUser.username }); // 👉 ใช้ชื่อจาก localStorage
        }
    }, []);

    const handleCreateTemplate = () => {
        const newTemplate = { id: Date.now(), name: "New Template", description: "Edit this template.", image: null };
        setTemplates([...templates, newTemplate]);
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setNewName(template.name);
        setNewDescription(template.description);
        setNewImage(template.image);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveEdit = () => {
        setTemplates(templates.map((t) =>
            t.id === editingTemplate.id ? { ...t, name: newName, description: newDescription, image: newImage } : t
        ));
        setEditingTemplate(null);
    };

    const handleDeleteTemplate = (id) => {
        setTemplates(templates.filter((template) => template.id !== id));
    };

    return (
        <div className="admin-container">
            {/* Navbar */}
            <nav className="admin-navbar">
                <div className="navbar-title">Admin Dashboard</div>
                <div className="navbar-user">
                    <img src={userAccount.profilePic} alt="User" className="user-icon" />
                    <span className="user-name">{userAccount.name}</span>
                    <button className="logout-btn" onClick={() => {
                        localStorage.removeItem("user"); // 👉 ลบข้อมูล User เมื่อ Logout
                        window.location.href = "/login"; // 👉 Redirect ไปหน้า Login
                    }}>🚪 Logout</button>
                </div>
            </nav>

            {/* Sidebar */}
            <aside className="sidebar">
                <ul>
                    <li>📋 Dashboard</li>
                    <li>🎯 Template</li>
                    <li>⚙️ Settings</li>
                </ul>
            </aside>

            {/* Main Content */}
            <div className="dashboard-content">
                <header>
                    <h1>Admin Template</h1>
                    <button className="create-btn" onClick={handleCreateTemplate}>➕ Create Template</button>
                </header>

                <table className="template-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Template Name</th>
                            <th>Description</th>
                            <th>Image</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.map((template, index) => (
                            <tr key={template.id}>
                                <td>{index + 1}</td>
                                <td>{template.name}</td>
                                <td>{template.description}</td>
                                <td>
                                    {template.image ? <img src={template.image} alt="Template" className="template-img" /> : "No Image"}
                                </td>
                                <td>
                                    <button className="edit-btn" onClick={() => handleEditTemplate(template)}>✏ Edit</button>
                                    <button className="delete-btn" onClick={() => handleDeleteTemplate(template.id)}>🗑 Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {editingTemplate && (
                    <div className="modal">
                        <div className="modal-content">
                            <h2>Edit Template</h2>
                            <label>Template Name:</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                            <label>Description:</label>
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                            />

                            
                            <div className="modal-buttons">
                            <label>Upload Image:</label>
                            <input type="file" accept="image/*" onChange={handleImageUpload} />

                            {newImage && <img src={newImage} alt="Preview" className="preview-img" />}

                                <button className="save-btn" onClick={handleSaveEdit}>💾 Save</button>
                                <button className="cancel-btn" onClick={() => setEditingTemplate(null)}>❌ Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
