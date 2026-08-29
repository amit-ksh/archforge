import type { IsoTimestamp } from "@/domain/architecture";

export interface Clock {
  now(): IsoTimestamp;
}
