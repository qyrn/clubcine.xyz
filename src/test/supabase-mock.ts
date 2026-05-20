import { vi } from "vitest";

export interface FakeResult {
  data?: unknown;
  error?: unknown;
}

type AuthCallback = (event: string, session: unknown) => void | Promise<void>;

export interface ChannelHandler {
  event: string;
  config: unknown;
  callback: (payload: unknown) => void;
}

export interface FakeChannel {
  handlers: ChannelHandler[];
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  emit: (payload: unknown) => void;
}

export interface SupabaseMockState {
  session: unknown;
  results: FakeResult[];
  authCallback: AuthCallback | null;
  channels: FakeChannel[];
}

const CHAIN_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "neq",
  "ilike",
  "like",
  "in",
  "is",
  "not",
  "or",
  "order",
  "limit",
  "range",
  "gte",
  "lte",
  "gt",
  "lt",
];

function makeBuilder(results: FakeResult[]): Record<string, unknown> {
  const consume = (): Promise<FakeResult> =>
    Promise.resolve(results.shift() ?? { data: null, error: null });

  const builder: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(consume);
  builder.maybeSingle = vi.fn(consume);
  builder.then = (resolve: (value: FakeResult) => unknown, reject?: (reason: unknown) => unknown) =>
    consume().then(resolve, reject);
  return builder;
}

function makeChannel(state: SupabaseMockState): FakeChannel {
  const handlers: ChannelHandler[] = [];
  const channel: FakeChannel = {
    handlers,
    on: vi.fn((event: string, config: unknown, callback: (payload: unknown) => void) => {
      handlers.push({ event, config, callback });
      return channel;
    }),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn(() => Promise.resolve("ok")),
    emit: (payload: unknown) => {
      for (const handler of handlers) handler.callback(payload);
    },
  };
  state.channels.push(channel);
  return channel;
}

export function createSupabaseMock() {
  const state: SupabaseMockState = {
    session: null,
    results: [],
    authCallback: null,
    channels: [],
  };

  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: state.session } })),
      onAuthStateChange: vi.fn((cb: AuthCallback) => {
        state.authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signUp: vi.fn(async () => ({ data: {}, error: null as unknown })),
      signInWithPassword: vi.fn(async () => ({ data: {}, error: null as unknown })),
      signOut: vi.fn(async () => ({ error: null as unknown })),
    },
    from: vi.fn(() => makeBuilder(state.results)),
    channel: vi.fn(() => makeChannel(state)),
    removeChannel: vi.fn(),
  };

  const reset = () => {
    state.session = null;
    state.results = [];
    state.authCallback = null;
    state.channels = [];
  };

  return { client, state, reset };
}
