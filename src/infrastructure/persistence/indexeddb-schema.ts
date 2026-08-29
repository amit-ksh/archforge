export const ARCHFORGE_DATABASE_NAME = "archforge";
export const ARCHFORGE_DATABASE_VERSION = 1;
export const ARCHITECTURE_STORE_NAME = "architectures";
export const UPDATED_AT_INDEX_NAME = "by-updated-at";

export function upgradeArchitectureDatabase(
  database: IDBDatabase,
  oldVersion: number,
) {
  if (oldVersion < 1) {
    const store = database.createObjectStore(ARCHITECTURE_STORE_NAME, {
      keyPath: "id",
    });
    store.createIndex(UPDATED_AT_INDEX_NAME, "updatedAt", { unique: false });
  }
}
