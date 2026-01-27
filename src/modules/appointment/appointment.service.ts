/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from "http-status";
import { Types } from "mongoose";
import { AppError } from "../../errors/app_error";
import QueryBuilder from "../../utils/query_builder.utils";
import {
  cancelAppointmentCompletion,
  scheduleAppointmentCompletion,
} from "../../utils/schedule_appointment.utils";
import { activityLogService } from "../activity-log/activity_log.service";
import ServiceModel from "../service/service.model";
import { AvailabilityStatus } from "../staff/staff.enum";
import StaffModel from "../staff/staff.model";
import { AppointmentStatus } from "./appointment.enum";
import { IAppointment } from "./appointment.interface";
import AppointmentModel from "./appointment.model";
import {
  ICreateAppointment,
  IUpdateAppointment,
} from "./appointment.validation";

export class AppointmentService {
  private appointmentSearchableFields = ["customerName"];

  // Helper: Check if appointment time is in the past
  private isPastTime(appointmentDate: Date, appointmentTime: string): boolean {
    const now = new Date();
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const appointmentDateTime = new Date(appointmentDate);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    return appointmentDateTime < now;
  }

  // Helper: Check if staff has time conflict (considering service duration)
  private async checkTimeConflict(
    staffId: string,
    appointmentDate: Date,
    appointmentTime: string,
    serviceDuration: number,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    // Parse appointment time to calculate time window
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const appointmentStart = new Date(appointmentDate);
    appointmentStart.setHours(hours, minutes, 0, 0);

    const appointmentEnd = new Date(appointmentStart);
    appointmentEnd.setMinutes(appointmentEnd.getMinutes() + serviceDuration);

    // Find all scheduled appointments for this staff
    const existingAppointments = await AppointmentModel.find({
      assignedStaff: staffId,
      appointmentDate,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_QUEUE],
      },
      isDeleted: false,
    }).populate("service", "duration");

    if (excludeAppointmentId) {
      existingAppointments = existingAppointments.filter(
        (apt) => apt._id.toString() !== excludeAppointmentId,
      );
    }

    // Check for time overlaps considering service duration
    for (const existingApt of existingAppointments) {
      const [existHours, existMinutes] = existingApt.appointmentTime
        .split(":")
        .map(Number);
      const existingStart = new Date(appointmentDate);
      existingStart.setHours(existHours, existMinutes, 0, 0);

      const existingEnd = new Date(existingStart);
      const existingService: any = existingApt.service;
      existingEnd.setMinutes(
        existingEnd.getMinutes() + (existingService?.duration || 0),
      );

      // Check if there's any overlap between the two time windows
      if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
        return true;
      }
    }

    return false;
  }

  // Helper: Get staff daily appointment count
  private async getStaffDailyCount(
    staffId: string,
    appointmentDate: Date,
  ): Promise<number> {
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await AppointmentModel.countDocuments({
      assignedStaff: staffId,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
      },
      isDeleted: false,
    });

    return count;
  }

  // Helper: Update queue positions
  private async updateQueuePositions(createdBy: string) {
    const queuedAppointments = await AppointmentModel.find({
      createdBy,
      status: AppointmentStatus.IN_QUEUE,
      isDeleted: false,
    }).sort({ appointmentDate: 1, appointmentTime: 1, createdAt: 1 });

    for (let i = 0; i < queuedAppointments.length; i++) {
      queuedAppointments[i].queuePosition = i + 1;
      await queuedAppointments[i].save();
    }
  }

  async createAppointment(
    createdBy: string,
    appointmentData: ICreateAppointment,
  ) {
    // Validate service exists and belongs to user
    const service = await ServiceModel.findOne({
      _id: appointmentData.service,
      createdBy,
    });

    if (!service) {
      throw new AppError(httpStatus.NOT_FOUND, "Service not found");
    }

    const appointmentDate = new Date(appointmentData.appointmentDate);

    // Check if appointment time is in the past
    if (this.isPastTime(appointmentDate, appointmentData.appointmentTime)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot create appointments for past times",
      );
    }

    let newAppointment: IAppointment;

    // If staff is assigned
    if (appointmentData.assignedStaff) {
      // Validate staff exists and belongs to user
      const staff = await StaffModel.findOne({
        _id: appointmentData.assignedStaff,
        createdBy,
      });

      if (!staff) {
        throw new AppError(httpStatus.NOT_FOUND, "Staff not found");
      }

      // Check if staff type matches service requirement
      if (staff.serviceType !== service.requiredStaffType) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `This staff member cannot provide this service. Required: ${service.requiredStaffType}, Staff type: ${staff.serviceType}`,
        );
      }

      // Check if staff is available
      if (staff.availabilityStatus !== AvailabilityStatus.AVAILABLE) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "This staff member is currently on leave",
        );
      }

      // Check time conflict (now with service duration)
      const hasConflict = await this.checkTimeConflict(
        appointmentData.assignedStaff,
        appointmentDate,
        appointmentData.appointmentTime,
        service.duration,
      );

      if (hasConflict) {
        throw new AppError(
          httpStatus.CONFLICT,
          "This staff member already has an appointment at this time",
        );
      }

      // Check daily capacity
      const dailyCount = await this.getStaffDailyCount(
        appointmentData.assignedStaff,
        appointmentDate,
      );

      if (dailyCount >= staff.dailyCapacity) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `This staff member has reached their daily capacity (${staff.dailyCapacity} appointments)`,
        );
      }

      newAppointment = await AppointmentModel.create({
        ...appointmentData,
        appointmentDate,
        createdBy,
        status: AppointmentStatus.SCHEDULED,
      });

      // Schedule appointment auto-completion after service duration
      await scheduleAppointmentCompletion(
        newAppointment._id.toString(),
        appointmentDate,
        appointmentData.appointmentTime,
        service.duration,
      );

      // Log activity
      await activityLogService.logAppointmentCreated(
        createdBy,
        newAppointment._id.toString(),
        appointmentData.customerName,
        appointmentData.assignedStaff,
      );
    } else {
      // No staff assigned - add to queue
      newAppointment = await AppointmentModel.create({
        ...appointmentData,
        appointmentDate,
        createdBy,
        status: AppointmentStatus.IN_QUEUE,
        assignedStaff: null,
      });

      await this.updateQueuePositions(createdBy);

      // Log activity
      await activityLogService.logAppointmentCreated(
        createdBy,
        newAppointment._id.toString(),
        appointmentData.customerName,
      );
    }

    return await AppointmentModel.findById(newAppointment._id)
      .populate("service", "serviceName duration requiredStaffType")
      .populate("assignedStaff", "name serviceType availabilityStatus");
  }

  async getAllAppointments(createdBy: string, query: Record<string, unknown>) {
    const appointmentQuery = new QueryBuilder(
      AppointmentModel.find({ createdBy })
        .populate("service", "serviceName duration requiredStaffType")
        .populate("assignedStaff", "name serviceType availabilityStatus"),
      query,
    )
      .search(this.appointmentSearchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();

    const result = await appointmentQuery.modelQuery;
    const meta = await appointmentQuery.countTotal();

    return {
      meta,
      result,
    };
  }

  async getAppointmentById(createdBy: string, appointmentId: string) {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid appointment ID");
    }

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      createdBy,
    })
      .populate("service", "serviceName duration requiredStaffType")
      .populate("assignedStaff", "name serviceType availabilityStatus");

    if (!appointment) {
      throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
    }

    return appointment;
  }

  async updateAppointment(
    createdBy: string,
    appointmentId: string,
    updateData: IUpdateAppointment,
  ) {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid appointment ID");
    }

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      createdBy,
    });

    if (!appointment) {
      throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
    }

    const oldStatus = appointment.status;

    // If service is being updated, validate it
    if (updateData.service) {
      const service = await ServiceModel.findOne({
        _id: updateData.service,
        createdBy,
      });

      if (!service) {
        throw new AppError(httpStatus.NOT_FOUND, "Service not found");
      }
    }

    // If staff is being updated
    if (updateData.assignedStaff !== undefined) {
      if (updateData.assignedStaff) {
        const staff = await StaffModel.findOne({
          _id: updateData.assignedStaff,
          createdBy,
        });

        if (!staff) {
          throw new AppError(httpStatus.NOT_FOUND, "Staff not found");
        }

        const service = await ServiceModel.findById(
          updateData.service || appointment.service,
        );

        if (staff.serviceType !== service?.requiredStaffType) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            "Staff type does not match service requirement",
          );
        }

        if (staff.availabilityStatus !== AvailabilityStatus.AVAILABLE) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            "This staff member is currently on leave",
          );
        }

        const appointmentDate = updateData.appointmentDate
          ? new Date(updateData.appointmentDate)
          : appointment.appointmentDate;
        const appointmentTime =
          updateData.appointmentTime || appointment.appointmentTime;

        const hasConflict = await this.checkTimeConflict(
          updateData.assignedStaff,
          appointmentDate,
          appointmentTime,
          service?.duration || 0,
          appointmentId,
        );

        if (hasConflict) {
          throw new AppError(
            httpStatus.CONFLICT,
            "This staff member already has an appointment at this time",
          );
        }

        const dailyCount = await this.getStaffDailyCount(
          updateData.assignedStaff,
          appointmentDate,
        );

        if (dailyCount >= staff.dailyCapacity) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `This staff member has reached their daily capacity (${staff.dailyCapacity} appointments)`,
          );
        }

        updateData.status = AppointmentStatus.SCHEDULED;

        // Log staff assignment
        await activityLogService.logStaffAssigned(
          createdBy,
          appointmentId,
          appointment.customerName,
          updateData.assignedStaff,
          staff.name,
          false,
        );
      } else {
        // Staff removed - move to queue
        updateData.status = AppointmentStatus.IN_QUEUE;
      }
    }

    // If date or time is being updated and staff is assigned
    if (
      (updateData.appointmentDate || updateData.appointmentTime) &&
      appointment.assignedStaff
    ) {
      const appointmentDate = updateData.appointmentDate
        ? new Date(updateData.appointmentDate)
        : appointment.appointmentDate;
      const appointmentTime =
        updateData.appointmentTime || appointment.appointmentTime;

      const service = await ServiceModel.findById(appointment.service);

      const hasConflict = await this.checkTimeConflict(
        appointment.assignedStaff.toString(),
        appointmentDate,
        appointmentTime,
        service?.duration || 0,
        appointmentId,
      );

      if (hasConflict) {
        throw new AppError(
          httpStatus.CONFLICT,
          "This staff member already has an appointment at this time",
        );
      }
    }

    const updatedAppointment = await AppointmentModel.findOneAndUpdate(
      { _id: appointmentId, createdBy },
      updateData.appointmentDate
        ? {
            ...updateData,
            appointmentDate: new Date(updateData.appointmentDate),
          }
        : updateData,
      { new: true, runValidators: true },
    )
      .populate("service", "serviceName duration requiredStaffType")
      .populate("assignedStaff", "name serviceType availabilityStatus");

    // If appointment date or time was updated and status is SCHEDULED, reschedule completion
    if (
      updatedAppointment &&
      (updateData.appointmentDate || updateData.appointmentTime) &&
      updatedAppointment.status === AppointmentStatus.SCHEDULED
    ) {
      const newDate = updateData.appointmentDate
        ? new Date(updateData.appointmentDate)
        : appointment.appointmentDate;
      const newTime = updateData.appointmentTime || appointment.appointmentTime;
      const service: any = updatedAppointment.service;

      // Cancel old schedule and create new one
      await cancelAppointmentCompletion(appointmentId);
      await scheduleAppointmentCompletion(
        appointmentId,
        newDate,
        newTime,
        service?.duration || 0,
      );
    }

    await this.updateQueuePositions(createdBy);

    // Log status change if status was updated
    if (updateData.status && updateData.status !== oldStatus) {
      await activityLogService.logAppointmentStatusChange(
        createdBy,
        appointmentId,
        appointment.customerName,
        updateData.status,
        updatedAppointment?.assignedStaff?._id.toString(),
      );
    }

    return updatedAppointment;
  }

  async deleteAppointment(createdBy: string, appointmentId: string) {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid appointment ID");
    }

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      createdBy,
    });

    if (!appointment) {
      throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
    }

    await AppointmentModel.findOneAndUpdate(
      { _id: appointmentId, createdBy },
      { isDeleted: true },
      { new: true },
    );

    // Cancel scheduled completion if appointment was scheduled
    if (appointment.status === AppointmentStatus.SCHEDULED) {
      await cancelAppointmentCompletion(appointmentId);
    }

    await this.updateQueuePositions(createdBy);

    // Log deletion
    await activityLogService.logAppointmentDeleted(
      createdBy,
      appointmentId,
      appointment.customerName,
    );

    return appointment;
  }

  // Get waiting queue
  async getWaitingQueue(createdBy: string) {
    const queue = await AppointmentModel.find({
      createdBy,
      status: AppointmentStatus.IN_QUEUE,
    })
      .sort({ queuePosition: 1 })
      .populate("service", "serviceName duration requiredStaffType");

    return queue;
  }

  // Assign staff to appointment from queue
  async assignStaffToAppointment(
    createdBy: string,
    appointmentId: string,
    staffId: string,
  ) {
    if (
      !Types.ObjectId.isValid(appointmentId) ||
      !Types.ObjectId.isValid(staffId)
    ) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid ID");
    }

    const appointment = await AppointmentModel.findOne({
      _id: appointmentId,
      createdBy,
    }).populate("service");

    if (!appointment) {
      throw new AppError(httpStatus.NOT_FOUND, "Appointment not found");
    }

    const staff = await StaffModel.findOne({
      _id: staffId,
      createdBy,
    });

    if (!staff) {
      throw new AppError(httpStatus.NOT_FOUND, "Staff not found");
    }

    const service: any = appointment.service;

    if (staff.serviceType !== service.requiredStaffType) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Staff type does not match service requirement",
      );
    }

    if (staff.availabilityStatus !== AvailabilityStatus.AVAILABLE) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This staff member is currently on leave",
      );
    }

    const hasConflict = await this.checkTimeConflict(
      staffId,
      appointment.appointmentDate,
      appointment.appointmentTime,
      service.duration,
      appointmentId,
    );

    if (hasConflict) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This staff member already has an appointment at this time",
      );
    }

    const dailyCount = await this.getStaffDailyCount(
      staffId,
      appointment.appointmentDate,
    );

    if (dailyCount >= staff.dailyCapacity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `This staff member has reached their daily capacity (${staff.dailyCapacity} appointments)`,
      );
    }

    const wasInQueue = appointment.status === AppointmentStatus.IN_QUEUE;

    appointment.assignedStaff = new Types.ObjectId(staffId);
    appointment.status = AppointmentStatus.SCHEDULED;
    appointment.queuePosition = null;
    await appointment.save();

    // Schedule appointment auto-completion after service duration
    // (it will be scheduled from queue to scheduled transition)
    await scheduleAppointmentCompletion(
      appointmentId,
      appointment.appointmentDate,
      appointment.appointmentTime,
      service?.duration || 0,
    );

    await this.updateQueuePositions(createdBy);

    // Log staff assignment from queue
    await activityLogService.logStaffAssigned(
      createdBy,
      appointmentId,
      appointment.customerName,
      staffId,
      staff.name,
      wasInQueue,
    );

    return await AppointmentModel.findById(appointmentId)
      .populate("service", "serviceName duration requiredStaffType")
      .populate("assignedStaff", "name serviceType availabilityStatus");
  }

  // Get appointments by date
  async getAppointmentsByDate(createdBy: string, date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await AppointmentModel.find({
      createdBy,
      appointmentDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("service", "serviceName duration requiredStaffType")
      .populate("assignedStaff", "name serviceType availabilityStatus")
      .sort({ appointmentTime: 1 });

    return appointments;
  }

  // Get Appointment Date List
  async getAppointmentDateList(createdBy: string) {
    const dates = await AppointmentModel.aggregate([
      {
        $match: {
          createdBy: createdBy,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$appointmentDate",
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          appointmentDate: "$_id",
        },
      },
    ]);

    return dates.map((d) => d.appointmentDate);
  }

  // Get appointments by staff
  async getAppointmentsByStaff(createdBy: string, staffId: string) {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid staff ID");
    }

    const appointments = await AppointmentModel.find({
      createdBy,
      assignedStaff: staffId,
    })
      .populate("service", "serviceName duration requiredStaffType")
      .populate("assignedStaff", "name serviceType availabilityStatus")
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    return appointments;
  }

  // Get staff load for a specific date
  async getStaffLoadByDate(createdBy: string, date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const allStaff = await StaffModel.find({ createdBy });

    const staffLoad = await Promise.all(
      allStaff.map(async (staff) => {
        const appointmentCount = await AppointmentModel.countDocuments({
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

        return {
          staffId: staff._id,
          staffName: staff.name,
          serviceType: staff.serviceType,
          currentLoad: appointmentCount,
          dailyCapacity: staff.dailyCapacity,
          availabilityStatus: staff.availabilityStatus,
          isOverloaded: appointmentCount >= staff.dailyCapacity,
        };
      }),
    );

    return staffLoad;
  }
}

export const appointmentService = new AppointmentService();
