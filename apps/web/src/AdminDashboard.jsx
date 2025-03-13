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
        name: "",
        description: "",
        image: null,
        category: "",
        goals: [], // กำหนดค่าเริ่มต้นเป็น array ว่าง
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
    const [newTaskType, setNewTaskType] = useState(null);  // for Daily or Weekly
    const [selectedDays, setSelectedDays] = useState([]);   // for weekly days selection

    const [goalEditingMode, setGoalEditingMode] = useState(false);
    const [showDescription, setShowDescription] = useState(null); // สถานะใหม่สำหรับแสดงคำอธิบาย
    const [selectedGoalId, setSelectedGoalId] = useState(null); // สถานะใหม่สำหรับเก็บ Goal ที่ถูกเลือก
    const [selectedTaskId, setSelectedTaskId] = useState(null); // เพิ่ม state เพื่อเก็บ Task ที่ถูกเลือก
    const [creatingTemplate, setCreatingTemplate] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await axios.get("http://localhost:8000/api/v1/template");
                setTemplates(response.data);
                console.log("✅ Templates fetched:", response.data);
            } catch (error) {
                console.error("Error fetching templates:", error);
            }
        };

        fetchTemplates();  // โหลด template จาก backend
    }, []);

    const handleCreateTemplates = async () => {
        try {
            const templateData = {
                title: newName || "New Template", // ตั้งค่าเริ่มต้นหาก newName เป็นค่าว่าง
                description: newDescription || "Edit this template.", // ตั้งค่าเริ่มต้นหาก newDescription เป็นค่าว่าง
                image_url: newImage || "https://example.com/default-image.jpg", // ตั้งค่าเริ่มต้นหาก newImage เป็นค่าว่าง
                created_by: userAccount.name,
                category: newCategory || "Workout Routine", // ตั้งค่าเริ่มต้นหาก newCategory เป็นค่าว่าง
                goals: editingTemplate.goals.map(goal => ({
                    title: goal.text || "New Goal", // ตั้งค่าเริ่มต้นหาก goal.text เป็นค่าว่าง
                    type: "template",
                    start_date: goal.start_date || new Date().toISOString().split('T')[0], // ตั้งค่าเริ่มต้นหากไม่มี start_date
                    due_date: goal.due_date || new Date().toISOString().split('T')[0], // ตั้งค่าเริ่มต้นหากไม่มี due_date
                    tasks: goal.tasks.map(task => ({
                        title: task.text || "New Task", // ตั้งค่าเริ่มต้นหาก task.text เป็นค่าว่าง
                        description: task.description || "",
                        repeat_type: task.type || "aily", // ตั้งค่าเริ่มต้นหาก task.type เป็นค่าว่าง
                        date_interval: [],
                        week_interval: task.selectedDays ? task.selectedDays.map(day => {
                            switch (day) {
                                case "Sunday": return 0;
                                case "Monday": return 1;
                                case "Tuesday": return 2;
                                case "Wednesday": return 3;
                                case "Thursday": return 4;
                                case "Friday": return 5;
                                case "Saturday": return 6;
                                default: return -1;
                            }
                        }) : []
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
            name: "", // ตั้งชื่อเริ่มต้นเป็นค่าว่าง
            description: "Edit this template.",
            image: null,
            category: "Workout Routine",
            goals: [],
        };
        setEditingTemplate(newTemplate);
        setCreatingTemplate(true);
        setNewName(""); // ตั้งค่า newName เป็นค่าว่าง
        setNewDescription("Edit this template."); // ตั้งค่า newDescription เป็นค่าเริ่มต้น
        setNewImage(null); // ตั้งค่า newImage เป็นค่าเริ่มต้น
        setNewCategory("Workout Routine"); // ตั้งค่า newCategory เป็นค่าเริ่มต้น

    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setNewName(template.name);
        setNewDescription(template.description);
        setNewImage(template.image);
        setNewCategory(template.category);
        setSelectedGoalId(null); // รีเซ็ต selectedGoalId เมื่อเริ่มแก้ไข Template ใหม่
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result;

                img.onload = () => {
                    const MAX_WIDTH = 200; // ความกว้างสูงสุดที่ต้องการ
                    const MAX_HEIGHT = 200; // ความสูงสูงสุดที่ต้องการ
                    let width = img.width;
                    let height = img.height;

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

                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);

                    const resizedImage = canvas.toDataURL("image/jpeg", 0.8);
                    setNewImage(resizedImage);
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
                name: newName,
                description: newDescription,
                image: newImage,
                category: newCategory,
            };
            templateToSave = {
                title: newName,
                description: newDescription,
                image_url: newImage,
                created_by: userAccount.name,
                category: newCategory,
                goals: editingTemplate.goals ? editingTemplate.goals.map(goal => ({
                    title: goal.text,
                    type: "template",
                    start_date: goal.start_date,
                    due_date: goal.due_date,
                    tasks: goal.tasks ? goal.tasks.map(task => ({
                        title: task.text,
                        description: task.description || "",
                        type: task.type,
                        date_interval: [],
                        week_interval: task.selectedDays ? task.selectedDays.map(day => {
                            switch (day) {
                                case "Sunday": return 0;
                                case "Monday": return 1;
                                case "Tuesday": return 2;
                                case "Wednesday": return 3;
                                case "Thursday": return 4;
                                case "Friday": return 5;
                                case "Saturday": return 6;
                                default: return -1;
                            }
                        }) : []
                    })) : [] // ตรวจสอบว่า goal.tasks ไม่เป็น undefined
                })) : [] // ตรวจสอบว่า editingTemplate.goals ไม่เป็น undefined
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
                    title: goal.text,
                    type: "template",
                    start_date: goal.start_date,
                    due_date: goal.due_date,
                    tasks: goal.tasks ? goal.tasks.map(task => ({
                        title: task.text,
                        description: task.description || "",
                        type: task.type,
                        date_interval: [],
                        week_interval: task.selectedDays ? task.selectedDays.map(day => {
                            switch (day) {
                                case "Sunday": return 0;
                                case "Monday": return 1;
                                case "Tuesday": return 2;
                                case "Wednesday": return 3;
                                case "Thursday": return 4;
                                case "Friday": return 5;
                                case "Saturday": return 6;
                                default: return -1;
                            }
                        }) : []
                    })) : [] // ตรวจสอบว่า goal.tasks ไม่เป็น undefined
                })) : [] // ตรวจสอบว่า editingTemplate.goals ไม่เป็น undefined
            };
            setTemplates(templates.map((t) =>
                t.id === editingTemplate.id ? {
                    ...editingTemplate,
                    name: newName,
                    description: newDescription,
                    image: newImage,
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
            fetchTemplates();
        } catch (error) {
            console.error("Error deleting template:", error);
        }
        setTemplates(templates.filter((template) => template.id !== id));
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
                    text: newGoal,
                    tasks: [], // กำหนดค่าเริ่มต้นเป็น array ว่าง
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
                                    text: newTask,
                                    type: newTaskType, // Add the type of the task (Daily or Weekly)
                                    selectedDays: newTaskType === "weekly" ? selectedDays : null, // Only set selectedDays if Weekly
                                }
                            ]
                        }
                        : goal
                )
            };
            setEditingTemplate(updatedTemplate);
            setNewTask("");
            setNewTaskType(null); // Reset task type after adding
            setSelectedDays([]);  // Reset selected days after adding
        }
    };

    const handleDaySelect = (day) => {
        setSelectedDays(prev => {
            if (prev.includes(day)) {
                return prev.filter(d => d !== day); // Remove the day if already selected
            }
            return [...prev, day]; // Add the day if not already selected
        });
    };

    const handleRemoveTask = (goalId, taskId) => {
        if (selectedTaskId === taskId) { // ตรวจสอบว่า Task ที่จะลบคือ Task ที่ถูกเลือกอยู่หรือไม่
            const updatedTemplate = {
                ...editingTemplate,
                goals: editingTemplate.goals.map(goal =>
                    goal.id === goalId
                        ? { ...goal, tasks: goal.tasks.filter(task => task.id !== taskId) }
                        : goal
                )
            };
            setEditingTemplate(updatedTemplate);
            setSelectedTaskId(null); // รีเซ็ต selectedTaskId หลังจากลบ Task
        }
    };

    const toggleDescription = (templateId) => {
        setShowDescription(showDescription === templateId ? null : templateId);
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

            {/* Main Content */}
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
                            <th>Task</th> {/* เพิ่มคอลัมน์ Task */}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.map((template, index) => (
                            <tr key={template.id}>
                                <td>{index + 1}</td>
                                <td>{template.title}</td>
                                <td>
                                    {template.image ? (
                                        <img src={template.image} alt="Template" className="template-img" />
                                    ) : (
                                        "No Image"
                                    )}
                                </td>
                                <td>{template.category}</td>
                                <td>
                                    <ul>
                                        {template.goals.map((goal) => (
                                            <li key={goal.id}>
                                                <strong>{goal.text}</strong>
                                                <p>Start Date: {goal.start_date}</p>
                                                <p>Due Date: {goal.due_date}</p>
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
                                                            <strong>Task: {task.text} {task.type === "weekly" && task.selectedDays && (
                                                                <p>Selected Days: {task.selectedDays.join(", ")}</p>
                                                            )}</strong>
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
                                                <h3>Goal{index + 1}: {goal.text}</h3>
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
                                                                        {task.text}
                                                                        {task.type === "weekly" && task.selectedDays && task.selectedDays.length > 0 && (
                                                                            <span className="selected-days">
                                                                                ({task.selectedDays.join(", ")})
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