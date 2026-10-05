import { z } from "zod";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_KEY = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp)$/;
export const productSchema = z.object({
  id: z.string().uuid().optional(), code: z.string().trim().min(1).max(60), name: z.string().trim().min(1).max(150),
  category: z.enum(["Women","Men","Kids","Other"]), subcategory: z.string().max(80),
  price: z.number().int().min(0).max(100000000).nullable(), sizes: z.array(z.string().trim().min(1).max(40)).max(30),
  colors: z.array(z.string().trim().min(1).max(40)).max(30), stock: z.enum(["Available","Limited stock","Out of stock"]),
  description: z.string().max(5000), images: z.array(z.string().refine(s=>s.startsWith("/api/images/") && IMAGE_KEY.test(s.slice(12)))).max(8),
  flags: z.array(z.enum(["New Arrival","Featured","Festive"])).max(3), published: z.boolean(),
}).refine(p=>!p.published||p.images.length>0,{message:"Add a photo before publishing"});
export const settingsSchema = z.object({phone:z.string().regex(/^\d{10}$/),address:z.string().trim().min(5).max(500),story:z.string().trim().min(5).max(2000),headline:z.string().trim().min(3).max(150),announcement:z.string().max(200)});
export const uploadSchema = z.object({type:z.enum(["image/jpeg","image/png","image/webp"]),size:z.number().int().positive().max(MAX_IMAGE_BYTES)});
export function imageType(bytes: Uint8Array): string | null {
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return "image/jpeg";
  if ([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return "image/png";
  if (String.fromCharCode(...bytes.slice(0,4))==="RIFF" && String.fromCharCode(...bytes.slice(8,12))==="WEBP") return "image/webp";
  return null;
}
