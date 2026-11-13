import type { LucideIcon } from "lucide-preact";
import { Blinds, Fan, Lamp, Lightbulb, Lock, Moon, Power, Sun } from "lucide-preact";

import type { EntityState } from "../../../services/homeAssistant/createHomeAssistantService";
import type { DrawerButton, DrawerIcon } from "../../../services/homeAssistant/drawerConfig";
import { Icon } from "../../../shared/icons/Icon/Icon";
import { stateLabel } from "../../presentation/drawerValues";
import type { HomeEnvironment } from "../../types";
import { HomeControl } from "../HomeControl/HomeControl";

import styles from "./DrawerButtonCard.module.css";

const ICONS: Readonly<Record<DrawerIcon, LucideIcon>> = {
  blinds: Blinds,
  fan: Fan,
  lamp: Lamp,
  lightbulb: Lightbulb,
  lock: Lock,
  moon: Moon,
  power: Power,
  sun: Sun,
};

// Fork addition: one Home Assistant action in the drawer; OK runs it.
export const DrawerButtonCard = ({
  env,
  button,
  index,
  entity,
}: {
  env: HomeEnvironment;
  button: DrawerButton;
  index: number;
  entity?: EntityState;
}) => {
  const detail = entity ? stateLabel(entity.state) : button.detail || "";
  return (
    <HomeControl env={env} controlKey={"drawer:" + index} className={styles.button} title={button.name}>
      <Icon icon={ICONS[button.icon]} class={styles.icon} />
      <span class={styles.name}>{button.name}</span>
      {detail && <span class={styles.detail}>{detail}</span>}
    </HomeControl>
  );
};
