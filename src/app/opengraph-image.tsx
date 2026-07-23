import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const alt = "Manarat Science Club";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const svgPath = path.join(process.cwd(), "public", "msc.svg");
  const svgBuffer = fs.readFileSync(svgPath);
  const base64Svg = `data:image/svg+xml;base64,${svgBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d4c4a",
          backgroundImage: "radial-gradient(circle at 50% 50%, #156260 0%, #0d4c4a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              boxShadow: "0 0 40px rgba(245, 158, 11, 0.4)",
              border: "4px solid #f59e0b",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={base64Svg} alt="MSC Logo" width="108" height="108" />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Manarat
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: "#f59e0b",
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
              }}
            >
              Science Club
            </span>
          </div>
        </div>
        <p
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.85)",
            maxWidth: 750,
            textAlign: "center",
            marginTop: 16,
            lineHeight: 1.4,
          }}
        >
          A prestigious high school science club where curiosity meets creativity
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
