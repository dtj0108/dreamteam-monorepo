import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  const title = "Have up to 38 autonomous AI agents working for you in minutes";

  // Get logo URL - must be absolute for edge runtime
  const logoUrl = "https://dreamteam.ai/logo.png";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          backgroundColor: "#ffffff",
          padding: "50px 60px",
        }}
      >
        {/* Logo + Brand grouped together */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <img
            src={logoUrl}
            width={180}
            height={180}
            style={{
              marginBottom: "8px",
            }}
          />
          <span
            style={{
              fontSize: "42px",
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            dreamteam.ai
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.2,
              margin: 0,
              textAlign: "center",
            }}
          >
            Have up to 38 autonomous AI agents
          </h1>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.2,
              margin: 0,
              textAlign: "center",
            }}
          >
            working for you in minutes
          </h1>
        </div>

        {/* Description */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "24px",
            gap: "8px",
          }}
        >
          <p
            style={{
              fontSize: "28px",
              color: "#64748b",
              margin: 0,
              textAlign: "center",
            }}
          >
            Start with a workspace for your team.
          </p>
          <p
            style={{
              fontSize: "28px",
              color: "#64748b",
              margin: 0,
              textAlign: "center",
            }}
          >
            Add AI agents when you're ready to scale.
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
