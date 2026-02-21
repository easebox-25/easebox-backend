import * as z from "zod";

export const idVerificationSchema = z.object({
  id_number: z
    .string({ error: "ID number is required" })
    .min(1, "ID number is required")
    .transform((val) => val.trim()),
    
  id_type: z.enum(["rc_number", "nigerian_national_id"], { error: "Invalid ID type" }
  ),
});

export type IdVerificationDto = z.infer<typeof idVerificationSchema>;

