import { z } from "zod";
import { ServiceDuration, ServiceType } from "./service.enum";

const createServiceValidationSchema = z.object({
  serviceName: z.string().min(1, "Service name is required").trim(),
  duration: z
    .number()
    .refine((val) => Object.values(ServiceDuration).includes(val), {
      message: "Invalid duration. Must be 15, 30, or 60 minutes",
    }),
  requiredStaffType: z.nativeEnum(ServiceType, {
    errorMap: () => ({ message: "Invalid staff type" }),
  }),
});

const updateServiceValidationSchema = createServiceValidationSchema.partial();

export type ICreateService = z.infer<typeof createServiceValidationSchema>;
export type IUpdateService = z.infer<typeof updateServiceValidationSchema>;

export const serviceValidation = {
  createServiceValidationSchema,
  updateServiceValidationSchema,
};
