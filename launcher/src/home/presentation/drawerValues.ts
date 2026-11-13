import type { EntityState } from "../../services/homeAssistant/createHomeAssistantService";
import type { DrawerReadout } from "../../services/homeAssistant/drawerConfig";

// Fork addition: how drawer tiles show Home Assistant states.
const ALERT_STATES = ["unlocked", "open", "jammed", "unavailable"] as const;

export const stateLabel = (state: string) => {
  const words = state.replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
};

export const readoutValue = (readout: DrawerReadout, entity: EntityState | undefined) => {
  if (!entity) {
    return "";
  }
  if (!readout.attribute) {
    return stateLabel(entity.state);
  }
  const raw = entity.attributes[readout.attribute];
  if (typeof raw === "number") {
    return String(Math.round(raw * 10) / 10) + (readout.suffix || "");
  }
  const value = typeof raw === "string" ? raw : "";
  return value ? value + (readout.suffix || "") : "";
};

export const readoutTone = (readout: DrawerReadout, entity: EntityState | undefined) => {
  if (!entity || readout.attribute) {
    return "neutral";
  }
  if (readout.entity.startsWith("lock.") && entity.state === "locked") {
    return "good";
  }
  return (ALERT_STATES as readonly string[]).includes(entity.state) ? "alert" : "neutral";
};
