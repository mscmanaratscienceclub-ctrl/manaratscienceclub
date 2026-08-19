export interface TagConfig {
  name: string;
  dot: string;
  text: string;
  bg: string;
  accent: string;
}

const tagStyles: Omit<TagConfig, "name">[] = [
  { dot: "var(--ion)", text: "var(--ion)", bg: "color-mix(in srgb, var(--ion) 12%, transparent)", accent: "var(--ion)" },
  { dot: "var(--space-sage)", text: "var(--space-sage)", bg: "color-mix(in srgb, var(--space-sage) 12%, transparent)", accent: "var(--space-sage)" },
  { dot: "var(--space-amber)", text: "var(--space-amber)", bg: "color-mix(in srgb, var(--space-amber) 12%, transparent)", accent: "var(--space-amber)" },
  { dot: "var(--space-ivory)", text: "var(--space-ivory)", bg: "color-mix(in srgb, var(--space-ivory) 9%, transparent)", accent: "var(--space-ivory)" },
  { dot: "var(--ion)", text: "var(--ion-bright)", bg: "color-mix(in srgb, var(--ion) 18%, transparent)", accent: "var(--ion)" },
  { dot: "var(--space-amber-bright)", text: "var(--space-amber-bright)", bg: "color-mix(in srgb, var(--space-amber) 9%, transparent)", accent: "var(--space-amber)" },
  { dot: "var(--ion-bright)", text: "var(--ion-bright)", bg: "color-mix(in srgb, var(--space-plum) 70%, transparent)", accent: "var(--ion-bright)" },
];

export function getTagConfig(tag: string): TagConfig {
  let hash = 0;
  const trimmed = tag.trim().toLowerCase();
  for (let i = 0; i < trimmed.length; i++) {
    hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % tagStyles.length;
  const config = tagStyles[index];
  return {
    name: tag.charAt(0).toUpperCase() + tag.slice(1),
    ...config,
  };
}
