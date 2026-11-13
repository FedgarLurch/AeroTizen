import type { HomeAssistantStatus } from "../../../services/homeAssistant/createHomeAssistantService";
import { useStore } from "../../../shared/hooks/useStore";
import type { MessageKey } from "../../../shared/i18n/catalogues";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import type { HomeEnvironment } from "../../types";
import { DrawerButtonCard } from "../DrawerButtonCard/DrawerButtonCard";
import { DrawerReadoutTile } from "../DrawerReadoutTile/DrawerReadoutTile";

import styles from "./HomeDrawer.module.css";

const STATUS_MESSAGES: Readonly<Partial<Record<HomeAssistantStatus, MessageKey>>> = {
  unconfigured: "home.drawerUnconfigured",
  connecting: "home.drawerConnecting",
  offline: "home.drawerOffline",
  rejected: "home.drawerRejected",
};

// Fork addition: the Home Assistant drawer on the right of Home.
export const HomeDrawer = ({ env, visible }: { env: HomeEnvironment; visible: boolean }) => {
  const { t } = useTranslation();
  const { drawer, states, status } = useStore(env.homeAssistant);
  const message = STATUS_MESSAGES[status];
  if (!visible || (!drawer.buttons.length && !drawer.readouts.length)) {
    return null;
  }
  return (
    <aside class={styles.drawer} data-home-drawer aria-label={drawer.title || t("home.drawer")}>
      {drawer.title && <h2 class={styles.title}>{drawer.title}</h2>}
      {drawer.readouts.length > 0 && (
        <div class={styles.readouts} data-count={drawer.readouts.length}>
          {drawer.readouts.map((readout) => (
            <DrawerReadoutTile key={readout.entity + readout.name} readout={readout} entity={states[readout.entity]} />
          ))}
        </div>
      )}
      <div class={styles.buttons}>
        {drawer.buttons.map((button, index) => (
          <DrawerButtonCard
            key={button.name + index}
            env={env}
            button={button}
            index={index}
            entity={button.entity ? states[button.entity] : undefined}
          />
        ))}
      </div>
      {message && (
        <p class={styles.status} data-status={status}>
          {t(message)}
        </p>
      )}
    </aside>
  );
};
