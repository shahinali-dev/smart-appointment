import httpStatus from "http-status";
import { Types } from "mongoose";
import { AppError } from "../../errors/app_error";
import QueryBuilder from "../../utils/query_builder.utils";
import { AvailabilityStatus } from "./staff.enum";
import StaffModel from "./staff.model";
import { ICreateStaff, IUpdateStaff } from "./staff.validation";

export class StaffService {
  // Searchable fields for text search
  private staffSearchableFields = ["name"];

  async createStaff(createdBy: string, staffData: ICreateStaff) {
    const newStaff = await StaffModel.create({
      ...staffData,
      createdBy,
    });

    return newStaff;
  }

  async getAllStaff(createdBy: string, query: Record<string, unknown>) {
    // Add createdBy to filter
    const staffQuery = new QueryBuilder(StaffModel.find({ createdBy }), query)
      .search(this.staffSearchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();

    const result = await staffQuery.modelQuery;
    const meta = await staffQuery.countTotal();

    return {
      meta,
      result,
    };
  }

  async getStaffById(createdBy: string, staffId: string) {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid staff ID");
    }

    const staff = await StaffModel.findOne({
      _id: staffId,
      createdBy,
    });

    if (!staff) {
      throw new AppError(httpStatus.NOT_FOUND, "Staff not found");
    }

    return staff;
  }

  async updateStaff(
    createdBy: string,
    staffId: string,
    updateData: IUpdateStaff,
  ) {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid staff ID");
    }

    const staff = await StaffModel.findOneAndUpdate(
      { _id: staffId, createdBy },
      updateData,
      { new: true, runValidators: true },
    );

    if (!staff) {
      throw new AppError(httpStatus.NOT_FOUND, "Staff not found");
    }

    return staff;
  }

  // Soft delete
  async deleteStaff(createdBy: string, staffId: string) {
    if (!Types.ObjectId.isValid(staffId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid staff ID");
    }

    const staff = await StaffModel.findOneAndUpdate(
      { _id: staffId, createdBy },
      { isDeleted: true },
      { new: true },
    );

    if (!staff) {
      throw new AppError(httpStatus.NOT_FOUND, "Staff not found");
    }

    return staff;
  }

  // Get available staff by service type
  async getAvailableStaffByType(createdBy: string, serviceType: string) {
    const staff = await StaffModel.find({
      createdBy,
      serviceType,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
    });

    return staff;
  }
}

// Export singleton instance
export const staffService = new StaffService();
