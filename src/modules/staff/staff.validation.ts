import { z } from "zod";
import { AvailabilityStatus, ServiceType } from "./staff.enum";

const createStaffValidationSchema = z.object({
  name: z.string().min(1, "Staff name is required"),
  serviceType: z.nativeEnum(ServiceType, {
    errorMap: () => ({ message: "Invalid service type" }),
  }),
  dailyCapacity: z
    .number()
    .min(1, "Daily capacity must be at least 1")
    .max(5, "Daily capacity cannot exceed 5")
    .optional()
    .default(5),
  availabilityStatus: z
    .nativeEnum(AvailabilityStatus, {
      errorMap: () => ({ message: "Invalid availability status" }),
    })
    .optional()
    .default(AvailabilityStatus.AVAILABLE),
});

const updateStaffValidationSchema = createStaffValidationSchema.partial();

export type ICreateStaff = z.infer<typeof createStaffValidationSchema>;
export type IUpdateStaff = z.infer<typeof updateStaffValidationSchema>;

export const staffValidation = {
  createStaffValidationSchema,
  updateStaffValidationSchema,
};
