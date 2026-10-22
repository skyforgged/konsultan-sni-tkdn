import { defineCollection, z } from 'astro:content';

const relationshipFields = {
  relatedServices: z.array(z.string().min(1)).default([]),
  relatedPages: z.array(z.string().min(1)).default([]),
  relatedArticles: z.array(z.string().min(1)).default([]),
  relatedGuides: z.array(z.string().min(1)).default([]),
};

const base = z.object({
  // id/ulid are optional internal identifiers; the stable public URL is always slug.
  id: z.union([z.string(), z.number()]).optional(),
  ulid: z.string().optional(),
  type: z.enum(['page', 'service', 'article', 'guide', 'faq']).optional(),
  title: z.string().min(3),
  description: z.string().min(30).max(180),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date(),
  draft: z.boolean().default(false),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  navLabel: z.string().optional(),
  canonical: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  socialImage: z.string().min(1),
  ...relationshipFields,
});

const services = defineCollection({
  type: 'content',
  schema: base.extend({
    type: z.literal('service').default('service'),
    eyebrow: z.string(),
    intro: z.string(),
    audience: z.array(z.string()).min(1),
    deliverables: z.array(z.string()).min(1),
    order: z.number().optional(),
    process: z.array(z.object({ title: z.string(), description: z.string() })).min(3),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
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
