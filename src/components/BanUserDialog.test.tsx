/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabase-mock";

const mock = createSupabaseMock();
vi.mock("@/lib/supabase", () => ({ supabase: mock.client }));

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
});

async function renderDialog() {
  const BanUserDialog = (await import("@/components/BanUserDialog")).default;
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(
    <BanUserDialog
      targetUserId="u42"
      targetUsername="raider"
      onClose={onClose}
      onSuccess={onSuccess}
    />,
  );
  return { onClose, onSuccess };
}

describe("BanUserDialog · rendu", () => {
  it("affiche le pseudo ciblé et les quatre durées disponibles", async () => {
    await renderDialog();

    expect(screen.getByText(/@raider/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 h" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "24 h" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 j" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "perma" })).toBeInTheDocument();
  });

  it("ferme le dialogue avec la touche Échap", async () => {
    const { onClose } = await renderDialog();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("BanUserDialog · soumission", () => {
  it("bannit avec la durée par défaut de 24h et la raison saisie", async () => {
    const { onClose, onSuccess } = await renderDialog();

    fireEvent.change(screen.getByPlaceholderText("spam, insultes, raid…"), {
      target: { value: "flood du chat" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bannir" }));
    });

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0].fn).toBe("chat_ban_user");
    expect(rpcCalls[0].args).toMatchObject({ p_user_id: "u42", p_reason: "flood du chat" });
    const until = new Date(rpcCalls[0].args.p_until as string).getTime();
    expect(until - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(until - Date.now()).toBeLessThan(25 * 60 * 60 * 1000);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("bannit en permanence quand la durée perma est sélectionnée", async () => {
    await renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "perma" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bannir" }));
    });

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    const until = new Date(rpcCalls[0].args.p_until as string).getTime();
    expect(until - Date.now()).toBeGreaterThan(50 * 365 * 24 * 60 * 60 * 1000);
  });

  it("envoie p_reason à null quand aucune raison n'est saisie", async () => {
    await renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bannir" }));
    });

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0].args.p_reason).toBeNull();
  });

  it("affiche l'erreur Supabase et ne ferme pas le dialogue en cas d'échec", async () => {
    rpcHandler = () => ({ data: null, error: { message: "policy refusée" } });
    const { onClose, onSuccess } = await renderDialog();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Bannir" }));
    });

    await waitFor(() => expect(screen.getByText(/policy refusée/)).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
