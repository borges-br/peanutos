export const defaultAppearance = {
  accent: "mint",
  density: "comfortable",
  contrast: "normal",
  largeText: false,
  motion: true,
};
export const appearanceKey = (user: any) =>
  `peanut:appearance:${user?.workspaceId}:${user?.id}`;
export function readAppearance(user: any) {
  try {
    return {
      ...defaultAppearance,
      ...JSON.parse(localStorage.getItem(appearanceKey(user)) || "{}"),
    };
  } catch {
    return { ...defaultAppearance };
  }
}
export function applyAppearance(user: any) {
  const p = readAppearance(user);
  const root = document.documentElement;
  root.dataset.accent = p.accent;
  root.dataset.density = p.density;
  root.dataset.contrast = p.contrast;
  root.dataset.largeText = String(p.largeText);
  root.dataset.motion = String(p.motion);
  return p;
}
export function saveAppearance(user: any, values: typeof defaultAppearance) {
  localStorage.setItem(appearanceKey(user), JSON.stringify(values));
  applyAppearance(user);
}
