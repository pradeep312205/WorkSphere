const SAMPLE_EMPLOYEES = [
  ["EMP-1001", "Aarav Mehta", "aarav.mehta@example.test", "Engineering", "Senior Software Engineer", "2021-04-12", 95, 91, 94, 92, 90, "Active", 2],
  ["EMP-1002", "Nisha Kapoor", "nisha.kapoor@example.test", "Engineering", "Product Engineer", "2022-08-03", 92, 88, 90, 93, 91, "Active", 1],
  ["EMP-1003", "Rohan Iyer", "rohan.iyer@example.test", "Engineering", "QA Engineer", "2020-02-18", 88, 82, 86, 90, 87, "Active", -3],
  ["EMP-1004", "Maya Chen", "maya.chen@example.test", "Engineering", "Engineering Lead", "2019-11-04", 97, 94, 91, 96, 95, "Active", 3],
  ["EMP-1005", "Liam Brooks", "liam.brooks@example.test", "Marketing", "Content Strategist", "2023-01-16", 93, 89, 87, 90, 92, "Active", 4],
  ["EMP-1006", "Sara Haddad", "sara.haddad@example.test", "Marketing", "Campaign Manager", "2021-06-21", 90, 92, 91, 88, 94, "Active", 1],
  ["EMP-1007", "Dev Patel", "dev.patel@example.test", "Marketing", "Marketing Analyst", "2024-03-11", 86, 84, 82, 88, 85, "Active", -5],
  ["EMP-1008", "Noah Williams", "noah.williams@example.test", "Sales", "Account Executive", "2022-05-09", 91, 96, 89, 90, 93, "Active", 2],
  ["EMP-1009", "Isha Nair", "isha.nair@example.test", "Sales", "Sales Operations Analyst", "2020-09-14", 96, 90, 95, 92, 91, "Active", 3],
  ["EMP-1010", "Elena Garcia", "elena.garcia@example.test", "Sales", "Customer Success Manager", "2023-07-24", 89, 87, 84, 91, 90, "Active", -2],
  ["EMP-1011", "Omar Farouk", "omar.farouk@example.test", "HR", "People Operations Partner", "2021-02-01", 98, 86, 90, 93, 97, "Active", 2],
  ["EMP-1012", "Priya Das", "priya.das@example.test", "HR", "Recruiter", "2024-01-08", 93, 90, 92, 89, 94, "Active", 5],
  ["EMP-1013", "Ethan Reed", "ethan.reed@example.test", "Finance", "Financial Analyst", "2020-12-07", 96, 92, 94, 97, 88, "Active", 1],
  ["EMP-1014", "Zoya Khan", "zoya.khan@example.test", "Finance", "Payroll Specialist", "2022-10-17", 94, 85, 88, 95, 93, "Active", -4],
  ["EMP-1015", "Lucas Martin", "lucas.martin@example.test", "Finance", "Finance Associate", "2025-02-10", 87, 89, 86, 90, 88, "Active", 3],
];

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const clamp = (value) => Math.max(0, Math.min(100, value));

function monthlyHistory(employee, index) {
  const [, , , , , , attendance, productivity, taskCompletion, qualityScore, teamworkScore, , trend] = employee;
  const offsets = [-5, -3, -1, 0, 2, trend];
  return MONTHS.map((month, monthIndex) => {
    const offset = offsets[monthIndex];
    const variation = offset + ((index + monthIndex) % 3 - 1);
    const metrics = {
      attendance: clamp(attendance + variation),
      productivity: clamp(productivity + variation),
      taskCompletion: clamp(taskCompletion + variation),
      qualityScore: clamp(qualityScore + variation),
      teamworkScore: clamp(teamworkScore + variation),
    };
    return {
      month,
      ...metrics,
      performanceScore: Number(Object.values(metrics).reduce((sum, value) => sum + value, 0).toFixed(2)) / 5,
    };
  });
}

function seedEmployees(db, ownerUserId, callback = () => {}) {
  if (!Number.isInteger(Number(ownerUserId)) || Number(ownerUserId) <= 0) return callback(new Error("A valid account ID is required to seed demo employees."));
  db.query("SELECT COUNT(*) AS total FROM employees WHERE owner_user_id = ?", [ownerUserId], (countError, rows) => {
    if (countError) return callback(countError);
    if (Number(rows[0].total) > 0) return callback(null, { inserted: 0 });

    const sql = `INSERT INTO employees
      (owner_user_id, employee_id, name, email, department, position, joining_date, status, attendance, productivity, task_completion, quality_score, teamwork_score, monthly_performance)
      VALUES ?`;
    const values = SAMPLE_EMPLOYEES.map((employee, index) => {
      const [employeeId, name, email, department, position, joiningDate, attendance, productivity, taskCompletion, qualityScore, teamworkScore, status] = employee;
      return [ownerUserId, employeeId, name, email, department, position, joiningDate, status, attendance, productivity, taskCompletion, qualityScore, teamworkScore, JSON.stringify(monthlyHistory(employee, index))];
    });
    db.query(sql, [values], (insertError) => {
      if (insertError) return callback(insertError);
      console.log(`Seeded ${values.length} fictional employee performance profiles.`);
      return callback(null, { inserted: values.length });
    });
  });
}

module.exports = { SAMPLE_EMPLOYEES, seedEmployees };
