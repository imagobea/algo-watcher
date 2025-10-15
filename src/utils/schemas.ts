import { z } from "zod/v4";

export const AddAccountSchema = z.object({
  address: z
    .string()
    .min(1)
    .describe("Algorand account address")
    .meta({
      examples: ["ELJEB3OYX325FATYL765AM5ZSJPSWZX745TYM5KCLTTSHJN2BJSHEMQ2JE"],
    }),
});
export type AddAccountInput = z.infer<typeof AddAccountSchema>;
