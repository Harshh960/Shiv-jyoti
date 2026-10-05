import { authClient } from "../../../../lib/supabase/server";
import { sameOrigin } from "../../../../lib/security";
export async function POST(req:Request){try{if(!sameOrigin(req))return Response.json({error:"Request origin is not allowed."},{status:403});const client=await authClient();const {error}=await client.auth.signOut({scope:"local"});if(error)throw error;return Response.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});}catch{return Response.json({error:"Could not sign out. Please try again."},{status:503});}}
