import { HeadObjectCommand,GetObjectCommand,DeleteObjectCommand } from "@aws-sdk/client-s3";
import { storage,bucket } from "../../../../lib/storage";
import { database } from "../../../../lib/supabase/database";
import { getOwner,sameOrigin } from "../../../server";
import { IMAGE_KEY,MAX_IMAGE_BYTES,imageType } from "../../../../lib/validation";
export const runtime="nodejs";
export async function POST(req:Request){try{
  if(!sameOrigin(req))return Response.json({error:"Request origin is not allowed."},{status:403});
  const owner=await getOwner();if(!owner)return Response.json({error:"Owner access required"},{status:403});
  const {key}=await req.json();if(typeof key!=="string"||!IMAGE_KEY.test(key))return Response.json({error:"Invalid photo key."},{status:400});
  const db=database();const {data:upload,error}=await db.from("uploads").select("*").eq("key",key).eq("owner_id",owner.id).maybeSingle();if(error)throw error;
  if(!upload)return Response.json({error:"Unknown upload."},{status:404});
  if(upload.ready)return Response.json({url:"/api/images/"+key});
  if(Date.now()-Date.parse(upload.created_at)>15*60*1000)return Response.json({error:"Upload expired. Please upload this photo again."},{status:400});
  const client=storage();const Bucket=bucket();
  const head=await client.send(new HeadObjectCommand({Bucket,Key:key}));
  const prefix=await client.send(new GetObjectCommand({Bucket,Key:key,Range:"bytes=0-11"}));
  const bytes=await prefix.Body?.transformToByteArray();
  if(!bytes||head.ContentLength!==upload.bytes||(head.ContentLength??Infinity)>MAX_IMAGE_BYTES||head.ContentType!==upload.mime||imageType(bytes)!==upload.mime){
    await client.send(new DeleteObjectCommand({Bucket,Key:key}));
    await db.from("uploads").delete().eq("key",key).eq("owner_id",owner.id);
    return Response.json({error:"This file is not a valid matching JPG, PNG or WebP photo."},{status:400});
  }
  const {error:saveError}=await db.from("uploads").update({ready:true}).eq("key",key).eq("owner_id",owner.id);if(saveError)throw saveError;
  return Response.json({url:"/api/images/"+key});
}catch(e){console.error("Upload verification failed",e);return Response.json({error:"Could not verify the photo upload. Please try uploading again."},{status:503});}}
