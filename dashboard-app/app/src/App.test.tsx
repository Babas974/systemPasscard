import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

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

import { invoke } from "@tauri-apps/api/core";
import App from "./App";

const STATS_VIDES = {
  par_jour: [],
  top_contenus: [],
  heure_pointe: null,
  heure_pointe_nombre: 0,
  total: 0,
};

type Handlers = Record<string, unknown>;

function mockInvoke(handlers: Handlers = {}) {
  const defaults: Handlers = {
    lister_scans_pagines: [],
    compter_aujourd_hui: 0,
    compter_total: 0,
    obtenir_statistiques: STATS_VIDES,
    compter_avec_predicat: 0,
    exporter_csv: "/tmp/scans.csv",
  };
  const merged = { ...defaults, ...handlers };
  vi.mocked(invoke).mockImplementation(async (cmd: string) => {
    if (cmd in merged) return merged[cmd];
    return null;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("App - affichage", () => {
  it("affiche le titre Infirmerie et le statut serveur", async () => {
    mockInvoke();
    render(<App />);
    expect(screen.getByText("Infirmerie")).toBeInTheDocument();
    expect(screen.getByText(/Serveur actif.*port 8389/i)).toBeInTheDocument();
  });

  it("affiche le message vide quand la base est vide", async () => {
    mockInvoke();
    render(<App />);
    expect(
      await screen.findByText(/Aucun scan enregistr/i, {}, { timeout: 3000 })
    ).toBeInTheDocument();
  });

  it("affiche les scans retournes par lister_scans_pagines", async () => {
    mockInvoke({
      lister_scans_pagines: [
        { id: 1, contenu: "DUPONT Jean", date_heure: "2026-06-04 10:00:00" },
        { id: 2, contenu: "MARTIN Lea", date_heure: "2026-06-04 11:30:00" },
      ],
      compter_aujourd_hui: 2,
      compter_total: 2,
    });
    render(<App />);
    expect(await screen.findByText("DUPONT Jean")).toBeInTheDocument();
    expect(await screen.findByText("MARTIN Lea")).toBeInTheDocument();
  });
});

describe("App - compteurs", () => {
  it("affiche 0/0 quand la base est vide", async () => {
    mockInvoke();
    render(<App />);
    await waitFor(() => {
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("affiche les valeurs des compteurs Aujourd'hui et Total", async () => {
    mockInvoke({
      compter_aujourd_hui: 7,
      compter_total: 42,
    });
    render(<App />);
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(await screen.findByText("42")).toBeInTheDocument();
  });

  it("appelle compter_aujourd_hui, compter_total et obtenir_statistiques au chargement", async () => {
    mockInvoke();
    render(<App />);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("lister_scans_pagines", expect.any(Object));
      expect(invoke).toHaveBeenCalledWith("compter_aujourd_hui");
      expect(invoke).toHaveBeenCalledWith("compter_total");
      expect(invoke).toHaveBeenCalledWith("obtenir_statistiques");
    });
  });
});

describe("App - suppression", () => {
  it("appelle supprimer_scan lors du clic sur Supprimer d'une ligne", async () => {
    mockInvoke({
      lister_scans_pagines: [
        { id: 99, contenu: "TEST User", date_heure: "2026-06-04 10:00:00" },
      ],
    });
    render(<App />);
    const deleteBtn = await screen.findByRole("button", { name: "Supprimer" });
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("supprimer_scan", { id: 99 });
    });
  });

  it("ouvre la modale de suppression au clic sur le bouton d'action", async () => {
    mockInvoke();
    render(<App />);
    const trigger = await screen.findByRole("button", { name: /Supprimer des donn/i });
    fireEvent.click(trigger);
    expect(
      await screen.findByText(/Cette action est irr/i)
    ).toBeInTheDocument();
  });

  it("appelle supprimer_tout quand on confirme la selection 'Tout supprimer'", async () => {
    mockInvoke({
      lister_scans_pagines: [{ id: 1, contenu: "X", date_heure: "2026-06-04 10:00:00" }],
      compter_avec_predicat: 1,
    });
    render(<App />);
    const trigger = await screen.findByRole("button", { name: /Supprimer des donn/i });
    fireEvent.click(trigger);
    const toutRadio = await screen.findByDisplayValue("tout");
    fireEvent.click(toutRadio);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("compter_avec_predicat", expect.any(Object));
    });
    // Le bouton de confirmation dans la modale affiche "Supprimer (1)"
    const confirmBtn = await screen.findByRole("button", { name: /Supprimer \(/ });
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("supprimer_tout");
    });
  });
});
