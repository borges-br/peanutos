import { existsSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";

const candidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "..", "..", ".env"),
];

for (const path of candidates) {
  if (existsSync(path)) {
    dotenv.config({ path, override: false });
    break;
  }
}
