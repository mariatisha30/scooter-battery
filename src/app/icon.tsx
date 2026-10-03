import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Same mark as the in-app BrandMark: lime → emerald tile with a dark bolt,
// kept inside the centre so Android's mask never clips it.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#040605" }}>
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 102,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #c4f24b 0%, #34d399 100%)",
            boxShadow: "0 24px 90px rgba(196, 242, 75, 0.28)",
          }}
        >
          <svg width="172" height="172" viewBox="0 0 24 24" fill="none" stroke="#0b1a0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  );
}
