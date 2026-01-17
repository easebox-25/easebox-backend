import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .email("Please provide a valid email address")
    .max(255, "Email must not exceed 255 characters")
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string({ error: "Password is required" })
    .min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const registerIndividualSchema = z.object({
  email: z
    .email("Please provide a valid email address")
    .max(255, "Email must not exceed 255 characters")
    .transform((val) => val.toLowerCase().trim()),

  firstName: z
    .string({ error: "First name is required" })
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must not exceed 50 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  lastName: z
    .string({ error: "Last name is required" })
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must not exceed 50 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    ),

  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),

  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Please provide a valid phone number")
    .optional()
    .nullable(),

  termsAccepted: z
    .boolean({ error: "Terms acceptance is required" })
    .refine((val) => val, "You must accept the terms and conditions"),
});

export type RegisterIndividualDto = z.infer<typeof registerIndividualSchema>;

export const registerCompanySchema = z.object({
  address: z
    .string({ error: "Address is required" })
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must not exceed 500 characters"),

  companyEmail: z
    .email("Please provide a valid email address")
    .max(255, "Email must not exceed 255 characters")
    .transform((val) => val.toLowerCase().trim()),

  companyName: z
    .string({ error: "Company name is required" })
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must not exceed 100 characters")
    .regex(
      /^[a-zA-Z0-9\s&.,'-]+$/,
      "Company name can only contain letters, numbers, spaces, and special characters (&.,'-)"
    ),

  companyPhone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Please provide a valid phone number")
    .optional()
    .nullable(),

  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),

  rcNumber: z
    .string({ error: "RC Number is required" })
    .regex(
      /^RC-\d{7}$/,
      "RC Number must be in the format RC- followed by 7 digits (e.g., RC-1234567)"
    ),

  termsAccepted: z
    .boolean({ error: "Terms acceptance is required" })
    .refine((val) => val, "You must accept the terms and conditions"),
});

export type RegisterCompanyDto = z.infer<typeof registerCompanySchema>;