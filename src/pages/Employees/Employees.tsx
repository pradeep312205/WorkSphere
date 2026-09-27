import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { asNumber, performanceRequest } from "../../lib/performanceApi";
import type { Employee } from "../../lib/performanceApi";
import "./performance.css";

type EmployeeForm = {
  employeeId: string; name: string; email: string; department: string; position: string;
  joiningDate: string; status: "Active" | "Inactive"; attendance: string; productivity: string;
  taskCompletion: string; qualityScore: string; teamworkScore: string;
};

const emptyForm: EmployeeForm = {
  employeeId: "", name: "", email: "", department: "Engineering", position: "", joiningDate: "",
  status: "Active", attendance: "85", productivity: "85", taskCompletion: "85", qualityScore: "85", teamworkScore: "85",
};

function employeeToForm(employee: Employee): EmployeeForm {
  return {
    employeeId: employee.employeeId, name: employee.name, email: employee.email,
    department: employee.department, position: employee.position,
    joiningDate: String(employee.joiningDate).slice(0, 10), status: employee.status,
    attendance: String(employee.attendance), productivity: String(employee.productivity),
    taskCompletion: String(employee.taskCompletion), qualityScore: String(employee.qualityScore),
    teamworkScore: String(employee.teamworkScore),
  };
}

const departmentOptions = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations", "Design"];
const metricFields: Array<[keyof EmployeeForm, string]> = [
  ["attendance", "Attendance"], ["productivity", "Productivity"], ["taskCompletion", "Task completion"], ["qualityScore", "Quality score"], ["teamworkScore", "Teamwork score"],
];

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const pageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      if (department !== "All") params.set("department", department);
      performanceRequest<{ employees: Employee[]; departments: string[] }>(`/employees?${params.toString()}`)
        .then((data) => { setEmployees(data.employees); setDepartments(data.departments); setPage(1); })
        .catch((requestError: Error) => setError(requestError.message))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, department]);

  const sortedEmployees = useMemo(() => [...employees].sort((a, b) => sortAsc ? asNumber(a.performanceScore) - asNumber(b.performanceScore) : asNumber(b.performanceScore) - asNumber(a.performanceScore)), [employees, sortAsc]);
  const pageCount = Math.max(1, Math.ceil(sortedEmployees.length / pageSize));
  const visibleEmployees = sortedEmployees.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(""); setModalOpen(true); };
  const openEdit = (employee: Employee) => { setEditing(employee); setForm(employeeToForm(employee)); setError(""); setModalOpen(true); };
  const updateField = (field: keyof EmployeeForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const saveEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      ...form,
      employeeId: form.employeeId.trim() || undefined,
      attendance: Number(form.attendance), productivity: Number(form.productivity),
      taskCompletion: Number(form.taskCompletion), qualityScore: Number(form.qualityScore), teamworkScore: Number(form.teamworkScore),
    };
    try {
      await performanceRequest(editing ? `/employees/${editing.id}` : "/employees", {
        method: editing ? "PUT" : "POST", body: JSON.stringify(body),
      });
      setModalOpen(false);
      setNotice(editing ? "Employee profile updated." : "Employee added.");
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      if (department !== "All") params.set("department", department);
      const data = await performanceRequest<{ employees: Employee[]; departments: string[] }>(`/employees?${params.toString()}`);
      setEmployees(data.employees); setDepartments(data.departments);
      window.setTimeout(() => setNotice(""), 3200);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save employee.");
    } finally { setSaving(false); }
  };

  const deleteEmployee = async (employee: Employee) => {
    if (!window.confirm(`Delete ${employee.name}'s employee profile? This cannot be undone.`)) return;
    setError("");
    try {
      await performanceRequest(`/employees/${employee.id}`, { method: "DELETE" });
      setEmployees((current) => current.filter((item) => item.id !== employee.id));
      setNotice(`${employee.name} was removed.`);
      window.setTimeout(() => setNotice(""), 3200);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not delete employee."); }
  };

  return (
    <PerformanceLayout>
      <div className="performance-page-header">
        <div><span className="performance-eyebrow">PEOPLE OPERATIONS</span><h1>Employees</h1><p>Manage profiles and review the performance signals behind each score.</p></div>
        <button className="performance-primary-button" type="button" onClick={openAdd}><Plus size={17} /> Add employee</button>
      </div>
      {error && !modalOpen && <div className="performance-alert error">{error}</div>}
      {notice && <div className="performance-toast" role="status">{notice}</div>}

      <section className="performance-panel employee-toolbar">
        <label className="performance-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, ID or role…" /></label>
        <select aria-label="Filter by department" value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="All">All departments</option>
          {[...new Set([...departments, ...departmentOptions])].sort().map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="employee-result-count"><Users size={16} /> {employees.length} employees</div>
      </section>

      <section className="performance-panel employee-table-panel">
        {loading ? <div className="performance-loading">Loading employee profiles…</div> : error && !employees.length ? <div className="performance-empty">{error}</div> : !visibleEmployees.length ? <div className="performance-empty">{employees.length === 0 && !query.trim() && department === "All" ? "No employee profiles belong to this account yet. Add your first employee to start tracking performance." : "No employees match these filters."}</div> : (
          <div className="performance-table-wrap"><table className="performance-table">
            <thead><tr>
              <th>Employee</th><th>Employee ID</th><th>Department / role</th><th>Joined</th>
              <th><button className="sort-table-button" type="button" onClick={() => setSortAsc((value) => !value)}>Performance {sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />}</button></th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>{visibleEmployees.map((employee) => (
              <tr key={employee.id}>
                <td><div className="employee-name-cell"><span className="employee-avatar">{employee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span><strong>{employee.name}</strong><small>{employee.email}</small></span></div></td>
                <td className="employee-id">{employee.employeeId}</td>
                <td><strong>{employee.department}</strong><small className="table-subtext">{employee.position}</small></td>
                <td>{String(employee.joiningDate).slice(0, 10)}</td>
                <td><span className={`performance-score-pill ${asNumber(employee.performanceScore) < 75 ? "low" : asNumber(employee.performanceScore) >= 90 ? "high" : ""}`}>{asNumber(employee.performanceScore).toFixed(1)}</span></td>
                <td><span className={`employee-status ${employee.status.toLowerCase()}`}>{employee.status}</span></td>
                <td><div className="employee-actions">
                  <button type="button" title="View employee" aria-label={`View ${employee.name}`} onClick={() => navigate(`/employees/${employee.id}`)}><Eye size={16} /></button>
                  <button type="button" title="Edit employee" aria-label={`Edit ${employee.name}`} onClick={() => openEdit(employee)}><Pencil size={16} /></button>
                  <button type="button" title="Delete employee" aria-label={`Delete ${employee.name}`} onClick={() => void deleteEmployee(employee)}><Trash2 size={16} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        {!loading && employees.length > pageSize && <div className="performance-pagination"><span>Showing {Math.min((page - 1) * pageSize + 1, employees.length)}–{Math.min(page * pageSize, employees.length)} of {employees.length}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>{page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</button></div></div>}
      </section>

      {modalOpen && <div className="performance-modal-backdrop" onClick={() => !saving && setModalOpen(false)}>
        <section className="performance-modal employee-form-modal" role="dialog" aria-modal="true" aria-labelledby="employee-form-title" onClick={(event) => event.stopPropagation()}>
          <div className="performance-modal-header"><div><span className="performance-eyebrow">EMPLOYEE PROFILE</span><h2 id="employee-form-title">{editing ? "Edit employee" : "Add employee"}</h2></div><button type="button" aria-label="Close form" onClick={() => setModalOpen(false)}><X size={19} /></button></div>
          {error && <div className="performance-alert error">{error}</div>}
          <form onSubmit={saveEmployee}>
            <div className="employee-form-grid">
              <label>Full name<input required value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
              <label>Email<input required type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
              <label>Employee ID<input value={form.employeeId} disabled={Boolean(editing)} placeholder="Auto-generated if blank" onChange={(event) => updateField("employeeId", event.target.value)} /></label>
              <label>Department<select value={form.department} onChange={(event) => updateField("department", event.target.value)}>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Position<input required value={form.position} onChange={(event) => updateField("position", event.target.value)} /></label>
              <label>Joining date<input required type="date" value={form.joiningDate} onChange={(event) => updateField("joiningDate", event.target.value)} /></label>
              <label>Status<select value={form.status} onChange={(event) => updateField("status", event.target.value as EmployeeForm["status"])}><option>Active</option><option>Inactive</option></select></label>
            </div>
            <div className="employee-metric-inputs"><h3>Performance metrics <span>0–100 scale</span></h3><p>Task completion is calculated from assigned tasks whenever the employee has tasks.</p>{metricFields.map(([key, label]) => <label key={key}>{label}<input required type="number" min="0" max="100" step="0.1" value={form[key]} disabled={key === "taskCompletion" && Boolean(editing && Number(editing.assignedTaskCount || 0) > 0)} onChange={(event) => updateField(key, event.target.value)} /></label>)}</div>
            <div className="performance-score-explainer">Overall performance is calculated automatically as the equally weighted average of attendance, productivity, task completion, quality, and teamwork.</div>
            <div className="performance-modal-actions"><button type="button" className="performance-secondary-button" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="performance-primary-button" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add employee"}</button></div>
          </form>
        </section>
      </div>}
    </PerformanceLayout>
  );
}
