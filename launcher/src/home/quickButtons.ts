// Fork addition: the Home quick buttons. Edit this list and rebuild to change them.
// - "app": opens an installed app by its Tizen app ID.
// - "none": a slot that shows a "not set up" notice until it is configured.
// A button without a name is shown as an empty slot.
export type QuickButtonAction = { readonly type: "app"; readonly appId: string } | { readonly type: "none" };

export type QuickButtonIcon = "home-assistant" | "settings" | "plus";

export interface QuickButton {
  readonly action: QuickButtonAction;
  readonly icon: QuickButtonIcon;
  readonly id: string;
  readonly name?: string;
}

const HOME_ASSISTANT = "Home Assistant";

export const QUICK_BUTTONS: readonly QuickButton[] = [
  { id: "home-assistant", name: HOME_ASSISTANT, icon: "home-assistant", action: { type: "none" } },
  { id: "slot-2", icon: "plus", action: { type: "none" } },
  { id: "slot-3", icon: "plus", action: { type: "none" } },
];

export const quickButtonKey = (button: QuickButton) => "quick:" + button.id;
