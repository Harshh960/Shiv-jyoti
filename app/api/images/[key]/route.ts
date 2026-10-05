import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storage,bucket } from "../../../../lib/storage";
import { database } from "../../../../lib/supabase/database";
import { getOwner } from "../../../server";
import { IMAGE_KEY } from "../../../../lib/validation";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(req:Request,{params}:{params:Promise<{key:string}>}){try{
  const {key}=await params;if(!IMAGE_KEY.test(key))return new Response(null,{status:404});
  const db=database();const {data:upload,error}=await db.from("uploads").select("mime").eq("key",key).eq("ready",true).maybeSingle();if(error)throw error;if(!upload)return new Response(null,{status:404});
  const {data:published,error:queryError}=await db.from("products").select("id").eq("published",true).contains("images",["/api/images/"+key]).limit(1);if(queryError)throw queryError;
  if(!published.length&&!await getOwner())return new Response(null,{status:404});
  // Redirect bytes directly from storage, avoiding Vercel's response body limit.
  const url=await getSignedUrl(storage(),new GetObjectCommand({Bucket:bucket(),Key:key,ResponseContentType:upload.mime}),{expiresIn:60});
  return new Response(null,{status:307,headers:{Location:url,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
}catch(e){console.error("Image unavailable",e);return new Response(null,{status:503});}}
