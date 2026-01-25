/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from "http-status";
import { Types } from "mongoose";
import { AppError } from "../../errors/app_error";
import QueryBuilder from "../../utils/query_builder.utils";
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

  // Helper: Check if staff has time conflict
  private async checkTimeConflict(
    staffId: string,
    appointmentDate: Date,
    appointmentTime: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const query: any = {
      assignedStaff: staffId,
      appointmentDate,
      appointmentTime,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_QUEUE],
      },
      isDeleted: false,
    };

    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    const conflict = await AppointmentModel.findOne(query);
    return !!conflict;
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

      // Check time conflict
      const hasConflict = await this.checkTimeConflict(
        appointmentData.assignedStaff,
        appointmentDate,
        appointmentData.appointmentTime,
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

      const hasConflict = await this.checkTimeConflict(
        appointment.assignedStaff.toString(),
        appointmentDate,
        appointmentTime,
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
