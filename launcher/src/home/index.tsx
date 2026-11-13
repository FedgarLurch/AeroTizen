import { createRef, render } from "preact";
import { flushSync } from "preact/compat";

import type { SettingsStore } from "../contracts/preferences";
import type { StatusStores } from "../contracts/status";
import type { LauncherUpdateNotice } from "../contracts/updates";
import type { LauncherRuntime } from "../platform/tizen/launcherRuntime";
import { createLaunchStatsService } from "../services/createLaunchStatsService";
import { createHomeAssistantService } from "../services/homeAssistant/createHomeAssistantService";
import { describeApp } from "../shared/apps/appPresentation";
import type { Translations } from "../shared/i18n/createTranslations";
import { TranslationContext } from "../shared/i18n/useTranslation";
import { InputScopeContext } from "../shared/input/context";

import { Home } from "./components/Home/Home";
import { createHomeController } from "./state/createHomeController";
import { createHomeInventory } from "./state/createHomeInventory";

export const mountHome = (
  runtime: LauncherRuntime,
  settings: SettingsStore,
  mount: HTMLElement,
  status: StatusStores,
  translations: Translations,
  updates: LauncherUpdateNotice,
) => {
  const document = mount.ownerDocument;
  const artworkEnvironment = { tv: !!runtime.tizen };
  // Apply the shell appearance before any Home focus geometry is measured.
  const syncShell = () => {
    const values = settings.getSnapshot();
    document.body.classList.toggle("glass-ui", values.theme === "glass");
    document.documentElement.setAttribute("data-performance-mode", String(values.performanceMode));
  };
  syncShell();
  const unsubscribeShell = settings.subscribe(syncShell);
  const inventory = createHomeInventory(runtime, settings, flushSync);
  const rows = createRef<HTMLElement>();
  // XMLHttpRequest also reads the packaged ha.json and drawer.json, which fetch() cannot load from file:// on the TV.
  const fetchJson = (url: string) =>
    new Promise<unknown>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("GET", url);
      request.timeout = 8000;
      request.onload = () => {
        if ((request.status === 0 || (request.status >= 200 && request.status < 300)) && request.responseText) {
          try {
            resolve(JSON.parse(request.responseText));
          } catch {
            reject(new Error("invalid JSON"));
          }
        } else {
          reject(new Error("HTTP " + request.status));
        }
      };
      request.onerror = () => reject(new Error("network"));
      request.ontimeout = () => reject(new Error("timeout"));
      request.send();
    });
  const homeAssistant = createHomeAssistantService({
    fetchJson,
    createSocket: (url) => new WebSocket(url),
    setTimer: (callback, ms) => window.setTimeout(callback, ms),
    clearTimer: (handle) => window.clearTimeout(handle),
  });
  const environment = createHomeController(
    {
      runtime,
      settings,
      inventory,
      homeAssistant,
      launches: createLaunchStatsService({
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => localStorage.setItem(key, value),
      }),
      status,
      updates,
      rows,
      appItems: createRef<HTMLDivElement>(),
      appViewport: createRef<HTMLDivElement>(),
      continueItems: createRef<HTMLDivElement>(),
      continueViewport: createRef<HTMLDivElement>(),
      nodes: new Map(),
      showMoveInstructions: () => runtime.toast(translations.getSnapshot().t("home.moveInstructions")),
      describe: (app) => describeApp(app, artworkEnvironment),
      columns: (values) => values.homeCardColumns,
    },
    flushSync,
  );
  const refresh = () => {
    inventory.refresh();
    environment.bridge.focus();
  };
  const bridge = { ...environment.bridge, render: refresh, buildRows: refresh, refreshApps: refresh };
  const dispose = () => {
    environment.bridge.blur();
    render(null, mount);
    inventory.dispose();
    homeAssistant.dispose();
    unsubscribeShell();
    document.body.classList.remove("glass-ui");
    document.documentElement.removeAttribute("data-performance-mode");
  };
  try {
    render(
      <TranslationContext.Provider value={translations}>
        <InputScopeContext.Provider value={environment.bridge.inputScope}>
          <Home env={environment} />
        </InputScopeContext.Provider>
      </TranslationContext.Provider>,
      mount,
    );
    void homeAssistant.start();
    return { bridge, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
};
