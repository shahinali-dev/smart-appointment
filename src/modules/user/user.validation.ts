import { z } from "zod";

// Base validation schema for common fields
const baseUserValidationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  avatar: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const userValidation = {
  baseUserValidationSchema,
};
