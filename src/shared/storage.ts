import type { CaptureAsset, EditorPreferences, SnapshotRecord, UserFrameTemplate } from "./types";

export const StorageKeys = {
  LatestCaptureId: "snaptab.latestCaptureId",
  CapturePrefix: "snaptab.capture.",
  RecentShots: "snaptab.recentShots",
  Preferences: "snaptab.preferences",
  UserFrameTemplates: "snaptab.userFrameTemplates"
} as const;

const DEFAULT_PREFERENCES: EditorPreferences = {
  exportFormat: "png",
  jpgQuality: 0.92,
  filenamePattern: "domain-timestamp",
  defaultShareAction: "copy"
};

export async function saveCapture(capture: CaptureAsset): Promise<void> {
  const key = StorageKeys.CapturePrefix + capture.id;
  const state = await chrome.storage.local.get([StorageKeys.RecentShots]);
  const recent = (state[StorageKeys.RecentShots] as SnapshotRecord[] | undefined) ?? [];
  const nextRecent = [
    {
      id: capture.id,
      createdAt: capture.createdAt,
      mode: capture.mode,
      pageTitle: capture.pageTitle,
      pageUrl: capture.pageUrl
    },
    ...recent.filter((item) => item.id !== capture.id)
  ].slice(0, 30);

  await chrome.storage.local.set({
    [key]: capture,
    [StorageKeys.LatestCaptureId]: capture.id,
    [StorageKeys.RecentShots]: nextRecent
  });
}

export async function getCaptureById(captureId: string): Promise<CaptureAsset | null> {
  const key = StorageKeys.CapturePrefix + captureId;
  const result = await chrome.storage.local.get([key]);
  return (result[key] as CaptureAsset | undefined) ?? null;
}

export async function getLatestCaptureId(): Promise<string | null> {
  const result = await chrome.storage.local.get([StorageKeys.LatestCaptureId]);
  return (result[StorageKeys.LatestCaptureId] as string | undefined) ?? null;
}

export async function getPreferences(): Promise<EditorPreferences> {
  const result = await chrome.storage.local.get([StorageKeys.Preferences]);
  const stored = result[StorageKeys.Preferences] as Partial<EditorPreferences> | undefined;
  return {
    ...DEFAULT_PREFERENCES,
    ...stored
  };
}

export async function setPreferences(preferences: EditorPreferences): Promise<void> {
  await chrome.storage.local.set({
    [StorageKeys.Preferences]: preferences
  });
}

export async function getUserFrameTemplates(): Promise<UserFrameTemplate[]> {
  const result = await chrome.storage.local.get([StorageKeys.UserFrameTemplates]);
  return (result[StorageKeys.UserFrameTemplates] as UserFrameTemplate[] | undefined) ?? [];
}

export async function setUserFrameTemplates(templates: UserFrameTemplate[]): Promise<void> {
  await chrome.storage.local.set({
    [StorageKeys.UserFrameTemplates]: templates
  });
}
