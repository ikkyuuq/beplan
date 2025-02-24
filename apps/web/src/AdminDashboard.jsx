import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";

const AdminDashboard = () => {
    const [templates, setTemplates] = useState([
        { 
            id: 1, 
            name: "Health Goal", 
            description: "Track your daily habits for better health.", 
            image: null, 
            category: "Workout Routine", 
            goals: [], 
        },
        { 
            id: 2, 
            name: "Career Planning", 
            description: "Set milestones for your career growth.", 
            image: null, 
            category: "Personal Budgeting", 
            goals: [], 
        },
    ]);

    const [editingTemplate, setEditingTemplate] = useState(null);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newImage, setNewImage] = useState(null);
    const [newCategory, setNewCategory] = useState("");
    const [newGoal, setNewGoal] = useState("");
    const [newTask, setNewTask] = useState("");
    const [newGoalStartDate, setNewGoalStartDate] = useState("");
    const [newGoalDueDate, setNewGoalDueDate] = useState("");
    const [categories, setCategories] = useState(["Workout Routine", "Personal Budgeting", "Healthy Eating"]);
    const [userAccount, setUserAccount] = useState({
        name: "Admin",
        profilePic: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    });

    const [goalEditingMode, setGoalEditingMode] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser && storedUser.username) {
            setUserAccount({ ...userAccount, name: storedUser.username });
        }
    }, []);

    const handleCreateTemplate = () => {
        const newTemplate = { 
            id: Date.now(), 
            name: "New Template", 
            description: "Edit this template.", 
            image: null, 
            category: "Workout Routine", 
            goals: [], 
        };
        setTemplates([...templates, newTemplate]);
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setNewName(template.name);
        setNewDescription(template.description);
        setNewImage(template.image);
        setNewCategory(template.category);
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
            t.id === editingTemplate.id ? { 
                ...t, 
                name: newName, 
                description: newDescription, 
                image: newImage, 
                category: newCategory, 
                goals: editingTemplate.goals,
            } : t
        ));
        setEditingTemplate(null);
    };

    const handleDeleteTemplate = (id) => {
        setTemplates(templates.filter((template) => template.id !== id));
    };

    const handleAddCategory = () => {
        if (newCategory && !categories.includes(newCategory)) {
            setCategories([...categories, newCategory]);
            setNewCategory("");
        }
    };

    const handleAddGoal = () => {
        if (newGoal.trim()) {
            const updatedTemplate = {
                ...editingTemplate,
                goals: [...editingTemplate.goals, { 
                    id: Date.now(), 
                    text: newGoal, 
                    tasks: [],
                    start_date: newGoalStartDate,
                    due_date: newGoalDueDate
                }]
            };
            setEditingTemplate(updatedTemplate);
            setNewGoal("");
            setNewGoalStartDate("");
            setNewGoalDueDate("");
        }
    };

    const handleRemoveGoal = (goalId) => {
        const updatedTemplate = {
            ...editingTemplate,
            goals: editingTemplate.goals.filter((goal) => goal.id !== goalId)
        };
        setEditingTemplate(updatedTemplate);
    };

    const handleAddTask = (goalId) => {
        if (newTask.trim()) {
            const updatedTemplate = {
                ...editingTemplate,
                goals: editingTemplate.goals.map(goal => 
                    goal.id === goalId 
                    ? { ...goal, tasks: [...goal.tasks, { id: Date.now(), text: newTask }] }
                    : goal
                )
            };
            setEditingTemplate(updatedTemplate);
            setNewTask("");
        }
    };

    const handleRemoveTask = (goalId, taskId) => {
        const updatedTemplate = {
            ...editingTemplate,
            goals: editingTemplate.goals.map(goal => 
                goal.id === goalId 
                ? { ...goal, tasks: goal.tasks.filter(task => task.id !== taskId) }
                : goal
            )
        };
        setEditingTemplate(updatedTemplate);
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
                        localStorage.removeItem("user");
                        window.location.href = "/login";
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
                            <th>Category</th>
                            <th>Goals</th>
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
                                <td>{template.category}</td>
                                <td>
                                    <ul>
                                        {template.goals.map((goal) => (
                                            <li key={goal.id}>
                                                <strong>{goal.text}</strong>
                                                <ul>
                                                    {goal.tasks.map((task) => (
                                                        <li key={task.id}>{task.text}</li>
                                                    ))}
                                                </ul>
                                                <p>Start Date: {goal.start_date}</p>
                                                <p>Due Date: {goal.due_date}</p>
                                                <button onClick={() => handleRemoveGoal(goal.id)}>🗑 Remove Goal</button>
                                            </li>
                                        ))}
                                    </ul>
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
                            <button onClick={() => setGoalEditingMode(!goalEditingMode)}>
                                {goalEditingMode ? "❌ Close Goal Editing" : "✏ Edit Goals"}
                            </button>
                            {!goalEditingMode && (
                                <>
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
                                    <label>Category:</label>
                                    <select
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                    >
                                        {categories.map((category, index) => (
                                            <option key={index} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </>
                            )}

                            {goalEditingMode && (
                                <div>
                                    <h3>Editing Goals for Template: {editingTemplate.name}</h3>
                                    <div>
                                        <input
                                            type="text"
                                            value={newGoal}
                                            onChange={(e) => setNewGoal(e.target.value)}
                                            placeholder="Add a new goal"
                                        />
                                        <label>Start Date:</label>
                                        <input
                                            type="date"
                                            value={newGoalStartDate}
                                            onChange={(e) => setNewGoalStartDate(e.target.value)}
                                        />
                                        <label>Due Date:</label>
                                        <input
                                            type="date"
                                            value={newGoalDueDate}
                                            onChange={(e) => setNewGoalDueDate(e.target.value)}
                                        />
                                        <button onClick={handleAddGoal}>+ Add Goal</button>
                                    </div>
                                    <div className="goals-list">
                                        {editingTemplate.goals.map((goal) => (
                                            <div key={goal.id}>
                                                <h3>{goal.text}</h3>
                                                <p>Start Date: {goal.start_date}</p>
                                                <p>Due Date: {goal.due_date}</p>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={newTask}
                                                        onChange={(e) => setNewTask(e.target.value)}
                                                        placeholder="Add task"
                                                    />
                                                    <button onClick={() => handleAddTask(goal.id)}>+ Add Task</button>
                                                </div>
                                                <ul>
                                                    {goal.tasks.map((task) => (
                                                        <li key={task.id}>{task.text}</li>
                                                    ))}
                                                </ul>
                                                <button onClick={() => handleRemoveGoal(goal.id)}>🗑 Remove Goal</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <label>Upload Image:</label>
                            <input type="file" accept="image/*" onChange={handleImageUpload} />
                            {newImage && <img src={newImage} alt="Preview" className="preview-img" />}
                            <div className="modal-buttons">
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