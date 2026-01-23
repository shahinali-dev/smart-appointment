import { AvailabilityStatus, ServiceType } from "./staff.enum";

export interface IStaff {
  name: string;
  serviceType: ServiceType;
  dailyCapacity: number;
  availabilityStatus: AvailabilityStatus;
  createdBy: string;
  isDeleted: boolean;
}

export interface IStaffFilters {
  searchTerm?: string;
  serviceType?: ServiceType;
  availabilityStatus?: AvailabilityStatus;
}
