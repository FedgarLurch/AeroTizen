# FedgarLurch/AeroTizen fork

A personal fork of [helalaou/AeroTizen](https://github.com/helalaou/AeroTizen) with a reworked Home screen.

## What changed

- **App strip on top.** Home defaults to the scrolling app row, drawn as a compact strip of smaller cards.
- **Top apps.** A row of three wide cards for the most launched apps. The launcher counts every launch it makes
  (strip, Top apps, quick buttons) and stores the counts on the TV under `aerotizen-fork.launches.v1`. Before there
  is any history, the row shows the first three Home apps.
- **Continue watching** and **Inputs** are unchanged and sit below Top apps.
- **Home Assistant drawer** on the right of Home. Right from the end of any row moves into it, Up and Down move
  between its buttons, OK runs one, and Left goes back. Readouts and button states update live.

## The drawer's tiles

`launcher/drawer.json` holds the default tiles. If Home Assistant serves `/local/tv-drawer.json` (a file at
`/config/www/tv-drawer.json`), that file is used instead, so tiles change without reinstalling. Format:

- `title`: the heading.
- `readouts` (up to 3): `name`, `entity`, and optionally `attribute` and `suffix` (for example a climate entity's
  `current_temperature` with suffix `°`). Without an attribute the entity's state is shown.
- `buttons` (up to 8): `name`, `icon` (moon, lamp, lightbulb, blinds, fan, lock, power, sun), `action` (a
  Home Assistant action such as `light.toggle`), optional `target`, `data`, `entity` (whose state is shown on the
  right) and `detail` (fixed text shown when there is no entity).

## Connecting to Home Assistant

The launcher reads `ha.json` (`{"url": "http://HA_HOST:8123", "token": "LONG_LIVED_TOKEN"}`) from its own package
and talks to Home Assistant's WebSocket API. The file is added at install time by the installer script on the PC
from a local `ha-token.txt`; it is in `.gitignore` and must never be committed. A rejected token is never retried,
so a bad token cannot trip Home Assistant's IP ban.

## Files added or changed

New: `services/createLaunchStatsService.ts` (+ test), `services/homeAssistant/` (WebSocket client, drawer config,
tests), `home/components/TopAppsRow`, `TopAppCard`, `HomeDrawer`, `DrawerButtonCard`, `DrawerReadoutTile`,
`home/presentation/drawerValues.ts`, `launcher/drawer.json`.

Changed: `home/state/createHomeController.ts` (rows, drawer navigation and activation), `home/components/Home`,
`AppGrid`, `home/index.tsx`, `home/types.ts`, `services/preferences/defaults.ts`,
the six translation catalogues, `tests/settings.test.cjs` (new default layout), and `cli/src/aerotizen/cli.py`
(`--sdb-port` and `--sdb-timeout`, for installing through Vetro's Developer access relay).

All changes are kept in new components where possible so upstream updates merge with few conflicts.
