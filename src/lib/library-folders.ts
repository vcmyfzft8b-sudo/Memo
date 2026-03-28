"use client";

export type LibraryFolder = {
  id: string;
  name: string;
  lectureIds: string[];
};

const LEGACY_FOLDERS_STORAGE_KEY = "nota-library-folders";
const FOLDERS_STORAGE_KEY_PREFIX = "nota-library-folders";
const SELECTED_FOLDER_STORAGE_KEY_PREFIX = "nota-selected-library-folder";

function parseStoredFolders(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((folder): folder is LibraryFolder => {
      if (!folder || typeof folder !== "object") {
        return false;
      }

      const value = folder as Partial<LibraryFolder>;

      return (
        typeof value.id === "string" &&
        typeof value.name === "string" &&
        Array.isArray(value.lectureIds) &&
        value.lectureIds.every((lectureId) => typeof lectureId === "string")
      );
    });
  } catch {
    return [];
  }
}

export function getFoldersStorageKey(userId: string) {
  return `${FOLDERS_STORAGE_KEY_PREFIX}:${userId}`;
}

export function getSelectedFolderStorageKey(userId: string) {
  return `${SELECTED_FOLDER_STORAGE_KEY_PREFIX}:${userId}`;
}

export function readStoredFolders(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const userScopedKey = getFoldersStorageKey(userId);
  const userScopedFolders = parseStoredFolders(window.localStorage.getItem(userScopedKey));

  if (userScopedFolders.length > 0) {
    return userScopedFolders;
  }

  const legacyFolders = parseStoredFolders(window.localStorage.getItem(LEGACY_FOLDERS_STORAGE_KEY));

  if (legacyFolders.length > 0) {
    window.localStorage.setItem(userScopedKey, JSON.stringify(legacyFolders));
  }

  return legacyFolders;
}

export function writeStoredFolders(userId: string, nextFolders: LibraryFolder[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getFoldersStorageKey(userId), JSON.stringify(nextFolders));
}

export function readStoredSelectedFolderId(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(getSelectedFolderStorageKey(userId));
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function writeStoredSelectedFolderId(userId: string, folderId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getSelectedFolderStorageKey(userId);

  if (folderId) {
    window.localStorage.setItem(storageKey, folderId);
    return;
  }

  window.localStorage.removeItem(storageKey);
}

export function createFolder(name: string, lectureIds: string[]) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    lectureIds,
  };
}

export function toggleLectureId(currentIds: string[], lectureId: string) {
  return currentIds.includes(lectureId)
    ? currentIds.filter((id) => id !== lectureId)
    : [...currentIds, lectureId];
}

export function assignLectureToFolder(userId: string, folderId: string | null, lectureId: string) {
  if (!folderId || typeof window === "undefined") {
    return;
  }

  const nextFolders = readStoredFolders(userId).map((folder) =>
    folder.id === folderId && !folder.lectureIds.includes(lectureId)
      ? {
          ...folder,
          lectureIds: [...folder.lectureIds, lectureId],
        }
      : folder,
  );

  writeStoredFolders(userId, nextFolders);
  writeStoredSelectedFolderId(userId, folderId);
}
