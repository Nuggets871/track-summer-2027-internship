"use client";

import dynamic from "next/dynamic";

export const NetworkingBoardClient = dynamic(
  () => import("@/components/networking/networking-board").then((m) => m.NetworkingBoard),
  { ssr: false },
);
