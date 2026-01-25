// Common enums used across multiple modules
export enum ServiceType {
  DOCTOR = "DOCTOR",
  CONSULTANT = "CONSULTANT",
  SUPPORT_AGENT = "SUPPORT_AGENT",
  THERAPIST = "THERAPIST",
  TECHNICIAN = "TECHNICIAN",
}

export enum ServiceDuration {
  FIFTEEN_MINUTES = 15,
  THIRTY_MINUTES = 30,
  SIXTY_MINUTES = 60,
}

export enum AvailabilityStatus {
  AVAILABLE = "AVAILABLE",
  ON_LEAVE = "ON_LEAVE",
}

export enum AppointmentStatus {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  NO_SHOW = "NO_SHOW",
  IN_QUEUE = "IN_QUEUE",
}
