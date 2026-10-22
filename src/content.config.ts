import { defineCollection, z } from 'astro:content';

const relationshipFields = {
  relatedServices: z.array(z.union([z.string().min(1), z.number().int().positive()])).default([]),
  relatedPages: z.array(z.union([z.string().min(1), z.number().int().positive()])).default([]),
  relatedArticles: z.array(z.union([z.string().min(1), z.number().int().positive()])).default([]),
  relatedGuides: z.array(z.union([z.string().min(1), z.number().int().positive()])).default([]),
};

const base = z.object({
  // Preserve the identifier contract: integer ID, stable ULID, and public URL slug.
  id: z.number().int().positive(),
  ulid: z.string().regex(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/, 'ulid harus berupa ULID valid 26 karakter'),
  type: z.enum(['page', 'service', 'article', 'guide', 'faq']).optional(),
  title: z.string().min(3),
  description: z.string().min(30).max(180),
  pubDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'pubDate harus ISO 8601 UTC lengkap sampai detik, berakhiran Z')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'pubDate harus berupa tanggal yang valid')
    .transform((value) => new Date(value)),
  updatedDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'updatedDate harus ISO 8601 UTC lengkap sampai detik, berakhiran Z')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'updatedDate harus berupa tanggal yang valid')
    .transform((value) => new Date(value)),
  draft: z.boolean().default(false),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  navLabel: z.string().optional(),
  canonical: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  socialImage: z.string().min(1),
  blocks: z.array(z.object({ component: z.string().min(1), props: z.record(z.any()).optional() }).passthrough()).default([]),
  ...relationshipFields,
});

const services = defineCollection({
  type: 'content',
  schema: base.omit({ relatedServices: true, relatedPages: true, relatedArticles: true, relatedGuides: true }).extend({
    type: z.literal('service').default('service'),
    eyebrow: z.string(),
    order: z.number().optional(),
    blocks: z.array(z.object({ component: z.string().min(1), props: z.record(z.any()).optional() }).passthrough()).min(1),
  }),
});

const articles = defineCollection({
  type: 'content',
  schema: base.extend({
    type: z.literal('article').default('article'),
    author: z.string().default('Tim Editorial'),
  }),
});

const guides = defineCollection({
  type: 'content',
  schema: base.extend({
    type: z.literal('guide').default('guide'),
    author: z.string().default('Tim Editorial'),
    howTo: z.object({
      title: z.string(),
      description: z.string(),
      steps: z.array(z.object({ title: z.string(), text: z.string() })).min(2),
    }).optional(),
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: base.extend({
    type: z.literal('page').default('page'),
    navLabel: z.string().optional(),
    pageKind: z.enum(['home', 'standard', 'listing', 'contact', 'faq', 'not-found']).default('standard'),
    heroTitle: z.string().optional(),
    heroIntro: z.string().optional(),
    servicesIntro: z.string().optional(),
    heroEyebrow: z.string().optional(),
    heroProof: z.string().optional(),
    servicesTitle: z.string().optional(),
    benefitsTitle: z.string().optional(),
    benefitsIntro: z.string().optional(),
    benefitsLinkLabel: z.string().optional(),
    processTitle: z.string().optional(),
    processIntro: z.string().optional(),
    ctaEyebrow: z.string().optional(),
    ctaButtonLabel: z.string().optional(),
    benefits: z.array(z.object({ title: z.string(), text: z.string() })).default([]),
    process: z.array(z.object({ title: z.string(), description: z.string() })).default([]),
    ctaTitle: z.string().optional(),
    ctaIntro: z.string().optional(),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
  }),
});

export const collections = { pages, services, articles, guides };
