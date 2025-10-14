import { z } from "zod/v4";

export const AddAccountSchema = z.object({ address: z.string().min(1) });
export type AddAccountInput = z.infer<typeof AddAccountSchema>;
