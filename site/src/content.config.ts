import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase-words-with-dashes");

/** lessons/<track>/track.yaml; the Track id is its directory name. */
const tracks = defineCollection({
  loader: glob({
    pattern: "*/track.yaml",
    base: "../lessons",
    generateId: ({ entry }) => entry.replace(/\/track\.yaml$/, ""),
  }),
  schema: z.strictObject({
    title: z.string(),
    order: z.number().int().positive(),
    description: z.string(),
  }),
});

/** lessons/<track>/<lesson>/lesson.yaml; the Lesson id is its path, e.g. "memory/method-calls". */
const lessons = defineCollection({
  loader: glob({
    pattern: "*/*/lesson.yaml",
    base: "../lessons",
    generateId: ({ entry }) => entry.replace(/\/lesson\.yaml$/, ""),
  }),
  schema: z
    .strictObject({
    title: z.string(),
    kind: z.enum(["timeline", "pipeline", "execution"]),
    /** Pipeline Lessons only: which bespoke visual draws it (site/src/renderers/pipeline). */
    visual: slug.optional(),
    order: z.number().int().positive(),
    summary: z.string(),
    prerequisites: z.array(z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/, "a Lesson id like memory/method-calls")).default([]),
    detail: z.enum(["simple", "jvm"]).default("simple"),
    variants: z
      .array(z.strictObject({ id: slug, label: z.string(), schedule: slug.optional() }))
      .min(1)
      .default([{ id: "default", label: "As written" }])
      .refine((v) => v[0]!.id === "default", "the first Variant must be `default`")
      .refine((v) => new Set(v.map((x) => x.id)).size === v.length, "Variant ids must be unique"),
    })
    .refine((l) => (l.kind === "pipeline") === (l.visual !== undefined), {
      message: "`visual` is required for Pipeline Lessons and only allowed on them",
      path: ["visual"],
    }),
});

export const collections = { tracks, lessons };
