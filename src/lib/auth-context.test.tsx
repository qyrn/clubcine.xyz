/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { createSupabaseMock } from "@/test/supabase-mock";

const mock = createSupabaseMock();
vi.mock("@/lib/supabase", () => ({ supabase: mock.client }));

type AuthModule = typeof import("@/lib/auth-context");
type AuthApi = ReturnType<AuthModule["useAuth"]>;

const TOKEN_KEY = "sb-jmkpzpfz-auth-token";

function profileRow(over: Record<string, unknown> = {}) {
  return {
    user_id: "u1",
    username: "lynch",
    bio: "",
    letterboxd: "",
    twitter: null,
    instagram: null,
    avatar_url: null,
    role: "spectateur",
    username_font_slug: null,
    username_color_slug: null,
    ...over,
  };
}

function signedInSession() {
  return { user: { id: "u1", user_metadata: {} } };
}

async function renderProvider() {
  const { AuthProvider, useAuth } = await import("@/lib/auth-context");
  let api: AuthApi | null = null;
  function Probe() {
    api = useAuth();
    return (
      <div>
        <span data-testid="loading">{String(api.loading)}</span>
        <span data-testid="username">{api.username ?? ""}</span>
        <span data-testid="role">{api.profile?.role ?? ""}</span>
        <span data-testid="bio">{api.profile?.bio ?? ""}</span>
      </div>
    );
  }
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  return { getApi: () => api as AuthApi };
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.reset();
  localStorage.clear();
});

describe("AuthProvider · lazy-init", () => {
  it("ne touche pas getSession quand aucun token n'est stocké", async () => {
    await renderProvider();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(mock.client.auth.getSession).not.toHaveBeenCalled();
    expect(screen.getByTestId("username")).toHaveTextContent("");
  });

  it("appelle getSession et charge le profil quand un token est présent", async () => {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = signedInSession();
    mock.state.handlers.profiles = () => ({ data: profileRow({ role: "admin" }) });

    await renderProvider();

    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("lynch"));
    expect(mock.client.auth.getSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("role")).toHaveTextContent("admin");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });
});

describe("AuthProvider · onAuthStateChange", () => {
  it("met à jour user et profil à la connexion", async () => {
    await renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    mock.state.handlers.profiles = () => ({ data: profileRow({ username: "bergman" }) });
    await act(async () => {
      await mock.state.authCallback?.("SIGNED_IN", signedInSession());
    });

    expect(screen.getByTestId("username")).toHaveTextContent("bergman");
  });

  it("efface le profil à la déconnexion", async () => {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = signedInSession();
    mock.state.handlers.profiles = () => ({ data: profileRow() });
    await renderProvider();
    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("lynch"));

    await act(async () => {
      await mock.state.authCallback?.("SIGNED_OUT", null);
    });

    expect(screen.getByTestId("username")).toHaveTextContent("");
    expect(screen.getByTestId("role")).toHaveTextContent("");
  });
});

describe("AuthProvider · updateProfile", () => {
  it("applique le patch quand l'UPDATE renvoie une ligne", async () => {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = signedInSession();
    mock.state.handlers.profiles = (ctx) =>
      ctx.op === "update"
        ? { data: [profileRow({ bio: "cinéaste du rêve" })] }
        : { data: profileRow() };
    const { getApi } = await renderProvider();
    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("lynch"));

    let res: string | null = "init";
    await act(async () => {
      res = await getApi().updateProfile({ bio: "cinéaste du rêve" });
    });

    expect(res).toBeNull();
    expect(screen.getByTestId("bio")).toHaveTextContent("cinéaste du rêve");
  });

  it("retombe sur un upsert quand l'UPDATE ne renvoie aucune ligne", async () => {
    localStorage.setItem(TOKEN_KEY, "stored");
    mock.state.session = signedInSession();
    mock.state.handlers.profiles = (ctx) => {
      if (ctx.op === "update") return { data: [] };
      if (ctx.op === "upsert") return { data: profileRow({ bio: "via upsert" }) };
      return { data: profileRow() };
    };
    const { getApi } = await renderProvider();
    await waitFor(() => expect(screen.getByTestId("username")).toHaveTextContent("lynch"));

    let res: string | null = "init";
    await act(async () => {
      res = await getApi().updateProfile({ bio: "via upsert" });
    });

    expect(res).toBeNull();
    expect(screen.getByTestId("bio")).toHaveTextContent("via upsert");
    expect(mock.client.from).toHaveBeenCalledTimes(3);
  });
});

describe("AuthProvider · signIn", () => {
  it("remonte le message d'erreur Supabase", async () => {
    mock.client.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: "Invalid login credentials" },
    });
    const { getApi } = await renderProvider();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));

    let res: string | null = null;
    await act(async () => {
      res = await getApi().signIn("a@b.c", "wrong");
    });

    expect(res).toBe("Invalid login credentials");
  });
});
