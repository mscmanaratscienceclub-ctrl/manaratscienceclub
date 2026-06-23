export interface TagConfig {
  name: string;
  dot: string;
  text: string;
  bg: string;
  accent: string;
}

const tagStyles: Omit<TagConfig, "name">[] = [
  { dot: "var(--color-manara-blue)", text: "var(--color-manara-blue)", bg: "color-mix(in srgb, var(--color-manara-blue) 15%, transparent)", accent: "var(--color-manara-blue)" },
  { dot: "var(--color-manara-purple)", text: "var(--color-manara-purple)", bg: "color-mix(in srgb, var(--color-manara-purple) 13%, transparent)", accent: "var(--color-manara-purple)" },
  { dot: "var(--color-manara-pink)", text: "var(--color-manara-pink)", bg: "color-mix(in srgb, var(--color-manara-pink) 13%, transparent)", accent: "var(--color-manara-pink)" },
  { dot: "var(--color-manara-red)", text: "var(--color-manara-red)", bg: "color-mix(in srgb, var(--color-manara-red) 10%, transparent)", accent: "var(--color-manara-red)" },
  { dot: "var(--color-manara-yellow)", text: "var(--color-manara-yellow)", bg: "color-mix(in srgb, var(--color-manara-yellow) 18%, transparent)", accent: "var(--color-manara-yellow)" },
  { dot: "var(--color-manara-teal)", text: "var(--color-manara-teal)", bg: "color-mix(in srgb, var(--color-manara-teal) 10%, transparent)", accent: "var(--color-manara-teal)" },
  { dot: "#16a34a", text: "#16a34a", bg: "color-mix(in srgb, #16a34a 12%, transparent)", accent: "#16a34a" },
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
