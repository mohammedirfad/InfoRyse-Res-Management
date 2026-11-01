"use client";

/**
 * Last-resort boundary: this replaces the root layout when the layout itself
 * throws, so it must render its own <html>/<body> and cannot rely on global
 * CSS. Styles are intentionally inline for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error?.message ?? "Unexpected error";
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBF7F1",
          color: "#132A1E",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: 20,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 20px 45px rgba(19,42,30,0.12)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: "16px 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
            The app could not finish loading. Please reload — your table tab and orders are stored on our servers.
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: "#f5f5f4",
              borderRadius: 14,
              fontSize: 11,
              color: "#78716c",
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {message}
            {error?.digest ? `\nref: ${error.digest}` : ""}
          </pre>
          <button
            type="button"
            onClick={() => {
              try { reset(); } catch { window.location.reload(); }
            }}
            style={{
              marginTop: 20,
              width: "100%",
              minHeight: 44,
              border: 0,
              borderRadius: 16,
              background: "#132A1E",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              width: "100%",
              minHeight: 44,
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
