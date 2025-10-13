import { z } from "zod";

export const AddAccountSchema = z.object({ address: z.string().min(1) });
export type AddAccountInput = z.infer<typeof AddAccountSchema>;
