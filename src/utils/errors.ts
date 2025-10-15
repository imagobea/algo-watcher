import createError from "@fastify/error";

export const InvalidAlgoAddressError = createError(
  "APP_ERR_INVALID_ALGO_ADDRESS",
  "The provided Algorand address is invalid",
  422,
);

export const DbWriteFailedError = createError(
  "APP_ERR_DB_WRITE_FAILED",
  "Failed to write to the database",
  503,
);
