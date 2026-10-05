import nextEnv from "@next/env";
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
const required=["APP_URL","NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","SUPABASE_SECRET_KEY","ADMIN_EMAIL","S3_BUCKET","S3_ACCESS_KEY_ID","S3_SECRET_ACCESS_KEY","S3_REGION"];
const problems=required.filter(k=>!process.env[k]?.trim()).map(k=>`${k} is missing`);
for(const key of ["APP_URL","NEXT_PUBLIC_SUPABASE_URL","S3_ENDPOINT"]){if(process.env[key]){try{const url=new URL(process.env[key]);if(!["http:","https:"].includes(url.protocol))throw Error();}catch{problems.push(`${key} must be an HTTP(S) URL`);}}}
if(process.env.S3_REGION==="auto"&&!process.env.S3_ENDPOINT)problems.push("R2 requires S3_ENDPOINT when S3_REGION=auto");
if(process.env.ADMIN_EMAIL&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.ADMIN_EMAIL))problems.push("ADMIN_EMAIL must be an email address");
if(problems.length){console.error(problems.join("\n"));process.exitCode=1;}else console.log("Required environment values are present. No credentials were printed. This does not test provider connectivity.");
