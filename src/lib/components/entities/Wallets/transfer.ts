import { z } from "zod";

const transferObjectSchema = z.object({
  amount: z.coerce
    .number()
    .gt(0, "Amount must be greater than 0")
    .finite("Amount must be a finite number"),

  desc: z
    .string()
    .min(2, "Description must be at least 2 characters long")
    .max(4096, "Description must be less than 4096 characters long"),
});

type TransferObject = z.infer<typeof transferObjectSchema>;

export { transferObjectSchema };

export type { TransferObject };
