import {
  ArchitectureRepositoryError,
  type ArchitectureRepository,
} from "@/application/ports";
import type { Architecture, EntityId } from "@/domain/architecture";

import { hydrateArchitecture, serializeArchitecture } from "./architecture-record";
import {
  ARCHFORGE_DATABASE_NAME,
  ARCHFORGE_DATABASE_VERSION,
  ARCHITECTURE_STORE_NAME,
  upgradeArchitectureDatabase,
} from "./indexeddb-schema";

export interface IndexedDbArchitectureRepositoryOptions {
  readonly factory?: IDBFactory;
  readonly databaseName?: string;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function persistenceError(error: unknown): ArchitectureRepositoryError {
  if (error instanceof ArchitectureRepositoryError) return error;
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError") {
      return new ArchitectureRepositoryError(
        "quota",
        "Browser storage quota was exceeded.",
        false,
        error,
      );
    }
    if (
      error.name === "InvalidStateError" ||
      error.name === "UnknownError" ||
      error.name === "AbortError"
    ) {
      return new ArchitectureRepositoryError(
        "transaction",
        "The browser storage transaction could not complete.",
        true,
        error,
      );
    }
  }
  return new ArchitectureRepositoryError(
    "unknown",
    "Architecture persistence failed unexpectedly.",
    false,
    error,
  );
}

function compareArchitectures(left: Architecture, right: Architecture) {
  if (left.updatedAt !== right.updatedAt) {
    return left.updatedAt > right.updatedAt ? -1 : 1;
  }
  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

export class IndexedDbArchitectureRepository
  implements ArchitectureRepository
{
  private readonly factory: IDBFactory | undefined;
  private readonly databaseName: string;
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbArchitectureRepositoryOptions = {}) {
    this.factory = options.factory ?? globalThis.indexedDB;
    this.databaseName = options.databaseName ?? ARCHFORGE_DATABASE_NAME;
  }

  async list(): Promise<readonly Architecture[]> {
    const records = await this.withStore("readonly", (store) =>
      requestResult(store.getAll() as IDBRequest<unknown[]>),
    );
    return records
      .map((record) => hydrateArchitecture(record))
      .sort(compareArchitectures);
  }

  async get(id: EntityId): Promise<Architecture | null> {
    const record = await this.withStore("readonly", (store) =>
      requestResult(store.get(id) as IDBRequest<unknown>),
    );
    return record === undefined ? null : hydrateArchitecture(record);
  }

  async save(architecture: Architecture): Promise<void> {
    const record = serializeArchitecture(architecture);
    await this.withStore("readwrite", async (store) => {
      await requestResult(store.put(record));
    });
  }

  async delete(id: EntityId): Promise<void> {
    await this.withStore("readwrite", async (store) => {
      await requestResult(store.delete(id));
    });
  }

  close() {
    void this.databasePromise?.then((database) => database.close());
    this.databasePromise = null;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.factory) {
      return Promise.reject(
        new ArchitectureRepositoryError(
          "unavailable",
          "IndexedDB is not available in this environment.",
          false,
        ),
      );
    }
    if (this.databasePromise) return this.databasePromise;

    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory!.open(
        this.databaseName,
        ARCHFORGE_DATABASE_VERSION,
      );
      request.onupgradeneeded = (event) => {
        upgradeArchitectureDatabase(
          request.result,
          (event as IDBVersionChangeEvent).oldVersion,
        );
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(
          new ArchitectureRepositoryError(
            "unavailable",
            "IndexedDB upgrade is blocked by another ArchForge tab.",
            true,
          ),
        );
    }).catch((error) => {
      this.databasePromise = null;
      throw persistenceError(error);
    });
    this.databasePromise = opening;
    return opening;
  }

  private async withStore<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(ARCHITECTURE_STORE_NAME, mode);
      const completion = transactionCompletion(transaction);
      const result = await operation(
        transaction.objectStore(ARCHITECTURE_STORE_NAME),
      );
      await completion;
      return result;
    } catch (error) {
      throw persistenceError(error);
    }
  }
}
