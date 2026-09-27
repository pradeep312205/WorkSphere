import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Settings from "../pages/Settings";
import Projects from "../pages/projects";
import MyTasks from "../pages/MyTasks";
import Teams from "../pages/Teams";
import Calendar from "../pages/Calendar/Calendar";
import Documents from "../pages/Documents/Documents";
import Messages from "../pages/Messages/Messages";
import Notifications from "../pages/Notifications/Notifications";
import Employees from "../pages/Employees/Employees";
import EmployeeDetails from "../pages/Employees/EmployeeDetails";
import Analytics from "../pages/Analytics/Analytics";
import Assistant from "../pages/AI/Assistant";

import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/settings" element={<Settings />} />

        <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
        <Route path="/employees/:id" element={<ProtectedRoute><EmployeeDetails /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />

        <Route
  path="/tasks"
  element={
    <ProtectedRoute>
      <MyTasks />
    </ProtectedRoute>
  }
/>
<Route
  path="/teams"
  element={
    <ProtectedRoute>
      <Teams />
    </ProtectedRoute>
  }

/>
<Route
  path="/calendar"
  element={
    <ProtectedRoute>
      <Calendar />
    </ProtectedRoute>
  }
/>
<Route
  path="/files"
  element={
    <ProtectedRoute>
      <Documents />
    </ProtectedRoute>
  }
/>
<Route
  path="/messages"
  element={
    <ProtectedRoute>
      <Messages />
    </ProtectedRoute>
  }
/>
<Route
  path="/notifications"
  element={
    <ProtectedRoute>
      <Notifications />
    </ProtectedRoute>
  }
/>

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
