const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const db = require("./db");
const { initializePerformanceSchema, registerPerformanceRoutes } = require("./performance");

const app = express();

/* =====================================================
   CONFIGURATION
===================================================== */

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);


/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("This origin is not allowed by CORS."));
  },
}));
app.use(express.json());


/* =====================================================
   DOCUMENT UPLOAD CONFIGURATION
===================================================== */

const documentsUploadPath = path.join(
  process.env.UPLOADS_DIR || __dirname,
  "uploads",
  "documents"
);
const messageUploadsPath = path.join(process.env.UPLOADS_DIR || __dirname, "uploads", "messages");

// Create upload directory automatically
if (!fs.existsSync(documentsUploadPath)) {
  fs.mkdirSync(documentsUploadPath, {
    recursive: true,
  });
}
if (!fs.existsSync(messageUploadsPath)) {
  fs.mkdirSync(messageUploadsPath, { recursive: true });
}


// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentsUploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});


// Multer upload configuration
const uploadDocument = multer({
  storage: storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

const messageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, messageUploadsPath),
  filename: (_req, file, cb) => {
    const safeExtension = path.extname(file.originalname).replace(/[^.a-zA-Z0-9]/g, "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`);
  },
});

const uploadMessageAttachment = multer({
  storage: messageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      /^image\//,
      /^text\//,
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    const isAllowed = allowedTypes.some((type) =>
      type instanceof RegExp ? type.test(file.mimetype) : type === file.mimetype
    );
    if (!isAllowed) {
      const error = new Error("Attach an image, PDF, text, or Office document.");
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

const handleMessageUpload = (req, res, next) => {
  uploadMessageAttachment.single("attachment")(req, res, (err) => {
    if (!err) return next();
    const status = err instanceof multer.MulterError ? 400 : (err.status || 400);
    return res.status(status).json({ message: err.message || "File upload failed." });
  });
};


/* =====================================================
   BASIC TEST ROUTE
===================================================== */

app.get("/", (req, res) => {
  res.json({
    message: "WorkSphere backend is running",
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({ status: "ok" });
});


/* =====================================================
   REGISTER
===================================================== */

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const sql = `
      INSERT INTO users
      (name, email, password)
      VALUES (?, ?, ?)
    `;

    db.query(
      sql,
      [
        name.trim(),
        email.trim(),
        hashedPassword,
      ],
      (err, result) => {
        if (err) {
          console.error(
            "REGISTER ERROR:",
            err
          );

          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
              message: "Email already registered",
            });
          }

          return res.status(500).json({
            message: "Database error",
            error: err.message,
          });
        }

        console.log(
          "USER CREATED:",
          result.insertId
        );

        return res.status(201).json({
          message:
            "Account created successfully",
        });
      }
    );
  } catch (error) {
    console.error(
      "REGISTER SERVER ERROR:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});


/* =====================================================
   LOGIN
===================================================== */

app.post("/api/login", (req, res) => {
  const {
    email,
    password,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message:
        "Email and password are required",
    });
  }

  const sql = `
    SELECT
      id,
      name,
      email,
      password
    FROM users
    WHERE email = ?
  `;

  db.query(
    sql,
    [email.trim()],
    async (err, results) => {
      if (err) {
        console.error(
          "LOGIN DATABASE ERROR:",
          err
        );

        return res.status(500).json({
          message: "Database error",
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      const user = results[0];

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordMatch) {
        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
        },
        JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

      console.log(
        "LOGIN SUCCESS:",
        user.email
      );

      return res.status(200).json({
        message: "Login successful",

        token,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    }
  );
});


/* =====================================================
   JWT AUTHENTICATION
===================================================== */

function authenticateToken(
  req,
  res,
  next
) {
  const authHeader =
    req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message:
        "Access denied. No token provided.",
    });
  }

  const parts =
    authHeader.split(" ");

  if (
    parts.length !== 2 ||
    parts[0] !== "Bearer"
  ) {
    return res.status(401).json({
      message:
        "Invalid authorization format.",
    });
  }

  const token = parts[1];

  try {
    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    req.user = decoded;

    next();
  } catch (error) {
    console.error(
      "JWT ERROR:",
      error.message
    );

    return res.status(403).json({
      message:
        "Invalid or expired token.",
    });
  }
}

registerPerformanceRoutes(app, db, authenticateToken);


/* =====================================================
   UPDATE USER PROFILE
===================================================== */

app.get("/api/user", authenticateToken, (req, res) => {
  db.query("SELECT id, name, email FROM users WHERE id = ? LIMIT 1", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Could not load the signed-in profile." });
    if (!rows.length) return res.status(404).json({ message: "User not found." });
    return res.json({ user: rows[0] });
  });
});

app.put(
  "/api/user",
  authenticateToken,
  (req, res) => {
    const userId =
      req.user.id;

    const {
      name,
      email,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message:
          "Name and email are required",
      });
    }

    const sql = `
      UPDATE users
      SET
        name = ?,
        email = ?
      WHERE id = ?
    `;

    db.query(
      sql,
      [
        name.trim(),
        email.trim(),
        userId,
      ],
      (err) => {
        if (err) {
          console.error(
            "UPDATE USER ERROR:",
            err
          );

          if (
            err.code ===
            "ER_DUP_ENTRY"
          ) {
            return res.status(400).json({
              message:
                "Email is already registered",
            });
          }

          return res.status(500).json({
            message:
              "Database error",
            error:
              err.message,
          });
        }

        const selectSql = `
          SELECT
            id,
            name,
            email
          FROM users
          WHERE id = ?
        `;

        db.query(
          selectSql,
          [userId],
          (selectErr, rows) => {
            if (selectErr) {
              console.error(
                "FETCH UPDATED USER ERROR:",
                selectErr
              );

              return res.status(500).json({
                message:
                  "Profile updated, but failed to fetch user",
              });
            }

            if (rows.length === 0) {
              return res.status(404).json({
                message:
                  "User not found",
              });
            }

            return res.status(200).json({
              message:
                "Profile updated successfully",

              user: rows[0],
            });
          }
        );
      }
    );
  }
);


/* =====================================================
   PROJECTS
===================================================== */

const PROJECT_SELECT = `
  SELECT p.id, p.name, p.description, p.owner, p.status,
    p.due_date AS dueDate, p.members, p.progress,
    p.assignee_employee_id AS assignedEmployeeId,
    e.name AS assignedEmployeeName,
    p.created_at AS createdAt
  FROM projects p
  LEFT JOIN employees e ON e.id = p.assignee_employee_id AND e.owner_user_id = p.owner_user_id`;

const TASK_SELECT = `
  SELECT t.id, t.title, t.project, t.priority,
    t.due_date AS dueDate, t.status,
    t.assignee_employee_id AS assignedEmployeeId,
    e.name AS assignedEmployeeName,
    t.created_at AS createdAt
  FROM tasks t
  LEFT JOIN employees e ON e.id = t.assignee_employee_id AND e.owner_user_id = t.owner_user_id`;

function validateAssignedEmployee(employeeId, userId, callback) {
  if (employeeId === undefined || employeeId === null || employeeId === "") return callback(null, null);
  const normalizedId = Number(employeeId);
  if (!Number.isInteger(normalizedId) || normalizedId <= 0) return callback(new Error("Select a valid employee."));
  db.query("SELECT id, name FROM employees WHERE id=? AND owner_user_id=? AND status='Active' LIMIT 1", [normalizedId, userId], (err, rows) => {
    if (err) return callback(err);
    if (!rows.length) return callback(new Error("That employee is not active in your account."));
    return callback(null, rows[0]);
  });
}

// GET ALL PROJECTS
app.get("/api/projects", authenticateToken, (req, res) => {
  db.query(`${PROJECT_SELECT} WHERE p.owner_user_id=? ORDER BY p.id DESC`, [req.user.id], (err, projects) => {
    if (err) return res.status(500).json({ message: "Could not load projects." });
    return res.json({ projects });
  });
});

app.get("/api/projects/:id", authenticateToken, (req, res) => {
  db.query(`${PROJECT_SELECT} WHERE p.id=? AND p.owner_user_id=?`, [req.params.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Could not load project." });
    if (!rows.length) return res.status(404).json({ message: "Project not found." });
    return res.json({ project: rows[0] });
  });
});

app.post("/api/projects", authenticateToken, (req, res) => {
  const { name, description, owner, assignedEmployeeId, status, dueDate, members, progress } = req.body;
  if (!name || (!owner && !assignedEmployeeId)) return res.status(400).json({ message: "Project name and an owner are required." });
  validateAssignedEmployee(assignedEmployeeId, req.user.id, (employeeErr, employee) => {
    if (employeeErr) return res.status(400).json({ message: employeeErr.message });
    const projectOwner = employee?.name || owner.trim();
    db.query("INSERT INTO projects (owner_user_id,name,description,owner,status,due_date,members,progress,assignee_employee_id) VALUES (?,?,?,?,?,?,?,?,?)",
      [req.user.id, name.trim(), description?.trim() || "", projectOwner, status || "Active", dueDate || null, Number.isFinite(members) ? members : 0, Number.isFinite(progress) ? progress : 0, employee?.id || null],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Could not create project." });
        return res.status(201).json({ message: "Project created successfully", projectId: result.insertId });
      });
  });
});

app.put("/api/projects/:id", authenticateToken, (req, res) => {
  const { name, description, owner, assignedEmployeeId, status, dueDate, members, progress } = req.body;
  if (!name || (!owner && !assignedEmployeeId)) return res.status(400).json({ message: "Project name and an owner are required." });
  validateAssignedEmployee(assignedEmployeeId, req.user.id, (employeeErr, employee) => {
    if (employeeErr) return res.status(400).json({ message: employeeErr.message });
    const projectOwner = employee?.name || owner.trim();
    db.query("UPDATE projects SET name=?,description=?,owner=?,status=?,due_date=?,members=?,progress=?,assignee_employee_id=? WHERE id=? AND owner_user_id=?",
      [name.trim(), description?.trim() || "", projectOwner, status || "Active", dueDate || null, Number.isFinite(members) ? members : 0, Number.isFinite(progress) ? progress : 0, employee?.id || null, req.params.id, req.user.id],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Could not update project." });
        if (!result.affectedRows) {
          return db.query("SELECT id FROM projects WHERE id=? AND owner_user_id=?", [req.params.id, req.user.id], (checkErr, rows) => {
            if (checkErr) return res.status(500).json({ message: "Could not verify project." });
            if (!rows.length) return res.status(404).json({ message: "Project not found." });
            db.query(`${PROJECT_SELECT} WHERE p.id=? AND p.owner_user_id=?`, [req.params.id, req.user.id], (readErr, projects) => {
              if (readErr) return res.status(500).json({ message: "Could not reload project." });
              return res.json({ message: "Project updated successfully", project: projects[0] });
            });
          });
        }
        db.query(`${PROJECT_SELECT} WHERE p.id=? AND p.owner_user_id=?`, [req.params.id, req.user.id], (readErr, rows) => {
          if (readErr) return res.status(500).json({ message: "Project updated, but could not reload it." });
          return res.json({ message: "Project updated successfully", project: rows[0] });
        });
      });
  });
});

app.delete("/api/projects/:id", authenticateToken, (req, res) => {
  db.query("DELETE FROM projects WHERE id=? AND owner_user_id=?", [req.params.id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Could not delete project." });
    if (!result.affectedRows) return res.status(404).json({ message: "Project not found." });
    return res.json({ message: "Project deleted successfully." });
  });
});

app.get("/api/tasks", authenticateToken, (req, res) => {
  db.query(`${TASK_SELECT} WHERE t.owner_user_id=? ORDER BY t.id DESC`, [req.user.id], (err, tasks) => {
    if (err) return res.status(500).json({ message: "Could not load tasks." });
    return res.json({ tasks });
  });
});

app.get("/api/tasks/:id", authenticateToken, (req, res) => {
  db.query(`${TASK_SELECT} WHERE t.id=? AND t.owner_user_id=?`, [req.params.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Could not load task." });
    if (!rows.length) return res.status(404).json({ message: "Task not found." });
    return res.json({ task: rows[0] });
  });
});

app.post("/api/tasks", authenticateToken, (req, res) => {
  const { title, project, priority, dueDate, status, assignedEmployeeId } = req.body;
  if (!title || !project) return res.status(400).json({ message: "Title and project are required." });
  const formattedDueDate = dueDate ? String(dueDate).substring(0, 10) : null;
  validateAssignedEmployee(assignedEmployeeId, req.user.id, (employeeErr, employee) => {
    if (employeeErr) return res.status(400).json({ message: employeeErr.message });
    db.query("INSERT INTO tasks (owner_user_id,title,project,priority,due_date,status,assignee_employee_id) VALUES (?,?,?,?,?,?,?)",
      [req.user.id, title.trim(), project.trim(), priority || "Medium", formattedDueDate, status || "To Do", employee?.id || null],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Could not create task." });
        return res.status(201).json({ message: "Task created successfully", taskId: result.insertId });
      });
  });
});

app.put("/api/tasks/:id", authenticateToken, (req, res) => {
  const { title, project, priority, dueDate, status, assignedEmployeeId } = req.body;
  if (!title || !project) return res.status(400).json({ message: "Title and project are required." });
  const formattedDueDate = dueDate ? String(dueDate).substring(0, 10) : null;
  validateAssignedEmployee(assignedEmployeeId, req.user.id, (employeeErr, employee) => {
    if (employeeErr) return res.status(400).json({ message: employeeErr.message });
    db.query("UPDATE tasks SET title=?,project=?,priority=?,due_date=?,status=?,assignee_employee_id=? WHERE id=? AND owner_user_id=?",
      [title.trim(), project.trim(), priority || "Medium", formattedDueDate, status || "To Do", employee?.id || null, req.params.id, req.user.id],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Could not update task." });
        if (!result.affectedRows) {
          return db.query("SELECT id FROM tasks WHERE id=? AND owner_user_id=?", [req.params.id, req.user.id], (checkErr, rows) => {
            if (checkErr) return res.status(500).json({ message: "Could not verify task." });
            return rows.length ? res.json({ message: "Task updated successfully." }) : res.status(404).json({ message: "Task not found." });
          });
        }
        return res.json({ message: "Task updated successfully." });
      });
  });
});

app.delete("/api/tasks/:id", authenticateToken, (req, res) => {
  db.query("DELETE FROM tasks WHERE id=? AND owner_user_id=?", [req.params.id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Could not delete task." });
    if (!result.affectedRows) return res.status(404).json({ message: "Task not found." });
    return res.json({ message: "Task deleted successfully." });
  });
});


/* =====================================================
   DATE FORMAT HELPER
===================================================== */

function formatDateForMySQL(value) {
  if (!value) {
    return null;
  }

  // Already YYYY-MM-DD
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  // ISO date/time
  if (typeof value === "string") {
    const datePart =
      value.substring(0, 10);

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        datePart
      )
    ) {
      return datePart;
    }

    return null;
  }

  // JavaScript Date object
  const date =
    new Date(value);

  if (
    isNaN(date.getTime())
  ) {
    return null;
  }

  return date
    .toISOString()
    .substring(0, 10);
}


/* =====================================================
   TEAMS API
===================================================== */

// GET ALL TEAM MEMBERS
app.get(
  "/api/teams",
  (req, res) => {
    const sql = `
      SELECT
        id,
        name,
        email,
        role,
        department,
        status,
        joined_date,
        created_at
      FROM teams
      ORDER BY id DESC
    `;

    db.query(
      sql,
      (err, results) => {
        if (err) {
          console.error(
            "GET TEAMS ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to load teams",
            error:
              err.message,
          });
        }

        return res.status(200).json(
          results
        );
      }
    );
  }
);


// CREATE TEAM MEMBER
app.post(
  "/api/teams",
  (req, res) => {
    const {
      name,
      email,
      role,
      department,
      status,
      joined_date,
      joinedDate,
    } = req.body;

    if (
      !name ||
      !email ||
      !role
    ) {
      return res.status(400).json({
        message:
          "Name, email and role are required",
      });
    }

    const finalJoinedDate =
      formatDateForMySQL(
        joined_date ||
          joinedDate
      );

    const sql = `
      INSERT INTO teams
      (
        name,
        email,
        role,
        department,
        status,
        joined_date
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name.trim(),
      email.trim(),
      role.trim(),
      department || null,
      status || "Active",
      finalJoinedDate,
    ];

    db.query(
      sql,
      values,
      (err, result) => {
        if (err) {
          console.error(
            "CREATE TEAM ERROR:",
            err
          );

          if (
            err.code ===
            "ER_DUP_ENTRY"
          ) {
            return res.status(400).json({
              message:
                "Email already exists",
              error:
                err.message,
            });
          }

          return res.status(500).json({
            message:
              "Failed to create team member",
            error:
              err.message,
          });
        }

        console.log(
          "TEAM CREATED:",
          result.insertId
        );

        return res.status(201).json({
          message:
            "Team member created successfully",

          id:
            result.insertId,
        });
      }
    );
  }
);


// UPDATE TEAM MEMBER
app.put(
  "/api/teams/:id",
  (req, res) => {
    const {
      id,
    } = req.params;

    const {
      name,
      email,
      role,
      department,
      status,
      joined_date,
      joinedDate,
    } = req.body;

    if (
      !id ||
      isNaN(Number(id))
    ) {
      return res.status(400).json({
        message:
          "Invalid team member ID",
      });
    }

    if (
      !name ||
      !email ||
      !role
    ) {
      return res.status(400).json({
        message:
          "Name, email and role are required",
      });
    }

    const finalJoinedDate =
      formatDateForMySQL(
        joined_date ||
          joinedDate
      );

    const sql = `
      UPDATE teams
      SET
        name = ?,
        email = ?,
        role = ?,
        department = ?,
        status = ?,
        joined_date = ?
      WHERE id = ?
    `;

    const values = [
      name.trim(),
      email.trim(),
      role.trim(),
      department || null,
      status || "Active",
      finalJoinedDate,
      Number(id),
    ];

    db.query(
      sql,
      values,
      (err) => {
        if (err) {
          console.error(
            "UPDATE TEAM ERROR:",
            err
          );

          if (
            err.code ===
            "ER_DUP_ENTRY"
          ) {
            return res.status(400).json({
              message:
                "Email already exists",
              error:
                err.message,
            });
          }

          return res.status(500).json({
            message:
              "Failed to update team member",
            error:
              err.message,
          });
        }

        const checkSql = `
          SELECT
            id,
            name,
            email,
            role,
            department,
            status,
            joined_date,
            created_at
          FROM teams
          WHERE id = ?
        `;

        db.query(
          checkSql,
          [Number(id)],
          (checkErr, rows) => {
            if (checkErr) {
              console.error(
                "FETCH UPDATED TEAM ERROR:",
                checkErr
              );

              return res.status(500).json({
                message:
                  "Team member was updated, but failed to fetch updated data",
                error:
                  checkErr.message,
              });
            }

            if (
              rows.length === 0
            ) {
              return res.status(404).json({
                message:
                  "Team member not found",
              });
            }

            console.log(
              "TEAM UPDATED SUCCESSFULLY:",
              Number(id)
            );

            return res.status(200).json({
              message:
                "Team member updated successfully",

              member:
                rows[0],
            });
          }
        );
      }
    );
  }
);


// CHANGE TEAM MEMBER STATUS
app.patch(
  "/api/teams/:id/status",
  (req, res) => {
    const {
      id,
    } = req.params;

    const {
      status,
    } = req.body;

    if (
      !status ||
      ![
        "Active",
        "Inactive",
      ].includes(status)
    ) {
      return res.status(400).json({
        message:
          "Status must be Active or Inactive",
      });
    }

    const sql = `
      UPDATE teams
      SET status = ?
      WHERE id = ?
    `;

    db.query(
      sql,
      [
        status,
        Number(id),
      ],
      (err) => {
        if (err) {
          console.error(
            "UPDATE TEAM STATUS ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to update status",
            error:
              err.message,
          });
        }

        const checkSql = `
          SELECT id
          FROM teams
          WHERE id = ?
        `;

        db.query(
          checkSql,
          [Number(id)],
          (checkErr, rows) => {
            if (checkErr) {
              return res.status(500).json({
                message:
                  "Status update failed while checking member",
                error:
                  checkErr.message,
              });
            }

            if (
              rows.length === 0
            ) {
              return res.status(404).json({
                message:
                  "Team member not found",
              });
            }

            console.log(
              "TEAM STATUS UPDATED:",
              Number(id),
              status
            );

            return res.status(200).json({
              message:
                "Team status updated successfully",
            });
          }
        );
      }
    );
  }
);


// DELETE TEAM MEMBER
app.delete(
  "/api/teams/:id",
  (req, res) => {
    const {
      id,
    } = req.params;

    const sql = `
      DELETE FROM teams
      WHERE id = ?
    `;

    db.query(
      sql,
      [Number(id)],
      (err, result) => {
        if (err) {
          console.error(
            "DELETE TEAM ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to delete team member",
            error:
              err.message,
          });
        }

        if (
          result.affectedRows === 0
        ) {
          return res.status(404).json({
            message:
              "Team member not found",
          });
        }

        console.log(
          "TEAM DELETED:",
          Number(id)
        );

        return res.status(200).json({
          message:
            "Team member deleted successfully",
        });
      }
    );
  }
);


/* =====================================================
   DOCUMENTS API
===================================================== */

// GET ALL DOCUMENTS
app.get(
  "/api/documents",
  authenticateToken,
  (req, res) => {
    const sql = `
      SELECT
        id,
        name,
        file_name,
        file_path,
        file_type,
        file_size,
        upload_date
      FROM documents
      WHERE owner_user_id = ?
      ORDER BY upload_date DESC
    `;

    db.query(
      sql,
      [req.user.id],
      (err, results) => {
        if (err) {
          console.error(
            "GET DOCUMENTS ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to fetch documents",
            error:
              err.message,
          });
        }

        return res.status(200).json(
          results
        );
      }
    );
  }
);


// UPLOAD DOCUMENT
app.post(
  "/api/documents",
  authenticateToken,
  uploadDocument.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message:
          "Please select a file",
      });
    }

    const file =
      req.file;

    const filePath =
      `/uploads/documents/${file.filename}`;

    const sql = `
      INSERT INTO documents
      (
        name,
        file_name,
        file_path,
        file_type,
        file_size,
        owner_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        file.originalname,
        file.filename,
        filePath,
        file.mimetype,
        file.size,
        req.user.id,
      ],
      (err, result) => {
        if (err) {
          console.error(
            "CREATE DOCUMENT ERROR:",
            err
          );

          // Remove uploaded file
          fs.unlink(
            file.path,
            () => {}
          );

          return res.status(500).json({
            message:
              "Failed to save document",
            error:
              err.message,
          });
        }

        console.log(
          "DOCUMENT UPLOADED:",
          result.insertId
        );

        return res.status(201).json({
          message:
            "Document uploaded successfully",

          document: {
            id:
              result.insertId,

            name:
              file.originalname,

            fileName:
              file.filename,

            filePath:
              filePath,

            fileType:
              file.mimetype,

            fileSize:
              file.size,
          },
        });
      }
    );
  }
);

// Download only if the requested document belongs to the signed-in account.
app.get("/api/documents/:id/download", authenticateToken, (req, res) => {
  db.query("SELECT name, file_path FROM documents WHERE id=? AND owner_user_id=?", [req.params.id, req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Could not find this document." });
    if (!rows.length) return res.status(404).json({ message: "Document not found." });
    const physicalPath = path.join(documentsUploadPath, path.basename(rows[0].file_path));
    return res.download(physicalPath, rows[0].name, (downloadErr) => {
      if (downloadErr && !res.headersSent) return res.status(404).json({ message: "Document file is missing." });
    });
  });
});


// DELETE DOCUMENT
app.delete(
  "/api/documents/:id",
  authenticateToken,
  (req, res) => {
    const {
      id,
    } = req.params;

    // First find the document
    const selectSql = `
      SELECT
        file_path
      FROM documents
      WHERE id = ? AND owner_user_id = ?
    `;

    db.query(
      selectSql,
      [Number(id), req.user.id],
      (err, results) => {
        if (err) {
          console.error(
            "FIND DOCUMENT ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to find document",
            error:
              err.message,
          });
        }

        if (
          results.length === 0
        ) {
          return res.status(404).json({
            message:
              "Document not found",
          });
        }

        const filePath =
          results[0].file_path;

        // Delete database record
        const deleteSql = `
          DELETE FROM documents
          WHERE id = ? AND owner_user_id = ?
        `;

        db.query(
          deleteSql,
          [Number(id), req.user.id],
          (deleteErr, result) => {
            if (deleteErr) {
              console.error(
                "DELETE DOCUMENT ERROR:",
                deleteErr
              );

              return res.status(500).json({
                message:
                  "Failed to delete document",
                error:
                  deleteErr.message,
              });
            }

            if (
              result.affectedRows === 0
            ) {
              return res.status(404).json({
                message:
                  "Document not found",
              });
            }

            // Uploaded documents are confined to their private documents directory.
            const physicalPath = path.join(documentsUploadPath, path.basename(filePath));

            fs.unlink(
              physicalPath,
              (fileErr) => {
                if (
                  fileErr &&
                  fileErr.code !==
                    "ENOENT"
                ) {
                  console.error(
                    "PHYSICAL FILE DELETE ERROR:",
                    fileErr
                  );
                }

                console.log(
                  "DOCUMENT DELETED:",
                  id
                );

                return res.status(200).json({
                  message:
                    "Document deleted successfully",
                });
              }
            );
          }
        );
      }
    );
  }
);


/* =====================================================
   CALENDAR API
===================================================== */

// GET ALL CALENDAR EVENTS
app.get(
  "/api/calendar",
  (req, res) => {
    const sql = `
      SELECT
        id,
        title,
        event_date,
        start_time,
        end_time,
        location,
        description,
        created_at
      FROM calendar_events
      ORDER BY
        event_date ASC,
        start_time ASC
    `;

    db.query(
      sql,
      (err, results) => {
        if (err) {
          console.error(
            "GET CALENDAR ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to fetch calendar events",
            error:
              err.message,
          });
        }

        return res.status(200).json(
          results
        );
      }
    );
  }
);


// GET SINGLE CALENDAR EVENT
app.get(
  "/api/calendar/:id",
  (req, res) => {
    const {
      id,
    } = req.params;

    const sql = `
      SELECT
        id,
        title,
        event_date,
        start_time,
        end_time,
        location,
        description,
        created_at
      FROM calendar_events
      WHERE id = ?
    `;

    db.query(
      sql,
      [Number(id)],
      (err, results) => {
        if (err) {
          console.error(
            "GET CALENDAR EVENT ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to fetch calendar event",
            error:
              err.message,
          });
        }

        if (
          results.length === 0
        ) {
          return res.status(404).json({
            message:
              "Calendar event not found",
          });
        }

        return res.status(200).json(
          results[0]
        );
      }
    );
  }
);


// CREATE CALENDAR EVENT
app.post(
  "/api/calendar",
  (req, res) => {
    const {
      title,
      date,
      startTime,
      endTime,
      location,
      description,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        message:
          "Title and date are required",
      });
    }

    const formattedDate =
      formatDateForMySQL(date);

    if (!formattedDate) {
      return res.status(400).json({
        message:
          "Invalid event date",
      });
    }

    const sql = `
      INSERT INTO calendar_events
      (
        title,
        event_date,
        start_time,
        end_time,
        location,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        title.trim(),
        formattedDate,
        startTime || null,
        endTime || null,
        location || null,
        description || null,
      ],
      (err, result) => {
        if (err) {
          console.error(
            "CREATE CALENDAR EVENT ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to create calendar event",
            error:
              err.message,
          });
        }

        console.log(
          "CALENDAR EVENT CREATED:",
          result.insertId
        );

        return res.status(201).json({
          message:
            "Calendar event created successfully",

          event: {
            id:
              result.insertId,

            title:
              title.trim(),

            date:
              formattedDate,

            startTime:
              startTime || null,

            endTime:
              endTime || null,

            location:
              location || null,

            description:
              description || null,
          },
        });
      }
    );
  }
);


// UPDATE CALENDAR EVENT
app.put(
  "/api/calendar/:id",
  (req, res) => {
    const {
      id,
    } = req.params;

    const {
      title,
      date,
      startTime,
      endTime,
      location,
      description,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({
        message:
          "Title and date are required",
      });
    }

    const formattedDate =
      formatDateForMySQL(date);

    if (!formattedDate) {
      return res.status(400).json({
        message:
          "Invalid event date",
      });
    }

    const sql = `
      UPDATE calendar_events
      SET
        title = ?,
        event_date = ?,
        start_time = ?,
        end_time = ?,
        location = ?,
        description = ?
      WHERE id = ?
    `;

    db.query(
      sql,
      [
        title.trim(),
        formattedDate,
        startTime || null,
        endTime || null,
        location || null,
        description || null,
        Number(id),
      ],
      (err, result) => {
        if (err) {
          console.error(
            "UPDATE CALENDAR EVENT ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to update calendar event",
            error:
              err.message,
          });
        }

        if (
          result.affectedRows === 0
        ) {
          return res.status(404).json({
            message:
              "Calendar event not found",
          });
        }

        console.log(
          "CALENDAR EVENT UPDATED:",
          id
        );

        return res.status(200).json({
          message:
            "Calendar event updated successfully",
        });
      }
    );
  }
);


// DELETE CALENDAR EVENT
app.delete(
  "/api/calendar/:id",
  (req, res) => {
    const {
      id,
    } = req.params;

    const sql = `
      DELETE FROM calendar_events
      WHERE id = ?
    `;

    db.query(
      sql,
      [Number(id)],
      (err, result) => {
        if (err) {
          console.error(
            "DELETE CALENDAR EVENT ERROR:",
            err
          );

          return res.status(500).json({
            message:
              "Failed to delete calendar event",
            error:
              err.message,
          });
        }

        if (
          result.affectedRows === 0
        ) {
          return res.status(404).json({
            message:
              "Calendar event not found",
          });
        }

        console.log(
          "CALENDAR EVENT DELETED:",
          id
        );

        return res.status(200).json({
          message:
            "Calendar event deleted successfully",
        });
      }
    );
  }
);


/* =====================================================
   MULTER ERROR HANDLER
===================================================== */

app.use(
  (err, req, res, next) => {
    if (
      err instanceof multer.MulterError
    ) {
      if (
        err.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          message:
            "File size must be less than 10 MB.",
        });
      }

      return res.status(400).json({
        message:
          "File upload error",
        error:
          err.message,
      });
    }

    next(err);
  }
);


/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (err, req, res, next) => {
    console.error(
      "GLOBAL SERVER ERROR:",
      err
    );

    return res.status(500).json({
      message:
        "Internal server error",
      error:
        err.message,
    });
  }
);
// =====================================================
// MESSAGES API
// =====================================================

// NOTIFICATIONS
app.get("/api/notifications", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const unreadOnly = req.query.unread === "true";
  const sql = `
    SELECT id, title, content, type, link, is_read, created_at
    FROM notifications
    WHERE user_id = ? ${unreadOnly ? "AND is_read = FALSE" : ""}
    ORDER BY created_at DESC, id DESC
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("GET NOTIFICATIONS ERROR:", err);
      return res.status(500).json({ message: "Failed to load notifications." });
    }
    return res.status(200).json({ notifications: rows });
  });
});

app.post("/api/notifications", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  const type = typeof req.body.type === "string" ? req.body.type.trim() : "general";
  const link = typeof req.body.link === "string" ? req.body.link.trim() : null;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: "Authentication required." });
  }
  if (!title || !content || title.length > 160 || type.length > 40 || (link && link.length > 500)) {
    return res.status(400).json({ message: "A title and message are required; field lengths must be valid." });
  }

  db.query(
    "INSERT INTO notifications (user_id, title, content, type, link) VALUES (?, ?, ?, ?, ?)",
    [userId, title, content, type || "general", link || null],
    (err, result) => {
      if (err) {
        console.error("CREATE NOTIFICATION ERROR:", err);
        return res.status(500).json({ message: "Failed to create notification." });
      }
      db.query(
        "SELECT id, title, content, type, link, is_read, created_at FROM notifications WHERE id = ? AND user_id = ?",
        [result.insertId, userId],
        (fetchErr, rows) => {
          if (fetchErr || rows.length === 0) {
            console.error("FETCH CREATED NOTIFICATION ERROR:", fetchErr);
            return res.status(500).json({ message: "Notification created but could not be returned." });
          }
          return res.status(201).json({ notification: rows[0] });
        }
      );
    }
  );
});

app.patch("/api/notifications/read-all", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: "Authentication required." });
  }
  db.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE", [userId], (err, result) => {
    if (err) {
      console.error("MARK ALL NOTIFICATIONS READ ERROR:", err);
      return res.status(500).json({ message: "Failed to update notifications." });
    }
    return res.status(200).json({ updated: result.affectedRows });
  });
});

app.patch("/api/notifications/:id/read", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  const notificationId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: "Authentication required." });
  }
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ message: "Invalid notification ID." });
  }
  db.query("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?", [notificationId, userId], (err, result) => {
    if (err) {
      console.error("MARK NOTIFICATION READ ERROR:", err);
      return res.status(500).json({ message: "Failed to update notification." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }
    return res.status(200).json({ message: "Notification marked as read." });
  });
});

app.delete("/api/notifications/:id", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  const notificationId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: "Authentication required." });
  }
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ message: "Invalid notification ID." });
  }
  db.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [notificationId, userId], (err, result) => {
    if (err) {
      console.error("DELETE NOTIFICATION ERROR:", err);
      return res.status(500).json({ message: "Failed to delete notification." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }
    return res.status(200).json({ message: "Notification deleted." });
  });
});

// AUDIO AND VIDEO CALL SIGNALING (WebRTC offer/answer exchange)
app.post("/api/calls", authenticateToken, (req, res) => {
  const callerId = Number(req.user.id);
  const conversationName = typeof req.body.conversation_name === "string" ? req.body.conversation_name.trim() : "";
  const callType = req.body.call_type;
  const offerSdp = typeof req.body.offer_sdp === "string" ? req.body.offer_sdp : "";
  if (!Number.isInteger(callerId) || callerId <= 0) return res.status(401).json({ message: "Authentication required." });
  if (!conversationName || conversationName.length > 255 || !["audio", "video"].includes(callType) || !offerSdp) {
    return res.status(400).json({ message: "A conversation, call type, and WebRTC offer are required." });
  }
  db.query("SELECT name FROM users WHERE id = ?", [callerId], (userErr, users) => {
    if (userErr) return res.status(500).json({ message: "Could not start the call." });
    if (users.length === 0) return res.status(401).json({ message: "Authenticated user was not found." });
    db.query("INSERT INTO calls (caller_id, caller_name, conversation_name, call_type, offer_sdp) VALUES (?, ?, ?, ?, ?)",
      [callerId, users[0].name, conversationName, callType, offerSdp], (insertErr, result) => {
        if (insertErr) {
          console.error("CREATE CALL ERROR:", insertErr);
          return res.status(500).json({ message: "Could not start the call." });
        }
        return res.status(201).json({ id: result.insertId, caller_name: users[0].name, status: "ringing" });
      });
  });
});

app.get("/api/calls/incoming", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  const conversationName = typeof req.query.conversation === "string" ? req.query.conversation.trim() : "";
  if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ message: "Authentication required." });
  if (!conversationName) return res.status(200).json({ call: null });
  db.query(`
    SELECT id, caller_id, caller_name, conversation_name, call_type, status, offer_sdp, created_at
    FROM calls
    WHERE conversation_name = ? AND caller_id <> ? AND status = 'ringing'
      AND created_at > DATE_SUB(NOW(), INTERVAL 45 SECOND)
    ORDER BY id DESC LIMIT 1
  `, [conversationName, userId], (err, rows) => {
    if (err) {
      console.error("CHECK INCOMING CALL ERROR:", err);
      return res.status(500).json({ message: "Could not check for incoming calls." });
    }
    return res.status(200).json({ call: rows[0] || null });
  });
});

app.get("/api/calls/:id", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  const callId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ message: "Authentication required." });
  db.query(`
    SELECT id, caller_id, answered_by, caller_name, conversation_name, call_type,
      status, offer_sdp, answer_sdp, created_at
    FROM calls WHERE id = ? AND (caller_id = ? OR answered_by = ?)
  `, [callId, userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Could not read call status." });
    if (!rows.length) return res.status(404).json({ message: "Call not found." });
    return res.status(200).json({ call: rows[0] });
  });
});

app.patch("/api/calls/:id/answer", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  const callId = Number(req.params.id);
  const conversationName = typeof req.body.conversation_name === "string" ? req.body.conversation_name.trim() : "";
  const answerSdp = typeof req.body.answer_sdp === "string" ? req.body.answer_sdp : "";
  if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ message: "Authentication required." });
  if (!conversationName || !answerSdp) return res.status(400).json({ message: "A WebRTC answer is required." });
  db.query(`
    UPDATE calls SET answered_by = ?, answer_sdp = ?, status = 'active'
    WHERE id = ? AND conversation_name = ? AND caller_id <> ? AND status = 'ringing'
      AND created_at > DATE_SUB(NOW(), INTERVAL 45 SECOND)
  `, [userId, answerSdp, callId, conversationName, userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Could not answer the call." });
    if (!result.affectedRows) return res.status(409).json({ message: "This call is no longer available." });
    return res.status(200).json({ message: "Call connected." });
  });
});

app.patch("/api/calls/:id/status", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  const callId = Number(req.params.id);
  const conversationName = typeof req.body.conversation_name === "string" ? req.body.conversation_name.trim() : "";
  const status = req.body.status;
  if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ message: "Authentication required." });
  if (!conversationName || !["ended", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid call status." });
  db.query(`
    UPDATE calls SET status = ? WHERE id = ? AND conversation_name = ?
      AND ((status = 'ringing' AND caller_id <> ?) OR caller_id = ? OR answered_by = ?)
      AND status IN ('ringing', 'active')
  `, [status, callId, conversationName, userId, userId, userId], (err, result) => {
    if (err) return res.status(500).json({ message: "Could not end the call." });
    if (!result.affectedRows) return res.status(404).json({ message: "Call not found." });
    return res.status(200).json({ message: status === "rejected" ? "Call declined." : "Call ended." });
  });
});

// GET ALL MESSAGES
app.get("/api/message-contacts", authenticateToken, (req, res) => {
  const userId = Number(req.user.id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ message: "Authentication required." });
  db.query("SELECT id, name, email, position FROM employees WHERE owner_user_id = ? AND status = 'Active' ORDER BY name ASC", [userId], (err, rows) => {
    if (err) {
      console.error("MESSAGE CONTACTS ERROR:", err);
      return res.status(500).json({ message: "Could not load workspace members." });
    }
    return res.json(rows);
  });
});

app.get("/api/messages", authenticateToken, (req, res) => {
  const currentUserId = Number(req.user.id);
  if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
    return res.status(401).json({ message: "Authentication required." });
  }

  db.query("SELECT name FROM users WHERE id = ?", [currentUserId], (userErr, users) => {
    if (userErr) {
      console.error("GET MESSAGES USER ERROR:", userErr);
      return res.status(500).json({ message: "Failed to fetch messages" });
    }
    if (users.length === 0) {
      return res.status(401).json({ message: "Authenticated user was not found." });
    }

    const currentUserName = users[0].name;
    const sql = `
      SELECT m.id, m.sender_id, m.receiver_id, m.sender_name, m.receiver_name,
        m.message, m.is_read, m.created_at,
        a.original_name AS attachment_name,
        CASE WHEN a.message_id IS NOT NULL THEN CONCAT('/api/messages/', m.id, '/attachment') ELSE NULL END AS attachment_url,
        a.file_type AS attachment_type,
        a.file_size AS attachment_size
      FROM messages m
      LEFT JOIN message_attachments a ON a.message_id = m.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
        OR (m.sender_id IS NULL AND m.sender_name = ?)
        OR (m.receiver_id IS NULL AND m.receiver_name = ?)
      ORDER BY m.created_at ASC, m.id ASC
    `;

    db.query(sql, [currentUserId, currentUserId, currentUserName, currentUserName], (err, results) => {
      if (err) {
        console.error("GET MESSAGES ERROR:", err);
        return res.status(500).json({ message: "Failed to fetch messages" });
      }
      return res.status(200).json(results);
    });
  });
});

// Download a message attachment only for a participant in that message.
app.get("/api/messages/:id/attachment", authenticateToken, (req, res) => {
  const messageId = Number(req.params.id);
  const userId = Number(req.user.id);
  if (!Number.isInteger(messageId) || messageId <= 0 || !Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid attachment request." });
  }
  db.query(`
    SELECT a.original_name, a.file_path
    FROM message_attachments a
    JOIN messages m ON m.id = a.message_id
    WHERE m.id = ? AND (
      m.sender_id = ? OR m.receiver_id = ?
      OR (m.sender_id IS NULL AND m.sender_name = (SELECT name FROM users WHERE id = ?))
      OR (m.receiver_id IS NULL AND m.receiver_name = (SELECT name FROM users WHERE id = ?))
    )
  `, [messageId, userId, userId, userId, userId], (err, rows) => {
    if (err) {
      console.error("DOWNLOAD MESSAGE ATTACHMENT ERROR:", err);
      return res.status(500).json({ message: "Could not download this attachment." });
    }
    if (!rows.length) return res.status(404).json({ message: "Attachment not found." });
    const filename = path.basename(rows[0].file_path);
    const absolutePath = path.join(messageUploadsPath, filename);
    return res.download(absolutePath, rows[0].original_name, (downloadErr) => {
      if (downloadErr && !res.headersSent) res.status(404).json({ message: "Attachment file is missing." });
    });
  });
});


// SEND MESSAGE
app.post("/api/messages", authenticateToken, handleMessageUpload, (req, res) => {
  const currentUserId = Number(req.user.id);
  const receiverName = typeof req.body.receiver_name === "string"
    ? req.body.receiver_name.trim()
    : "";
  const receiverEmail = typeof req.body.receiver_email === "string"
    ? req.body.receiver_email.trim().toLowerCase()
    : "";
  const message = typeof req.body.message === "string"
    ? req.body.message.trim()
    : "";

  if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
    return res.status(401).json({ message: "Authentication required." });
  }
  const attachment = req.file || null;
  if (!receiverName || (!message && !attachment)) {
    return res.status(400).json({
      message: "Choose a recipient and enter a message or attach a file.",
    });
  }
  if (message.length > 5000) {
    return res.status(400).json({ message: "Message must be 5000 characters or fewer." });
  }

  db.query("SELECT id, name FROM users WHERE id = ?", [currentUserId], (senderErr, senders) => {
    if (senderErr) {
      console.error("SEND MESSAGE SENDER ERROR:", senderErr);
      return res.status(500).json({ message: "Failed to send message" });
    }
    if (senders.length === 0) {
      return res.status(401).json({ message: "Authenticated user was not found." });
    }
    const sender = senders[0];
    const saveForRecipient = (receiver) => {
      const sql = `
        INSERT INTO messages (sender_id, receiver_id, sender_name, receiver_name, message)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(sql, [sender.id, receiver ? receiver.id : null, sender.name, receiverName, message], (insertErr, result) => {
        if (insertErr) {
          console.error("SEND MESSAGE ERROR:", insertErr);
          return res.status(500).json({ message: "Failed to send message" });
        }

        const sendSavedMessage = () => db.query(`
          SELECT m.id, m.sender_id, m.receiver_id, m.sender_name, m.receiver_name,
            m.message, m.is_read, m.created_at,
            a.original_name AS attachment_name,
        CASE WHEN a.message_id IS NOT NULL THEN CONCAT('/api/messages/', m.id, '/attachment') ELSE NULL END AS attachment_url,
            a.file_type AS attachment_type,
            a.file_size AS attachment_size
          FROM messages m
          LEFT JOIN message_attachments a ON a.message_id = m.id
          WHERE m.id = ?
        `, [result.insertId], (fetchErr, rows) => {
          if (fetchErr || rows.length === 0) {
            console.error("FETCH SAVED MESSAGE ERROR:", fetchErr);
            return res.status(500).json({ message: "Message saved but could not be returned." });
          }
          return res.status(201).json({ message: rows[0] });
        });

        if (!attachment) return sendSavedMessage();
        const attachmentPath = `/uploads/messages/${attachment.filename}`;
        db.query(`
          INSERT INTO message_attachments (message_id, original_name, file_path, file_type, file_size)
          VALUES (?, ?, ?, ?, ?)
        `, [result.insertId, attachment.originalname, attachmentPath, attachment.mimetype, attachment.size], (attachmentErr) => {
          if (attachmentErr) {
            console.error("SAVE MESSAGE ATTACHMENT ERROR:", attachmentErr);
            fs.unlink(attachment.path, () => {});
            db.query("DELETE FROM messages WHERE id = ?", [result.insertId], () => {});
            return res.status(500).json({ message: "Message attachment could not be saved." });
          }
          return sendSavedMessage();
        });
      });
    };

    if (receiverEmail) {
      db.query("SELECT id, name FROM users WHERE LOWER(email) = ? AND id <> ? LIMIT 1", [receiverEmail, currentUserId], (userErr, users) => {
        if (userErr) {
          console.error("SEND MESSAGE USER RECIPIENT ERROR:", userErr);
          return res.status(500).json({ message: "Failed to validate recipient." });
        }
        if (users.length) return saveForRecipient(users[0]);
        db.query("SELECT id, name FROM employees WHERE owner_user_id = ? AND LOWER(email) = ? AND name = ? AND status = 'Active' LIMIT 1", [currentUserId, receiverEmail, receiverName], (employeeErr, employees) => {
          if (employeeErr) {
            console.error("SEND MESSAGE EMPLOYEE RECIPIENT ERROR:", employeeErr);
            return res.status(500).json({ message: "Failed to validate employee recipient." });
          }
          if (!employees.length) return res.status(404).json({ message: "This employee is not in your workspace." });
          return saveForRecipient(null);
        });
      });
    } else {
      db.query("SELECT id, name FROM users WHERE name = ? AND id <> ? LIMIT 1", [receiverName, currentUserId], (receiverErr, receivers) => {
        if (receiverErr) {
          console.error("SEND MESSAGE RECEIVER ERROR:", receiverErr);
          return res.status(500).json({ message: "Failed to validate recipient" });
        }
        return saveForRecipient(receivers[0] || null);
      });
    }
  });
});


// MARK MESSAGE AS READ
app.patch(
  "/api/messages/:id/read",
  authenticateToken,
  (req, res) => {
    const { id } = req.params;

    const sql = `
      UPDATE messages
      SET is_read = TRUE
      WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error("MARK READ ERROR:", err);

        return res.status(500).json({
          message: "Failed to update message",
        });
      }

      res.json({
        message: "Message marked as read",
      });
    });
  }
);


// DELETE MESSAGE
app.delete(
  "/api/messages/:id",
  authenticateToken,
  (req, res) => {
    const { id } = req.params;

    const sql = `
      DELETE FROM messages
      WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error("DELETE MESSAGE ERROR:", err);

        return res.status(500).json({
          message: "Failed to delete message",
        });
      }

      res.json({
        message: "Message deleted successfully",
      });
    });
  }
);


/* =====================================================
   START SERVER
===================================================== */

function initializeWorkspaceOwnershipSchema(callback) {
  const ensureColumn = (table, next) => {
    db.query(`SHOW COLUMNS FROM ${table} LIKE 'owner_user_id'`, (showErr, rows) => {
      if (showErr) return next(showErr);
      if (rows.length) return next(null);
      db.query(`ALTER TABLE ${table} ADD COLUMN owner_user_id INT NULL AFTER id`, next);
    });
  };

  const ensureIndex = (table, index, next) => {
    db.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [index], (showErr, rows) => {
      if (showErr) return next(showErr);
      if (rows.length) return next(null);
      db.query(`ALTER TABLE ${table} ADD INDEX ${index} (owner_user_id)`, next);
    });
  };

  const ensureAssignee = (table, index, constraint, next) => {
    db.query(`SHOW COLUMNS FROM ${table} LIKE 'assignee_employee_id'`, (columnErr, columns) => {
      if (columnErr) return next(columnErr);
      const ensureAssigneeIndex = () => ensureIndex(table, index, (indexErr) => {
        if (indexErr) return next(indexErr);
        db.query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?", [table, constraint], (fkErr, rows) => {
          if (fkErr) return next(fkErr);
          if (rows.length) return next(null);
          db.query(`ALTER TABLE ${table} ADD CONSTRAINT ${constraint} FOREIGN KEY (assignee_employee_id) REFERENCES employees(id) ON DELETE SET NULL`, next);
        });
      });
      if (columns.length) return ensureAssigneeIndex();
      db.query(`ALTER TABLE ${table} ADD COLUMN assignee_employee_id INT NULL`, (alterErr) => alterErr ? next(alterErr) : ensureAssigneeIndex());
    });
  };

  ensureColumn("projects", (projectColumnErr) => {
    if (projectColumnErr) return callback(projectColumnErr);
    ensureColumn("tasks", (taskColumnErr) => {
      if (taskColumnErr) return callback(taskColumnErr);
      ensureIndex("projects", "idx_projects_owner", (projectIndexErr) => {
        if (projectIndexErr) return callback(projectIndexErr);
          ensureIndex("tasks", "idx_tasks_owner", (taskIndexErr) => {
            if (taskIndexErr) return callback(taskIndexErr);
            ensureAssignee("projects", "idx_projects_assignee_employee", "fk_projects_assignee_employee", (projectAssigneeErr) => {
              if (projectAssigneeErr) return callback(projectAssigneeErr);
              ensureAssignee("tasks", "idx_tasks_assignee_employee", "fk_tasks_assignee_employee", (taskAssigneeErr) => {
                if (taskAssigneeErr) return callback(taskAssigneeErr);
                // Only migrate legacy rows when an account name is unique; unmatched data remains unassigned.
                db.query("UPDATE projects p JOIN (SELECT LOWER(TRIM(name)) AS owner_key, MIN(id) AS id FROM users GROUP BY LOWER(TRIM(name)) HAVING COUNT(*)=1) u ON LOWER(TRIM(p.owner))=u.owner_key SET p.owner_user_id=u.id WHERE p.owner_user_id IS NULL", (projectMigrationErr) => {
                  if (projectMigrationErr) return callback(projectMigrationErr);
                  db.query("UPDATE tasks t JOIN projects p ON BINARY TRIM(t.project)=BINARY TRIM(p.name) SET t.owner_user_id=p.owner_user_id WHERE t.owner_user_id IS NULL AND p.owner_user_id IS NOT NULL", callback);
                });
              });
            });
        });
      });
    });
  });
}

function initializeDocumentOwnershipSchema(callback) {
  db.query("SHOW COLUMNS FROM documents LIKE 'owner_user_id'", (columnErr, columns) => {
    if (columnErr) return callback(columnErr);
    const ensureIndex = () => db.query("SHOW INDEX FROM documents WHERE Key_name='idx_documents_owner'", (indexErr, indexes) => {
      if (indexErr) return callback(indexErr);
      if (indexes.length) return callback(null);
      db.query("ALTER TABLE documents ADD INDEX idx_documents_owner (owner_user_id)", callback);
    });
    if (columns.length) return ensureIndex();
    db.query("ALTER TABLE documents ADD COLUMN owner_user_id INT NULL AFTER id", (alterErr) => alterErr ? callback(alterErr) : ensureIndex());
  });
}

db.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(160) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(40) NOT NULL,
    link VARCHAR(500) DEFAULT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_user_created (user_id, created_at),
    CONSTRAINT fk_notifications_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`, (err) => {
  if (err) {
    console.error("NOTIFICATIONS TABLE INITIALIZATION ERROR:", err);
    return;
  }
  db.query(`
    CREATE TABLE IF NOT EXISTS message_attachments (
      message_id INT NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(150) NOT NULL,
      file_size BIGINT NOT NULL,
      PRIMARY KEY (message_id),
      CONSTRAINT fk_message_attachments_message
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `, (attachmentErr) => {
    if (attachmentErr) {
      console.error("MESSAGE ATTACHMENTS TABLE INITIALIZATION ERROR:", attachmentErr);
      return;
    }
    db.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id BIGINT NOT NULL AUTO_INCREMENT,
        caller_id INT NOT NULL,
        answered_by INT DEFAULT NULL,
        caller_name VARCHAR(255) NOT NULL,
        conversation_name VARCHAR(255) NOT NULL,
        call_type ENUM('audio', 'video') NOT NULL,
        status ENUM('ringing', 'active', 'ended', 'rejected') NOT NULL DEFAULT 'ringing',
        offer_sdp MEDIUMTEXT NOT NULL,
        answer_sdp MEDIUMTEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_calls_conversation_status (conversation_name, status, created_at),
        CONSTRAINT fk_calls_caller FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_calls_answered_by FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `, (callErr) => {
      if (callErr) {
        console.error("CALLS TABLE INITIALIZATION ERROR:", callErr);
        return;
      }
      initializePerformanceSchema(db, (performanceErr, seedResult) => {
        if (performanceErr) {
          console.error("EMPLOYEE PERFORMANCE INITIALIZATION ERROR:", performanceErr);
          return;
        }
        initializeWorkspaceOwnershipSchema((ownershipErr) => {
          if (ownershipErr) {
            console.error("PROJECT/TASK ACCOUNT OWNERSHIP INITIALIZATION ERROR:", ownershipErr);
            return;
          }
          initializeDocumentOwnershipSchema((documentErr) => {
            if (documentErr) {
              console.error("DOCUMENT ACCOUNT OWNERSHIP INITIALIZATION ERROR:", documentErr);
              return;
            }
            console.log(`Notifications, attachments, calls, and account-scoped workspace data are ready${seedResult?.removedDemoEmployees ? ` (${seedResult.removedDemoEmployees} old shared demo profiles removed)` : ""}.`);
            app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
          });
        });
      });
    });
  });
});
