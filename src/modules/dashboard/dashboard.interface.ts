/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IDashboardStats {
  totalAppointmentsToday: number;
  completedToday: number;
  pendingToday: number;
  cancelledToday: number;
  noShowToday: number;
  waitingQueueCount: number;
  totalStaff: number;
  availableStaff: number;
  onLeaveStaff: number;
}

export interface IStaffLoadSummary {
  staffId: string;
  staffName: string;
  serviceType: string;
  currentLoad: number;
  dailyCapacity: number;
  availabilityStatus: string;
  isOverloaded: boolean;
  loadPercentage: number;
}

export interface IDashboardData {
  stats: IDashboardStats;
  staffLoadSummary: IStaffLoadSummary[];
  recentActivity: any[];
  upcomingAppointments: any[];
}
