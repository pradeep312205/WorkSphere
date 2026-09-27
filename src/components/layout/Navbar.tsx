import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import "./Navbar.css";
import { API_URL } from "../../lib/api";

interface SearchResult {
  type: string;
  title: string;
  detail: string;
  path: string;
}

interface SignedInUser { id: number; name: string; email: string; }

function readStoredUser(): SignedInUser | null {
  try {
    const value = localStorage.getItem("user");
    return value ? JSON.parse(value) as SignedInUser : null;
  } catch { return null; }
}

function Navbar() {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] =
    useState(false);

  useEffect(() => {
    const handleSidebarClose = () => setMenuOpen(false);
    window.addEventListener("close-mobile-sidebar", handleSidebarClose);
    return () => window.removeEventListener("close-mobile-sidebar", handleSidebarClose);
  }, []);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [darkMode, setDarkMode] =
    useState(() => {
      return (
        localStorage.getItem("theme") ===
        "dark"
      );
    });


  // Keep the account menu tied to the identity attached to the active JWT.
  const [user, setUser] = useState<SignedInUser | null>(readStoredUser);

  useEffect(() => {
    const syncUser = () => {
      const token = localStorage.getItem("token");
      if (!token) { setUser(null); return; }
      fetch(`${API_URL}/user`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (response) => {
          if (!response.ok) return;
          const payload = await response.json();
          if (!payload.user) return;
          localStorage.setItem("user", JSON.stringify(payload.user));
          setUser(payload.user as SignedInUser);
        })
        .catch(() => setUser(readStoredUser()));
    };
    syncUser();
    window.addEventListener("worksphere-user-updated", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("worksphere-user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const userName =
    user?.name || "User";

  const userEmail =
    user?.email || "";

  const userInitial =
    userName.charAt(0).toUpperCase();

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      const headers: HeadersInit = {};
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;

      const sources = [
        { url: `${API_URL}/projects`, type: "Project", path: "/projects", unwrap: (data: any) => data.projects || [] },
        { url: `${API_URL}/tasks`, type: "Task", path: "/tasks", unwrap: (data: any) => data.tasks || [] },
        { url: `${API_URL}/teams`, type: "Team member", path: "/teams", unwrap: (data: any) => Array.isArray(data) ? data : [] },
        { url: `${API_URL}/documents`, type: "Document", path: "/files", unwrap: (data: any) => Array.isArray(data) ? data : [] },
        { url: `${API_URL}/messages`, type: "Message", path: "/messages", unwrap: (data: any) => Array.isArray(data) ? data : [] },
      ];

      try {
        const responses = await Promise.allSettled(sources.map(async (source) => {
          const response = await fetch(source.url, { headers, signal: controller.signal });
          if (!response.ok) return [];
          const payload = await response.json();
          return source.unwrap(payload).map((item: Record<string, unknown>) => {
            const title = String(item.name || item.title || item.file_name || item.receiver_name || item.sender_name || "");
            const detail = [item.description, item.owner, item.project, item.department, item.role, item.email, item.message, item.file_name, item.file_type, item.status]
              .filter(Boolean).map(String).join(" · ");
            return { type: source.type, title, detail, path: source.path };
          });
        }));

        if (controller.signal.aborted) return;
        const needle = query.toLocaleLowerCase();
        const results = responses.flatMap((response) => response.status === "fulfilled" ? response.value : [])
          .filter((item) => item.title.toLocaleLowerCase().includes(needle) || item.detail.toLocaleLowerCase().includes(needle))
          .slice(0, 10);
        setSearchResults(results);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("WORKSPHERE SEARCH ERROR:", error);
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  const openSearchResult = (result: SearchResult) => {
    navigate(result.path);
    setSearchOpen(false);
    setSearchQuery("");
  };


  // =========================================
  // THEME
  // =========================================

  useLayoutEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add(
        "dark-mode"
      );
      document.body.classList.add("dark-mode");

      localStorage.setItem(
        "theme",
        "dark"
      );
    } else {
      document.documentElement.classList.remove(
        "dark-mode"
      );
      document.body.classList.remove("dark-mode");

      localStorage.setItem(
        "theme",
        "light"
      );
    }
  }, [darkMode]);


  // =========================================
  // MOBILE MENU
  // =========================================

  const handleMenuClick = () => {
    const newState = !menuOpen;

    setMenuOpen(newState);

    window.dispatchEvent(
      new CustomEvent(
        "toggle-mobile-sidebar",
        {
          detail: {
            open: newState,
          },
        }
      )
    );
  };


  // =========================================
  // SETTINGS
  // =========================================

  const handleSettings = () => {
    setProfileOpen(false);

    navigate("/settings");
  };


  // =========================================
  // LOGOUT
  // =========================================

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    setProfileOpen(false);

    navigate("/login", {
      replace: true,
    });
  };


  // =========================================
  // RETURN
  // =========================================

  return (
    <header className="navbar">


      {/* ====================================
          LEFT
      ==================================== */}

      <div className="navbar-left">

        <button
          type="button"
          className="menu-button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={handleMenuClick}
        >
          ☰
        </button>


        <div className="brand">

          <div className="brand-icon">
            W
          </div>

          <span>
            WorkSphere
          </span>

        </div>

      </div>


      {/* ====================================
          SEARCH
      ==================================== */}

      <div className="navbar-search-container">
        <div className="navbar-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search WorkSphere"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            onChange={(event) => { setSearchQuery(event.target.value); setSearchOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearchOpen(false);
              if (event.key === "Enter" && searchResults[0]) openSearchResult(searchResults[0]);
            }}
            aria-label="Search WorkSphere"
            aria-expanded={searchOpen && Boolean(searchQuery.trim())}
          />
        </div>

        {searchOpen && searchQuery.trim() && (
          <div className="navbar-search-results">
            {searching ? <div className="navbar-search-empty">Searching…</div> : searchResults.length ? searchResults.map((result, index) => (
              <button type="button" className="navbar-search-result" key={`${result.type}-${result.title}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => openSearchResult(result)}>
                <span className="navbar-search-result-type">{result.type}</span>
                <strong>{result.title}</strong>
                {result.detail && <small>{result.detail}</small>}
              </button>
            )) : <div className="navbar-search-empty">No matching workspace items found.</div>}
          </div>
        )}
      </div>


      {/* ====================================
          RIGHT
      ==================================== */}

      <div className="navbar-right">


        {/* THEME */}

        <button
          type="button"
          className="theme-button"
          aria-label={
            darkMode
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          title={
            darkMode
              ? "Light mode"
              : "Dark mode"
          }
          onClick={() =>
            setDarkMode(
              (current) => !current
            )
          }
        >

          {darkMode ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}

        </button>


        {/* NOTIFICATION */}

        <button
          type="button"
          className="icon-button"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => navigate("/notifications")}
        >
          <Bell size={18} />
        </button>


        {/* =================================
            PROFILE
        ================================= */}

        <div className="profile-container">

          <button
            type="button"
            className="profile-button"
            onClick={() =>
              setProfileOpen(
                (current) => !current
              )
            }
          >

            <div className="profile-avatar">
              {userInitial}
            </div>


            <div className="profile-info">

              <strong>
                {userName}
              </strong>

              <span>
                WorkSphere account
              </span>

            </div>


            <ChevronDown
              size={15}
              className={
                profileOpen
                  ? "profile-chevron open"
                  : "profile-chevron"
              }
            />

          </button>


          {/* =================================
              DROPDOWN
          ================================= */}

          {profileOpen && (

            <div className="profile-dropdown">

              <div className="dropdown-user">

                <div className="dropdown-avatar">
                  {userInitial}
                </div>

                <div>

                  <strong>
                    {userName}
                  </strong>

                  <span>
                    {userEmail}
                  </span>

                </div>

              </div>


              <div className="dropdown-divider" />


              {/* SETTINGS */}

              <button
                type="button"
                className="dropdown-item"
                onClick={handleSettings}
              >

                <Settings
                  size={16}
                />

                <span>
                  Settings
                </span>

              </button>


              {/* LOGOUT */}

              <button
                type="button"
                className="dropdown-item logout-item"
                onClick={handleLogout}
              >

                <LogOut
                  size={16}
                />

                <span>
                  Logout
                </span>

              </button>

            </div>

          )}

        </div>

      </div>

    </header>
  );
}

export default Navbar;
