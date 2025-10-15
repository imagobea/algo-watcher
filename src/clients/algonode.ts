import type algosdk from "algosdk";

const BASE_URL =
  process.env.ALGONODE_BASE_URL ?? "https://testnet-api.algonode.cloud";
const TIMEOUT_MS = Number(process.env.ALGONODE_HTTP_TIMEOUT_MS ?? 5000);

export type FetchSuccess = { ok: true; amount: bigint; round: bigint };

export type FetchError = {
  ok: false;
  type: "timeout" | "fetch" | "http" | "json_error";
  status?: number; // HTTP status code for http_error
  message: string;
};

type FetchAccountResult = FetchSuccess | FetchError;

/**
 * fetchAccount retrieves the current state of an Algorand account from the Algonode API.
 * It returns either the account balance and round on success, or detailed error information on failure.
 *
 * The function handles:
 * - Network timeouts
 * - HTTP errors (non-2xx responses)
 * - JSON parsing errors
 *
 * @param address - The Algorand account address to fetch
 * @returns Promise resolving to FetchAccountResult
 */
export async function fetchAccount(
  address: string,
): Promise<FetchAccountResult> {
  const url = `${BASE_URL}/v2/accounts/${address}`;
  let res: Response;
  let data: algosdk.modelsv2.Account;

  // Fetch with timeout
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const error = err as Error;
    return error.name === "TimeoutError"
      ? { ok: false, type: "timeout", message: error.message }
      : { ok: false, type: "fetch", message: error.message };
  }

  // Check HTTP response
  if (!res.ok) {
    return {
      ok: false,
      type: "http",
      status: res.status,
      message: res.statusText,
    };
  }

  // Parse JSON
  try {
    data = await res.json();
  } catch (err) {
    const error = err as Error;
    return { ok: false, type: "json_error", message: error.message };
  }

  return { ok: true, amount: BigInt(data.amount), round: BigInt(data.round) };
}
