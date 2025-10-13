const BASE_URL =
  process.env.ALGONODE_BASE_URL ?? "https://testnet-api.algonode.cloud";
const TIMEOUT_MS = Number(process.env.ALGONODE_HTTP_TIMEOUT_MS ?? 5000);

export type AccountSnapshot = { amount: bigint; round: bigint };

export async function fetchAccount(address: string): Promise<AccountSnapshot> {
  const url = `${BASE_URL}/v2/accounts/${address}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP_${res.status}: ${res.statusText}`);

    const data = await res.json();
    return { amount: BigInt(data.amount), round: BigInt(data.round ?? 0) };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("TIMEOUT");
    }
    throw err;
  }
}
