// Fork addition: the Home drawer's tile list. The packaged drawer.json is the default; Home Assistant can
// serve an override at /local/tv-drawer.json so tiles change without reinstalling the launcher.
export type DrawerIcon = "moon" | "lamp" | "lightbulb" | "blinds" | "fan" | "lock" | "power" | "sun";

export interface DrawerReadout {
  readonly attribute?: string;
  readonly entity: string;
  readonly name: string;
  readonly suffix?: string;
}

export interface DrawerButton {
  readonly action: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly detail?: string;
  readonly entity?: string;
  readonly icon: DrawerIcon;
  readonly name: string;
  readonly target?: Readonly<Record<string, unknown>>;
}

export interface DrawerConfig {
  readonly buttons: readonly DrawerButton[];
  readonly readouts: readonly DrawerReadout[];
  readonly title: string;
}

const ICONS: readonly DrawerIcon[] = ["moon", "lamp", "lightbulb", "blinds", "fan", "lock", "power", "sun"];
const ENTITY_RE = /^[a-z_]+\.[a-z0-9_]+$/;
const ACTION_RE = /^[a-z_]+\.[a-z0-9_]+$/;
const MAX_READOUTS = 3;
const MAX_BUTTONS = 8;

export const EMPTY_DRAWER: DrawerConfig = { title: "", readouts: [], buttons: [] };

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const text = (value: unknown, limit: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : "";

const readout = (value: unknown): DrawerReadout | null => {
  const item = record(value);
  const name = text(item.name, 24);
  const entity = text(item.entity, 120);
  if (!name || !ENTITY_RE.test(entity)) {
    return null;
  }
  const attribute = text(item.attribute, 60);
  const suffix = text(item.suffix, 6);
  return { name, entity, ...(attribute ? { attribute } : {}), ...(suffix ? { suffix } : {}) };
};

const button = (value: unknown): DrawerButton | null => {
  const item = record(value);
  const name = text(item.name, 32);
  const action = text(item.action, 80);
  if (!name || !ACTION_RE.test(action)) {
    return null;
  }
  const entity = text(item.entity, 120);
  const detail = text(item.detail, 20);
  const icon = ICONS.includes(item.icon as DrawerIcon) ? (item.icon as DrawerIcon) : "power";
  const target = record(item.target);
  const data = record(item.data);
  return {
    name,
    action,
    icon,
    ...(ENTITY_RE.test(entity) ? { entity } : {}),
    ...(detail ? { detail } : {}),
    ...(Object.keys(target).length ? { target } : {}),
    ...(Object.keys(data).length ? { data } : {}),
  };
};

// Validate a drawer file; anything unusable is dropped rather than shown broken.
export const normalizeDrawerConfig = (value: unknown): DrawerConfig => {
  const item = record(value);
  const list = (entries: unknown): unknown[] => (Array.isArray(entries) ? (entries as unknown[]) : []);
  return {
    title: text(item.title, 32),
    readouts: list(item.readouts)
      .map(readout)
      .filter((entry): entry is DrawerReadout => !!entry)
      .slice(0, MAX_READOUTS),
    buttons: list(item.buttons)
      .map(button)
      .filter((entry): entry is DrawerButton => !!entry)
      .slice(0, MAX_BUTTONS),
  };
};

export const drawerEntityIds = (config: DrawerConfig): string[] => [
  ...new Set([
    ...config.readouts.map((entry) => entry.entity),
    ...config.buttons.map((entry) => entry.entity).filter((entity): entity is string => !!entity),
  ]),
];
