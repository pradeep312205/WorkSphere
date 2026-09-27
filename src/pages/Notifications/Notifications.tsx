import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  FolderKanban,
  Inbox,
  MessageCircle,
  Trash2,
  UsersRound,
} from "lucide-react";

import Navbar from "../../components/layout/Navbar";
import Sidebar from "../../components/layout/Sidebar";
import "./Notifications.css";
import { API_URL } from "../../lib/api";

const NOTIFICATIONS_API = `${API_URL}/notifications`;

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

type NotificationFilter = "all" | "unread";

interface NotificationApiResponse {
  message?: string;
  notifications?: NotificationItem[];
}

async function readApiResponse(response: Response): Promise<NotificationApiResponse> {
  const body = await response.text();
  try {
    return JSON.parse(body) as NotificationApiResponse;
  } catch {
    if (response.status === 404) {
      throw new Error("The notifications API is not loaded. Restart the WorkSphere backend and try again.");
    }
    throw new Error(`The notifications service returned an invalid response (HTTP ${response.status}).`);
  }
}

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay(date, today)) return `Today, ${time}`;
  if (sameDay(date, yesterday)) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function getNotificationIcon(type: string) {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("message")) return MessageCircle;
  if (normalizedType.includes("task")) return Check;
  if (normalizedType.includes("project")) return FolderKanban;
  if (normalizedType.includes("team")) return UsersRound;
  if (normalizedType.includes("calendar") || normalizedType.includes("event")) return CalendarDays;
  return Bell;
}

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | "all" | null>(null);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await fetch(NOTIFICATIONS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.message || "Failed to load notifications.");
      }
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );
  const visibleNotifications = useMemo(
    () => filter === "unread"
      ? notifications.filter((notification) => !notification.is_read)
      : notifications,
    [filter, notifications],
  );

  const markRead = async (notification: NotificationItem) => {
    if (notification.is_read) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required. Please log in again.");
      return;
    }
    setBusyId(notification.id);
    setError("");
    try {
      const response = await fetch(`${NOTIFICATIONS_API}/${notification.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || "Failed to mark notification as read.");
      setNotifications((current) => current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update notification.");
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required. Please log in again.");
      return;
    }
    setBusyId("all");
    setError("");
    try {
      const response = await fetch(`${NOTIFICATIONS_API}/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || "Failed to update notifications.");
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update notifications.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteNotification = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required. Please log in again.");
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`${NOTIFICATIONS_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || "Failed to delete notification.");
      setNotifications((current) => current.filter((item) => item.id !== id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to delete notification.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="notifications-page-layout">
      <Navbar />
      <div className="notifications-body">
        <Sidebar />
        <main className="notifications-main">
          <div className="notifications-container">
            <div className="notifications-page-header">
              <div>
                <span className="notifications-eyebrow">STAY UP TO DATE</span>
                <h1>Notifications</h1>
                <p>Updates and activity from your workspace, all in one place.</p>
              </div>
              <button
                className="mark-all-button"
                type="button"
                onClick={() => void markAllRead()}
                disabled={unreadCount === 0 || busyId !== null}
              >
                <CheckCheck size={17} />
                Mark all as read
              </button>
            </div>

            {error && <div className="notifications-error" role="alert">{error}</div>}

            <section className="notifications-card" aria-label="Your notifications">
              <div className="notifications-toolbar">
                <div className="notification-filters" role="tablist" aria-label="Filter notifications">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filter === "all"}
                    className={filter === "all" ? "active" : ""}
                    onClick={() => setFilter("all")}
                  >
                    All <span>{notifications.length}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={filter === "unread"}
                    className={filter === "unread" ? "active" : ""}
                    onClick={() => setFilter("unread")}
                  >
                    Unread <span>{unreadCount}</span>
                  </button>
                </div>
                <span className="notification-summary">
                  {unreadCount === 0 ? "You’re all caught up" : `${unreadCount} unread`}
                </span>
              </div>

              {loading ? (
                <div className="notifications-state">Loading notifications…</div>
              ) : visibleNotifications.length === 0 ? (
                <div className="notifications-empty">
                  <div className="notifications-empty-icon"><Inbox size={25} /></div>
                  <h2>{filter === "unread" ? "No unread notifications" : "You’re all caught up"}</h2>
                  <p>{filter === "unread" ? "New unread updates will show up here." : "Workspace updates will appear here when there’s something new."}</p>
                </div>
              ) : (
                <div className="notification-list">
                  {visibleNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type || "general");
                    const isBusy = busyId === notification.id;
                    return (
                      <article
                        className={`notification-item ${notification.is_read ? "read" : "unread"}`}
                        key={notification.id}
                      >
                        <div className={`notification-type-icon ${notification.type.toLowerCase()}`}>
                          <Icon size={19} />
                        </div>
                        <div className="notification-copy">
                          <div className="notification-title-row">
                            <h2>{notification.title}</h2>
                            {!notification.is_read && <span className="unread-indicator" aria-label="Unread" />}
                          </div>
                          <p>{notification.content}</p>
                          <time dateTime={notification.created_at}>{formatNotificationDate(notification.created_at)}</time>
                        </div>
                        <div className="notification-actions">
                          {notification.link && (
                            <button
                              type="button"
                              className="notification-open-button"
                              onClick={() => {
                                if (!notification.is_read) void markRead(notification);
                                navigate(notification.link || "/dashboard");
                              }}
                            >
                              Open
                            </button>
                          )}
                          {!notification.is_read && (
                            <button
                              className="notification-action-button"
                              type="button"
                              aria-label={`Mark ${notification.title} as read`}
                              title="Mark as read"
                              disabled={isBusy || busyId !== null}
                              onClick={() => void markRead(notification)}
                            >
                              <Check size={17} />
                            </button>
                          )}
                          <button
                            className="notification-action-button delete"
                            type="button"
                            aria-label={`Delete ${notification.title}`}
                            title="Delete notification"
                            disabled={isBusy || busyId !== null}
                            onClick={() => void deleteNotification(notification.id)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Notifications;
