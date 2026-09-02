import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const routes = [
  "login",
  "register",
  "auth/callback",
  "reset-password",
  "dashboard",
  "log",
  "foods",
  "meal-planner",
  "exercises",
  "ai",
  "workouts",
  "nutrition",
  "water",
  "sleep",
  "body",
  "progress",
  "goals",
  "plans",
  "insights",
  "settings",
];

const source = join("dist", "index.html");

await Promise.all(
  routes.map(async (route) => {
    const destination = join("dist", route, "index.html");
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }),
);
