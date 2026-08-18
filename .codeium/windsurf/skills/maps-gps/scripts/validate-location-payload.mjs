#!/usr/bin/env node
/**
 * validate-location-payload.mjs
 *
 * Validates a location payload against the Zod schema used by the maps-gps skill.
 * Usage:
 *   node validate-location-payload.mjs <path-to-payload.json>
 *   echo '{"orderId":"...","latitude":10.5,"longitude":-66.9}' | node validate-location-payload.mjs
 *
 * Embeds the same schema as packages/contracts/src/location.ts. Keep in sync.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CoordinatesSchema = {
  parse(input) {
    if (typeof input !== "object" || input === null) {
      throw new Error("Payload must be an object");
    }
    const o = input;
    if (typeof o.orderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(o.orderId)) {
      throw new Error("orderId must be a valid UUID");
    }
    if (typeof o.latitude !== "number" || o.latitude < -90 || o.latitude > 90) {
      throw new Error("latitude must be a number between -90 and 90");
    }
    if (typeof o.longitude !== "number" || o.longitude < -180 || o.longitude > 180) {
      throw new Error("longitude must be a number between -180 and 180");
    }
    if (o.accuracy !== undefined && (typeof o.accuracy !== "number" || o.accuracy < 0)) {
      throw new Error("accuracy must be a non-negative number");
    }
    if (o.timestamp !== undefined && (typeof o.timestamp !== "number" || !Number.isInteger(o.timestamp) || o.timestamp <= 0)) {
      throw new Error("timestamp must be a positive integer");
    }
    return o;
  },
};

function loadPayload() {
  if (process.argv[2]) {
    const filePath = resolve(process.argv[2]);
    return JSON.parse(readFileSync(filePath, "utf8"));
  }
  // Read from stdin
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error(`Invalid JSON on stdin: ${e.message}`));
      }
    });
    process.stdin.on("error", reject);
  });
}

async function main() {
  try {
    const payload = await loadPayload();
    const validated = CoordinatesSchema.parse(payload);
    console.log("✅ Valid location payload:");
    console.log(JSON.stringify(validated, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("❌ Invalid payload:");
    console.error(`   ${err.message}`);
    process.exit(1);
  }
}

main();
