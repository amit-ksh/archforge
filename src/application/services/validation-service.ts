import {
  ValidationIssueSchema,
  parseArchitectureContract,
  toArchitectureContract,
  type ValidationIssue,
} from "@/application/contracts";
import type { ArchitectureRepository } from "@/application/ports";
import {
  DomainError,
  type Architecture,
  type EntityId,
} from "@/domain/architecture";
import { ValidationEngine } from "@/domain/validation";

export class ValidationService {
  constructor(
    private readonly repository: ArchitectureRepository,
    private readonly engine: ValidationEngine,
  ) {}

  async validate(architectureId: EntityId): Promise<readonly ValidationIssue[]> {
    const architecture = await this.requireArchitecture(architectureId);
    let validatedArchitecture: Architecture;
    try {
      validatedArchitecture = parseArchitectureContract(
        toArchitectureContract(architecture),
      );
    } catch {
      throw new DomainError(
        "INVALID_ARCHITECTURE",
        `Architecture '${architectureId}' cannot be validated because its canonical data is invalid.`,
        { architectureId },
      );
    }

    return ValidationIssueSchema.array().parse(
      this.engine.validate(validatedArchitecture),
    );
  }

  private async requireArchitecture(id: EntityId): Promise<Architecture> {
    const architecture = await this.repository.get(id);
    if (!architecture) {
      throw new DomainError(
        "ENTITY_NOT_FOUND",
        `Architecture '${id}' was not found.`,
        { entity: "Architecture", id },
      );
    }
    return architecture;
  }
}
