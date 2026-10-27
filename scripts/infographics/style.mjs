/**
 * Sheet stylesheet for the infographic set.
 *
 * The fonts are the project's own local files, inlined as data URIs so a sheet
 * renders identically from `file://` with no network and no font-blocking
 * cross-origin rule to fight. The palette is `src/app/globals.css`'s brand tokens
 * repeated once here as CSS custom properties; every chart draws through them, so
 * a sheet never carries a colour of its own.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const font = (file) => readFileSync(path.resolve("src/app/fonts", file)).toString("base64");

export function sheetCss(root) {
  const unbounded = font(path.join(root, "src/app/fonts/Unbounded.woff2"));
  const rubik = font(path.join(root, "src/app/fonts/Rubik.woff2"));
  const mono = font(path.join(root, "src/app/fonts/GeistMonoVF.woff"));

  return `@font-face{font-family:Unbounded;src:url(data:font/woff2;base64,${unbounded}) format('woff2');font-weight:200 900;font-display:block}
@font-face{font-family:Rubik;src:url(data:font/woff2;base64,${rubik}) format('woff2');font-weight:100 900;font-display:block}
@font-face{font-family:MSC Mono;src:url(data:font/woff;base64,${mono}) format('woff');font-weight:100 900;font-display:block}
:root{
  --cream:#fff8ec; --ink:#142326; --surface:#ffffff;
  --teal:#005f6b; --teal-deep:#002f36; --teal-bright:#007a8a;
  --yellow:#ffb703; --purple:#7c3aed; --pink:#ec4899; --blue:#60a5fa;
  --red:#dc2626; --green:#059669; --muted:#5c6b6e; --line:#14232633; --line-soft:#1423261a;
  --c1:var(--teal); --c2:var(--yellow); --c3:var(--purple); --c4:var(--pink); --c5:var(--blue); --c6:var(--green); --c7:var(--red);
  --display:Unbounded,system-ui,sans-serif; --body:Rubik,system-ui,sans-serif; --mono:MSC Mono,ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#e9e4d8}
body{font-family:var(--body);color:var(--ink);-webkit-font-smoothing:antialiased}
.sheet{width:1600px;height:2000px;background:var(--cream);display:flex;flex-direction:column;overflow:hidden;position:relative}

.mast{display:grid;grid-template-columns:232px 1fr auto;align-items:start;gap:32px;padding:60px 72px 34px;border-bottom:3px solid var(--ink)}
.no{font-family:var(--display);font-weight:900;font-size:122px;line-height:.82;letter-spacing:-.04em}
.no small{display:block;font-family:var(--mono);font-size:19px;font-weight:500;letter-spacing:.16em;margin-top:14px;color:var(--muted)}
.title{font-family:var(--display);font-weight:800;font-size:62px;line-height:1.02;letter-spacing:-.03em}
.dek{margin-top:18px;font-size:27px;line-height:1.42;color:var(--muted);max-width:900px}
.tag{font-family:var(--mono);font-size:18px;letter-spacing:.14em;text-transform:uppercase;padding:12px 18px;border:1.5px solid var(--line);border-radius:999px;white-space:nowrap;color:var(--muted)}

/* Rows keep their natural height and the sheet's slack is spent between them, so a
   sparse sheet reads as an airy poster rather than as a card with an empty body. */
.body{flex:1;padding:40px 72px 8px;display:flex;flex-direction:column;gap:34px;justify-content:space-between;overflow:hidden}
.row{display:grid;gap:30px}
.row>*{min-width:0}
.c2{grid-template-columns:1fr 1fr}.c3{grid-template-columns:1fr 1fr 1fr}.c4{grid-template-columns:repeat(4,1fr)}
.c21{grid-template-columns:1.65fr 1fr}.c12{grid-template-columns:1fr 1.65fr}

.panel{border:1.5px solid var(--line);border-radius:8px;padding:28px 30px 26px;background:var(--surface);display:flex;flex-direction:column;gap:18px}
.ptitle{font-family:var(--mono);font-size:19px;letter-spacing:.14em;text-transform:uppercase;font-weight:600}
.psub{font-size:21px;color:var(--muted);line-height:1.35}
.kicker{font-family:var(--mono);font-size:17px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}

.kpi{border:1.5px solid var(--line);border-radius:8px;padding:24px 26px;display:flex;flex-direction:column;gap:8px;background:var(--surface)}
.kpi .v{font-family:var(--display);font-weight:800;font-size:64px;line-height:.95;letter-spacing:-.03em}
.kpi .l{font-size:22px;font-weight:600}
.kpi .n{font-size:18px;color:var(--muted);line-height:1.35}
.hero .v{font-size:132px}
.accent{border-left:8px solid var(--teal)}.accent.y{border-left-color:var(--yellow)}.accent.p{border-left-color:var(--purple)}.accent.k{border-left-color:var(--pink)}.accent.g{border-left-color:var(--green)}.accent.r{border-left-color:var(--red)}

svg{display:block;width:100%;max-width:100%;height:auto;overflow:visible}
.axis{font-family:var(--mono);font-size:17px;fill:var(--muted)}
.value{font-family:var(--display);font-weight:700;font-size:22px}
.label{font-family:var(--body);font-size:20px;font-weight:500}
.tnote{font-size:18px;color:var(--muted);font-family:var(--mono)}
.foot{padding:22px 72px 30px;border-top:1.5px solid var(--line);display:flex;justify-content:space-between;gap:24px;font-family:var(--mono);font-size:17px;letter-spacing:.06em;color:var(--muted)}
.leak{display:flex;gap:22px;flex-wrap:wrap;margin-top:4px}
.chip{font-family:var(--mono);font-size:17px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--line)}
.grid-note{margin-top:auto;font-size:19px;line-height:1.4;color:var(--muted);border-top:1.5px dashed var(--line-soft);padding-top:14px}
`;
}
