import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { performanceRequest } from "../../lib/performanceApi";
import type { AnalyticsOverview, Employee } from "../../lib/performanceApi";
import "../Employees/performance.css";

const COLORS = ["#2563eb", "#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

export default function Analytics() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [department, setDepartment] = useState("All");
  const [employeeId, setEmployeeId] = useState("All");
  const [period, setPeriod] = useState("6");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    performanceRequest<{ employees: Employee[] }>("/employees")
      .then((data) => setEmployees(data.employees))
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  useEffect(() => {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (department !== "All") params.set("department", department);
    if (employeeId !== "All") params.set("employeeId", employeeId);
    performanceRequest<AnalyticsOverview>(`/analytics/overview?${params.toString()}`)
      .then(setOverview)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [department, employeeId]);

  const months = useMemo(() => overview?.monthlyPerformance.slice(-Number(period)) || [], [overview, period]);

  return <PerformanceLayout>
    <div className="performance-page-header"><div><span className="performance-eyebrow">PEOPLE ANALYTICS</span><h1>Analytics</h1><p>Compare performance signals and review trends across your organization.</p></div></div>
    <section className="performance-panel analytics-filters">
      <label>Period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="3">Last 3 months</option><option value="6">Last 6 months</option></select></label>
      <label>Department<select value={department} onChange={(event) => { setDepartment(event.target.value); setEmployeeId("All"); }}><option value="All">All departments</option>{[...new Set(employees.map((item) => item.department))].sort().map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Employee<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="All">All employees</option>{employees.filter((item) => department === "All" || item.department === department).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <span className="analytics-filter-note">Monthly histories cover the seeded and recorded reporting period.</span>
    </section>

    {error && <div className="performance-alert error">{error}</div>}
    {loading ? <div className="performance-panel performance-loading">Calculating analytics…</div> : overview && <>
      <section className="analytics-summary-row">
        <div className="performance-metric-card"><span>Employees in view</span><strong>{overview.summary.totalEmployees}</strong></div>
        <div className="performance-metric-card"><span>Average performance</span><strong>{overview.summary.averagePerformance.toFixed(1)}<small>/100</small></strong></div>
        <div className="performance-metric-card"><span>Average productivity</span><strong>{overview.summary.averageProductivity.toFixed(1)}<small>/100</small></strong></div>
        <div className="performance-metric-card"><span>Average attendance</span><strong>{overview.summary.averageAttendance.toFixed(1)}<small>/100</small></strong></div>
      </section>

      <div className="analytics-chart-grid">
        <section className="performance-panel analytics-chart-card analytics-chart-wide"><div className="performance-panel-heading"><div><h2>Monthly performance</h2><p>Organization average by month.</p></div></div><div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={months}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Line type="monotone" dataKey="performance" name="Performance" stroke="#2563eb" strokeWidth={3} /><Line type="monotone" dataKey="productivity" name="Productivity" stroke="#14b8a6" strokeWidth={2} /><Line type="monotone" dataKey="attendance" name="Attendance" stroke="#f59e0b" strokeWidth={2} /></LineChart></ResponsiveContainer></div></section>
        <section className="performance-panel analytics-chart-card"><div className="performance-panel-heading"><div><h2>Department performance</h2><p>Average score by department.</p></div></div><div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.departmentPerformance}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="department" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="performance" name="Performance" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
        <section className="performance-panel analytics-chart-card"><div className="performance-panel-heading"><div><h2>Productivity trend</h2><p>Monthly average productivity score.</p></div></div><div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={months}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="productivity" name="Productivity" stroke="#14b8a6" strokeWidth={3} /></LineChart></ResponsiveContainer></div></section>
        <section className="performance-panel analytics-chart-card"><div className="performance-panel-heading"><div><h2>Attendance trend</h2><p>Monthly average attendance score.</p></div></div><div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={months}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="attendance" name="Attendance" stroke="#f59e0b" strokeWidth={3} /></LineChart></ResponsiveContainer></div></section>
        <section className="performance-panel analytics-chart-card"><div className="performance-panel-heading"><div><h2>Task completion & quality</h2><p>Monthly average metric scores.</p></div></div><div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={months}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Line type="monotone" dataKey="taskCompletion" name="Task completion" stroke="#8b5cf6" strokeWidth={2.5} /><Line type="monotone" dataKey="qualityScore" name="Quality" stroke="#ec4899" strokeWidth={2.5} /></LineChart></ResponsiveContainer></div></section>
        <section className="performance-panel analytics-chart-card"><div className="performance-panel-heading"><div><h2>Employee distribution</h2><p>Employees by department.</p></div></div><div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={overview.departmentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label>{overview.departmentDistribution.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></section>
        <section className="performance-panel analytics-chart-card analytics-chart-wide"><div className="performance-panel-heading"><div><h2>Attendance vs productivity</h2><p>Each point represents an employee; hover for details.</p></div></div><div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 10, right: 18, bottom: 12, left: 4 }}><CartesianGrid /><XAxis type="number" dataKey="attendance" name="Attendance" domain={[0, 100]} /><YAxis type="number" dataKey="productivity" name="Productivity" domain={[0, 100]} /><ZAxis type="number" dataKey="performanceScore" range={[60, 180]} name="Performance" /><Tooltip cursor={{ strokeDasharray: "3 3" }} /><Scatter data={overview.attendanceProductivity} fill="#2563eb" /></ScatterChart></ResponsiveContainer></div></section>
      </div>
    </>}
  </PerformanceLayout>;
}
