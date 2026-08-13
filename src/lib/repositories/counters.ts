import { readJson, writeJson } from "@/lib/storage/local-storage";

export interface Counters {
  pedidoNumero: number;
}

const DEFAULT_COUNTERS: Counters = { pedidoNumero: 1 };

export function getCounters(): Counters {
  return readJson<Counters>("counters", DEFAULT_COUNTERS);
}

export function setCounters(counters: Counters): void {
  writeJson("counters", counters);
}

export function nextPedidoNumero(): number {
  const counters = getCounters();
  const numero = counters.pedidoNumero;
  setCounters({ ...counters, pedidoNumero: numero + 1 });
  return numero;
}