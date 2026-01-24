import { z } from "zod";
import { AppointmentStatus } from "./appointment.enum";

// Time format validation (HH:mm)
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const createAppointmentValidationSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").trim(),
  service: z.string().min(1, "Service ID is required"),
  assignedStaff: z.string().optional(),
  appointmentDate: z.string().refine(
    (date) => {
      const appointmentDate = new Date(date);
      return !isNaN(appointmentDate.getTime());
    },
    { message: "Invalid date format" },
  ),
  appointmentTime: z.string().regex(timeRegex, {
    message: "Time must be in HH:mm format (e.g., 14:30)",
  }),
  status: z
    .nativeEnum(AppointmentStatus, {
      errorMap: () => ({ message: "Invalid appointment status" }),
    })
    .optional(),
});

const updateAppointmentValidationSchema = z.object({
  customerName: z
    .string()
    .min(1, "Customer name is required")
    .trim()
    .optional(),
  service: z.string().min(1, "Service ID is required").optional(),
  assignedStaff: z.string().nullable().optional(),
  appointmentDate: z
    .string()
    .refine(
      (date) => {
        const appointmentDate = new Date(date);
        return !isNaN(appointmentDate.getTime());
      },
      { message: "Invalid date format" },
    )
    .optional(),
  appointmentTime: z
    .string()
    .regex(timeRegex, {
      message: "Time must be in HH:mm format (e.g., 14:30)",
    })
    .optional(),
  status: z
    .nativeEnum(AppointmentStatus, {
      errorMap: () => ({ message: "Invalid appointment status" }),
    })
    .optional(),
});

const assignStaffValidationSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
});

export type ICreateAppointment = z.infer<
  typeof createAppointmentValidationSchema
>;
export type IUpdateAppointment = z.infer<
  typeof updateAppointmentValidationSchema
>;
export type IAssignStaff = z.infer<typeof assignStaffValidationSchema>;

export const appointmentValidation = {
  createAppointmentValidationSchema,
  updateAppointmentValidationSchema,
  assignStaffValidationSchema,
};
