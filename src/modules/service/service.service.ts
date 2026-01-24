import httpStatus from "http-status";
import { Types } from "mongoose";
import { AppError } from "../../errors/app_error";
import QueryBuilder from "../../utils/query_builder.utils";
import ServiceModel from "./service.model";
import { ICreateService, IUpdateService } from "./service.validation";

export class ServiceService {
  // Searchable fields for text search
  private serviceSearchableFields = ["serviceName"];

  async createService(createdBy: string, serviceData: ICreateService) {
    // Check if service with same name already exists for this user
    const existingService = await ServiceModel.findOne({
      createdBy,
      serviceName: serviceData.serviceName,
      isDeleted: false,
    });

    if (existingService) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A service with this name already exists",
      );
    }

    const newService = await ServiceModel.create({
      ...serviceData,
      createdBy,
    });

    return newService;
  }

  async getAllServices(createdBy: string, query: Record<string, unknown>) {
    // Add createdBy to filter
    const serviceQuery = new QueryBuilder(
      ServiceModel.find({ createdBy }),
      query,
    )
      .search(this.serviceSearchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();

    const result = await serviceQuery.modelQuery;
    const meta = await serviceQuery.countTotal();

    return {
      meta,
      result,
    };
  }

  async getServiceById(createdBy: string, serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid service ID");
    }

    const service = await ServiceModel.findOne({
      _id: serviceId,
      createdBy,
    });

    if (!service) {
      throw new AppError(httpStatus.NOT_FOUND, "Service not found");
    }

    return service;
  }

  async updateService(
    createdBy: string,
    serviceId: string,
    updateData: IUpdateService,
  ) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid service ID");
    }

    // If serviceName is being updated, check for duplicates
    if (updateData.serviceName) {
      const existingService = await ServiceModel.findOne({
        createdBy,
        serviceName: updateData.serviceName,
        _id: { $ne: serviceId },
        isDeleted: false,
      });

      if (existingService) {
        throw new AppError(
          httpStatus.CONFLICT,
          "A service with this name already exists",
        );
      }
    }

    const service = await ServiceModel.findOneAndUpdate(
      { _id: serviceId, createdBy },
      updateData,
      { new: true, runValidators: true },
    );

    if (!service) {
      throw new AppError(httpStatus.NOT_FOUND, "Service not found");
    }

    return service;
  }

  // Soft delete
  async deleteService(createdBy: string, serviceId: string) {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid service ID");
    }

    const service = await ServiceModel.findOneAndUpdate(
      { _id: serviceId, createdBy },
      { isDeleted: true },
      { new: true },
    );

    if (!service) {
      throw new AppError(httpStatus.NOT_FOUND, "Service not found");
    }

    return service;
  }

  // Get services by staff type
  async getServicesByStaffType(createdBy: string, staffType: string) {
    const services = await ServiceModel.find({
      createdBy,
      requiredStaffType: staffType,
    });

    return services;
  }

  // Get services by duration
  async getServicesByDuration(createdBy: string, duration: number) {
    const services = await ServiceModel.find({
      createdBy,
      duration,
    });

    return services;
  }
}

// Export singleton instance
export const serviceService = new ServiceService();
