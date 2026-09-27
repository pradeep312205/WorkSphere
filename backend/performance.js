const ASSIGNED_TASK_COMPLETION = `COALESCE(
  (SELECT ROUND(100 * SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) / COUNT(*), 1)
   FROM tasks t WHERE t.assignee_employee_id = employees.id AND t.owner_user_id = employees.owner_user_id),
  employees.task_completion
)`;

const EMPLOYEE_FIELDS = `
  id, employee_id AS employeeId, name, email, department, position,
  joining_date AS joiningDate, status, attendance, productivity,
  ${ASSIGNED_TASK_COMPLETION} AS taskCompletion, quality_score AS qualityScore,
  teamwork_score AS teamworkScore,
  ROUND((attendance + productivity + ${ASSIGNED_TASK_COMPLETION} + quality_score + teamwork_score) / 5, 1) AS performanceScore,
  (SELECT COUNT(*) FROM tasks t WHERE t.assignee_employee_id = employees.id AND t.owner_user_id = employees.owner_user_id) AS assignedTaskCount,
  (SELECT COUNT(*) FROM tasks t WHERE t.assignee_employee_id = employees.id AND t.owner_user_id = employees.owner_user_id AND t.status = 'Completed') AS completedTaskCount,
  monthly_performance AS monthlyPerformance, created_at AS createdAt,
  updated_at AS updatedAt`;

const clampScore = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
const average = (values) => values.length ? Number((values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length).toFixed(1)) : 0;

function readMonthly(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

function withNormalizedHistory(employee) {
  return { ...employee, monthlyPerformance: readMonthly(employee.monthlyPerformance) };
}

function initializePerformanceSchema(db, callback) {
  db.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT NOT NULL AUTO_INCREMENT,
      owner_user_id INT NULL,
      employee_id VARCHAR(40) NOT NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL,
      department VARCHAR(100) NOT NULL,
      position VARCHAR(120) NOT NULL,
      joining_date DATE NOT NULL,
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      attendance DECIMAL(5,2) NOT NULL DEFAULT 0,
      productivity DECIMAL(5,2) NOT NULL DEFAULT 0,
      task_completion DECIMAL(5,2) NOT NULL DEFAULT 0,
      quality_score DECIMAL(5,2) NOT NULL DEFAULT 0,
      teamwork_score DECIMAL(5,2) NOT NULL DEFAULT 0,
      performance_score DECIMAL(5,2) GENERATED ALWAYS AS (
        (attendance + productivity + task_completion + quality_score + teamwork_score) / 5
      ) STORED,
      monthly_performance JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_employee_owner_employee_id (owner_user_id, employee_id),
      UNIQUE KEY uq_employee_owner_email (owner_user_id, email),
      KEY idx_employee_owner (owner_user_id),
      KEY idx_employees_department (department),
      KEY idx_employees_performance (performance_score)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `, (err) => {
    if (err) return callback(err);
    ensureEmployeeOwnershipSchema(db, callback);
  });
}

function ensureEmployeeOwnershipSchema(db, callback) {
  db.query("SHOW COLUMNS FROM employees LIKE 'owner_user_id'", (columnErr, columns) => {
    if (columnErr) return callback(columnErr);
    const ensureIndexesAndScope = () => {
      db.query("SHOW INDEX FROM employees", (indexErr, indexes) => {
        if (indexErr) return callback(indexErr);
        const names = new Set(indexes.map((index) => index.Key_name));
        const alter = [];
        if (names.has("uq_employees_employee_id")) alter.push("DROP INDEX uq_employees_employee_id");
        if (names.has("uq_employees_email")) alter.push("DROP INDEX uq_employees_email");
        if (!names.has("uq_employee_owner_employee_id")) alter.push("ADD UNIQUE KEY uq_employee_owner_employee_id (owner_user_id, employee_id)");
        if (!names.has("uq_employee_owner_email")) alter.push("ADD UNIQUE KEY uq_employee_owner_email (owner_user_id, email)");
        if (!names.has("idx_employee_owner")) alter.push("ADD KEY idx_employee_owner (owner_user_id)");
        if (alter.length) {
          db.query(`ALTER TABLE employees ${alter.join(", ")}`, (alterErr) => alterErr ? callback(alterErr) : migrateLegacyEmployees());
        } else migrateLegacyEmployees();
      });
    };
    const migrateLegacyEmployees = () => {
      db.query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'owner_user_id' AND REFERENCED_TABLE_NAME = 'users'", (fkErr, constraints) => {
        if (fkErr) return callback(fkErr);
        const attachOwnerFk = () => {
          db.query("UPDATE employees e JOIN users u ON LOWER(u.email) = LOWER(e.email) SET e.owner_user_id = u.id WHERE e.owner_user_id IS NULL", (ownerErr) => {
            if (ownerErr) return callback(ownerErr);
            // Remove only the known fictional seed set from earlier builds.
            db.query("DELETE FROM employees WHERE employee_id IN ('EMP-1001','EMP-1002','EMP-1003','EMP-1004','EMP-1005','EMP-1006','EMP-1007','EMP-1008','EMP-1009','EMP-1010','EMP-1011','EMP-1012','EMP-1013','EMP-1014','EMP-1015') AND email LIKE '%@example.test'", (seedErr, deleteResult) => callback(seedErr, { removedDemoEmployees: deleteResult?.affectedRows || 0 }));
          });
        };
        if (constraints.length) return attachOwnerFk();
        db.query("ALTER TABLE employees ADD CONSTRAINT fk_employees_owner_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE", (fkAlterErr) => fkAlterErr ? callback(fkAlterErr) : attachOwnerFk());
      });
    };
    if (columns.length) return ensureIndexesAndScope();
    db.query("ALTER TABLE employees ADD COLUMN owner_user_id INT NULL AFTER id", (alterErr) => alterErr ? callback(alterErr) : ensureIndexesAndScope());
  });
}

function queryEmployees(db, userId, where, params, callback) {
  const conditions = where ? where.replace(/^WHERE\s+/i, "") : "";
  const scopedWhere = conditions ? `WHERE owner_user_id = ? AND ${conditions}` : "WHERE owner_user_id = ?";
  db.query(`SELECT ${EMPLOYEE_FIELDS} FROM employees ${scopedWhere} ORDER BY performanceScore DESC, name ASC`, [userId, ...params], (err, rows) => {
    if (err) return callback(err);
    return callback(null, rows.map(withNormalizedHistory));
  });
}

function computeAnalytics(employees) {
  const sorted = [...employees].sort((a, b) => Number(b.performanceScore) - Number(a.performanceScore));
  const scores = employees.map((employee) => Number(employee.performanceScore));
  const averagePerformance = average(scores);
  const monthlyBuckets = new Map();
  const departments = new Map();
  const distribution = new Map();
  const declining = [];

  employees.forEach((employee) => {
    const department = employee.department || "Other";
    const aggregate = departments.get(department) || { department, employees: 0, performance: [], productivity: [], attendance: [], taskCompletion: [], qualityScore: [] };
    aggregate.employees += 1;
    aggregate.performance.push(Number(employee.performanceScore));
    aggregate.productivity.push(Number(employee.productivity));
    aggregate.attendance.push(Number(employee.attendance));
    aggregate.taskCompletion.push(Number(employee.taskCompletion));
    aggregate.qualityScore.push(Number(employee.qualityScore));
    departments.set(department, aggregate);
    distribution.set(department, (distribution.get(department) || 0) + 1);

    const history = readMonthly(employee.monthlyPerformance);
    history.forEach((month) => {
      const bucket = monthlyBuckets.get(month.month) || { month: month.month, performance: [], productivity: [], attendance: [], taskCompletion: [], qualityScore: [] };
      bucket.performance.push(Number(month.performanceScore));
      bucket.productivity.push(Number(month.productivity));
      bucket.attendance.push(Number(month.attendance));
      bucket.taskCompletion.push(Number(month.taskCompletion));
      bucket.qualityScore.push(Number(month.qualityScore));
      monthlyBuckets.set(month.month, bucket);
    });
    if (history.length >= 2) {
      const delta = Number(history.at(-1).performanceScore) - Number(history.at(-2).performanceScore);
      if (delta <= -3) declining.push({ name: employee.name, department, performanceScore: Number(employee.performanceScore), trendDelta: Number(delta.toFixed(1)) });
    }
  });

  const departmentsData = [...departments.values()].map((item) => ({
    department: item.department,
    employees: item.employees,
    performance: average(item.performance),
    productivity: average(item.productivity),
    attendance: average(item.attendance),
    taskCompletion: average(item.taskCompletion),
    qualityScore: average(item.qualityScore),
  })).sort((a, b) => b.performance - a.performance);

  const monthlyPerformance = [...monthlyBuckets.values()].map((item) => ({
    month: item.month,
    performance: average(item.performance),
    productivity: average(item.productivity),
    attendance: average(item.attendance),
    taskCompletion: average(item.taskCompletion),
    qualityScore: average(item.qualityScore),
  }));

  return {
    summary: {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((employee) => employee.status === "Active").length,
      averagePerformance,
      averageProductivity: average(employees.map((employee) => employee.productivity)),
      averageAttendance: average(employees.map((employee) => employee.attendance)),
      topPerformer: sorted[0] || null,
      needingAttention: employees.filter((employee) => Number(employee.performanceScore) < 75).length,
      decliningEmployees: declining,
    },
    performanceByEmployee: sorted.map((employee) => ({ id: employee.id, employeeId: employee.employeeId, name: employee.name, department: employee.department, performanceScore: Number(employee.performanceScore) })),
    departmentPerformance: departmentsData,
    monthlyPerformance,
    departmentDistribution: [...distribution.entries()].map(([name, value]) => ({ name, value })),
    attendanceProductivity: employees.map((employee) => ({ name: employee.name, department: employee.department, attendance: Number(employee.attendance), productivity: Number(employee.productivity), performanceScore: Number(employee.performanceScore) })),
    employees: employees.map(({ monthlyPerformance, ...employee }) => ({ ...employee, performanceScore: Number(employee.performanceScore), attendance: Number(employee.attendance), productivity: Number(employee.productivity), taskCompletion: Number(employee.taskCompletion), qualityScore: Number(employee.qualityScore), teamworkScore: Number(employee.teamworkScore) })),
  };
}

function validateEmployee(body) {
  const requiredText = ["name", "email", "department", "position", "joiningDate"];
  for (const key of requiredText) {
    if (typeof body[key] !== "string" || !body[key].trim()) return `${key} is required.`;
  }
  if (!/^\S+@\S+\.\S+$/.test(body.email.trim())) return "Enter a valid email address.";
  if (body.status !== undefined && !["Active", "Inactive"].includes(body.status)) return "Status must be Active or Inactive.";
  const metrics = ["attendance", "productivity", "taskCompletion", "qualityScore", "teamworkScore"];
  for (const key of metrics) if (!clampScore(body[key])) return `${key} must be between 0 and 100.`;
  return null;
}

function fallbackChat(question, analytics) {
  const summary = analytics.summary;
  const department = analytics.departmentPerformance;
  const lower = question.toLowerCase().trim().replace(/[!?.,]+$/g, "");
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)( there)?$/.test(lower)) {
    return "Hi! I can help you explore the employee performance data. Ask me about top performers, team trends, attendance, productivity, department comparisons, or a named employee.";
  }
  if (/what can you do|how can you help|what do you do|capabilit|^help$/.test(lower)) {
    return "I can summarize employee performance, list top performers, compare department averages, find employees with declining monthly scores, report attendance or productivity averages, and explain an individual employee’s five metrics. Try: “Which department has the highest average performance?”";
  }
  if (/^(thanks|thank you|thx)( so much)?$/.test(lower)) return "You’re welcome. Ask me another question about the employee data whenever you’re ready.";
  if (/\b(task|project) status\b/.test(lower)) {
    return "I can analyze employee performance metrics here, but WorkSphere tasks are not linked to employee profiles yet. Task status currently comes from the task record, so I can’t reliably infer whether someone has started or completed a task without task activity or assignee data.";
  }
  const named = analytics.employees.find((employee) => lower.includes(employee.name.toLowerCase()));
  if (named && /attendance/.test(lower)) return `${named.name}’s attendance score is ${named.attendance}/100.`;
  if (named && /productiv/.test(lower)) return `${named.name}’s productivity score is ${named.productivity}/100.`;
  if (named && /task|completion/.test(lower)) return `${named.name}’s task completion score is ${named.taskCompletion}/100.`;
  if (named && /quality/.test(lower)) return `${named.name}’s quality score is ${named.qualityScore}/100.`;
  if (named && /teamwork/.test(lower)) return `${named.name}’s teamwork score is ${named.teamworkScore}/100.`;
  if (named && /trend|improv|declin|month/.test(lower)) {
    const history = readMonthly(named.monthlyPerformance);
    const previous = history.at(-2);
    const latest = history.at(-1);
    return previous && latest ? `${named.name}’s performance moved from ${Number(previous.performanceScore).toFixed(1)} in ${previous.month} to ${Number(latest.performanceScore).toFixed(1)} in ${latest.month} (${(Number(latest.performanceScore) - Number(previous.performanceScore) >= 0 ? "+" : "")}${(Number(latest.performanceScore) - Number(previous.performanceScore)).toFixed(1)} points).` : `There is not enough monthly history to describe ${named.name}’s trend.`;
  }
  if (named) return `${named.name} in ${named.department} has a calculated performance score of ${named.performanceScore.toFixed(1)}/100. Attendance is ${named.attendance}, productivity ${named.productivity}, task completion ${named.taskCompletion}, quality ${named.qualityScore}, and teamwork ${named.teamworkScore}.`;
  if (lower.includes("top") || lower.includes("highest performance")) {
    const top = analytics.performanceByEmployee.slice(0, 5);
    return top.length ? `Top performers by calculated score: ${top.map((employee, index) => `${index + 1}. ${employee.name} (${employee.department}) — ${employee.performanceScore.toFixed(1)}`).join("; ")}.` : "There are no employee records to compare yet.";
  }
  if (lower.includes("department") && (lower.includes("highest") || lower.includes("best") || lower.includes("average"))) {
    const best = department[0];
    return best ? `${best.department} has the highest department average performance at ${best.performance.toFixed(1)} across ${best.employees} employees. The calculation uses the five weighted performance metrics.` : "There are no department records to compare yet.";
  }
  if (lower.includes("declin") || lower.includes("drop") || lower.includes("trend")) {
    const list = summary.decliningEmployees;
    return list.length ? `These employees' latest monthly scores fell by at least 3 points from the prior month: ${list.map((employee) => `${employee.name} (${employee.department}, ${employee.trendDelta.toFixed(1)} points)`).join(", ")}. Review context with each employee before drawing conclusions.` : "No employee has a month-over-month decline of 3 or more points in the current sample history.";
  }
  if (lower.includes("attendance")) return `Average attendance is ${summary.averageAttendance.toFixed(1)} across ${summary.totalEmployees} employees.`;
  if (lower.includes("productivity")) return `Average productivity is ${summary.averageProductivity.toFixed(1)} across ${summary.totalEmployees} employees.`;
  if (/task completion|completion rate/.test(lower)) return `Average task completion is ${average(analytics.employees.map((employee) => employee.taskCompletion)).toFixed(1)} across ${summary.totalEmployees} employees.`;
  if (/\bquality\b/.test(lower)) return `Average quality score is ${average(analytics.employees.map((employee) => employee.qualityScore)).toFixed(1)} across ${summary.totalEmployees} employees.`;
  if (/\bteamwork\b/.test(lower)) return `Average teamwork score is ${average(analytics.employees.map((employee) => employee.teamworkScore)).toFixed(1)} across ${summary.totalEmployees} employees.`;
  if (/\b(summary|summari[sz]e|overall|overview)\b/.test(lower)) return `There are ${summary.totalEmployees} employees with an average performance score of ${summary.averagePerformance.toFixed(1)}. Average productivity is ${summary.averageProductivity.toFixed(1)} and attendance is ${summary.averageAttendance.toFixed(1)}. ${summary.needingAttention} employee(s) score below 75. The top performer is ${summary.topPerformer ? `${summary.topPerformer.name} at ${Number(summary.topPerformer.performanceScore).toFixed(1)}` : "not available"}.`;
  return "I’m not sure which metric you mean. I can answer questions about performance scores, attendance, productivity, task completion, quality, teamwork, department averages, and monthly trends. Ask about a named employee or try “Give me a summary of employee performance.”";
}

async function askOpenAI(systemPrompt, userPrompt, fallback) {
  if (!process.env.OPENAI_API_KEY) return { text: fallback, source: "local" };
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status}).`);
    const payload = await response.json();
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned an empty answer.");
    return { text, source: "openai" };
  } catch (error) {
    console.warn("AI provider unavailable; using local response:", error.message);
    return { text: fallback, source: "local" };
  }
}

function registerPerformanceRoutes(app, db, authenticateToken) {
  app.get("/api/employees", authenticateToken, (req, res) => {
    const conditions = [];
    const params = [];
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const department = typeof req.query.department === "string" ? req.query.department.trim() : "";
    if (department && department !== "All") { conditions.push("department = ?"); params.push(department); }
    if (search) {
      conditions.push("(name LIKE ? OR email LIKE ? OR employee_id LIKE ? OR position LIKE ? OR department LIKE ?)");
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      queryEmployees(db, req.user.id, where, params, (err, employees) => {
      if (err) return res.status(500).json({ message: "Failed to load employees." });
      return res.json({ employees, total: employees.length, departments: [...new Set(employees.map((employee) => employee.department))].sort() });
    });
  });

  app.get("/api/employees/:id", authenticateToken, (req, res) => {
    db.query(`SELECT ${EMPLOYEE_FIELDS} FROM employees WHERE owner_user_id = ? AND (id = ? OR employee_id = ?) LIMIT 1`, [req.user.id, req.params.id, req.params.id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Failed to load employee." });
      if (!rows.length) return res.status(404).json({ message: "Employee not found." });
      return res.json({ employee: withNormalizedHistory(rows[0]) });
    });
  });

  app.post("/api/employees", authenticateToken, (req, res) => {
    const error = validateEmployee(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const employeeId = typeof req.body.employeeId === "string" && req.body.employeeId.trim()
      ? req.body.employeeId.trim()
      : `EMP-${Date.now().toString().slice(-8)}`;
    const history = Array.isArray(req.body.monthlyPerformance) ? JSON.stringify(req.body.monthlyPerformance) : JSON.stringify([]);
    const values = [req.user.id, employeeId, req.body.name.trim(), req.body.email.trim().toLowerCase(), req.body.department.trim(), req.body.position.trim(), req.body.joiningDate, req.body.status || "Active", Number(req.body.attendance), Number(req.body.productivity), Number(req.body.taskCompletion), Number(req.body.qualityScore), Number(req.body.teamworkScore), history];
    db.query(`INSERT INTO employees (owner_user_id, employee_id, name, email, department, position, joining_date, status, attendance, productivity, task_completion, quality_score, teamwork_score, monthly_performance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, values, (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Employee ID or email already exists." });
        console.error("CREATE EMPLOYEE ERROR:", err);
        return res.status(500).json({ message: "Failed to create employee." });
      }
      db.query(`SELECT ${EMPLOYEE_FIELDS} FROM employees WHERE id = ? AND owner_user_id = ?`, [result.insertId, req.user.id], (readErr, rows) => {
        if (readErr || !rows.length) return res.status(201).json({ message: "Employee added." });
        return res.status(201).json({ employee: withNormalizedHistory(rows[0]) });
      });
    });
  });

  app.put("/api/employees/:id", authenticateToken, (req, res) => {
    const error = validateEmployee(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const history = Array.isArray(req.body.monthlyPerformance) ? JSON.stringify(req.body.monthlyPerformance) : JSON.stringify([]);
    const values = [req.body.name.trim(), req.body.email.trim().toLowerCase(), req.body.department.trim(), req.body.position.trim(), req.body.joiningDate, req.body.status || "Active", Number(req.body.attendance), Number(req.body.productivity), Number(req.body.taskCompletion), Number(req.body.qualityScore), Number(req.body.teamworkScore), history, req.params.id, req.user.id];
    db.query(`UPDATE employees SET name=?, email=?, department=?, position=?, joining_date=?, status=?, attendance=?, productivity=?, task_completion=?, quality_score=?, teamwork_score=?, monthly_performance=? WHERE id=? AND owner_user_id=?`, values, (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "An employee with this email already exists." });
        return res.status(500).json({ message: "Failed to update employee." });
      }
      if (!result.affectedRows) return res.status(404).json({ message: "Employee not found." });
      db.query(`SELECT ${EMPLOYEE_FIELDS} FROM employees WHERE id = ? AND owner_user_id = ?`, [req.params.id, req.user.id], (readErr, rows) => {
        if (readErr || !rows.length) return res.json({ message: "Employee updated." });
        return res.json({ employee: withNormalizedHistory(rows[0]) });
      });
    });
  });

  app.delete("/api/employees/:id", authenticateToken, (req, res) => {
    db.query("DELETE FROM employees WHERE id = ? AND owner_user_id = ?", [req.params.id, req.user.id], (err, result) => {
      if (err) return res.status(500).json({ message: "Failed to delete employee." });
      if (!result.affectedRows) return res.status(404).json({ message: "Employee not found." });
      return res.json({ message: "Employee deleted." });
    });
  });

  app.get("/api/analytics/overview", authenticateToken, (req, res) => {
    const department = typeof req.query.department === "string" ? req.query.department.trim() : "";
    const employeeId = typeof req.query.employeeId === "string" ? req.query.employeeId.trim() : "";
    const conditions = [];
    const params = [];
    if (department && department !== "All") { conditions.push("department = ?"); params.push(department); }
    if (employeeId && employeeId !== "All") { conditions.push("id = ?"); params.push(employeeId); }
    queryEmployees(db, req.user.id, conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params, (err, employees) => {
      if (err) return res.status(500).json({ message: "Failed to calculate analytics." });
      return res.json(computeAnalytics(employees));
    });
  });

  app.get("/api/analytics/department", authenticateToken, (req, res) => {
    queryEmployees(db, req.user.id, "", [], (err, employees) => err ? res.status(500).json({ message: "Failed to calculate department analytics." }) : res.json({ departments: computeAnalytics(employees).departmentPerformance }));
  });

  app.get("/api/analytics/monthly", authenticateToken, (req, res) => {
    queryEmployees(db, req.user.id, "", [], (err, employees) => err ? res.status(500).json({ message: "Failed to calculate monthly analytics." }) : res.json({ months: computeAnalytics(employees).monthlyPerformance }));
  });

  app.post("/api/ai/chat", authenticateToken, async (req, res) => {
    const question = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 1500) : "";
    if (!question) return res.status(400).json({ message: "Enter a question for WorkSphere AI." });
    const normalizedQuestion = question.toLowerCase().trim().replace(/[!?.,]+$/g, "");
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)( there)?$/.test(normalizedQuestion)
      || /what can you do|how can you help|what do you do|capabilit|^help$/.test(normalizedQuestion)
      || /^(thanks|thank you|thx)( so much)?$/.test(normalizedQuestion)) {
      return res.json({ reply: fallbackChat(question, { summary: { totalEmployees: 0 }, departmentPerformance: [], performanceByEmployee: [], employees: [] }), source: "local" });
    }
    if (/\b(task|project) status\b/.test(normalizedQuestion)) return res.json({ reply: "I can analyze employee performance metrics here, but WorkSphere tasks are not linked to employee profiles yet. Task workflow status remains user-reported; the task page now automatically flags completed, upcoming, on-schedule, and overdue tasks from their status and due date.", source: "local" });
    queryEmployees(db, req.user.id, "", [], async (err, employees) => {
      if (err) return res.status(500).json({ message: "Employee data is unavailable." });
      const analytics = computeAnalytics(employees);
      const fallback = fallbackChat(question, analytics);
      const structured = {
        summary: analytics.summary,
        departments: analytics.departmentPerformance,
        employees: analytics.employees.map((employee) => ({
          name: employee.name, department: employee.department,
          performanceScore: employee.performanceScore, attendance: employee.attendance,
          productivity: employee.productivity, taskCompletion: employee.taskCompletion,
          qualityScore: employee.qualityScore, teamworkScore: employee.teamworkScore,
          monthlyPerformance: readMonthly(employees.find((row) => row.id === employee.id)?.monthlyPerformance),
        })),
      };
      const result = await askOpenAI(
        "You are WorkSphere AI Assistant. Answer only from the supplied employee analytics JSON. Do not invent employee statistics or facts. Numerical answers must match supplied values; if data is insufficient, say so. Give balanced, respectful, practical guidance and avoid making employment decisions.",
        `Question: ${question}\n\nEmployee analytics JSON:\n${JSON.stringify(structured)}`,
        fallback,
      );
      return res.json({ reply: result.text, source: result.source });
    });
  });

  app.post("/api/ai/insights", authenticateToken, async (req, res) => {
    const employeeId = typeof req.body?.employeeId === "string" ? req.body.employeeId.trim() : String(req.body?.employeeId || "");
    if (!employeeId) return res.status(400).json({ message: "An employee ID is required." });
    db.query(`SELECT ${EMPLOYEE_FIELDS} FROM employees WHERE owner_user_id = ? AND (id = ? OR employee_id = ?) LIMIT 1`, [req.user.id, employeeId, employeeId], async (err, rows) => {
      if (err) return res.status(500).json({ message: "Unable to calculate employee insights." });
      if (!rows.length) return res.status(404).json({ message: "Employee not found." });
      const employee = withNormalizedHistory(rows[0]);
      const history = employee.monthlyPerformance;
      const previous = history.at(-4);
      const latest = history.at(-1);
      const change = previous && latest ? Number((Number(latest.performanceScore) - Number(previous.performanceScore)).toFixed(1)) : 0;
      const metricValues = [
        ["attendance", Number(employee.attendance)], ["productivity", Number(employee.productivity)],
        ["task completion", Number(employee.taskCompletion)], ["quality", Number(employee.qualityScore)],
        ["teamwork", Number(employee.teamworkScore)],
      ];
      const strengths = metricValues.filter(([, score]) => score >= 90).map(([name]) => name);
      const improvements = metricValues.filter(([, score]) => score < 80).map(([name]) => name);
      const direction = change > 0 ? `increased by ${change} points` : change < 0 ? `decreased by ${Math.abs(change)} points` : "remained steady";
      const fallback = `${employee.name} has a calculated overall score of ${Number(employee.performanceScore).toFixed(1)}. Their score ${direction} over the last three months. ${strengths.length ? `Relative strengths are ${strengths.join(", ")}.` : "No metric currently reaches the 90-point strength threshold."} ${improvements.length ? `Metrics to review are ${improvements.join(", ")}; discuss support and context with the employee.` : "No metric is currently below 80."}`;
      const structured = {
        employee: employee.name, department: employee.department, position: employee.position,
        performanceScore: Number(employee.performanceScore), attendance: Number(employee.attendance),
        productivity: Number(employee.productivity), taskCompletion: Number(employee.taskCompletion),
        qualityScore: Number(employee.qualityScore), teamworkScore: Number(employee.teamworkScore),
        trend: history.map((month) => ({ month: month.month, performanceScore: Number(month.performanceScore), productivity: Number(month.productivity), attendance: Number(month.attendance), taskCompletion: Number(month.taskCompletion), qualityScore: Number(month.qualityScore) })),
      };
      const result = await askOpenAI(
        "You are WorkSphere AI. Write a concise, balanced employee performance summary with strengths, improvement areas, trend, and practical coaching recommendations. Use only the structured metrics provided; do not invent statistics, events, or causes. Treat scores as discussion signals, not employment decisions.",
        `Create performance insights from this employee data:\n${JSON.stringify(structured)}`,
        fallback,
      );
      return res.json({ insights: result.text, source: result.source, employee: { id: employee.id, name: employee.name, performanceScore: Number(employee.performanceScore) } });
    });
  });
}

module.exports = { initializePerformanceSchema, registerPerformanceRoutes, computeAnalytics };
