/**
 * Validates every Trace against the JSON Schema and the semantic checks.
 *   fixtures/*.json              must pass
 *   fixtures/invalid/*.json      must fail (proves the checks catch real mistakes)
 *   ../lessons/**\/traces/*.json must pass
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import schema from "../schema/trace.schema.json" with { type: "json" };
import { checkTrace } from "../src/check.ts";
import type { Trace } from "../src/trace.generated.ts";

const root = join(import.meta.dirname, "..");
const validateSchema = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, allowUnionTypes: true }).compile(schema);

function problems(file: string): string[] {
  const data: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!validateSchema(data)) {
    return (validateSchema.errors ?? []).map((e) => `schema ${e.instancePath || "/"}: ${e.message}`);
  }
  return checkTrace(data as unknown as Trace);
}

function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => join(e.parentPath, e.name));
}

const fixturesDir = join(root, "fixtures");
const invalidDir = join(fixturesDir, "invalid");
const lessonTraces = jsonFiles(join(root, "..", "lessons")).filter((f) => f.split("/").includes("traces"));
const mustPass = [...jsonFiles(fixturesDir).filter((f) => !f.startsWith(invalidDir)), ...lessonTraces];
const mustFail = jsonFiles(invalidDir);

let failed = false;
for (const file of mustPass) {
  const found = problems(file);
  const name = relative(join(root, ".."), file);
  if (found.length === 0) console.log(`✓ ${name}`);
  else {
    failed = true;
    console.error(`✗ ${name}\n${found.map((p) => `    ${p}`).join("\n")}`);
  }
}
for (const file of mustFail) {
  const found = problems(file);
  const name = relative(join(root, ".."), file);
  if (found.length > 0) console.log(`✓ ${name} rejected: ${found[0]}`);
  else {
    failed = true;
    console.error(`✗ ${name} should have been rejected but passed`);
  }
}
process.exit(failed ? 1 : 0);
