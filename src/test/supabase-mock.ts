import { vi } from "vitest";

export interface FakeResult {
  data?: unknown;
  error?: unknown;
}

export type QueryOp = "select" | "insert" | "update" | "upsert" | "delete";

export interface QueryFilter {
  method: string;
  args: unknown[];
}

export interface QueryContext {
  table: string;
  op: QueryOp;
  single: boolean;
  payload: unknown;
  filters: QueryFilter[];
}

export type TableHandler = (ctx: QueryContext) => FakeResult;

type AuthCallback = (event: string, session: unknown) => void | Promise<void>;

export interface ChannelHandler {
  event: string;
  config: { event?: string };
  callback: (payload: unknown) => void;
}

export interface FakeChannel {
  handlers: ChannelHandler[];
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  emit: (event: string, payload: unknown) => void;
}

export interface SupabaseMockState {
  session: unknown;
  handlers: Record<string, TableHandler>;
  authCallback: AuthCallback | null;
  channels: FakeChannel[];
}

const OPERATION_METHODS: Record<string, QueryOp> = {
  insert: "insert",
  update: "update",
  upsert: "upsert",
  delete: "delete",
};

const PASSTHROUGH_METHODS = ["select", "order", "limit", "range"];
const FILTER_METHODS = ["eq", "neq", "ilike", "like", "in", "is", "not", "or", "gte", "lte", "gt", "lt"];

function makeBuilder(state: SupabaseMockState, table: string): Record<string, unknown> {
  const ctx: QueryContext = { table, op: "select", single: false, payload: undefined, filters: [] };

  const finalize = (single: boolean): Promise<FakeResult> => {
    ctx.single = single;
    const handler = state.handlers[table];
    if (handler) return Promise.resolve(handler(ctx));
    return Promise.resolve(single ? { data: null, error: null } : { data: [], error: null });
  };

  const builder: Record<string, unknown> = {};

  for (const [method, op] of Object.entries(OPERATION_METHODS)) {
    builder[method] = vi.fn((payload?: unknown) => {
      ctx.op = op;
      if (payload !== undefined) ctx.payload = payload;
      return builder;
    });
  }
  for (const method of PASSTHROUGH_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  for (const method of FILTER_METHODS) {
    builder[method] = vi.fn((...args: unknown[]) => {
      ctx.filters.push({ method, args });
      return builder;
    });
  }
  builder.single = vi.fn(() => finalize(true));
  builder.maybeSingle = vi.fn(() => finalize(true));
  builder.then = (onFulfilled: (value: FakeResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
    finalize(false).then(onFulfilled, onRejected);

  return builder;
}

function makeChannel(state: SupabaseMockState): FakeChannel {
  const handlers: ChannelHandler[] = [];
  const channel: FakeChannel = {
    handlers,
    on: vi.fn((event: string, config: { event?: string }, callback: (payload: unknown) => void) => {
      handlers.push({ event, config, callback });
      return channel;
    }),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn(() => Promise.resolve("ok")),
    send: vi.fn(() => Promise.resolve("ok")),
    emit: (event: string, payload: unknown) => {
      for (const handler of handlers) {
        if (handler.config?.event === event) handler.callback(payload);
      }
    },
  };
  state.channels.push(channel);
  return channel;
}

export function createSupabaseMock() {
  const state: SupabaseMockState = {
    session: null,
    handlers: {},
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
    from: vi.fn((table: string) => makeBuilder(state, table)),
    channel: vi.fn(() => makeChannel(state)),
    removeChannel: vi.fn(),
  };

  const reset = () => {
    state.session = null;
    state.handlers = {};
    state.authCallback = null;
    state.channels = [];
  };

  return { client, state, reset };
}
