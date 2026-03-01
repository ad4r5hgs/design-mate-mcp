import { z } from "zod";

export const GeoShape = z.enum([
  "rectangle",
  "ellipse",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "star",
  "cloud",
  "heart",
  "arrow-right",
  "arrow-left",
  "arrow-up",
  "arrow-down",
  "check-box",
  "x-box",
]);

export const Color = z.enum([
  "black",
  "grey",
  "light-violet",
  "violet",
  "blue",
  "light-blue",
  "yellow",
  "orange",
  "green",
  "light-green",
  "light-red",
  "red",
  "white",
]);

export const Fill = z.enum(["none", "semi", "solid", "pattern"]);
export const Size = z.enum(["s", "m", "l", "xl"]);
export const Align = z.enum(["start", "middle", "end"]);
