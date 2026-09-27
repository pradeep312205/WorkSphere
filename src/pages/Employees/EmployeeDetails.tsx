import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PerformanceLayout from "../../components/layout/PerformanceLayout";
import { performanceRequest, scoreLabel } from "../../lib/performanceApi";
import type { Employee } from "../../lib/performanceApi";
import "./performance.css";

interface InsightResponse { insights: string; source: "openai" | "local"; }

export default function EmployeeDetails() {
  const { id = "" } = useParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState("");
  const [insightSource, setInsightSource] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");

  useEffect(() => {
    performanceRequest<{ employee: Employee }>(`/employees/${encodeURIComponent(id)}`)
      .then(({ employee: record }) => setEmployee(record))
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);

  const generateInsights = async () => {
    setInsightLoading(true); setInsightError("");
    try {
      const result = await performanceRequest<InsightResponse>("/ai/insights", { method: "POST", body: JSON.stringify({ employeeId: id }) });
      setInsights(result.insights); setInsightSource(result.source);
    } catch (requestError) { setInsightError(requestError instanceof Error ? requestError.message : "Could not generate insights."); }
    finally { setInsightLoading(false); }
  };

  return <PerformanceLayout>
    {loading ? <div className="performance-loading">Loading employee profile…</div> : error || !employee ? <div className="performance-alert error">{error || "Employee profile not found."}</div> : <>
      <div className="performance-page-header employee-details-header">
        <div><Link className="performance-back-link" to="/employees"><ArrowLeft size={16} /> All employees</Link><span className="performance-eyebrow">EMPLOYEE PROFILE · {employee.employeeId}</span><h1>{employee.name}</h1><p>{employee.position} · {employee.department}</p></div>
        <span className={`employee-status ${employee.status.toLowerCase()}`}>{employee.status}</span>
      </div>

      <section className="employee-detail-score-row">
        <div className="employee-overall-card"><span>Overall performance</span><strong>{Number(employee.performanceScore).toFixed(1)}<small>/100</small></strong><span className={`score-descriptor ${Number(employee.performanceScore) < 75 ? "low" : ""}`}>{scoreLabel(Number(employee.performanceScore))}</span><small>Calculated equally from five performance metrics</small></div>
        {[
          ["Productivity", employee.productivity], ["Attendance", employee.attendance], ["Task completion", employee.taskCompletion], ["Quality", employee.qualityScore], ["Teamwork", employee.teamworkScore],
        ].map(([label, score]) => <div className="performance-metric-card" key={String(label)}><span>{label}</span><strong>{Number(score).toFixed(0)}<small>/100</small></strong><div className="metric-progress"><span style={{ width: `${Math.max(0, Math.min(100, Number(score)))}%` }} /></div>{label === "Task completion" && <small>{employee.assignedTaskCount ? `${employee.completedTaskCount || 0} of ${employee.assignedTaskCount} assigned tasks completed` : "No assigned tasks yet; using the saved manual score"}</small>}</div>)}
      </section>

      <section className="performance-panel employee-history-panel">
        <div className="performance-panel-heading"><div><h2>Performance history</h2><p>Monthly scores from the employee performance record.</p></div></div>
        {!employee.monthlyPerformance?.length ? <div className="performance-empty">No monthly history has been recorded.</div> : <div className="performance-chart employee-history-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={employee.monthlyPerformance}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="performanceScore" name="Performance" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} /><Line type="monotone" dataKey="productivity" name="Productivity" stroke="#14b8a6" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="attendance" name="Attendance" stroke="#f59e0b" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>}
      </section>

      <section className="performance-panel employee-ai-insights">
        <div className="performance-panel-heading"><div className="ai-section-title"><span className="ai-icon"><Sparkles size={19} /></span><div><h2>AI performance insights</h2><p>Generated from this employee’s recorded performance data.</p></div></div><button className="performance-primary-button" type="button" disabled={insightLoading} onClick={() => void generateInsights()}><Sparkles size={16} /> {insightLoading ? "Analyzing…" : insights ? "Refresh insights" : "Generate insights"}</button></div>
        {insightError && <div className="performance-alert error">{insightError}</div>}
        {insights ? <div className="ai-insight-copy"><span className="ai-source-badge">{insightSource === "openai" ? "AI-generated" : "Data-based fallback"}</span>{insights.split(/\n+/).map((line, index) => line.trim() ? <p key={index}>{line}</p> : null)}</div> : <div className="performance-empty">Generate a data-backed summary of strengths, trends, and coaching opportunities.</div>}
      </section>
    </>}
  </PerformanceLayout>;
}
