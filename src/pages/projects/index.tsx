import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";
import { performanceRequest } from "../../lib/performanceApi";
import { API_URL as API_BASE_URL } from "../../lib/api";

import "./projects.css";

type ProjectStatus =
  | "Active"
  | "In Review"
  | "Completed"
  | "On Hold";

interface Project {
  id: number;
  name: string;
  description: string;
  owner: string;
  status: ProjectStatus;
  dueDate: string;
  members: number;
  progress: number;
  assignedEmployeeId?: number | null;
  assignedEmployeeName?: string | null;
}

interface EmployeeOption { id: number; name: string; position: string; }

const API_URL = `${API_BASE_URL}/projects`;
const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getDateInputValue(value: string) {
  if (!value) return "";

  return value.substring(0, 10);
}

function Projects() {
  // =====================================================
  // PROJECT STATE
  // =====================================================

  const [projects, setProjects] =
    useState<Project[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"All" | ProjectStatus>("All");

  // =====================================================
  // MODAL
  // =====================================================

  const [showModal, setShowModal] =
    useState(false);

  const [editingProject, setEditingProject] =
    useState<Project | null>(null);

  // =====================================================
  // FORM
  // =====================================================

  const [projectName, setProjectName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [owner, setOwner] =
    useState("");

  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");

  const [status, setStatus] =
    useState<ProjectStatus>("Active");

  const [dueDate, setDueDate] =
    useState("");

  const [members, setMembers] =
    useState(1);

  const [progress, setProgress] =
    useState(0);

  // =====================================================
  // FETCH PROJECTS
  // =====================================================

  const fetchProjects = async () => {
    try {
      setError("");

      const response = await fetch(API_URL, { headers: authHeaders() });

      const data = await response.json();

      console.log(
        "PROJECTS RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load projects."
        );
      }

      setProjects(
        Array.isArray(data.projects)
          ? data.projects
          : []
      );
    } catch (err) {
      console.error(
        "FETCH PROJECTS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Cannot connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD FROM MYSQL
  // =====================================================

  useEffect(() => {
    fetchProjects();
    performanceRequest<{ employees: EmployeeOption[] }>("/employees")
      .then((data) => setEmployees(data.employees || []))
      .catch((employeeError) => console.error("LOAD EMPLOYEES FOR PROJECT ASSIGNMENT:", employeeError));
  }, []);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredProjects = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return projects.filter((project) => {
      const name =
        String(project.name || "")
          .toLowerCase();

      const ownerName =
        String(project.owner || "")
          .toLowerCase();

      const projectDescription =
        String(project.description || "")
          .toLowerCase();

      const matchesSearch =
        name.includes(searchText) ||
        ownerName.includes(searchText) ||
        projectDescription.includes(
          searchText
        );

      const matchesStatus =
        statusFilter === "All" ||
        project.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    projects,
    search,
    statusFilter,
  ]);

  // =====================================================
  // COUNTS
  // =====================================================

  const activeCount =
    projects.filter(
      (project) =>
        project.status === "Active"
    ).length;

  const reviewCount =
    projects.filter(
      (project) =>
        project.status === "In Review"
    ).length;

  const completedCount =
    projects.filter(
      (project) =>
        project.status === "Completed"
    ).length;

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setProjectName("");
    setDescription("");
    setOwner("");
    setAssignedEmployeeId("");
    setStatus("Active");
    setDueDate("");
    setMembers(1);
    setProgress(0);
  };

  // =====================================================
  // CREATE
  // =====================================================

  const openCreateModal = () => {
    setEditingProject(null);
    resetForm();
    setError("");
    setShowModal(true);
  };

  // =====================================================
  // EDIT
  // =====================================================

  const openEditModal = (
    project: Project
  ) => {
    setEditingProject(project);

    setProjectName(
      project.name || ""
    );

    setDescription(
      project.description || ""
    );

    setOwner(
      project.owner || ""
    );
    setAssignedEmployeeId(project.assignedEmployeeId ? String(project.assignedEmployeeId) : "");

    setStatus(
      project.status || "Active"
    );

    setDueDate(
      getDateInputValue(
        project.dueDate
      )
    );

    setMembers(
      Number(project.members) || 1
    );

    setProgress(
      Number(project.progress) || 0
    );

    setError("");
    setShowModal(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingProject(null);
    resetForm();
    setError("");
  };

  // =====================================================
  // SAVE PROJECT
  // CREATE + UPDATE
  // =====================================================

  const handleSaveProject = async () => {
    setError("");

    if (!projectName.trim()) {
      setError(
        "Project name is required."
      );
      return;
    }

    if (!owner.trim()) {
      setError(
        "Project owner is required."
      );
      return;
    }

    if (!dueDate) {
      setError(
        "Due date is required."
      );
      return;
    }

    if (members < 1) {
      setError(
        "Members must be at least 1."
      );
      return;
    }

    if (
      progress < 0 ||
      progress > 100
    ) {
      setError(
        "Progress must be between 0 and 100."
      );
      return;
    }

    try {
      setSaving(true);

      const projectData = {
        name: projectName.trim(),
        description:
          description.trim(),
        owner: owner.trim(),
        assignedEmployeeId: assignedEmployeeId ? Number(assignedEmployeeId) : null,
        status,
        dueDate,
        members: Number(members),
        progress: Number(progress),
      };

      // =================================================
      // UPDATE
      // =================================================

      if (editingProject) {
        const response = await fetch(
          `${API_URL}/${editingProject.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
              ...authHeaders(),
            },

            body: JSON.stringify(
              projectData
            ),
          }
        );

        const data =
          await response.json();

        console.log(
          "UPDATE PROJECT RESPONSE:",
          response.status,
          data
        );

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to update project."
          );
        }

        // Always reload from MySQL
        await fetchProjects();

        setShowModal(false);
        setEditingProject(null);
        resetForm();

        return;
      }

      // =================================================
      // CREATE
      // =================================================

      const response = await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            ...authHeaders(),
          },

          body: JSON.stringify(
            projectData
          ),
        }
      );

      const data =
        await response.json();

      console.log(
        "CREATE PROJECT RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create project."
        );
      }

      // Always reload from MySQL
      await fetchProjects();

      setShowModal(false);
      setEditingProject(null);
      resetForm();
    } catch (err) {
      console.error(
        "SAVE PROJECT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save project."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDeleteProject = async (
    projectId: number
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this project?"
      );

    if (!confirmed) return;

    try {
      setError("");
      setSaving(true);

      console.log(
        "DELETE PROJECT:",
        projectId
      );

      const response = await fetch(
        `${API_URL}/${projectId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data =
        await response.json();

      console.log(
        "DELETE RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete project."
        );
      }

      // Remove immediately
      setProjects(
        (currentProjects) =>
          currentProjects.filter(
            (project) =>
              project.id !== projectId
          )
      );

      // Verify again from MySQL
      await fetchProjects();
    } catch (err) {
      console.error(
        "DELETE PROJECT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete project."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // STATUS
  // =====================================================

  const getStatusClass = (
    projectStatus: ProjectStatus
  ) => {
    switch (projectStatus) {
      case "Active":
        return "project-status active";

      case "In Review":
        return "project-status review";

      case "Completed":
        return "project-status completed";

      case "On Hold":
        return "project-status hold";

      default:
        return "project-status";
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="app-layout">
        <Navbar />

        <div className="app-body">
          <Sidebar />

          <main className="app-main">
            <div className="projects-page">
              <div className="projects-header">
                <div>
                  <h1>Projects</h1>

                  <p>
                    Loading your workspace
                    projects...
                  </p>
                </div>
              </div>

              <div className="projects-empty">
                Loading projects...
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="app-layout">

      <Navbar />

      <div className="app-body">

        <Sidebar />

        <main className="app-main">

          <div className="projects-page">

            {/* HEADER */}

            <div className="projects-header">

              <div>
                <h1>
                  Projects
                </h1>

                <p>
                  Manage and track all
                  projects across your
                  workspace.
                </p>
              </div>

              <button
                type="button"
                className="projects-create-button"
                onClick={
                  openCreateModal
                }
                disabled={saving}
              >
                + New project
              </button>

            </div>

            {/* ERROR */}

            {error && !showModal && (
              <div className="projects-error">
                {error}
              </div>
            )}

            {/* SUMMARY */}

            <div className="projects-summary">

              <div className="project-summary-card">
                <span>
                  Total Projects
                </span>

                <strong>
                  {projects.length}
                </strong>
              </div>

              <div className="project-summary-card">
                <span>
                  Active
                </span>

                <strong>
                  {activeCount}
                </strong>
              </div>

              <div className="project-summary-card">
                <span>
                  In Review
                </span>

                <strong>
                  {reviewCount}
                </strong>
              </div>

              <div className="project-summary-card">
                <span>
                  Completed
                </span>

                <strong>
                  {completedCount}
                </strong>
              </div>

            </div>

            {/* SEARCH */}

            <div className="projects-toolbar">

              <div className="projects-search">

                <span>⌕</span>

                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                />

              </div>

              <select
                className="projects-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "All"
                      | ProjectStatus
                  )
                }
              >

                <option value="All">
                  All statuses
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="In Review">
                  In Review
                </option>

                <option value="Completed">
                  Completed
                </option>

                <option value="On Hold">
                  On Hold
                </option>

              </select>

            </div>

            {/* PROJECTS */}

            <div className="projects-list">

              {filteredProjects.length === 0 ? (

                <div className="projects-empty">

                  <h3>
                    No projects found
                  </h3>

                  <p>
                    {search ||
                    statusFilter !== "All"
                      ? "Try changing your search or filter."
                      : "Create your first project to get started."}
                  </p>

                </div>

              ) : (

                filteredProjects.map(
                  (project) => (

                    <div
                      className="project-card"
                      key={project.id}
                    >

                      <div className="project-card-top">

                        <div>

                          <h2>
                            {project.name}
                          </h2>

                          <p>
                            {project.description}
                          </p>

                        </div>

                        <span
                          className={getStatusClass(
                            project.status
                          )}
                        >
                          {project.status}
                        </span>

                      </div>

                      <div className="project-details">

                        <div>
                          <span>
                            Owner
                          </span>

                          <strong>
                            {project.assignedEmployeeName || project.owner}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Due date
                          </span>

                          <strong>
                            {formatDate(
                              project.dueDate
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Members
                          </span>

                          <strong>
                            {project.members}
                          </strong>
                        </div>

                      </div>

                      <div className="project-progress">

                        <div className="project-progress-header">

                          <span>
                            Progress
                          </span>

                          <strong>
                            {project.progress}%
                          </strong>

                        </div>

                        <div className="project-progress-bar">

                          <div
                            className="project-progress-fill"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  Number(
                                    project.progress
                                  ) || 0
                                )
                              )}%`,
                            }}
                          />

                        </div>

                      </div>

                      <div className="project-card-actions">

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              project
                            )
                          }
                          disabled={saving}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="project-delete-button"
                          onClick={() =>
                            handleDeleteProject(
                              project.id
                            )
                          }
                          disabled={saving}
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </div>

        </main>

      </div>

      {/* =================================================
          CREATE / EDIT MODAL
      ================================================= */}

      {showModal && (

        <div
          className="project-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="project-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="project-modal-header">

              <div>

                <h2>
                  {editingProject
                    ? "Edit project"
                    : "Create project"}
                </h2>

                <p>
                  {editingProject
                    ? "Update project details."
                    : "Add a new project to your workspace."}
                </p>

              </div>

              <button
                type="button"
                className="project-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>

            </div>

            <div className="project-form-group">

              <label>
                Project name
              </label>

              <input
                type="text"
                value={projectName}
                onChange={(e) =>
                  setProjectName(
                    e.target.value
                  )
                }
                placeholder="Enter project name"
                disabled={saving}
              />

            </div>

            <div className="project-form-group">

              <label>
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Describe the project"
                rows={4}
                disabled={saving}
              />

            </div>

            <div className="project-form-row">

              <div className="project-form-group">
                <label>Assign employee</label>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => {
                    const selected = employees.find((employee) => String(employee.id) === e.target.value);
                    setAssignedEmployeeId(e.target.value);
                    if (selected) setOwner(selected.name);
                  }}
                  disabled={saving}
                >
                  <option value="">Unassigned</option>
                  {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.position}</option>)}
                </select>
                {!employees.length && <small>Add an employee in Employees to assign this project.</small>}
              </div>

              <div className="project-form-group">

                <label>
                  Owner
                </label>

                <input
                  type="text"
                  value={owner}
                  onChange={(e) =>
                    setOwner(
                      e.target.value
                    )
                  }
                  placeholder="Project owner"
                  disabled={saving}
                />

              </div>

              <div className="project-form-group">

                <label>
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as ProjectStatus
                    )
                  }
                  disabled={saving}
                >

                  <option value="Active">
                    Active
                  </option>

                  <option value="In Review">
                    In Review
                  </option>

                  <option value="Completed">
                    Completed
                  </option>

                  <option value="On Hold">
                    On Hold
                  </option>

                </select>

              </div>

            </div>

            <div className="project-form-row">

              <div className="project-form-group">

                <label>
                  Due date
                </label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(
                      e.target.value
                    )
                  }
                  disabled={saving}
                />

              </div>

              <div className="project-form-group">

                <label>
                  Team members
                </label>

                <input
                  type="number"
                  min="1"
                  value={members}
                  onChange={(e) =>
                    setMembers(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  disabled={saving}
                />

              </div>

            </div>

            <div className="project-form-group">

              <label>
                Progress: {progress}%
              </label>

              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) =>
                  setProgress(
                    Number(
                      e.target.value
                    )
                  )
                }
                disabled={saving}
              />

            </div>

            {error && (
              <div className="project-form-error">
                {error}
              </div>
            )}

            <div className="project-modal-actions">

              <button
                type="button"
                className="project-cancel-button"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="projects-create-button"
                onClick={
                  handleSaveProject
                }
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingProject
                    ? "Save changes"
                    : "Create project"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Projects;
