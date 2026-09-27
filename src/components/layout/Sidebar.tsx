import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileSidebar = () => {
    setMobileOpen(false);
    window.dispatchEvent(new Event("close-mobile-sidebar"));
  };

  useEffect(() => {
    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent;

      setMobileOpen(customEvent.detail.open);
    };

    window.addEventListener("toggle-mobile-sidebar", handleToggle);

    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
    };
  }, []);

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobileSidebar}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-section">
          <p className="sidebar-title">Workspace</p>

          <NavLink to="/dashboard" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>▦</span>
            Dashboard
          </NavLink>

          <NavLink to="/projects" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>▤</span>
            Projects
          </NavLink>

          <NavLink to="/tasks" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>✓</span>
            My Tasks
          </NavLink>

          <NavLink to="/teams" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>♙</span>
            Teams
          </NavLink>

          <NavLink to="/calendar" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>□</span>
            Calendar
          </NavLink>

          <NavLink to="/files" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>▱</span>
            Documents
          </NavLink>
          <NavLink to="/employees" className="sidebar-link" onClick={closeMobileSidebar}><span>♙</span>Employees</NavLink>
          <NavLink to="/analytics" className="sidebar-link" onClick={closeMobileSidebar}><span>▥</span>Analytics</NavLink>
          <NavLink to="/ai" className="sidebar-link" onClick={closeMobileSidebar}><span>✦</span>AI Assistant</NavLink>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-title">Communication</p>

          <NavLink to="/messages" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>◌</span>
            Messages
          </NavLink>

          <NavLink to="/notifications" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>♢</span>
            Notifications
          </NavLink>
        </div>

        <div className="sidebar-bottom">
          <NavLink to="/settings" className="sidebar-link" onClick={closeMobileSidebar}>
            <span>⚙</span>
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
