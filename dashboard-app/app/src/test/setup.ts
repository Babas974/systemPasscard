import "@testing-library/jest-dom/vitest";

// Mock des plugins Tauri utilises par App.tsx mais pas installes dans package.json.
// On les declare comme vides pour permettre l'import sans erreur.
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async () => () => {}),
}));
vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(async () => true),
  requestPermission: vi.fn(async () => "granted"),
  sendNotification: vi.fn(),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(async () => null),
}));
