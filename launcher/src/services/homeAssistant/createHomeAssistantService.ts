import { createStore, type Store } from "../../shared/state/createStore";

import {
  type DrawerButton,
  type DrawerConfig,
  drawerEntityIds,
  EMPTY_DRAWER,
  normalizeDrawerConfig,
} from "./drawerConfig";

// Fork addition: a Home Assistant WebSocket client for the Home drawer.
// ha.json (url + long-lived token) is added to the package at install time and never committed.
export type HomeAssistantStatus = "loading" | "unconfigured" | "connecting" | "connected" | "offline" | "rejected";

export interface EntityState {
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly state: string;
}

export interface HomeAssistantSnapshot {
  readonly drawer: DrawerConfig;
  readonly states: Readonly<Record<string, EntityState>>;
  readonly status: HomeAssistantStatus;
}

export interface HomeAssistantService extends Store<HomeAssistantSnapshot> {
  dispose(): void;
  press(button: DrawerButton): void;
  start(): Promise<void>;
}

interface SocketLike {
  close(): void;
  onclose: ((this: never, event: CloseEvent) => unknown) | null;
  onmessage: ((this: never, event: MessageEvent) => unknown) | null;
  send(data: string): void;
}

export interface HomeAssistantDependencies {
  clearTimer(handle: number): void;
  createSocket(url: string): SocketLike;
  fetchJson(url: string): Promise<unknown>;
  setTimer(callback: () => void, ms: number): number;
}

const RETRY_MIN_MS = 5000;
const RETRY_MAX_MS = 60000;
const SUBSCRIBE_ID = 1;

const scalar = (value: unknown) =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readConnection = (value: unknown) => {
  const item = record(value);
  const url = typeof item.url === "string" ? item.url.trim().replace(/\/+$/, "") : "";
  const token = typeof item.token === "string" ? item.token.trim() : "";
  return /^https?:\/\/[^\s/]+/.test(url) && token ? { url, token } : null;
};

// subscribe_entities sends compressed updates: a = added, c = changed (+ set, - removed attributes), r = removed.
const applyEntityEvent = (
  states: Readonly<Record<string, EntityState>>,
  event: Record<string, unknown>,
): Record<string, EntityState> => {
  const next: Record<string, EntityState> = { ...states };
  Object.entries(record(event.a)).forEach(([id, raw]) => {
    const item = record(raw);
    next[id] = { state: scalar(item.s), attributes: record(item.a) };
  });
  Object.entries(record(event.c)).forEach(([id, raw]) => {
    const before = next[id] || { state: "", attributes: {} };
    const added = record(record(raw)["+"]);
    const removed = record(record(raw)["-"]);
    const attributes = { ...before.attributes, ...record(added.a) };
    (Array.isArray(removed.a) ? (removed.a as unknown[]) : []).forEach((key) => {
      delete attributes[scalar(key)];
    });
    next[id] = { state: added.s === undefined ? before.state : scalar(added.s), attributes };
  });
  (Array.isArray(event.r) ? (event.r as unknown[]) : []).forEach((id) => {
    delete next[scalar(id)];
  });
  return next;
};

export const createHomeAssistantService = (deps: HomeAssistantDependencies): HomeAssistantService => {
  const store = createStore<HomeAssistantSnapshot>({ status: "loading", drawer: EMPTY_DRAWER, states: {} });
  const update = (patch: Partial<HomeAssistantSnapshot>) => store.set({ ...store.getSnapshot(), ...patch });
  let socket: SocketLike | null = null;
  let timer: number | undefined;
  let retryMs = RETRY_MIN_MS;
  let nextId = SUBSCRIBE_ID + 1;
  let disposed = false;
  let started = false;
  let connection: { url: string; token: string } | null = null;

  const scheduleRetry = () => {
    if (disposed || timer !== undefined) {
      return;
    }
    timer = deps.setTimer(() => {
      timer = undefined;
      connect();
    }, retryMs);
    retryMs = Math.min(RETRY_MAX_MS, retryMs * 2);
  };

  const send = (message: Record<string, unknown>) => {
    try {
      socket?.send(JSON.stringify(message));
    } catch {
      // A closed socket reports through onclose; the retry handles it.
    }
  };

  const connect = () => {
    if (disposed || !connection) {
      return;
    }
    update({ status: "connecting" });
    let current: SocketLike;
    try {
      current = deps.createSocket(connection.url.replace(/^http/, "ws") + "/api/websocket");
    } catch {
      update({ status: "offline" });
      scheduleRetry();
      return;
    }
    socket = current;
    current.onmessage = ({ data }: MessageEvent) => {
      let message: Record<string, unknown>;
      try {
        message = record(JSON.parse(typeof data === "string" ? data : ""));
      } catch {
        return;
      }
      if (message.type === "auth_required" && connection) {
        send({ type: "auth", access_token: connection.token });
      } else if (message.type === "auth_ok") {
        retryMs = RETRY_MIN_MS;
        update({ status: "connected" });
        send({
          id: SUBSCRIBE_ID,
          type: "subscribe_entities",
          entity_ids: drawerEntityIds(store.getSnapshot().drawer),
        });
      } else if (message.type === "auth_invalid") {
        // Never retry a rejected token: repeated failures trip Home Assistant's IP ban.
        update({ status: "rejected" });
        disposed = true;
        current.close();
      } else if (message.type === "event" && message.id === SUBSCRIBE_ID) {
        update({ states: applyEntityEvent(store.getSnapshot().states, record(message.event)) });
      }
    };
    current.onclose = () => {
      if (socket === current) {
        socket = null;
      }
      if (!disposed) {
        update({ status: "offline" });
        scheduleRetry();
      }
    };
  };

  const loadDrawer = async (url: string) => {
    try {
      return normalizeDrawerConfig(await deps.fetchJson(url + "/local/tv-drawer.json"));
    } catch {
      try {
        return normalizeDrawerConfig(await deps.fetchJson("drawer.json"));
      } catch {
        return EMPTY_DRAWER;
      }
    }
  };

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    async start() {
      if (started) {
        return;
      }
      started = true;
      try {
        connection = readConnection(await deps.fetchJson("ha.json"));
      } catch {
        connection = null;
      }
      if (!connection) {
        let drawer = EMPTY_DRAWER;
        try {
          drawer = normalizeDrawerConfig(await deps.fetchJson("drawer.json"));
        } catch {
          // No packaged tiles either: the drawer stays empty.
        }
        update({ status: "unconfigured", drawer });
        return;
      }
      update({ drawer: await loadDrawer(connection.url) });
      connect();
    },
    press(button) {
      if (store.getSnapshot().status !== "connected") {
        return;
      }
      const [domain, service] = button.action.split(".");
      nextId += 1;
      send({
        id: nextId,
        type: "call_service",
        domain,
        service,
        ...(button.target ? { target: button.target } : {}),
        ...(button.data ? { service_data: button.data } : {}),
      });
    },
    dispose() {
      disposed = true;
      if (timer !== undefined) {
        deps.clearTimer(timer);
        timer = undefined;
      }
      socket?.close();
      socket = null;
    },
  };
};
