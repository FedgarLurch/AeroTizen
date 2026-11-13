import type { EntityState } from "../../../services/homeAssistant/createHomeAssistantService";
import type { DrawerReadout } from "../../../services/homeAssistant/drawerConfig";
import { readoutTone, readoutValue } from "../../presentation/drawerValues";

import styles from "./DrawerReadoutTile.module.css";

// Fork addition: one live readout (temperature, lock) at the top of the drawer.
export const DrawerReadoutTile = ({ readout, entity }: { readout: DrawerReadout; entity?: EntityState }) => {
  const value = readoutValue(readout, entity);
  return (
    <div class={styles.tile} data-tone={readoutTone(readout, entity)} data-long={value.length > 5 ? "true" : "false"}>
      <span class={styles.name}>{readout.name}</span>
      <span class={styles.value}>{value || "–"}</span>
    </div>
  );
};
