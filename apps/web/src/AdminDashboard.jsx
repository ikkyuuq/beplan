import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminDashboard.css";

const AdminDashboard = () => {
    const [templates, setTemplates] = useState([]);
    const [template, setTemplate] = useState({
        title: "",
        description: "",
        image_url: "",
        created_by: "BePlan",
        category: "",
        goals: [{
            title: "",
            type: "template",
            start_date: "",
            due_date: "",
            tasks: [{
                title: "",
                description: "",
                type: "",
                date_interval: [],
                week_interval: [],
            }]
        }]
    });

    const [editingTemplate, setEditingTemplate] = useState({
        title: "",
        description: "",
        image_url: null,
        category: "",
        goals: [],
    });
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
    const [newTaskType, setNewTaskType] = useState(null);
    const [selectedDays, setSelectedDays] = useState([]);
    const [goalEditingMode, setGoalEditingMode] = useState(false);
    const [showDescription, setShowDescription] = useState(null);
    const [selectedGoalId, setSelectedGoalId] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [creatingTemplate, setCreatingTemplate] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await axios.get("http://localhost:8000/api/v1/template");
                console.log("✅ Templates fetched:", response.data);
                setTemplates(response.data);
            } catch (error) {
                console.error("Error fetching templates:", error);
            }
        };

        fetchTemplates();
    }, []);

    const handleCreateTemplates = async () => {
        try {
            const templateData = {
                title: newName || "New Template",
                description: newDescription || "Edit this template.",
                image_url: newImage || "https://example.com/default-image.jpg",
                created_by: userAccount.name,
                category: newCategory || "Workout Routine",
                goals: editingTemplate.goals.map(goal => ({
                    title: goal.title || "New Goal",
                    type: "template",
                    start_date: goal.start_date || new Date().toISOString().split('T')[0],
                    due_date: goal.due_date || new Date().toISOString().split('T')[0],
                    tasks: goal.tasks.map(task => ({
                        title: task.title || "New Task",
                        description: task.description || "",
                        type: task.type || "daily",
                        date_interval: [],
                        week_interval: task.week_interval || []
                    }))
                }))
            };

            const response = await axios.post("http://localhost:8000/api/v1/template/create", templateData, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            console.log("✅ Template created:", response.data);
            setTemplates([...templates, response.data]);
        } catch (error) {
            console.error("❌ Error creating template:", error.response.data);
        }
    };

    const handleCreateTemplate = async () => {
        const newTemplate = {
            title: "",
            description: "Edit this template.",
            image_url: null,
            category: "Workout Routine",
            goals: [],
        };
        setEditingTemplate(newTemplate);
        setCreatingTemplate(true);
        setNewName("");
        setNewDescription("Edit this template.");
        setNewImage(null);
        setNewCategory("Workout Routine");
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setNewName(template.title);
        setNewDescription(template.description);
        setNewImage(template.image_url);
        setNewCategory(template.category);
        setSelectedGoalId(null);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result;

                img.onload = () => {
                    const MAX_WIDTH = 200; // ความกว้างสูงสุด
                    const MAX_HEIGHT = 200; // ความสูงสูงสุด
                    let width = img.width;
                    let height = img.height;

                    // ปรับขนาดรูปภาพให้พอดีกับขนาดสูงสุด
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    // สร้าง canvas เพื่อปรับขนาดรูปภาพ
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    // แปลง canvas เป็นรูปภาพขนาดเล็ก
                    const resizedImage = canvas.toDataURL("image/jpeg", 0.8); // คุณภาพ 80%
                    setNewImage(resizedImage); // บันทึกรูปภาพขนาดเล็กลง state
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveEdit = () => {
        if (!editingTemplate) {
            console.error("Editing template is not defined.");
            return;
        }

        let templateToSave;

        if (creatingTemplate) {
            const newTemplate = {
                ...editingTemplate,
                title: newName,
                description: newDescription,
                image_url: newImage,
                category: newCategory,
            };
            templateToSave = {
                title: newName,
                description: newDescription,
                image_url: newImage,
                created_by: userAccount.name,
                category: newCategory,
                goals: editingTemplate.goals ? editingTemplate.goals.map(goal => ({
                    title: goal.title,
                    type: "template",
                    start_date: goal.start_date,
                    due_date: goal.due_date,
                    tasks: goal.tasks ? goal.tasks.map(task => ({
                        title: task.title,
                        description: task.description || "",
                        type: task.type,
                        date_interval: [],
                        week_interval: task.week_interval || []
                    })) : []
                })) : []
            };
            setTemplates([...templates, newTemplate]);
            setCreatingTemplate(false);
            setTemplate(templateToSave);
            handleCreateTemplates();
        } else {
            templateToSave = {
                title: newName,
                description: newDescription,
                image_url: newImage,
                created_by: userAccount.name,
                category: newCategory,
                goals: editingTemplate.goals ? editingTemplate.goals.map(goal => ({
                    title: goal.title,
                    type: "template",
                    start_date: goal.start_date,
                    due_date: goal.due_date,
                    tasks: goal.tasks ? goal.tasks.map(task => ({
                        title: task.title,
                        description: task.description || "",
                        type: task.type,
                        date_interval: [],
                        week_interval: task.week_interval || []
                    })) : []
                })) : []
            };
            setTemplates(templates.map((t) =>
                t.id === editingTemplate.id ? {
                    ...editingTemplate,
                    title: newName,
                    description: newDescription,
                    image_url: newImage,
                    category: newCategory,
                } : t
            ));
        }

        setEditingTemplate(null);
        console.log("✅ Template to save:", templateToSave);
    };

    const handleDeleteTemplate = async (id) => {
        try {
            await axios.delete(`http://localhost:8000/api/v1/template/delete?template_id=${id}`);
            setTemplates(templates.filter((template) => template.id !== id));
        } catch (error) {
            console.error("Error deleting template:", error);
        }
    };

    const handleAddCategory = () => {
        if (newCategory && !categories.includes(newCategory)) {
            setCategories([...categories, newCategory]);
            setNewCategory("");
        }
    };

    const handleAddGoal = () => {
        if (!newGoalStartDate || !newGoalDueDate) {
            alert("กรุณากรอก Start Date และ Due Date ก่อนที่จะเพิ่ม Goal.");
            return;
        }

        if (newGoal.trim()) {
            const updatedTemplate = {
                ...editingTemplate,
                goals: [...editingTemplate.goals, {
                    id: Date.now(),
                    title: newGoal,
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

    const handleAddTask = () => {
        if (newTask.trim() && selectedGoalId) {
            const updatedTemplate = {
                ...editingTemplate,
                goals: editingTemplate.goals.map(goal =>
                    goal.id === selectedGoalId
                        ? {
                            ...goal,
                            tasks: [
                                ...goal.tasks,
                                {
                                    id: Date.now(),
                                    title: newTask,
                                    type: newTaskType,
                                    week_interval: newTaskType === "weekly" ? selectedDays : [],
                                }
                            ]
                        }
                        : goal
                )
            };
            setEditingTemplate(updatedTemplate);
            setNewTask("");
            setNewTaskType(null);
            setSelectedDays([]);
        }
    };

    const handleDaySelect = (day) => {
        setSelectedDays(prev => {
            if (prev.includes(day)) {
                return prev.filter(d => d !== day);
            }
            return [...prev, day];
        });
    };

    const formatDate = (dateString) => {
        if (!dateString || isNaN(new Date(dateString))) {
            return "No Date"; // หรือคืนค่าที่คุณต้องการ เช่น "N/A"
        }
        return new Date(dateString).toLocaleDateString(); // แปลงเป็นรูปแบบวันที่ที่อ่านง่าย
    };

    const handleRemoveTask = (goalId, taskId) => {
        if (selectedTaskId === taskId) {
            const updatedTemplate = {
                ...editingTemplate,
                goals: editingTemplate.goals.map(goal =>
                    goal.id === goalId
                        ? { ...goal, tasks: goal.tasks.filter(task => task.id !== taskId) }
                        : goal
                )
            };
            setEditingTemplate(updatedTemplate);
            setSelectedTaskId(null);
        }
    };

    const toggleDescription = (templateId) => {
        setShowDescription(showDescription === templateId ? null : templateId);
    };

    return (
        <div className="admin-container">
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

            <div className="dashboard-content">
                <header>
                    <h1>Admin Template</h1>
                    <button className="create-btn" onClick={handleCreateTemplate}>Create Template</button>
                </header>

                <table className="template-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Template Name</th>
                            <th>Image</th>
                            <th>Category</th>
                            <th>Goals</th>
                            <th>Task</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.map((template, index) => (
                            <tr key={template.id}>
                                <td>{index + 1}</td>
                                <td>{template.title}</td>
                                <td>
                                    {template.image_url ? (
                                        <img src={template.image_url} alt="Template" className="template-img" />
                                    ) : (
                                        "No Image"
                                    )}
                                </td>
                                <td>{template.category}</td>
                                <td>
                                    <ul>
                                        {template.goals.map((goal) => (
                                            <li key={goal.id}>
                                                <strong>{goal.title}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td>
                                    <ul>
                                        {template.goals.map((goal) => (
                                            <li key={goal.id}>
                                                <ul>
                                                    {goal.tasks.map((task) => (
                                                        <li key={task.id}>
                                                            <strong>Task: {task.title}</strong>
                                                            {task.type === "weekly" && task.week_interval && (
                                                                <p>Selected Days: {task.week_interval.join(", ")}</p>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td>
                                    <button className="description-btn" onClick={() => toggleDescription(template.id)}>
                                        Description
                                    </button>
                                    <button className="delete-btn" onClick={() => handleDeleteTemplate(template.id)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {showDescription && (
                    <div className="description-modal">
                        <div className="modal-content">
                            <h3>Description</h3>
                            <p>{templates.find(template => template.id === showDescription).description}</p>
                            <button onClick={() => setShowDescription(null)}>❌ Close</button>
                        </div>
                    </div>
                )}

                {editingTemplate && (
                    <div className="modal">
                        <div className="modal-content">
                            <h2>{creatingTemplate ? "Create Template" : "Edit Template"}</h2>
                            <button
                                onClick={() => setGoalEditingMode(!goalEditingMode)}
                                className={`goal-edit-btn ${goalEditingMode ? "close" : ""}`}
                            >
                                <span>{goalEditingMode ? "Edit Template" : "✏ Edit Goals"}</span>
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
                                    <label>Upload Image:</label>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                                    {newImage && <img src={newImage} alt="Preview" className="preview-img" />}
                                </>
                            )}

                            {goalEditingMode && (
                                <div>
                                    <h3>Editing Goals for Template: {editingTemplate.title}</h3>
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
                                        <button onClick={handleAddGoal} className="add-goal-btn">
                                            <span>+ Add Goal</span>
                                        </button>
                                    </div>
                                    <div className="goals-list">
                                        {editingTemplate.goals.map((goal, index) => (
                                            <div
                                                key={goal.id}
                                                className={selectedGoalId === goal.id ? "goal-selected" : "goal-not-selected"}
                                                onClick={() => setSelectedGoalId(goal.id)}
                                            >
                                                <h3>Goal{index + 1}: {goal.title}</h3>
                                                {selectedGoalId === goal.id && (
                                                    <>
                                                        <button
                                                            onClick={() => handleRemoveGoal(goal.id)}
                                                            className="remove-goal-btn"
                                                        >
                                                            <span>🗑 Remove Goal</span>
                                                        </button>
                                                        <ul className="task-list">
                                                            <p>Start Date: {goal.start_date}</p>
                                                            <p>Due Date: {goal.due_date}</p>
                                                            {goal.tasks.map((task) => (
                                                                <li
                                                                    key={task.id}
                                                                    className={`task-item ${selectedTaskId === task.id ? "task-selected" : ""}`}
                                                                    onClick={() => setSelectedTaskId(task.id)}
                                                                >
                                                                    <span>
                                                                        {task.title}
                                                                        {task.type === "weekly" && task.week_interval && task.week_interval.length > 0 && (
                                                                            <span className="selected-days">
                                                                                ({task.week_interval.join(", ")})
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    {selectedTaskId === task.id && (
                                                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveTask(goal.id, task.id); }} className="remove-task-btn">
                                                                            <span>Remove task</span>
                                                                        </button>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        <div>
                                                            <input
                                                                type="text"
                                                                value={newTask}
                                                                onChange={(e) => setNewTask(e.target.value)}
                                                                placeholder="Add task"
                                                            />

                                                            <div className="task-type-container">
                                                                <label className="task-type-label">
                                                                    <input
                                                                        type="radio"
                                                                        name="taskType"
                                                                        value="daily"
                                                                        checked={newTaskType === "daily"}
                                                                        onChange={() => setNewTaskType("daily")}
                                                                    />
                                                                    Daily
                                                                </label>
                                                                <label className="task-type-label">
                                                                    <input
                                                                        type="radio"
                                                                        name="taskType"
                                                                        value="weekly"
                                                                        checked={newTaskType === "weekly"}
                                                                        onChange={() => setNewTaskType("weekly")}
                                                                    />
                                                                    Weekly
                                                                </label>
                                                            </div>

                                                            {newTaskType === "weekly" && (
                                                                <div className="weekly-days-container">
                                                                    <label>Select Days of the Week:</label>
                                                                    <div className="days-checkbox-container">
                                                                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                                                                            <label key={day} className="day-checkbox">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedDays.includes(day)}
                                                                                    onChange={() => handleDaySelect(day)}
                                                                                />
                                                                                {day}
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <button onClick={handleAddTask} className="add-task-btn">
                                                                <span>+ Add Task</span>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="modal-buttons">
                                <button className="save-btn" onClick={handleSaveEdit}>💾 Save</button>
                                <button className="cancel-btn" onClick={() => { setEditingTemplate(null); setCreatingTemplate(false); }}>❌ Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;