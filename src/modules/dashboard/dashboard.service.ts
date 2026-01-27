import { activityLogService } from "../activity-log/activity_log.service";
import { AppointmentStatus } from "../appointment/appointment.enum";
import AppointmentModel from "../appointment/appointment.model";
import { AvailabilityStatus } from "../staff/staff.enum";
import StaffModel from "../staff/staff.model";
import {
  IDashboardData,
  IDashboardStats,
  IStaffLoadSummary,
} from "./dashboard.interface";

export class DashboardService {
  // Get today's date range
  private getTodayRange() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    return { startOfDay, endOfDay };
  }

  // Get dashboard statistics
  async getDashboardStats(createdBy: string): Promise<IDashboardStats> {
    const { startOfDay, endOfDay } = this.getTodayRange();

    // Get today's appointments by status
    const [
      totalAppointmentsToday,
      completedToday,
      pendingToday,
      cancelledToday,
      noShowToday,
      waitingQueueCount,
      totalStaff,
      availableStaff,
      onLeaveStaff,
    ] = await Promise.all([
      // Total appointments today
      AppointmentModel.countDocuments({
        createdBy,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        isDeleted: false,
      }),

      // Completed today
      AppointmentModel.countDocuments({
        createdBy,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: AppointmentStatus.COMPLETED,
        isDeleted: false,
      }),

      // Pending (scheduled) today
      AppointmentModel.countDocuments({
        createdBy,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: AppointmentStatus.SCHEDULED,
        isDeleted: false,
      }),

      // Cancelled today
      AppointmentModel.countDocuments({
        createdBy,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: AppointmentStatus.CANCELLED,
        isDeleted: false,
      }),

      // No-show today
      AppointmentModel.countDocuments({
        createdBy,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: AppointmentStatus.NO_SHOW,
        isDeleted: false,
      }),

      // Waiting queue count (all dates)
      AppointmentModel.countDocuments({
        createdBy,
        status: AppointmentStatus.IN_QUEUE,
        isDeleted: false,
      }),

      // Total staff
      StaffModel.countDocuments({
        createdBy,
        isDeleted: false,
      }),

      // Available staff
      StaffModel.countDocuments({
        createdBy,
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        isDeleted: false,
      }),

      // On leave staff
      StaffModel.countDocuments({
        createdBy,
        availabilityStatus: AvailabilityStatus.ON_LEAVE,
        isDeleted: false,
      }),
    ]);

    return {
      totalAppointmentsToday,
      completedToday,
      pendingToday,
      cancelledToday,
      noShowToday,
      waitingQueueCount,
      totalStaff,
      availableStaff,
      onLeaveStaff,
    };
  }

  // Get staff load summary for today
  async getStaffLoadSummary(createdBy: string): Promise<IStaffLoadSummary[]> {
    const { startOfDay, endOfDay } = this.getTodayRange();

    const allStaff = await StaffModel.find({ createdBy, isDeleted: false });

    const staffLoadSummary = await Promise.all(
      allStaff.map(async (staff) => {
        const currentLoad = await AppointmentModel.countDocuments({
          assignedStaff: staff._id,
          appointmentDate: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
          status: {
            $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
          },
          isDeleted: false,
        });

        const loadPercentage = Math.round(
          (currentLoad / staff.dailyCapacity) * 100,
        );

        return {
          staffId: staff._id.toString(),
          staffName: staff.name,
          serviceType: staff.serviceType,
          currentLoad,
          dailyCapacity: staff.dailyCapacity,
          availabilityStatus: staff.availabilityStatus,
          isOverloaded: currentLoad >= staff.dailyCapacity,
          loadPercentage,
        };
      }),
    );

    // Sort by load percentage (highest first)
    return staffLoadSummary.sort((a, b) => b.loadPercentage - a.loadPercentage);
  }

  // Get upcoming appointments (today's first, then future if no today's)
  async getUpcomingAppointments(createdBy: string) {
    // Get today's date range
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // First, try to get today's scheduled appointments
    let upcomingAppointments = await AppointmentModel.find({
      createdBy,
      appointmentDate: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
      status: AppointmentStatus.SCHEDULED,
      isDeleted: false,
    })
      .populate("service", "serviceName duration")
      .populate("assignedStaff", "name serviceType")
      .sort({ appointmentTime: 1 })
      .limit(5);

    // If no appointments today, get future appointments
    if (upcomingAppointments.length === 0) {
      upcomingAppointments = await AppointmentModel.find({
        createdBy,
        appointmentDate: { $gt: endOfToday },
        status: AppointmentStatus.SCHEDULED,
        isDeleted: false,
      })
        .populate("service", "serviceName duration")
        .populate("assignedStaff", "name serviceType")
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .limit(5);
    }

    return upcomingAppointments;
  }

  // Get complete dashboard data
  async getDashboardData(createdBy: string): Promise<IDashboardData> {
    const [stats, staffLoadSummary, recentActivity, upcomingAppointments] =
      await Promise.all([
        this.getDashboardStats(createdBy),
        this.getStaffLoadSummary(createdBy),
        activityLogService.getRecentLogs(createdBy, 10),
        this.getUpcomingAppointments(createdBy),
      ]);

    return {
      stats,
      staffLoadSummary,
      recentActivity,
      upcomingAppointments,
    };
  }

  // Get appointments overview by status
  async getAppointmentsOverview(createdBy: string) {
    const { startOfDay, endOfDay } = this.getTodayRange();

    const appointmentsByStatus = await AppointmentModel.aggregate([
      {
        $match: {
          createdBy,
          appointmentDate: { $gte: startOfDay, $lte: endOfDay },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return appointmentsByStatus;
  }

  // Get staff performance (appointments completed per staff)
  async getStaffPerformance(createdBy: string) {
    const { startOfDay, endOfDay } = this.getTodayRange();

    const staffPerformance = await AppointmentModel.aggregate([
      {
        $match: {
          createdBy,
          appointmentDate: { $gte: startOfDay, $lte: endOfDay },
          status: AppointmentStatus.COMPLETED,
          assignedStaff: { $ne: null },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$assignedStaff",
          completedCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "staffs",
          localField: "_id",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      {
        $unwind: "$staffInfo",
      },
      {
        $project: {
          staffId: "$_id",
          staffName: "$staffInfo.name",
          serviceType: "$staffInfo.serviceType",
          completedCount: 1,
        },
      },
      {
        $sort: { completedCount: -1 },
      },
    ]);

    return staffPerformance;
  }
}

export const dashboardService = new DashboardService();
