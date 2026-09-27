import { useEffect, useMemo, useState } from "react";

import {
  Users,
  UserPlus,
  Search,
  Mail,
  BriefcaseBusiness,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";

import "./team.css";
import { API_URL as API_BASE_URL } from "../../lib/api";


/* =========================================================
   TYPES
========================================================= */

type TeamStatus = "Active" | "Inactive";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  projects: number;
  status: TeamStatus;
  initials: string;
  joined_date?: string | null;
}


/* =========================================================
   BACKEND URL
========================================================= */

const API_URL = `${API_BASE_URL}/teams`;


/* =========================================================
   HELPER - INITIALS
========================================================= */

const getInitials = (name: string) => {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};


/* =========================================================
   TEAMS COMPONENT
========================================================= */

function Teams() {

  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [search, setSearch] =
    useState("");

  const [departmentFilter, setDepartmentFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState<"All" | TeamStatus>("All");

  const [showModal, setShowModal] =
    useState(false);

  const [editingMember, setEditingMember] =
    useState<TeamMember | null>(null);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState("");

  const [department, setDepartment] =
    useState("Engineering");

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);


  /* =======================================================
     LOAD TEAMS
  ======================================================= */

  const loadTeams = async () => {

    try {

      setLoading(true);

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Failed to load teams");
      }

      const data = await response.json();

      const formattedMembers: TeamMember[] =
        data.map((member: any) => ({
          id: Number(member.id),

          name: member.name,

          email: member.email,

          role: member.role,

          department:
            member.department || "Engineering",

          projects: 0,

          status:
            member.status === "Inactive"
              ? "Inactive"
              : "Active",

          initials:
            getInitials(member.name),

          joined_date:
            member.joined_date || null,
        }));

      setMembers(formattedMembers);

    } catch (error) {

      console.error(
        "LOAD TEAMS ERROR:",
        error
      );

      alert(
        "Unable to load team members. Make sure the backend is running."
      );

    } finally {

      setLoading(false);

    }
  };


  /* =======================================================
     LOAD ON PAGE OPEN
  ======================================================= */

  useEffect(() => {
    loadTeams();
  }, []);


  /* =======================================================
     DEPARTMENTS
  ======================================================= */

  const departments = useMemo(() => {

    return Array.from(
      new Set(
        members
          .map(
            (member) =>
              member.department
          )
          .filter(Boolean)
      )
    );

  }, [members]);


  /* =======================================================
     FILTER
  ======================================================= */

  const filteredMembers = useMemo(() => {

    const text =
      search
        .toLowerCase()
        .trim();

    return members.filter((member) => {

      const matchesSearch =
        member.name
          .toLowerCase()
          .includes(text) ||

        member.email
          .toLowerCase()
          .includes(text) ||

        member.role
          .toLowerCase()
          .includes(text);

      const matchesDepartment =
        departmentFilter === "All" ||
        member.department ===
          departmentFilter;

      const matchesStatus =
        statusFilter === "All" ||
        member.status ===
          statusFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesStatus
      );

    });

  }, [
    members,
    search,
    departmentFilter,
    statusFilter,
  ]);


  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalMembers =
    members.length;

  const activeMembers =
    members.filter(
      (member) =>
        member.status === "Active"
    ).length;

  const inactiveMembers =
    members.filter(
      (member) =>
        member.status === "Inactive"
    ).length;

  const totalProjects =
    members.reduce(
      (total, member) =>
        total + member.projects,
      0
    );


  /* =======================================================
     RESET FORM
  ======================================================= */

  const resetForm = () => {

    setName("");
    setEmail("");
    setRole("");
    setDepartment("Engineering");

  };


  /* =======================================================
     OPEN CREATE MODAL
  ======================================================= */

  const openCreateModal = () => {

    setEditingMember(null);

    resetForm();

    setShowModal(true);

  };


  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  const openEditModal = (
    member: TeamMember
  ) => {

    setEditingMember(member);

    setName(member.name);

    setEmail(member.email);

    setRole(member.role);

    setDepartment(
      member.department
    );

    setShowModal(true);

  };


  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal = () => {

    setShowModal(false);

    setEditingMember(null);

    resetForm();

  };


  /* =======================================================
     CREATE / UPDATE
  ======================================================= */

  const saveMember = async () => {

    if (!name.trim()) {

      alert("Name is required.");

      return;
    }

    if (!email.trim()) {

      alert("Email is required.");

      return;
    }

    if (!role.trim()) {

      alert("Role is required.");

      return;
    }


    try {

      setSaving(true);


      /* ---------------------------------------------------
         EDIT
      --------------------------------------------------- */

      if (editingMember) {

        const response =
          await fetch(
            `${API_URL}/${editingMember.id}`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                name: name.trim(),

                email: email.trim(),

                role: role.trim(),

                department,

                status:
                  editingMember.status,

                joined_date:
                  editingMember.joined_date ||
                  null,
              }),
            }
          );


        if (!response.ok) {

          const errorData =
            await response.json()
              .catch(() => null);

          throw new Error(
            errorData?.message ||
            "Failed to update member"
          );
        }


        alert(
          "Team member updated successfully!"
        );

      }


      /* ---------------------------------------------------
         CREATE
      --------------------------------------------------- */

      else {

        const response =
          await fetch(
            API_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                name: name.trim(),

                email: email.trim(),

                role: role.trim(),

                department,

                status: "Active",

                joined_date:
                  new Date()
                    .toISOString()
                    .split("T")[0],
              }),
            }
          );


        if (!response.ok) {

          const errorData =
            await response.json()
              .catch(() => null);

          throw new Error(
            errorData?.message ||
            "Failed to create member"
          );
        }


        alert(
          "Team member created successfully!"
        );
      }


      /* ---------------------------------------------------
         REFRESH FROM DATABASE
      --------------------------------------------------- */

      closeModal();

      await loadTeams();

    } catch (error) {

      console.error(
        "SAVE TEAM ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );

    } finally {

      setSaving(false);

    }
  };


  /* =======================================================
     DELETE
  ======================================================= */

  const deleteMember = async (
    id: number
  ) => {

    const confirmed =
      window.confirm(
        "Are you sure you want to remove this team member?"
      );

    if (!confirmed) {
      return;
    }


    try {

      const response =
        await fetch(
          `${API_URL}/${id}`,
          {
            method: "DELETE",
          }
        );


      if (!response.ok) {

        const errorData =
          await response.json()
            .catch(() => null);

        throw new Error(
          errorData?.message ||
          "Failed to delete member"
        );
      }


      alert(
        "Team member deleted successfully!"
      );


      await loadTeams();

    } catch (error) {

      console.error(
        "DELETE TEAM ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete member"
      );

    }
  };


  /* =======================================================
     CHANGE STATUS
  ======================================================= */

  const toggleStatus = async (
    member: TeamMember
  ) => {

    const newStatus: TeamStatus =
      member.status === "Active"
        ? "Inactive"
        : "Active";


    try {

      const response =
        await fetch(
          `${API_URL}/${member.id}/status`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              status: newStatus,
            }),
          }
        );


      if (!response.ok) {

        const errorData =
          await response.json()
            .catch(() => null);

        throw new Error(
          errorData?.message ||
          "Failed to update status"
        );
      }


      await loadTeams();

    } catch (error) {

      console.error(
        "STATUS UPDATE ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update status"
      );

    }
  };


  /* =======================================================
     JSX
  ======================================================= */

  return (
    <div className="app-layout">

      <Navbar />

      <div className="app-body">

        <Sidebar />

        <main className="app-main">

          <div className="teams-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="teams-header">

              <div className="teams-title-row">

                <div className="teams-title-icon">
                  <Users size={22} />
                </div>

                <div>

                  <h1>
                    Teams
                  </h1>

                  <p>
                    Manage your team members
                    and organization.
                  </p>

                </div>

              </div>


              <button
                type="button"
                className="teams-create-button"
                onClick={
                  openCreateModal
                }
              >

                <UserPlus size={17} />

                Add member

              </button>

            </div>


            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="teams-summary">


              <div className="team-summary-card">

                <div className="team-summary-top">

                  <span>
                    Total Members
                  </span>

                  <Users size={18} />

                </div>

                <strong>
                  {totalMembers}
                </strong>

                <p>
                  Team members
                </p>

              </div>


              <div className="team-summary-card">

                <div className="team-summary-top">

                  <span>
                    Active
                  </span>

                  <div className="summary-status-dot active" />

                </div>

                <strong>
                  {activeMembers}
                </strong>

                <p>
                  Currently active
                </p>

              </div>


              <div className="team-summary-card">

                <div className="team-summary-top">

                  <span>
                    Inactive
                  </span>

                  <div className="summary-status-dot inactive" />

                </div>

                <strong>
                  {inactiveMembers}
                </strong>

                <p>
                  Currently inactive
                </p>

              </div>


              <div className="team-summary-card">

                <div className="team-summary-top">

                  <span>
                    Projects
                  </span>

                  <BriefcaseBusiness size={18} />

                </div>

                <strong>
                  {totalProjects}
                </strong>

                <p>
                  Assigned projects
                </p>

              </div>

            </div>


            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="teams-toolbar">

              <div className="teams-search">

                <Search size={17} />

                <input
                  type="text"
                  placeholder="Search team members..."
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                />

              </div>


              <select
                value={departmentFilter}
                onChange={(e) =>
                  setDepartmentFilter(
                    e.target.value
                  )
                }
              >

                <option value="All">
                  All departments
                </option>

                {departments.map(
                  (item) => (

                    <option
                      value={item}
                      key={item}
                    >
                      {item}
                    </option>

                  )
                )}

              </select>


              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "All"
                      | TeamStatus
                  )
                }
              >

                <option value="All">
                  All status
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

              </select>

            </div>


            {/* =================================================
                LOADING
            ================================================= */}

            {loading ? (

              <div className="teams-empty">

                <Users size={30} />

                <h3>
                  Loading team members...
                </h3>

                <p>
                  Please wait.
                </p>

              </div>

            ) : filteredMembers.length === 0 ? (

              /* =================================================
                 EMPTY
              ================================================= */

              <div className="teams-empty">

                <Users size={30} />

                <h3>
                  No team members found
                </h3>

                <p>
                  Try changing your
                  search or filters.
                </p>

              </div>

            ) : (

              /* =================================================
                 TEAM GRID
              ================================================= */

              <div className="teams-grid">

                {filteredMembers.map(
                  (member) => (

                    <div
                      className="team-member-card"
                      key={member.id}
                    >


                      {/* CARD HEADER */}

                      <div className="member-card-header">

                        <div className="member-profile">

                          <div className="member-avatar">

                            {member.initials}

                          </div>

                          <div>

                            <h2>
                              {member.name}
                            </h2>

                            <span>
                              {member.role}
                            </span>

                          </div>

                        </div>


                        <button
                          type="button"
                          className="member-menu-button"
                          title="Edit"
                          onClick={() =>
                            openEditModal(
                              member
                            )
                          }
                        >

                          <MoreVertical
                            size={18}
                          />

                        </button>

                      </div>


                      <div className="member-divider" />


                      {/* MEMBER INFO */}

                      <div className="member-info">


                        <div className="member-info-row">

                          <Mail size={15} />

                          <span>
                            {member.email}
                          </span>

                        </div>


                        <div className="member-info-row">

                          <BriefcaseBusiness
                            size={15}
                          />

                          <span>
                            {member.department}
                          </span>

                        </div>

                      </div>


                      {/* FOOTER */}

                      <div className="member-card-footer">


                        <div>

                          <span>
                            Projects
                          </span>

                          <strong>
                            {member.projects}
                          </strong>

                        </div>


                        <button
                          type="button"
                          className={
                            member.status ===
                            "Active"
                              ? "member-status active"
                              : "member-status inactive"
                          }
                          onClick={() =>
                            toggleStatus(
                              member
                            )
                          }
                        >

                          <span />

                          {member.status}

                        </button>

                      </div>


                      {/* ACTIONS */}

                      <div className="member-actions">

                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              member
                            )
                          }
                        >

                          <Pencil size={14} />

                          Edit

                        </button>


                        <button
                          type="button"
                          className="member-delete"
                          onClick={() =>
                            deleteMember(
                              member.id
                            )
                          }
                        >

                          <Trash2 size={14} />

                          Delete

                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}


            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="teams-footer">

              Showing{" "}

              <strong>
                {filteredMembers.length}
              </strong>{" "}

              of{" "}

              <strong>
                {totalMembers}
              </strong>{" "}

              team members

            </div>

          </div>

        </main>

      </div>


      {/* =====================================================
          MODAL
      ===================================================== */}

      {showModal && (

        <div
          className="team-modal-overlay"
          onClick={closeModal}
        >

          <div
            className="team-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >


            {/* MODAL HEADER */}

            <div className="team-modal-header">

              <div>

                <h2>

                  {editingMember
                    ? "Edit team member"
                    : "Add team member"}

                </h2>

                <p>

                  {editingMember
                    ? "Update member information."
                    : "Add a new member to your team."}

                </p>

              </div>


              <button
                type="button"
                className="team-modal-close"
                onClick={closeModal}
              >
                ×
              </button>

            </div>


            {/* NAME */}

            <div className="team-form-group">

              <label>
                Full name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                placeholder="Enter full name"
              />

            </div>


            {/* EMAIL */}

            <div className="team-form-group">

              <label>
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="name@example.com"
              />

            </div>


            {/* ROLE */}

            <div className="team-form-group">

              <label>
                Role
              </label>

              <input
                type="text"
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value
                  )
                }
                placeholder="e.g. Frontend Developer"
              />

            </div>


            {/* DEPARTMENT */}

            <div className="team-form-group">

              <label>
                Department
              </label>

              <select
                value={department}
                onChange={(e) =>
                  setDepartment(
                    e.target.value
                  )
                }
              >

                <option value="Engineering">
                  Engineering
                </option>

                <option value="Design">
                  Design
                </option>

                <option value="Management">
                  Management
                </option>

                <option value="Human Resources">
                  Human Resources
                </option>

                <option value="Marketing">
                  Marketing
                </option>

                <option value="Finance">
                  Finance
                </option>

              </select>

            </div>


            {/* MODAL ACTIONS */}

            <div className="team-modal-actions">

              <button
                type="button"
                className="team-cancel-button"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>


              <button
                type="button"
                className="teams-create-button"
                onClick={saveMember}
                disabled={saving}
              >

                {saving
                  ? "Saving..."
                  : editingMember
                    ? "Save changes"
                    : "Add member"}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


export default Teams;
