import type { InstalledApp } from "../../../contracts/launcher";
import { useStore } from "../../../shared/hooks/useStore";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import type { HomeEnvironment } from "../../types";
import { HomeSectionHeading } from "../HomeSectionHeading/HomeSectionHeading";
import { TopAppCard } from "../TopAppCard/TopAppCard";

import styles from "./TopAppsRow.module.css";

// Fork addition: the three most launched apps, falling back to Home order before there is history.
export const TopAppsRow = ({
  env,
  apps,
  visible,
  active,
}: {
  env: HomeEnvironment;
  apps: readonly InstalledApp[];
  visible: boolean;
  active: boolean;
}) => {
  const { t } = useTranslation();
  // Subscribing re-renders the row when a launch changes the ranking.
  useStore(env.launches);
  const top = env
    .topApps()
    .map((id) => apps.find((app) => app.id === id))
    .filter((app): app is InstalledApp => !!app);
  return (
    <section class={styles.section} data-top-apps hidden={!visible || !top.length}>
      <HomeSectionHeading title={t("home.topApps")} />
      <div class={styles.row}>
        {top.map((app) => (
          <TopAppCard key={app.id} env={env} app={app} active={active && visible} />
        ))}
      </div>
    </section>
  );
};
