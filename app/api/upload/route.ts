import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storage,bucket } from "../../../lib/storage";
import { database } from "../../../lib/supabase/database";
import { getOwner,sameOrigin } from "../../server";
import { uploadSchema } from "../../../lib/validation";
export const runtime="nodejs";
export async function POST(req:Request){try{
  if(!sameOrigin(req))return Response.json({error:"Request origin is not allowed."},{status:403});
  const owner=await getOwner();if(!owner)return Response.json({error:"Owner access required"},{status:403});
  const parsed=uploadSchema.safeParse(await req.json());if(!parsed.success)return Response.json({error:"Choose a JPG, PNG or WebP photo under 8 MB."},{status:400});
  const {type,size}=parsed.data;
  const ext=type==="image/jpeg"?"jpg":type==="image/png"?"png":"webp";
  const key=crypto.randomUUID()+"."+ext;
  const command=new PutObjectCommand({Bucket:bucket(),Key:key,ContentType:type,ContentLength:size,IfNoneMatch:"*"});
  const url=await getSignedUrl(storage(),command,{expiresIn:60,signableHeaders:new Set(["content-type","content-length","if-none-match"])});
  const {error}=await database().from("uploads").insert({key,owner_id:owner.id,mime:type,bytes:size,ready:false});if(error)throw error;
  return Response.json({key,url,headers:{"Content-Type":type,"If-None-Match":"*"}},{headers:{"Cache-Control":"private, no-store"}});
}catch(e){console.error("Upload preparation failed",e);return Response.json({error:"Could not prepare photo upload. Check S3/R2 configuration."},{status:503});}}
