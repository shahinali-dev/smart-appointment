import httpStatus from "http-status";
import { Types } from "mongoose";
import { AppError } from "../../errors/app_error";
import QueryBuilder from "../../utils/query_builder.utils";
import { ActivityLogType } from "./activity_log.enum";
import { IActivityLog } from "./activity_log.interface";
import ActivityLogModel from "./activity_log.model";

export class ActivityLogService {
  // Create activity log
  async createLog(logData: Partial<IActivityLog>) {
    const log = await ActivityLogModel.create(logData);
    return log;
  }

  // Get all activity logs with pagination
  async getAllLogs(createdBy: string, query: Record<string, unknown>) {
    const logQuery = new QueryBuilder(
      ActivityLogModel.find({ createdBy })
        .populate(
          "appointment",
          "customerName appointmentDate appointmentTime status",
        )
        .populate("staff", "name serviceType")
        .sort({ createdAt: -1 }),
      query,
    )
      .filter()
      .sort()
      .paginate()
      .fields();

    const result = await logQuery.modelQuery;
    const meta = await logQuery.countTotal();

    return {
      meta,
      result,
    };
  }

  // Get recent logs (latest 5-10)
  async getRecentLogs(createdBy: string, limit: number = 10) {
    const logs = await ActivityLogModel.find({ createdBy })
      .populate(
        "appointment",
        "customerName appointmentDate appointmentTime status",
      )
      .populate("staff", "name serviceType")
      .sort({ createdAt: -1 })
      .limit(limit);

    return logs;
  }

  // Get logs by appointment
  async getLogsByAppointment(createdBy: string, appointmentId: string) {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid appointment ID");
    }

    const logs = await ActivityLogModel.find({
      createdBy,
      appointment: appointmentId,
    })
      .populate("staff", "name serviceType")
      .sort({ createdAt: -1 });

    return logs;
  }

  // Get logs by staff
  async getLogsByStaff(createdBy: string, staffId: string) {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid staff ID");
    }

    const logs = await ActivityLogModel.find({
      createdBy,
      staff: staffId,
    })
      .populate("appointment", "customerName appointmentDate appointmentTime")
      .sort({ createdAt: -1 });

    return logs;
  }

  // Get logs by type
  async getLogsByType(createdBy: string, type: ActivityLogType) {
    const logs = await ActivityLogModel.find({
      createdBy,
      type,
    })
      .populate("appointment", "customerName appointmentDate appointmentTime")
      .populate("staff", "name serviceType")
      .sort({ createdAt: -1 });

    return logs;
  }

  // Get logs by date range
  async getLogsByDateRange(createdBy: string, startDate: Date, endDate: Date) {
    const logs = await ActivityLogModel.find({
      createdBy,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("appointment", "customerName appointmentDate appointmentTime")
      .populate("staff", "name serviceType")
      .sort({ createdAt: -1 });

    return logs;
  }

  // Helper: Log appointment creation
  async logAppointmentCreated(
    createdBy: string,
    appointmentId: string,
    customerName: string,
    staffId?: string,
  ) {
    const message = staffId
      ? `Appointment created for "${customerName}" and assigned to staff`
      : `Appointment created for "${customerName}" and added to queue`;

    await this.createLog({
      type: ActivityLogType.APPOINTMENT_CREATED,
      message,
      appointment: new Types.ObjectId(appointmentId),
      staff: staffId ? new Types.ObjectId(staffId) : undefined,
      customerName,
      createdBy,
    });
  }

  // Helper: Log staff assignment
  async logStaffAssigned(
    createdBy: string,
    appointmentId: string,
    customerName: string,
    staffId: string,
    staffName: string,
    fromQueue: boolean = false,
  ) {
    const message = fromQueue
      ? `Appointment for "${customerName}" assigned to ${staffName} from queue`
      : `Staff ${staffName} assigned to appointment for "${customerName}"`;

    await this.createLog({
      type: fromQueue
        ? ActivityLogType.QUEUE_TO_STAFF
        : ActivityLogType.STAFF_ASSIGNED,
      message,
      appointment: new Types.ObjectId(appointmentId),
      staff: new Types.ObjectId(staffId),
      customerName,
      createdBy,
      metadata: { fromQueue },
    });
  }

  // Helper: Log appointment status change
  async logAppointmentStatusChange(
    createdBy: string,
    appointmentId: string,
    customerName: string,
    newStatus: string,
    staffId?: string,
  ) {
    let type: ActivityLogType;
    let message: string;

    switch (newStatus) {
      case "COMPLETED":
        type = ActivityLogType.APPOINTMENT_COMPLETED;
        message = `Appointment for "${customerName}" marked as completed`;
        break;
      case "CANCELLED":
        type = ActivityLogType.APPOINTMENT_CANCELLED;
        message = `Appointment for "${customerName}" cancelled`;
        break;
      case "NO_SHOW":
        type = ActivityLogType.APPOINTMENT_NO_SHOW;
        message = `"${customerName}" marked as no-show`;
        break;
      case "IN_QUEUE":
        type = ActivityLogType.STAFF_TO_QUEUE;
        message = `Appointment for "${customerName}" moved to queue`;
        break;
      default:
        type = ActivityLogType.APPOINTMENT_UPDATED;
        message = `Appointment for "${customerName}" updated`;
    }

    await this.createLog({
      type,
      message,
      appointment: new Types.ObjectId(appointmentId),
      staff: staffId ? new Types.ObjectId(staffId) : undefined,
      customerName,
      createdBy,
    });
  }

  // Helper: Log appointment deletion
  async logAppointmentDeleted(
    createdBy: string,
    appointmentId: string,
    customerName: string,
  ) {
    await this.createLog({
      type: ActivityLogType.APPOINTMENT_DELETED,
      message: `Appointment for "${customerName}" deleted`,
      appointment: new Types.ObjectId(appointmentId),
      customerName,
      createdBy,
    });
  }
}

export const activityLogService = new ActivityLogService();
