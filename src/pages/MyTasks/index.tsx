import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock3,
  Plus,
  Search,
  ListTodo,
  AlertCircle,
} from "lucide-react";

import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";
import { performanceRequest } from "../../lib/performanceApi";
import { API_URL as API_BASE_URL } from "../../lib/api";

import "./task.css";

type TaskStatus = "To Do" | "In Progress" | "Completed";
type Priority = "High" | "Medium" | "Low";

interface Task {
  id: number;
  title: string;
  description: string;
  project: string;
  priority: Priority;
  dueDate: string;
  status: TaskStatus;
  assignee?: string;
  assignedEmployeeId?: number | null;
  assignedEmployeeName?: string | null;
  createdAt?: string;
}

interface EmployeeOption { id: number; name: string; position: string; }

const API_URL = `${API_BASE_URL}/tasks`;
const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function getTaskTracking(task: Pick<Task, "status" | "dueDate">) {
  if (task.status === "Completed") return { label: "Complete", tone: "complete", detail: "Marked completed" };
  if (!task.dueDate) return { label: "No due date", tone: "neutral", detail: "Add a due date to track timing" };
  const due = String(task.dueDate).slice(0, 10).split("-").map(Number);
  const dueAt = Date.UTC(due[0], due[1] - 1, due[2]);
  const today = new Date();
  const todayAt = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((dueAt - todayAt) / 86400000);
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, tone: "risk", detail: `Due ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago; review progress` };
  if (days === 0) return { label: "Due today", tone: "soon", detail: "Due today; check progress" };
  if (days <= 3) return { label: `Due in ${days}d`, tone: "soon", detail: `Due in ${days} day${days === 1 ? "" : "s"}; check progress` };
  return { label: "On schedule", tone: "on-track", detail: `${days} days until due` };
}

function MyTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<"All" | TaskStatus>("All");

  const [priorityFilter, setPriorityFilter] =
    useState<"All" | Priority>("All");

  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [taskPriority, setTaskPriority] =
    useState<Priority>("Medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskStatus, setTaskStatus] =
    useState<TaskStatus>("To Do");

  // =====================================================
  // LOAD TASKS FROM MYSQL
  // =====================================================

  const loadTasks = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_URL, { headers: authHeaders() });

      if (!response.ok) {
        throw new Error("Failed to load tasks");
      }

      const data = await response.json();

      setTasks(data.tasks || []);
    } catch (error) {
      console.error("LOAD TASKS ERROR:", error);
      alert(
        "Unable to load tasks. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    performanceRequest<{ employees: EmployeeOption[] }>("/employees")
      .then((data) => setEmployees(data.employees || []))
      .catch((employeeError) => console.error("LOAD EMPLOYEES FOR TASK ASSIGNMENT:", employeeError));
  }, []);

  // =====================================================
  // COUNTS
  // =====================================================

  const totalTasks = tasks.length;

  const todoTasks = tasks.filter(
    (task) => task.status === "To Do"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "High"
  ).length;

  // =====================================================
  // FILTER
  // =====================================================

  const filteredTasks = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchText) ||
        task.project.toLowerCase().includes(searchText) ||
        String(task.description || "").toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" ||
        task.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    tasks,
    search,
    statusFilter,
    priorityFilter,
  ]);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskProject("");
    setAssignedEmployeeId("");
    setTaskPriority("Medium");
    setTaskDueDate("");
    setTaskStatus("To Do");
  };

  // =====================================================
  // CREATE MODAL
  // =====================================================

  const openCreateModal = () => {
    setEditingTask(null);
    resetForm();
    setShowModal(true);
  };

  // =====================================================
  // EDIT MODAL
  // =====================================================

  const openEditModal = (task: Task) => {
    setEditingTask(task);

    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskProject(task.project);
    setAssignedEmployeeId(task.assignedEmployeeId ? String(task.assignedEmployeeId) : "");
    setTaskPriority(task.priority);
    setTaskDueDate(task.dueDate || "");
    setTaskStatus(task.status);

    setShowModal(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
    resetForm();
  };

  // =====================================================
  // CREATE / UPDATE TASK
  // =====================================================

  const saveTask = async () => {
    if (!taskTitle.trim()) {
      alert("Task title is required.");
      return;
    }

    if (!taskProject.trim()) {
      alert("Project name is required.");
      return;
    }

    try {
      const payload = {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        project: taskProject.trim(),
        assignedEmployeeId: assignedEmployeeId ? Number(assignedEmployeeId) : null,
        priority: taskPriority,
        dueDate: taskDueDate || null,
        status: taskStatus,
      };

      const url = editingTask
        ? `${API_URL}/${editingTask.id}`
        : API_URL;

      const method = editingTask ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save task"
        );
      }

      closeModal();

      await loadTasks();
    } catch (error) {
      console.error("SAVE TASK ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save task."
      );
    }
  };

  // =====================================================
  // DELETE TASK
  // =====================================================

  const deleteTask = async (taskId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/${taskId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete task"
        );
      }

      await loadTasks();
    } catch (error) {
      console.error("DELETE TASK ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to delete task."
      );
    }
  };

  // =====================================================
  // CHANGE STATUS
  // =====================================================

  const toggleTaskStatus = async (task: Task) => {
    let nextStatus: TaskStatus;

    if (task.status === "To Do") {
      nextStatus = "In Progress";
    } else if (task.status === "In Progress") {
      nextStatus = "Completed";
    } else {
      nextStatus = "To Do";
    }

    try {
      const response = await fetch(
        `${API_URL}/${task.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            title: task.title,
            description: task.description || "",
            project: task.project,
            assignedEmployeeId: task.assignedEmployeeId || null,
            priority: task.priority,
            dueDate: task.dueDate || null,
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update task"
        );
      }

      await loadTasks();
    } catch (error) {
      console.error(
        "UPDATE TASK STATUS ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to update task."
      );
    }
  };

  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = (status: TaskStatus) => {
    if (status === "Completed") {
      return "task-status completed";
    }

    if (status === "In Progress") {
      return "task-status progress";
    }

    return "task-status todo";
  };

  // =====================================================
  // PRIORITY CLASS
  // =====================================================

  const getPriorityClass = (priority: Priority) => {
    return `task-priority ${priority.toLowerCase()}`;
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="app-layout">

      <Navbar />

      <div className="app-body">

        <Sidebar />

        <main className="app-main">

          <div className="tasks-page">

            {/* HEADER */}

            <div className="tasks-header">

              <div className="tasks-title-row">

                <div className="tasks-title-icon">
                  <ListTodo size={22} />
                </div>

                <div>
                  <h1>My Tasks</h1>

                  <p>
                    Manage your assigned tasks
                    and track your progress.
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="tasks-create-button"
                onClick={openCreateModal}
              >
                <Plus size={17} />
                New task
              </button>

            </div>

            {/* SUMMARY */}

            <div className="tasks-summary">

              <div className="task-summary-card">

                <div className="task-summary-top">
                  <span>Total Tasks</span>
                  <ListTodo size={18} />
                </div>

                <strong>{totalTasks}</strong>

                <p>All assigned tasks</p>

              </div>

              <div className="task-summary-card">

                <div className="task-summary-top">
                  <span>To Do</span>
                  <Circle size={18} />
                </div>

                <strong>{todoTasks}</strong>

                <p>Tasks waiting to start</p>

              </div>

              <div className="task-summary-card">

                <div className="task-summary-top">
                  <span>In Progress</span>
                  <Clock3 size={18} />
                </div>

                <strong>{inProgressTasks}</strong>

                <p>Currently working</p>

              </div>

              <div className="task-summary-card">

                <div className="task-summary-top">
                  <span>Completed</span>
                  <CheckCircle2 size={18} />
                </div>

                <strong>{completedTasks}</strong>

                <p>Successfully completed</p>

              </div>

            </div>

            {/* TOOLBAR */}

            <div className="tasks-toolbar">

              <div className="tasks-search">

                <Search size={17} />

                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />

              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "All"
                      | TaskStatus
                  )
                }
              >
                <option value="All">
                  All statuses
                </option>

                <option value="To Do">
                  To Do
                </option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Completed">
                  Completed
                </option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value as
                      | "All"
                      | Priority
                  )
                }
              >
                <option value="All">
                  All priorities
                </option>

                <option value="High">
                  High
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Low">
                  Low
                </option>
              </select>

            </div>

            {/* TASK LIST */}

            <div className="tasks-list">

              {loading ? (

                <div className="tasks-empty">

                  <Clock3 size={30} />

                  <h3>
                    Loading tasks...
                  </h3>

                  <p>
                    Getting your tasks from
                    the database.
                  </p>

                </div>

              ) : filteredTasks.length === 0 ? (

                <div className="tasks-empty">

                  <AlertCircle size={30} />

                  <h3>
                    No tasks found
                  </h3>

                  <p>
                    Try changing your search
                    or filters.
                  </p>

                </div>

              ) : (

                filteredTasks.map((task) => (

                  <div
                    className="task-card"
                    key={task.id}
                  >

                    {/* CHECK */}

                    <button
                      type="button"
                      className="task-check-button"
                      onClick={() =>
                        toggleTaskStatus(task)
                      }
                      title="Change task status"
                    >
                      {task.status ===
                      "Completed" ? (
                        <CheckCircle2
                          size={22}
                        />
                      ) : (
                        <Circle size={22} />
                      )}
                    </button>

                    {/* CONTENT */}

                    <div className="task-card-content">

                      <div className="task-card-title-row">

                        <h2
                          className={
                            task.status ===
                            "Completed"
                              ? "task-completed-title"
                              : ""
                          }
                        >
                          {task.title}
                        </h2>

                        <span
                          className={getPriorityClass(
                            task.priority
                          )}
                        >
                          {task.priority}
                        </span>

                      </div>

                      <p>
                        {task.description ||
                          "No description provided."}
                      </p>

                      <div className="task-card-meta">

                        <span>
                          Project:
                          <strong>
                            {task.project}
                          </strong>
                        </span>

                        {task.assignedEmployeeName && <span>Assigned to: <strong>{task.assignedEmployeeName}</strong></span>}

                        <span>
                          Due:
                          <strong>
                            {task.dueDate || "No date"}
                          </strong>
                        </span>

                        <span
                          className={getStatusClass(
                            task.status
                          )}
                        >
                          {task.status}
                        </span>

                        <span className={`task-ai-tracking ${getTaskTracking(task).tone}`} title={getTaskTracking(task).detail}>
                          <span aria-hidden="true">✦</span> Auto tracking: {getTaskTracking(task).label}
                        </span>

                      </div>

                    </div>

                    {/* ACTIONS */}

                    <div className="task-card-actions">

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(task)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="task-delete-button"
                        onClick={() =>
                          deleteTask(task.id)
                        }
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                ))

              )}

            </div>

            {/* FOOTER */}

            <div className="tasks-footer">

              <span>
                Showing{" "}
                <strong>
                  {filteredTasks.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {totalTasks}
                </strong>{" "}
                tasks
              </span>

              <span>
                {highPriorityTasks} high priority
              </span>

            </div>

          </div>

        </main>

      </div>

      {/* =================================================
          CREATE / EDIT MODAL
      ================================================= */}

      {showModal && (

        <div
          className="task-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="task-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="task-modal-header">

              <div>

                <h2>
                  {editingTask
                    ? "Edit task"
                    : "Create task"}
                </h2>

                <p>
                  {editingTask
                    ? "Update task details."
                    : "Add a new task to your workspace."}
                </p>

              </div>

              <button
                type="button"
                className="task-modal-close"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            {/* TITLE */}

            <div className="task-form-group">

              <label>
                Task title
              </label>

              <input
                type="text"
                value={taskTitle}
                onChange={(e) =>
                  setTaskTitle(e.target.value)
                }
                placeholder="Enter task title"
              />

            </div>

            <div className="task-form-group">
              <label>Assign employee</label>
              <select value={assignedEmployeeId} onChange={(e) => setAssignedEmployeeId(e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.position}</option>)}
              </select>
              {!employees.length && <small>Add an employee in Employees to assign this task.</small>}
            </div>

            {/* DESCRIPTION */}

            <div className="task-form-group">

              <label>
                Description
              </label>

              <textarea
                value={taskDescription}
                onChange={(e) =>
                  setTaskDescription(
                    e.target.value
                  )
                }
                placeholder="Describe the task"
                rows={4}
              />

            </div>

            {/* PROJECT */}

            <div className="task-form-group">

              <label>
                Project
              </label>

              <input
                type="text"
                value={taskProject}
                onChange={(e) =>
                  setTaskProject(e.target.value)
                }
                placeholder="Project name"
              />

            </div>

            {/* PRIORITY + STATUS */}

            <div className="task-form-row">

              <div className="task-form-group">

                <label>
                  Priority
                </label>

                <select
                  value={taskPriority}
                  onChange={(e) =>
                    setTaskPriority(
                      e.target.value as Priority
                    )
                  }
                >
                  <option value="High">
                    High
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="Low">
                    Low
                  </option>
                </select>

              </div>

              <div className="task-form-group">

                <label>
                  Workflow status
                </label>

                <select
                  value={taskStatus}
                  onChange={(e) =>
                    setTaskStatus(
                      e.target.value as TaskStatus
                    )
                  }
                >
                  <option value="To Do">
                    To Do
                  </option>

                  <option value="In Progress">
                    In Progress
                  </option>

                  <option value="Completed">
                    Completed
                  </option>
                </select>
                <small className="task-status-help">Set this when work actually starts or is completed. Automatic tracking below watches due dates and flags overdue tasks.</small>

              </div>

            </div>

            <div className={`task-ai-tracking task-modal-tracking ${getTaskTracking({ status: taskStatus, dueDate: taskDueDate }).tone}`} role="status">
              <span aria-hidden="true">✦</span>
              <span><strong>Automatic progress signal: {getTaskTracking({ status: taskStatus, dueDate: taskDueDate }).label}</strong><small>{getTaskTracking({ status: taskStatus, dueDate: taskDueDate }).detail}. This is based on workflow status and due date; it does not infer task completion.</small></span>
            </div>

            {/* DUE DATE */}

            <div className="task-form-group">

              <label>
                Due date
              </label>

              <input
                type="date"
                value={
                  taskDueDate
                    ? taskDueDate.slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  setTaskDueDate(
                    e.target.value
                  )
                }
              />

            </div>

            {/* ACTIONS */}

            <div className="task-modal-actions">

              <button
                type="button"
                className="task-cancel-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="tasks-create-button"
                onClick={saveTask}
              >
                {editingTask
                  ? "Save changes"
                  : "Create task"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default MyTasks;
