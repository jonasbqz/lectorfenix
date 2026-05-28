import { ImageResponse } from "next/og";

export const alt = "Mangastoon editorial social card";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top, rgba(255, 107, 0, 0.18), transparent 28%), linear-gradient(180deg, #120f0d 0%, #0a0908 55%, #050505 100%)",
          color: "#fff8f0",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 40,
            borderRadius: 40,
            border: "1px solid rgba(247,242,232,0.14)",
            background: "rgba(20,18,17,0.78)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 96,
            top: 80,
            width: 240,
            height: 240,
            borderRadius: 9999,
            background: "rgba(255, 107, 0, 0.14)",
            filter: "blur(22px)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "86px 84px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                alignSelf: "flex-start",
                padding: "10px 18px",
                borderRadius: 9999,
                border: "1px solid rgba(255, 107, 0, 0.28)",
                background: "rgba(255, 107, 0, 0.12)",
                color: "#ff8833",
                fontSize: 24,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
              }}
            >
              Editorial manga discovery
            </div>
            <div style={{ fontSize: 88, lineHeight: 1, fontWeight: 700 }}>Mangastoon</div>
            <div
              style={{
                display: "flex",
                maxWidth: 760,
                fontSize: 34,
                lineHeight: 1.45,
                color: "#d6d0c6",
                fontFamily: "sans-serif",
              }}
            >
              Search manga and merge MyAnimeList visuals with MangaDex identifiers
              in one premium dark interface.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 18,
              fontFamily: "sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "16px 22px",
                borderRadius: 9999,
                border: "1px solid rgba(247,242,232,0.14)",
                background: "rgba(255,255,255,0.05)",
                fontSize: 26,
                color: "#f1ece4",
              }}
            >
              MAL metadata
            </div>
            <div
              style={{
                display: "flex",
                padding: "16px 22px",
                borderRadius: 9999,
                border: "1px solid rgba(247,242,232,0.14)",
                background: "rgba(255,255,255,0.05)",
                fontSize: 26,
                color: "#f1ece4",
              }}
            >
              MangaDex cross-id
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
