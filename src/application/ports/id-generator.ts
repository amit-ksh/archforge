import type { EntityId } from "@/domain/architecture";

export interface IdGenerator {
  next(prefix: string): EntityId;
}
