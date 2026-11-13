import { useMemo } from "preact/hooks";

import type { InstalledApp } from "../../../contracts/launcher";
import type { HomeEnvironment } from "../../types";
import { AppArtwork } from "../AppArtwork/AppArtwork";
import { HomeControl } from "../HomeControl/HomeControl";

import styles from "./TopAppCard.module.css";

// Fork addition: a wide launch card for the Top apps row.
export const TopAppCard = ({ env, app, active }: { env: HomeEnvironment; app: InstalledApp; active: boolean }) => {
  const presentation = useMemo(() => env.describe(app), [env, app]);
  return (
    <HomeControl
      env={env}
      controlKey={"top:" + app.id}
      dataId={app.id}
      registered={active}
      className={styles.card}
      title={presentation.title}
    >
      <AppArtwork presentation={presentation} active={active} />
    </HomeControl>
  );
};
