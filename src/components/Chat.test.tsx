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
    fireEvent.click(screen.getByRole("button", { name: "envoyer" }));

    await waitFor(() => expect(inserts).toHaveLength(1));
    expect(inserts[0]).toMatchObject({ text: "bonsoir la salle" });
    expect((inserts[0] as { username: string }).username).toBeTruthy();
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
});
