import { treaty } from "@elysiajs/eden";
import type { App } from "../../../../backend/portal/src/main";

export const app = treaty<App>("localhost:3000");