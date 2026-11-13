# FedgarLurch/AeroTizen fork

A personal fork of [helalaou/AeroTizen](https://github.com/helalaou/AeroTizen) with a reworked Home screen.

## What changed

- **App strip on top.** Home defaults to the scrolling app row, drawn as a compact strip of smaller cards.
- **Top apps.** A row of three wide cards for the most launched apps. The launcher counts every launch it makes
  (strip, Top apps, quick buttons) and stores the counts on the TV under `aerotizen-fork.launches.v1`. Before there
  is any history, the row shows the first three Home apps.
- **Continue watching** and **Inputs** are unchanged and sit below Top apps.
- **Quick buttons** in the header, after the Settings and Samsung Home buttons. The focused button shows its name.

## Changing the quick buttons

Edit `launcher/src/home/quickButtons.ts` and rebuild. Each button has an `id`, an `icon`, an optional `name`
(no name means an empty slot) and an `action`:

- `{ type: "app", appId: "<Tizen app ID>" }` opens an installed app.
- `{ type: "none" }` shows a "not set up yet" notice.

## Files added or changed

New: `services/createLaunchStatsService.ts` (+ test), `home/quickButtons.ts`, `home/components/TopAppsRow`,
`home/components/TopAppCard`, `home/components/QuickButtons`.

Changed: `home/state/createHomeController.ts` (rows and activation), `home/components/Home`, `HomeHeader`,
`HeaderFocusIndicator`, `AppGrid`, `home/index.tsx`, `home/types.ts`, `services/preferences/defaults.ts`,
the six translation catalogues, and `tests/settings.test.cjs` (new default layout).

All changes are kept in new components where possible so upstream updates merge with few conflicts.
