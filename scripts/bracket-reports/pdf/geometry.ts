/**
 * The app's PDF page geometry, re-exported rather than copied.
 *
 * `src/lib/admin/pdf/` ships the committed primitives — geometry, the embedded
 * faces and their byte payloads — and this generator draws on them. They are
 * reached through a one-line shim so the seven modules beside it keep their
 * `./geometry` style imports and the 700 KB of font bytes stay in one place.
 */
export * from "../../../src/lib/admin/pdf/geometry";
