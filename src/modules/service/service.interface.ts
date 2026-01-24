import { ServiceDuration, ServiceType } from "./service.enum";

export interface IService {
  serviceName: string;
  duration: ServiceDuration;
  requiredStaffType: ServiceType;
  createdBy: string;
  isDeleted: boolean;
}

export interface IServiceFilters {
  searchTerm?: string;
  duration?: ServiceDuration;
  requiredStaffType?: ServiceType;
}
