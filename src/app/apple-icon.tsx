import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #c4f24b 0%, #34d399 100%)",
        }}
      >
        <svg width="104" height="104" viewBox="0 0 24 24" fill="none" stroke="#0b1a0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
