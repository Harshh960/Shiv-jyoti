import { loadProducts,loadSettings } from "../../server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(){try{return Response.json({products:await loadProducts(),settings:await loadSettings()},{headers:{"Cache-Control":"no-store"}});}catch(e){console.error("Catalogue unavailable",e);return Response.json({error:"The catalogue is temporarily unavailable. Please contact the store on WhatsApp."},{status:503});}}
