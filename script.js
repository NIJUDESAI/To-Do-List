/**
 * TaskFlow - Modern To-Do List Application
 * Features:
 * - Full CRUD (Create, Read, Update, Delete)
 * - Priority levels (High, Medium, Low)
 * - LocalStorage persistence
 * - Real-time Search & Filter tabs (All, Pending, Completed)
 * - Dynamic Progress tracking & Counters
 * - Dark & Light mode theme toggle
 * - Particle Confetti celebration upon 100% completion
 */

// ==========================================================================
// DOM Element References
// ==========================================================================
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

// Progress elements
const progressCount = document.getElementById("progressCount");
const progressBarFill = document.getElementById("progressBarFill");
const progressPercent = document.getElementById("progressPercent");

// Controls & Filter elements
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const badgeAll = document.getElementById("badgeAll");
const badgeActive = document.getElementById("badgeActive");
const badgeCompleted = document.getElementById("badgeCompleted");

// Footer elements
const tasksLeft = document.getElementById("tasksLeft");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");

// Header elements
const themeToggleBtn = document.getElementById("themeToggleBtn");
const currentDateEl = document.getElementById("currentDate");
const confettiCanvas = document.getElementById("confettiCanvas");

// ==========================================================================
// Application State
// ==========================================================================
const STORAGE_KEY = "taskflow_todo_tasks";
const THEME_KEY = "taskflow_theme";

// Default starter tasks for new users
const defaultTasks = [
    {
        id: "1",
        text: "Welcome to TaskFlow! 👋",
        priority: "high",
        completed: false,
        createdAt: "09:00 AM"
    },
    {
        id: "2",
        text: "Click the checkbox to complete a task",
        priority: "medium",
        completed: true,
        createdAt: "09:30 AM"
    },
    {
        id: "3",
        text: "Explore dark mode and filtering above",
        priority: "low",
        completed: false,
        createdAt: "10:15 AM"
    }
];

let tasks = loadTasksFromStorage();
let currentFilter = "all";
let searchQuery = "";

// ==========================================================================
// Initialization
// ==========================================================================
function init() {
    displayCurrentDate();
    initTheme();
    render();
    setupEventListeners();
}

// Format and display today's date
function displayCurrentDate() {
    const options = { weekday: "long", month: "short", day: "numeric" };
    const today = new Date().toLocaleDateString("en-US", options);
    if (currentDateEl) {
        currentDateEl.textContent = today;
    }
}

// ==========================================================================
// Theme Management
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
}

// ==========================================================================
// Local Storage Handlers
// ==========================================================================
function loadTasksFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse stored tasks:", e);
            return defaultTasks;
        }
    }
    return defaultTasks;
}

function saveTasksToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ==========================================================================
// Core Task Actions (Add, Toggle, Delete, Edit, Clear)
// ==========================================================================

// Add a new task
function addTask(text, priority = "medium") {
    const trimmed = text.trim();
    if (!trimmed) {
        // Trigger shake animation for validation
        taskInput.classList.remove("shake");
        void taskInput.offsetWidth; // Trigger reflow
        taskInput.classList.add("shake");
        taskInput.focus();
        return;
    }

    const newTask = {
        id: Date.now().toString(),
        text: trimmed,
        priority: priority,
        completed: false,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    tasks.unshift(newTask);
    saveTasksToStorage();
    render();

    // Reset input
    taskInput.value = "";
    taskInput.focus();
}

// Toggle complete status
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasksToStorage();
    render();

    // Check if all tasks are completed to celebrate
    const totalCount = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;
    if (totalCount > 0 && totalCount === completedCount) {
        runConfetti();
    }
}

// Delete task with smooth exit animation
function deleteTask(id, taskElement) {
    if (taskElement) {
        taskElement.classList.add("removing");
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveTasksToStorage();
            render();
        }, 280);
    } else {
        tasks = tasks.filter(t => t.id !== id);
        saveTasksToStorage();
        render();
    }
}

// Inline edit of task text
function startEditing(id, textElement) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const currentText = task.text;
    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "edit-input-field";
    editInput.value = currentText;
    editInput.maxLength = 120;

    textElement.replaceWith(editInput);
    editInput.focus();
    editInput.select();

    function finishEdit() {
        const newText = editInput.value.trim();
        if (newText && newText !== currentText) {
            task.text = newText;
            saveTasksToStorage();
        }
        render();
    }

    // Save on Enter, cancel on Escape
    editInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            finishEdit();
        } else if (e.key === "Escape") {
            render();
        }
    });

    editInput.addEventListener("blur", finishEdit);
}

// Clear all completed tasks
function clearCompletedTasks() {
    const hasCompleted = tasks.some(t => t.completed);
    if (!hasCompleted) return;

    tasks = tasks.filter(t => !t.completed);
    saveTasksToStorage();
    render();
}

// ==========================================================================
// Rendering & UI Updates
// ==========================================================================
function render() {
    renderTaskList();
    updateProgressAndBadges();
}

function renderTaskList() {
    taskList.innerHTML = "";

    // Apply filter and search query
    const filteredTasks = tasks.filter(task => {
        // Filter condition
        if (currentFilter === "active" && task.completed) return false;
        if (currentFilter === "completed" && !task.completed) return false;

        // Search condition
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase().trim();
            return task.text.toLowerCase().includes(query);
        }

        return true;
    });

    // Check if list is empty
    if (filteredTasks.length === 0) {
        emptyState.classList.add("visible");
        const emptyTitle = emptyState.querySelector(".empty-title");
        const emptyDesc = emptyState.querySelector(".empty-desc");

        if (searchQuery.trim() !== "") {
            emptyTitle.textContent = "No tasks found";
            emptyDesc.textContent = "No tasks matched your search query.";
        } else if (currentFilter === "completed") {
            emptyTitle.textContent = "No completed tasks";
            emptyDesc.textContent = "Complete tasks to see them categorized here.";
        } else if (currentFilter === "active") {
            emptyTitle.textContent = "No pending tasks";
            emptyDesc.textContent = "Great job! All pending tasks are completed.";
        } else {
            emptyTitle.textContent = "No tasks yet";
            emptyDesc.textContent = "Add a task using the input above to get started!";
        }
    } else {
        emptyState.classList.remove("visible");
    }

    // Build and inject task items
    filteredTasks.forEach(task => {
        const li = document.createElement("li");
        li.className = `task-item ${task.completed ? "completed" : ""}`;
        li.dataset.id = task.id;

        // Left Content Wrapper (Checkbox + Details)
        const contentWrapper = document.createElement("div");
        contentWrapper.className = "task-content-wrapper";

        // Custom Checkbox
        const checkbox = document.createElement("div");
        checkbox.className = "custom-checkbox";
        checkbox.setAttribute("role", "checkbox");
        checkbox.setAttribute("aria-checked", task.completed ? "true" : "false");
        checkbox.setAttribute("tabindex", "0");
        checkbox.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;

        // Checkbox click & keyboard accessibility
        checkbox.addEventListener("click", () => toggleTask(task.id));
        checkbox.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleTask(task.id);
            }
        });

        // Details (Text, Priority, Time)
        const details = document.createElement("div");
        details.className = "task-details";

        const textSpan = document.createElement("span");
        textSpan.className = "task-text";
        textSpan.textContent = task.text;
        textSpan.title = "Double click to edit";

        // Double click to edit text
        textSpan.addEventListener("dblclick", () => {
            if (!task.completed) {
                startEditing(task.id, textSpan);
            }
        });

        const metaDiv = document.createElement("div");
        metaDiv.className = "task-meta";

        const priorityTag = document.createElement("span");
        priorityTag.className = `priority-tag ${task.priority}`;
        priorityTag.textContent = task.priority;

        const timeSpan = document.createElement("span");
        timeSpan.className = "task-date";
        timeSpan.textContent = task.createdAt || "";

        metaDiv.appendChild(priorityTag);
        if (task.createdAt) {
            metaDiv.appendChild(timeSpan);
        }

        details.appendChild(textSpan);
        details.appendChild(metaDiv);

        contentWrapper.appendChild(checkbox);
        contentWrapper.appendChild(details);

        // Action Buttons (Edit & Delete)
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "task-actions";

        // Edit button
        const editBtn = document.createElement("button");
        editBtn.className = "action-btn edit-btn";
        editBtn.setAttribute("aria-label", "Edit task");
        editBtn.title = "Edit task";
        editBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
        `;
        editBtn.addEventListener("click", () => startEditing(task.id, textSpan));

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "action-btn delete-btn";
        deleteBtn.setAttribute("aria-label", "Delete task");
        deleteBtn.title = "Delete task";
        deleteBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;
        deleteBtn.addEventListener("click", () => deleteTask(task.id, li));

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(contentWrapper);
        li.appendChild(actionsDiv);

        taskList.appendChild(li);
    });
}

function updateProgressAndBadges() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    // Badges in tabs
    badgeAll.textContent = total;
    badgeActive.textContent = pending;
    badgeCompleted.textContent = completed;

    // Progress card calculation
    progressCount.textContent = `${completed} / ${total} Completed`;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBarFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;

    // Footer pending count
    tasksLeft.textContent = `${pending} pending task${pending === 1 ? "" : "s"}`;
}

// ==========================================================================
// Event Listeners Setup
// ==========================================================================
function setupEventListeners() {
    // Add task through form submission or Enter key
    taskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        addTask(taskInput.value, prioritySelect.value);
    });

    // Theme toggle
    themeToggleBtn.addEventListener("click", toggleTheme);

    // Search bar filter
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderTaskList();
    });

    // Filter tab buttons
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            currentFilter = btn.dataset.filter;
            renderTaskList();
        });
    });

    // Clear completed tasks button
    clearCompletedBtn.addEventListener("click", clearCompletedTasks);
}

// ==========================================================================
// Lightweight Celebration Confetti (Pure Canvas, No external library required)
// ==========================================================================
function runConfetti() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext("2d");
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#3b82f6"];

    for (let i = 0; i < 90; i++) {
        particles.push({
            x: confettiCanvas.width / 2,
            y: confettiCanvas.height / 2,
            r: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 0.7) * 16,
            gravity: 0.35,
            opacity: 1,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 8
        });
    }

    let animationFrame;
    function renderConfetti() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        let active = false;

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.opacity -= 0.012;
            p.rotation += p.rotationSpeed;

            if (p.opacity > 0) {
                active = true;
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 1.4);
                ctx.restore();
            }
        });

        if (active) {
            animationFrame = requestAnimationFrame(renderConfetti);
        } else {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            cancelAnimationFrame(animationFrame);
        }
    }

    renderConfetti();
}

// Handle window resize for confetti canvas
window.addEventListener("resize", () => {
    if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
});

// Run application
document.addEventListener("DOMContentLoaded", init);