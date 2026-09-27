import { API_URL } from "./api";

export const PERFORMANCE_API = API_URL;

export interface MonthlyPerformance {
  month: string;
  performanceScore: number;
  productivity: number;
  attendance: number;
  taskCompletion: number;
  qualityScore: number;
}

export interface Employee {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  position: string;
  joiningDate: string;
  status: "Active" | "Inactive";
  attendance: number;
  productivity: number;
  taskCompletion: number;
  qualityScore: number;
  teamworkScore: number;
  performanceScore: number;
  assignedTaskCount?: number;
  completedTaskCount?: number;
  monthlyPerformance: MonthlyPerformance[];
}

export interface AnalyticsOverview {
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    averagePerformance: number;
    averageProductivity: number;
    averageAttendance: number;
    topPerformer: Employee | null;
    needingAttention: number;
    decliningEmployees: Array<{ name: string; department: string; performanceScore: number; trendDelta: number }>;
  };
  performanceByEmployee: Array<{ id: number; employeeId: string; name: string; department: string; performanceScore: number }>;
  departmentPerformance: Array<{ department: string; employees: number; performance: number; productivity: number; attendance: number; taskCompletion: number; qualityScore: number }>;
  monthlyPerformance: Array<{ month: string; performance: number; productivity: number; attendance: number; taskCompletion: number; qualityScore: number }>;
  departmentDistribution: Array<{ name: string; value: number }>;
  attendanceProductivity: Array<{ name: string; department: string; attendance: number; productivity: number; performanceScore: number }>;
  employees: Employee[];
}

export async function performanceRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Your login session has expired. Please log in again.");
  const response = await fetch(`${PERFORMANCE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status}).`);
  return payload as T;
}

export const asNumber = (value: number | string | null | undefined) => Number(value || 0);
export const scoreLabel = (score: number) => score >= 90 ? "Excellent" : score >= 80 ? "Strong" : score >= 70 ? "Developing" : "Needs support";
