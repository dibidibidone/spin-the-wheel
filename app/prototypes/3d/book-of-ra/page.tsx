"use client";
import dynamic from "next/dynamic";

const BookOfRaScene = dynamic(
  () => import("@/components/r3f/slots/book-of-ra/BookOfRaScene").then((m) => m.BookOfRaScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "#1a0f04", color: "#F5C24B", fontFamily: "system-ui, sans-serif",
        fontWeight: 800, letterSpacing: "2px",
      }}>
        ENTERING THE TEMPLE…
      </div>
    ),
  }
);

export default function Page() {
  return <BookOfRaScene />;
}
