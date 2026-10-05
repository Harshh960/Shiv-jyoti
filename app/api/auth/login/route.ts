import { authClient } from "../../../../lib/supabase/server";
import { sameOrigin } from "../../../../lib/security";
import { z } from "zod";
export const runtime="nodejs";
export async function POST(req:Request){try{
  if(!sameOrigin(req))return Response.json({error:"Request origin is not allowed."},{status:403});
  const parsed=z.object({email:z.string().trim().email().max(254),password:z.string().min(1).max(256)}).safeParse(await req.json());
  if(!parsed.success)return Response.json({error:"Enter your email and password."},{status:400});
  if(!process.env.ADMIN_EMAIL?.trim())return Response.json({error:"Admin access is not configured yet."},{status:503});
  const client=await authClient();const {data,error}=await client.auth.signInWithPassword(parsed.data);
  if(error||!data.user)return Response.json({error:"Unable to sign in. Check your credentials and try again."},{status:401});
  if(!data.user.email_confirmed_at||data.user.email?.toLowerCase()!==process.env.ADMIN_EMAIL.trim().toLowerCase()){
    await client.auth.signOut({scope:"local"});return Response.json({error:"This account cannot manage the store."},{status:403});
  }
  return Response.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
}catch(e){console.error("Sign-in unavailable");return Response.json({error:"Sign-in is unavailable. Check Supabase configuration."},{status:503});}}
