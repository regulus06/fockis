/**
 * orgIcons.ts — icons the Fockis Organizations artwork uses that Lucide does
 * not ship, built with Lucide's own factory so they behave like Lucide icons.
 */

import { createLucideIcon } from "lucide-react";

/** Two adults and a child (Youth & Family). */
export const FamilyIcon = createLucideIcon("FockisFamily", [
  ["circle", { cx: "6.5", cy: "5", r: "2.5", key: "a1" }],
  ["circle", { cx: "17.5", cy: "5", r: "2.5", key: "a2" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "c" }],
  ["path", { d: "M2.5 21v-6a4 4 0 0 1 4-4h1.5", key: "b1" }],
  ["path", { d: "M21.5 21v-6a4 4 0 0 0-4-4H16", key: "b2" }],
  ["path", { d: "M8.5 21v-1.5a3.5 3.5 0 0 1 7 0V21", key: "bc" }],
]);
