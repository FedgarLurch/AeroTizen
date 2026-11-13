import type { LucideIcon } from "lucide-preact";
import { HousePlug, Plus, SlidersHorizontal } from "lucide-preact";

import { useTranslation } from "../../../shared/i18n/useTranslation";
import { Icon } from "../../../shared/icons/Icon/Icon";
import { QUICK_BUTTONS, type QuickButtonIcon, quickButtonKey } from "../../quickButtons";
import type { HomeEnvironment } from "../../types";
import { HomeControl } from "../HomeControl/HomeControl";

import styles from "./QuickButtons.module.css";

const ICONS: Readonly<Record<QuickButtonIcon, LucideIcon>> = {
  "home-assistant": HousePlug,
  settings: SlidersHorizontal,
  plus: Plus,
};

// Fork addition: configurable header buttons, defined in home/quickButtons.ts.
export const QuickButtons = ({ env, className }: { env: HomeEnvironment; className: string }) => {
  const { t } = useTranslation();
  return (
    <>
      {QUICK_BUTTONS.map((button) => (
        <HomeControl
          key={button.id}
          env={env}
          controlKey={quickButtonKey(button)}
          className={className + " " + styles.button}
          dataAttributes={{ "data-quick-button": button.id, "data-empty": button.action.type === "none" }}
          title={button.name || t("home.quickEmpty")}
        >
          <Icon icon={ICONS[button.icon]} />
          <span class={styles.label} aria-hidden="true">
            {button.name || t("home.quickEmpty")}
          </span>
        </HomeControl>
      ))}
    </>
  );
};
