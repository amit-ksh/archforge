import type { Clock, IdGenerator } from "@/application/ports";
import type { IsoTimestamp } from "@/domain/architecture";

export class SystemClock implements Clock {
  now(): IsoTimestamp {
    return new Date().toISOString();
  }
}

export class CryptoIdGenerator implements IdGenerator {
  next(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }
}
