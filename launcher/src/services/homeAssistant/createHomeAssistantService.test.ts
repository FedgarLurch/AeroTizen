import { describe, expect, it } from "vitest";

import { createHomeAssistantService } from "./createHomeAssistantService";
import { normalizeDrawerConfig } from "./drawerConfig";

const ROOM = ["Living", "Room"].join(" ");
const DRAWER = {
  title: ROOM,
  readouts: [{ name: "Front door", entity: "lock.front_door" }],
  buttons: [
    {
      name: "Lights",
      icon: "lightbulb",
      entity: "light.lr",
      action: "light.toggle",
      target: { entity_id: "light.lr" },
    },
  ],
};

const fakeSocket = () => {
  const sent: Record<string, unknown>[] = [];
  const socket = {
    onclose: null as ((event: CloseEvent) => unknown) | null,
    onmessage: null as ((event: MessageEvent) => unknown) | null,
    send: (data: string) => sent.push(JSON.parse(data) as Record<string, unknown>),
    close: () => socket.onclose?.({} as CloseEvent),
    receive: (message: unknown) => socket.onmessage?.({ data: JSON.stringify(message) } as MessageEvent),
  };
  return { socket, sent };
};

const setup = (files: Record<string, unknown>) => {
  const sockets: ReturnType<typeof fakeSocket>[] = [];
  const timers: (() => void)[] = [];
  const service = createHomeAssistantService({
    fetchJson: (url) => (url in files ? Promise.resolve(files[url]) : Promise.reject(new Error("404"))),
    createSocket: () => {
      const created = fakeSocket();
      sockets.push(created);
      return created.socket;
    },
    setTimer: (callback) => timers.push(callback),
    clearTimer: () => undefined,
  });
  return { service, sockets, timers };
};

describe("drawer config", () => {
  it("drops invalid tiles and keeps valid ones", () => {
    const config = normalizeDrawerConfig({
      title: ROOM,
      readouts: [{ name: "Bad" }, { name: "Door", entity: "lock.front_door" }],
      buttons: [{ name: "No action" }, { name: "Fan", action: "fan.toggle", icon: "rocket" }],
    });
    expect(config.readouts).toEqual([{ name: "Door", entity: "lock.front_door" }]);
    expect(config.buttons).toEqual([{ name: "Fan", action: "fan.toggle", icon: "power" }]);
  });
});

describe("Home Assistant service", () => {
  it("shows the packaged tiles and waits when there is no token", async () => {
    const { service, sockets } = setup({ "drawer.json": DRAWER });
    await service.start();
    expect(service.getSnapshot().status).toBe("unconfigured");
    expect(service.getSnapshot().drawer.buttons).toHaveLength(1);
    expect(sockets).toHaveLength(0);
  });

  it("authenticates, applies state updates and sends actions", async () => {
    const { service, sockets } = setup({
      "ha.json": { url: "http://ha.local:8123/", token: "t" },
      "drawer.json": DRAWER,
    });
    await service.start();
    const { socket, sent } = sockets[0];
    socket.receive({ type: "auth_required" });
    expect(sent[0]).toEqual({ type: "auth", access_token: "t" });
    socket.receive({ type: "auth_ok" });
    expect(sent[1]).toMatchObject({ type: "subscribe_entities", entity_ids: ["lock.front_door", "light.lr"] });
    socket.receive({ id: 1, type: "event", event: { a: { "light.lr": { s: "off", a: { brightness: 0 } } } } });
    socket.receive({
      id: 1,
      type: "event",
      event: { c: { "light.lr": { "+": { s: "on" }, "-": { a: ["brightness"] } } } },
    });
    expect(service.getSnapshot().states["light.lr"]).toEqual({ state: "on", attributes: {} });
    service.press(service.getSnapshot().drawer.buttons[0]);
    expect(sent[2]).toMatchObject({
      type: "call_service",
      domain: "light",
      service: "toggle",
      target: { entity_id: "light.lr" },
    });
  });

  it("never retries a rejected token", async () => {
    const { service, sockets, timers } = setup({ "ha.json": { url: "http://ha.local:8123", token: "bad" } });
    await service.start();
    sockets[0].socket.receive({ type: "auth_required" });
    sockets[0].socket.receive({ type: "auth_invalid" });
    expect(service.getSnapshot().status).toBe("rejected");
    expect(timers).toHaveLength(0);
  });

  it("retries after the connection drops", async () => {
    const { service, sockets, timers } = setup({ "ha.json": { url: "http://ha.local:8123", token: "t" } });
    await service.start();
    sockets[0].socket.close();
    expect(service.getSnapshot().status).toBe("offline");
    timers[0]();
    expect(sockets).toHaveLength(2);
  });
});
