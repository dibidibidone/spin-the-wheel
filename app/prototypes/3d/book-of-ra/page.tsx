"use client";
import dynamic from "next/dynamic";
import { SceneLoader } from "@/components/r3f/kit/SceneLoader";

const BookOfRaScene = dynamic(
  () => import("@/components/r3f/slots/book-of-ra/BookOfRaScene").then((m) => m.BookOfRaScene),
  { ssr: false, loading: () => <SceneLoader label="Entering the Temple" accent="#F5C24B" bg="#1a0f04" /> }
);

export default function Page() {
  return <BookOfRaScene />;
}
