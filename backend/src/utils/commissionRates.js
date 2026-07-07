/** Buyer fee added at checkout (unchanged). */
export const BUYER_COMMISSION_RATE = 0.05;

/** Early-user promotional worker/platform commission on service price. */
export const WORKER_COMMISSION_RATE = 0.05;

/** Standard rate shown in disclosures (not currently charged). */
export const STANDARD_WORKER_COMMISSION_RATE = 0.2;

export const WORKER_PAYOUT_SHARE = 1 - WORKER_COMMISSION_RATE;

export function workerNetFromGross(gross) {
  return gross * WORKER_PAYOUT_SHARE;
}

export function grossFromWorkerNet(net) {
  return net / WORKER_PAYOUT_SHARE;
}

export function workerCommissionFromGross(gross) {
  return gross * WORKER_COMMISSION_RATE;
}

export function workerCommissionFromNet(net) {
  return grossFromWorkerNet(net) * WORKER_COMMISSION_RATE;
}
