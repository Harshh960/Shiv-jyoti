import { database } from "../../../lib/supabase/database";
import { getOwner,loadProducts,loadSettings,sameOrigin } from "../../server";
import { productSchema, settingsSchema } from "../../../lib/validation";
import { categories } from "../../data";
import { z } from "zod";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function failure(error:unknown){console.error("Admin operation failed",error);return Response.json({error:"Could not complete this request. Check your configuration and try again."},{status:503});}
export async function GET(){try{if(!await getOwner())return Response.json({error:"Owner access required"},{status:403});return Response.json({products:await loadProducts(true),settings:await loadSettings()},{headers:{"Cache-Control":"private, no-store"}});}catch(e){return failure(e);}}
export async function POST(req:Request){
  try{
    if(!sameOrigin(req)||!await getOwner())return Response.json({error:"Owner access required"},{status:403});
    const body=await req.json(); const db=database();
    if(body.type==="settings"){
      const parsed=settingsSchema.safeParse(body.data);if(!parsed.success)return Response.json({error:"Check your store details; phone must contain 10 digits."},{status:400});
      const {error}=await db.from("settings").upsert({id:"store",content:parsed.data});if(error)throw error;
      return Response.json({ok:true});
    }
    const parsed=productSchema.safeParse(body.data);if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"Check product details."},{status:400});
    const v=parsed.data;
    if(!categories[v.category].includes(v.subcategory))return Response.json({error:"Choose a matching subcategory."},{status:400});
    if(v.images.length){
      const keys=[...new Set(v.images.map(s=>s.slice(12)))];
      const {data,error}=await db.from("uploads").select("key").in("key",keys).eq("ready",true);
      if(error)throw error;
      if(data.length!==keys.length)return Response.json({error:"One or more photos are not uploaded yet. Upload them again."},{status:400});
    }
    const id=v.id||crypto.randomUUID();
    const {error}=await db.from("products").upsert({...v,id,updated:Date.now()});
    if(error?.code==="23505")return Response.json({error:"That product code is already used."},{status:409});
    if(error)throw error;
    return Response.json({ok:true,id});
  }catch(e){return failure(e);}
}
export async function DELETE(req:Request){try{
  if(!sameOrigin(req)||!await getOwner())return Response.json({error:"Owner access required"},{status:403});
  const parsed=z.object({id:z.string().uuid()}).safeParse(await req.json());if(!parsed.success)return Response.json({error:"Invalid product ID"},{status:400});
  const {error}=await database().from("products").delete().eq("id",parsed.data.id);if(error)throw error;
  // Retain image objects so a shared photo is not deleted from another product.
  return Response.json({ok:true});
}catch(e){return failure(e);}}
