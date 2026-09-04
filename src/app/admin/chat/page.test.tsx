/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabase-mock";

const mock = createSupabaseMock();
vi.mock("@/lib/supabase", () => ({ supabase: mock.client }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children?: ReactNode; href?: unknown }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

const authState = vi.hoisted(() => ({
  current: {
    user: null as { id: string } | null,
    profile: null as { role: string } | null,
    loading: false,
  },
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

type RpcResult = { data?: unknown; error?: { message: string } | null };
type RpcHandler = (fn: string, args: Record<string, unknown>) => RpcResult;

const rpcCalls: RpcCall[] = [];
let rpcHandler: RpcHandler = () => ({ data: null, error: null });

(
  mock.client as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<RpcResult>;
  }
).rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
  rpcCalls.push({ fn, args });
  return rpcHandler(fn, args);
});

beforeEach(() => {
  vi.clearAllMocks();
  mock.reset();
  rpcCalls.length = 0;
  rpcHandler = () => ({ data: null, error: null });
  authState.current = { user: { id: "admin1" }, profile: { role: "admin" }, loading: false };
  mock.state.handlers.chat_settings = () => ({ data: { id: 1, frozen: false, slow_mode_seconds: 0 } });
  mock.state.handlers.profiles = () => ({ data: [] });
});

async function renderPage() {
  const ChatAdminPage = (await import("@/app/admin/chat/page")).default;
  return render(<ChatAdminPage />);
}

describe("ChatAdminPage · accès", () => {
  it("affiche l'écran d'accès refusé pour un profil non staff", async () => {
    authState.current = { user: { id: "u1" }, profile: { role: "spectateur" }, loading: false };
    await renderPage();

    await waitFor(() => expect(screen.getByText("★ Accès refusé")).toBeInTheDocument());
    expect(screen.queryByText("Modération chat")).not.toBeInTheDocument();
  });

  it("affiche le contenu de modération pour un admin", async () => {
    await renderPage();

    await waitFor(() => expect(screen.getByText("Modération chat")).toBeInTheDocument());
  });
});

describe("ChatAdminPage · gel du chat", () => {
  it("bascule le gel via chat_set_settings", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Geler" })).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Geler" }));
    });

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0]).toMatchObject({
      fn: "chat_set_settings",
      args: { p_frozen: true, p_slow_mode_seconds: 0 },
    });
  });

  it("reflète le gel une fois l'état realtime mis à jour", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Geler" })).toBeInTheDocument());

    await act(async () => {
      mock.findChannel("chat-settings").emit("UPDATE", {
        new: { id: 1, frozen: true, slow_mode_seconds: 0 },
      });
    });

    expect(await screen.findByRole("button", { name: "Dégeler" })).toBeInTheDocument();
  });
});

describe("ChatAdminPage · slow mode", () => {
  it("règle le slow mode à 30 secondes via chat_set_settings", async () => {
    await renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "30s" })).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "30s" }));
    });

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0]).toMatchObject({
      fn: "chat_set_settings",
      args: { p_frozen: false, p_slow_mode_seconds: 30 },
    });
  });
});

describe("ChatAdminPage · bans actifs", () => {
  it("affiche la liste des profils bannis", async () => {
    mock.state.handlers.profiles = () => ({
      data: [
        {
          user_id: "u9",
          username: "raider",
          avatar_url: null,
          role: "spectateur",
          chat_banned_until: new Date(Date.now() + 3_600_000).toISOString(),
          chat_ban_reason: "flood",
        },
      ],
    });

    await renderPage();

    await waitFor(() => expect(screen.getByText("@raider")).toBeInTheDocument());
    expect(screen.getByText("flood")).toBeInTheDocument();
    expect(screen.getByText("1 compte")).toBeInTheDocument();
  });

  it("affiche aucun ban actif quand la liste est vide", async () => {
    await renderPage();

    await waitFor(() => expect(screen.getByText("aucun ban actif")).toBeInTheDocument());
  });

  it("lève un ban via chat_ban_user et retire l'entrée de la liste", async () => {
    mock.state.handlers.profiles = () => ({
      data: [
        {
          user_id: "u9",
          username: "raider",
          avatar_url: null,
          role: "spectateur",
          chat_banned_until: new Date(Date.now() + 3_600_000).toISOString(),
          chat_ban_reason: "flood",
        },
      ],
    });

    await renderPage();
    await waitFor(() => expect(screen.getByText("@raider")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lever" }));
    });

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0]).toMatchObject({
      fn: "chat_ban_user",
      args: { p_user_id: "u9", p_until: null, p_reason: null },
    });
    await waitFor(() => expect(screen.queryByText("@raider")).not.toBeInTheDocument());
    expect(screen.getByText("aucun ban actif")).toBeInTheDocument();
  });
});
