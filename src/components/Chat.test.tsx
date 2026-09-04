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

const TOKEN_KEY = "sb-jmkpzpfz-auth-token";

interface Msg {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

function adminProfileRow() {
  return {
    user_id: "admin1",
    username: "moncle",
    bio: "",
    letterboxd: "",
    twitter: null,
    instagram: null,
    avatar_url: null,
    role: "admin",
    username_font_slug: null,
    username_color_slug: null,
  };
}

async function renderChat() {
  const Chat = (await import("@/components/Chat")).default;
  return render(<Chat onCollapse={() => {}} />);
}

async function renderChatWithAuth() {
  const Chat = (await import("@/components/Chat")).default;
  const { AuthProvider } = await import("@/lib/auth-context");
  return render(
    <AuthProvider>
      <Chat onCollapse={() => {}} />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.reset();
  localStorage.clear();
  rpcCalls.length = 0;
  rpcHandler = () => ({ data: null, error: null });
});

describe("Chat · états de chargement", () => {
  it("affiche le chargement puis l'état vide", async () => {
    mock.state.handlers.messages = () => ({ data: [] });
    await renderChat();

    expect(screen.getByText(/chargement/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/personne ne parle/)).toBeInTheDocument());
  });

  it("affiche indisponible quand le fetch échoue", async () => {
    mock.state.handlers.messages = () => ({ data: null, error: { message: "boom" } });
    await renderChat();

    await waitFor(() => expect(screen.getByText(/indisponible/)).toBeInTheDocument());
  });

  it("rend les messages chargés", async () => {
    mock.state.handlers.messages = () => ({
      data: [
        { id: "m2", username: "tati", text: "playtime", timestamp: 2000 },
        { id: "m1", username: "bresson", text: "pickpocket", timestamp: 1000 },
      ],
    });
    await renderChat();

    await waitFor(() => expect(screen.getByText("playtime")).toBeInTheDocument());
    expect(screen.getByText("pickpocket")).toBeInTheDocument();
  });
});

describe("Chat · realtime", () => {
  it("ajoute un message reçu via le canal INSERT", async () => {
    mock.state.handlers.messages = () => ({ data: [] });
    await renderChat();
    await waitFor(() => expect(screen.getByText(/personne ne parle/)).toBeInTheDocument());

    act(() => {
      mock.findChannel("chat").emit("INSERT", {
        new: { id: "rt1", username: "varda", text: "cléo de 5 à 7", timestamp: 5000 },
      });
    });

    await waitFor(() => expect(screen.getByText("cléo de 5 à 7")).toBeInTheDocument());
  });

  it("retire un message reçu via le canal DELETE", async () => {
    mock.state.handlers.messages = () => ({
      data: [
        { id: "keep", username: "tati", text: "mon oncle", timestamp: 2000 },
        { id: "drop", username: "tati", text: "trafic", timestamp: 1000 },
      ],
    });
    await renderChat();
    await waitFor(() => expect(screen.getByText("trafic")).toBeInTheDocument());

    act(() => {
      mock.findChannel("chat").emit("DELETE", { old: { id: "drop" } });
    });

    await waitFor(() => expect(screen.queryByText("trafic")).not.toBeInTheDocument());
    expect(screen.getByText("mon oncle")).toBeInTheDocument();
  });
});

describe("Chat · envoi", () => {
  it("insère le message saisi dans le formulaire", async () => {
    const inserts: unknown[] = [];
    mock.state.handlers.messages = (ctx) => {
      if (ctx.op === "insert") {
        inserts.push(ctx.payload);
        return { data: null };
      }
      return { data: [] };
    };
    await renderChat();
    await waitFor(() => expect(screen.getByText(/personne ne parle/)).toBeInTheDocument());

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "bonsoir la salle" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(inserts).toHaveLength(1));
    expect(inserts[0]).toMatchObject({ text: "bonsoir la salle" });
    expect((inserts[0] as { username: string }).username).toBeTruthy();
  });
});

describe("Chat · dons", () => {
  it("rend une notification de don comme ligne système", async () => {
    mock.state.handlers.messages = () => ({
      data: [
        {
          id: "s1",
          username: "lauraPalmer",
          text: "lauraPalmer vient de soutenir la chaîne",
          timestamp: 3000,
          kind: "system",
        },
      ],
    });
    await renderChat();

    await waitFor(() =>
      expect(screen.getByText("vient de soutenir la chaîne")).toBeInTheDocument(),
    );
    expect(screen.getByText("lauraPalmer")).toBeInTheDocument();
  });

  it("ne compte pas les notifications système dans le total de messages", async () => {
    mock.state.handlers.messages = () => ({
      data: [
        { id: "m1", username: "tati", text: "playtime", timestamp: 1000 },
        {
          id: "s1",
          username: "Un anonyme",
          text: "Un anonyme vient de soutenir la chaîne",
          timestamp: 2000,
          kind: "system",
        },
      ],
    });
    const Chat = (await import("@/components/Chat")).default;
    render(<Chat />);

    await waitFor(() => expect(screen.getByText("playtime")).toBeInTheDocument());
    expect(screen.getByText("1 message")).toBeInTheDocument();
  });

  it("ajoute une notification de don reçue en realtime", async () => {
    mock.state.handlers.messages = () => ({ data: [] });
    await renderChat();
    await waitFor(() => expect(screen.getByText(/personne ne parle/)).toBeInTheDocument());

    act(() => {
      mock.findChannel("chat").emit("INSERT", {
        new: {
          id: "s2",
          username: "keyzersoze",
          text: "keyzersoze vient de soutenir la chaîne",
          timestamp: 6000,
          kind: "system",
        },
      });
    });

    await waitFor(() =>
      expect(screen.getByText("vient de soutenir la chaîne")).toBeInTheDocument(),
    );
  });

  it("rend une annonce de soirée (kind soiree) telle quelle", async () => {
    mock.state.handlers.messages = () => ({
      data: [
        {
          id: "so1",
          username: "clubcine",
          text: "La soirée « Affaires non classées » commence",
          timestamp: 4000,
          kind: "soiree",
        },
      ],
    });
    await renderChat();
    await waitFor(() =>
      expect(
        screen.getByText("La soirée « Affaires non classées » commence"),
      ).toBeInTheDocument(),
    );
  });
});

describe("Chat · réponses et /me", () => {
  it("rend une action /me en italique, sans séparateur deux-points", async () => {
    mock.state.handlers.messages = () => ({
      data: [{ id: "m1", username: "tati", text: "/me sifflote", timestamp: 1000 }],
    });
    await renderChat();

    await waitFor(() => expect(screen.getByText("sifflote")).toBeInTheDocument());
    expect(screen.queryByText(":", { exact: true })).not.toBeInTheDocument();
  });

  it("joint reply_meta à l'insertion quand on répond à un message", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    mock.state.handlers.messages = (ctx) => {
      if (ctx.op === "insert") {
        inserts.push(ctx.payload as Record<string, unknown>);
        return { data: null };
      }
      return { data: [{ id: "m1", username: "varda", text: "cléo", timestamp: 1000 }] };
    };
    await renderChat();
    await waitFor(() => expect(screen.getByText("cléo")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Répondre à varda"));
    expect(screen.getByText(/Réponse à/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "bien vu" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(inserts).toHaveLength(1));
    expect(inserts[0].reply_meta).toMatchObject({ username: "varda", excerpt: "cléo" });
  });

  it("affiche l'extrait cité au-dessus d'une réponse", async () => {
    mock.state.handlers.messages = () => ({
      data: [
        { id: "m1", username: "varda", text: "cléo de 5 à 7", timestamp: 1000 },
        {
          id: "m2",
          username: "demy",
          text: "les parapluies",
          timestamp: 2000,
          reply_meta: { id: "m1", username: "varda", excerpt: "cléo de 5 à 7" },
        },
      ],
    });
    await renderChat();

    await waitFor(() => expect(screen.getByText("les parapluies")).toBeInTheDocument());
    expect(screen.getAllByText("cléo de 5 à 7")).toHaveLength(2);
  });
});

describe("Chat · modération", () => {
  it("laisse un admin supprimer un message avec retrait optimiste", async () => {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = { user: { id: "admin1", user_metadata: {} } };
    mock.state.handlers.profiles = (ctx) => (ctx.single ? { data: adminProfileRow() } : { data: [] });

    let db: Msg[] = [
      { id: "keep", username: "tati", text: "playtime", timestamp: 2000 },
      { id: "kill", username: "tati", text: "à supprimer", timestamp: 1000 },
    ];
    mock.state.handlers.messages = (ctx) => {
      if (ctx.op === "delete") {
        const filter = ctx.filters.find((f) => f.method === "eq" && f.args[0] === "id");
        const id = filter?.args[1];
        const removed = db.filter((m) => m.id === id);
        db = db.filter((m) => m.id !== id);
        return { data: removed.map((m) => ({ id: m.id })) };
      }
      return { data: db.slice() };
    };

    await renderChatWithAuth();
    await waitFor(() => expect(screen.getByText("à supprimer")).toBeInTheDocument());

    const deleteButtons = screen.getAllByLabelText("Supprimer ce message");
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => expect(screen.queryByText("à supprimer")).not.toBeInTheDocument());
    expect(screen.getByText("playtime")).toBeInTheDocument();
  });

  it("signale le refus RLS quand le delete renvoie 0 ligne affectée", async () => {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = { user: { id: "admin1", user_metadata: {} } };
    mock.state.handlers.profiles = (ctx) => (ctx.single ? { data: adminProfileRow() } : { data: [] });

    const db: Msg[] = [{ id: "kill", username: "tati", text: "protégé", timestamp: 1000 }];
    mock.state.handlers.messages = (ctx) => {
      if (ctx.op === "delete") return { data: [] };
      return { data: db.slice() };
    };

    await renderChatWithAuth();
    await waitFor(() => expect(screen.getByText("protégé")).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Supprimer ce message"));
    });

    await waitFor(() =>
      expect(screen.getByText(/RLS a refusé la suppression/)).toBeInTheDocument(),
    );
    expect(screen.queryByText("protégé")).not.toBeInTheDocument();
  });

  it("purge tous les messages d'un utilisateur via l'action de purge auteur", async () => {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = { user: { id: "admin1", user_metadata: {} } };
    mock.state.handlers.profiles = (ctx) => (ctx.single ? { data: adminProfileRow() } : { data: [] });

    let db: Msg[] = [
      { id: "a1", username: "tati", text: "un", timestamp: 1000 },
      { id: "a2", username: "tati", text: "deux", timestamp: 2000 },
      { id: "b1", username: "varda", text: "trois", timestamp: 3000 },
    ];
    mock.state.handlers.messages = (ctx) => {
      if (ctx.op === "delete") {
        const filter = ctx.filters.find((f) => f.method === "eq" && f.args[0] === "username");
        const target = filter?.args[1];
        const removed = db.filter((m) => m.username === target);
        db = db.filter((m) => m.username !== target);
        return { data: removed.map((m) => ({ id: m.id })) };
      }
      return { data: db.slice() };
    };

    await renderChatWithAuth();
    await waitFor(() => expect(screen.getByText("deux")).toBeInTheDocument());

    const purgeButtons = screen.getAllByLabelText("Supprimer tous les messages de @tati");
    await act(async () => {
      fireEvent.click(purgeButtons[0]);
    });

    await waitFor(() => expect(screen.queryByText("un")).not.toBeInTheDocument());
    expect(screen.queryByText("deux")).not.toBeInTheDocument();
    expect(screen.getByText("trois")).toBeInTheDocument();
  });
});

describe("Chat · commandes de modération", () => {
  type MessagesHandler = typeof mock.state.handlers.messages;

  async function renderAsAdmin(handler: MessagesHandler = () => ({ data: [] })) {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = { user: { id: "admin1", user_metadata: {} } };
    mock.state.handlers.profiles = (ctx) => (ctx.single ? { data: adminProfileRow() } : { data: [] });
    mock.state.handlers.messages = handler;
    await renderChatWithAuth();
    await waitFor(() => expect(screen.getByText(/personne ne parle/)).toBeInTheDocument());
  }

  const runCommand = async (text: string) => {
    fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    });
  };

  it("/freeze fige le chat via chat_set_settings", async () => {
    await renderAsAdmin();
    await runCommand("/freeze");

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0]).toMatchObject({
      fn: "chat_set_settings",
      args: { p_frozen: true, p_slow_mode_seconds: 0 },
    });
    expect(screen.getByText(/Chat figé/)).toBeInTheDocument();
  });

  it("/unfreeze dégèle le chat via chat_set_settings", async () => {
    await renderAsAdmin();
    await runCommand("/unfreeze");

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0]).toMatchObject({
      fn: "chat_set_settings",
      args: { p_frozen: false, p_slow_mode_seconds: 0 },
    });
    expect(screen.getByText(/Chat dégelé/)).toBeInTheDocument();
  });

  it("/slow 30 règle le slow mode à 30 secondes via chat_set_settings", async () => {
    await renderAsAdmin();
    await runCommand("/slow 30");

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0]).toMatchObject({
      fn: "chat_set_settings",
      args: { p_frozen: false, p_slow_mode_seconds: 30 },
    });
    expect(screen.getByText(/Slow mode réglé à 30s/)).toBeInTheDocument();
  });

  it("/slowoff désactive le slow mode via chat_set_settings", async () => {
    await renderAsAdmin();
    await runCommand("/slowoff");

    await waitFor(() => expect(rpcCalls).toHaveLength(1));
    expect(rpcCalls[0]).toMatchObject({
      fn: "chat_set_settings",
      args: { p_frozen: false, p_slow_mode_seconds: 0 },
    });
    expect(screen.getByText(/Slow mode désactivé/)).toBeInTheDocument();
  });

  it("/clear supprime tous les messages côté serveur et vide le fil affiché", async () => {
    const deletes: Array<{ method: string; args: unknown[] }[]> = [];
    await renderAsAdmin((ctx) => {
      if (ctx.op === "delete") {
        deletes.push(ctx.filters);
        return { data: [] };
      }
      return { data: [] };
    });

    await runCommand("/clear");

    await waitFor(() => expect(deletes).toHaveLength(1));
    expect(deletes[0]).toContainEqual(
      expect.objectContaining({ method: "gte", args: ["timestamp", 0] }),
    );
    expect(screen.getByText(/Chat purgé/)).toBeInTheDocument();
  });
});

describe("Chat · mentions et emotes", () => {
  it("rend une mention @pseudo comme un lien vers le profil", async () => {
    mock.state.handlers.messages = () => ({
      data: [{ id: "m1", username: "chris", text: "salut @varda ça va", timestamp: 1000 }],
    });
    await renderChat();

    await waitFor(() => expect(screen.getByText(/salut/)).toBeInTheDocument());
    const link = screen.getByRole("link", { name: "@varda" });
    expect(link).toHaveAttribute("href", "/u/varda");
  });

  it("rend une emote connue en image et laisse une emote inconnue en texte brut", async () => {
    mock.state.handlers.messages = () => ({
      data: [{ id: "m1", username: "tati", text: "regarde :kappa: et :inconnue:", timestamp: 1000 }],
    });
    await renderChat();
    await waitFor(() => expect(screen.getByText(/regarde/)).toBeInTheDocument());

    const { invalidateEmotesCache } = await import("@/lib/use-emotes");
    mock.state.handlers.emotes = () => ({
      data: [
        {
          slug: "kappa",
          label: "Kappa",
          image_url: "https://cdn.clubcine.xyz/emotes/kappa.png",
          image_path: "emotes/kappa.png",
          uploader_id: null,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    await act(async () => {
      invalidateEmotesCache();
      await new Promise((r) => setTimeout(r, 0));
    });

    const img = await screen.findByAltText(":kappa:");
    expect(img).toHaveAttribute("src", "https://cdn.clubcine.xyz/emotes/kappa.png");
    expect(screen.getByText(/:inconnue:/)).toBeInTheDocument();
  });
});

describe("Chat · verrou anti-spam local", () => {
  it("bloque un renvoi immédiat après un rejet spam, sans nouvel appel réseau", async () => {
    const inserts: unknown[] = [];
    let first = true;
    mock.state.handlers.messages = (ctx) => {
      if (ctx.op === "insert") {
        inserts.push(ctx.payload);
        if (first) {
          first = false;
          return { data: null, error: { message: "tu spammes, réessaie dans 5 secondes" } };
        }
        return { data: null };
      }
      return { data: [] };
    };
    await renderChat();
    await waitFor(() => expect(screen.getByText(/personne ne parle/)).toBeInTheDocument());

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "premier message" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    });

    await waitFor(() => expect(inserts).toHaveLength(1));
    await waitFor(() => expect(screen.getByText(/tu spammes/)).toBeInTheDocument());

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "second message" } });
    const form = screen.getByRole("textbox").closest("form");
    expect(form).not.toBeNull();
    await act(async () => {
      fireEvent.submit(form as HTMLFormElement);
    });

    expect(inserts).toHaveLength(1);
  });
});

describe("Chat · bannissement du compte connecté", () => {
  it("affiche ChatBanNotice quand le compte connecté a un ban actif", async () => {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = { user: { id: "u1", user_metadata: {} } };
    const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    mock.state.handlers.profiles = (ctx) =>
      ctx.single
        ? {
            data: {
              user_id: "u1",
              username: "banni",
              bio: "",
              letterboxd: "",
              twitter: null,
              instagram: null,
              avatar_url: null,
              role: "spectateur",
              username_font_slug: null,
              username_color_slug: null,
              chat_banned_until: until,
              chat_ban_reason: "spam répété",
            },
          }
        : { data: [] };
    mock.state.handlers.messages = () => ({ data: [] });

    await renderChatWithAuth();

    await waitFor(() => expect(screen.getByText(/Tu es banni du chat/)).toBeInTheDocument());
    expect(screen.getByText(/spam répété/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Envoyer un message")).not.toBeInTheDocument();
  });
});
