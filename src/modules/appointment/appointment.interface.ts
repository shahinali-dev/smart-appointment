import { Types } from "mongoose";
import { AppointmentStatus } from "./appointment.enum";

export interface IAppointment {
  _id: Types.ObjectId;
  customerName: string;
  service: Types.ObjectId;
  assignedStaff?: Types.ObjectId | null;
  appointmentDate: Date;
  appointmentTime: string;
  status: AppointmentStatus;
  queuePosition?: number | null;
  createdBy: string;
  isDeleted: boolean;
}

export interface IAppointmentFilters {
  searchTerm?: string;
  status?: AppointmentStatus;
  assignedStaff?: string;
  appointmentDate?: string;
  service?: string;
}

export interface IAppointmentPopulated extends Omit<
  IAppointment,
  "service" | "assignedStaff"
> {
  service: {
    _id: Types.ObjectId;
    serviceName: string;
    duration: number;
    requiredStaffType: string;
  };
  assignedStaff?: {
    _id: Types.ObjectId;
    name: string;
    serviceType: string;
    availabilityStatus: string;
  } | null;
}
