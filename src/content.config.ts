import { defineCollection, z } from 'astro:content';
const base = z.object({title:z.string().min(5),description:z.string().min(30).max(180),publishDate:z.coerce.date(),updatedDate:z.coerce.date().optional(),draft:z.boolean().default(false),category:z.string().optional(),tags:z.array(z.string()).default([]),image:z.string().optional()});
const services = defineCollection({type:'content',schema:base.extend({eyebrow:z.string(),intro:z.string(),audience:z.array(z.string()).min(1),deliverables:z.array(z.string()).min(1),process:z.array(z.object({title:z.string(),description:z.string()})).min(3),faqs:z.array(z.object({question:z.string(),answer:z.string()})).default([])})});
const articles = defineCollection({type:'content',schema:base.extend({author:z.string().default('Tim Editorial')})});
const guides = defineCollection({type:'content',schema:base.extend({author:z.string().default('Tim Editorial'),howTo:z.object({title:z.string(),description:z.string(),steps:z.array(z.object({title:z.string(),text:z.string()})).min(2)}).optional()})});
export const collections = {services,articles,guides};
