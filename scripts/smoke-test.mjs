// Contract smoke test against local Supabase/S3 doubles, never your real services.
// Builds with dummy credentials. Run npm run build again with your real .env afterward.
import http from 'node:http';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {once} from 'node:events';
const owner={id:'a0123456-1234-4234-8234-123456789012',aud:'authenticated',role:'authenticated',email:'owner@example.test',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}};
const tables={products:[],settings:[],uploads:[]},objects=new Map();
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:owner.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),email:owner.email})+'.dummy-signature';
const read=async req=>{let data=[];for await(const c of req)data.push(c);return Buffer.concat(data)};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))};
const provider=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/auth/v1/token'){
  const body=JSON.parse((await read(req)).toString());
  if(body.email!==owner.email||body.password!=='test-password')return json(res,400,{msg:'Invalid credentials'});
  return json(res,200,{access_token:token,refresh_token:'dummy-refresh-token',token_type:'bearer',expires_in:3600,user:owner});
 }
 if(url.pathname==='/auth/v1/user')return req.headers.authorization==='Bearer '+token?json(res,200,owner):json(res,401,{msg:'Invalid token'});
 if(url.pathname==='/auth/v1/logout'){res.writeHead(204);return res.end()}
 if(url.pathname.startsWith('/rest/v1/')){
  if(req.headers.apikey!=='dummy-service-key')return json(res,403,{message:'server key required'});
  const name=url.pathname.split('/').pop();if(!tables[name])return json(res,404,{});
  const matches=row=>Array.from(url.searchParams.entries()).every(([k,v])=>{
   if(v.startsWith('eq.'))return String(row[k])===v.slice(3);
   if(v.startsWith('in.'))return v.slice(4,-1).split(',').map(x=>x.replaceAll('"','')).includes(String(row[k]));
   if(v.startsWith('cs.'))return row[k]?.some(x=>v.includes(x));
   return true;
  });
  if(req.method==='GET')return json(res,200,tables[name].filter(matches).slice(0,Number(url.searchParams.get('limit')||1000)));
  if(req.method==='POST'){
   const row=JSON.parse((await read(req)).toString()),key=name==='uploads'?'key':'id';
   if(name==='products'&&tables.products.some(x=>x.code===row.code&&x.id!==row.id))return json(res,409,{code:'23505',message:'duplicate code'});
   const i=tables[name].findIndex(x=>x[key]===row[key]);if(name==='uploads')row.created_at=new Date().toISOString();
   if(i<0)tables[name].push(row);else tables[name][i]=row;return json(res,201,{});
  }
  if(req.method==='PATCH'){const patch=JSON.parse((await read(req)).toString());tables[name].filter(matches).forEach(r=>Object.assign(r,patch));return json(res,200,{})}
  if(req.method==='DELETE'){tables[name]=tables[name].filter(r=>!matches(r));return json(res,200,{})}
 }
 if(url.pathname.startsWith('/photos/')){
  const key=decodeURIComponent(url.pathname.slice(8));
  if(req.method==='PUT'){
   assert(url.searchParams.get('X-Amz-SignedHeaders').includes('content-length'));
   assert(url.searchParams.get('X-Amz-SignedHeaders').includes('if-none-match'));
   assert.equal(req.headers['if-none-match'],'*');
   if(objects.has(key)){res.writeHead(412);return res.end()}
   objects.set(key,{bytes:await read(req),type:req.headers['content-type']});res.writeHead(200,{ETag:'"test-etag"'});return res.end();
  }
  const object=objects.get(key);if(!object){res.writeHead(404);return res.end()}
  if(req.method==='DELETE'){objects.delete(key);res.writeHead(204);return res.end()}
  const bytes=req.headers.range?object.bytes.subarray(0,12):object.bytes;
  res.writeHead(req.headers.range?206:200,{'Content-Type':object.type,'Content-Length':String(bytes.length)});
  return res.end(req.method==='HEAD'?undefined:bytes);
 }
 json(res,404,{path:url.pathname});
}catch(e){console.error('Mock provider error',e);json(res,500,{error:'mock failed'})}});
provider.listen(0,'127.0.0.1');await once(provider,'listening');
const providerUrl=`http://127.0.0.1:${provider.address().port}`;
const portServer=http.createServer();portServer.listen(0,'127.0.0.1');await once(portServer,'listening');const port=portServer.address().port;await new Promise(r=>portServer.close(r));
const base=`http://127.0.0.1:${port}`;
const env={...process.env,NEXT_TELEMETRY_DISABLED:'1',APP_URL:base,NEXT_PUBLIC_SUPABASE_URL:providerUrl,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'dummy-public-key',SUPABASE_SECRET_KEY:'dummy-service-key',ADMIN_EMAIL:owner.email,S3_ENDPOINT:providerUrl,S3_REGION:'auto',S3_BUCKET:'photos',S3_ACCESS_KEY_ID:'dummy-access-key',S3_SECRET_ACCESS_KEY:'dummy-s3-secret',S3_FORCE_PATH_STYLE:'true'};
const next='node_modules/next/dist/bin/next';let app;let output='';
try{
 const build=spawn(process.execPath,[next,'build'],{env,stdio:['ignore','pipe','pipe']});
 build.stdout.on('data',c=>output+=c);build.stderr.on('data',c=>output+=c);
 const [code]=await once(build,'exit');assert.equal(code,0,output);console.log('Production build passed with test configuration.');output='';
 app=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});app.stdout.on('data',c=>output+=c);app.stderr.on('data',c=>output+=c);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}assert(ready,output);
 const jar=new Map();
 async function call(path,{method='GET',body,auth=false,origin=base}={}){
  const headers={};if(method!=='GET')headers.Origin=origin;if(body)headers['Content-Type']='application/json';if(auth)headers.Cookie=Array.from(jar,([k,v])=>`${k}=${v}`).join('; ');
  const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'manual'});
  if(auth)for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1))}
  return r;
 }
 for(const page of ['/','/women','/men','/kids','/collections','/about','/contact','/login'])assert.equal((await call(page)).status,200,page);
 assert.equal((await call('/admin')).status,307);
 assert.equal((await call('/api/admin')).status,403);
 assert.equal((await call('/api/upload',{method:'POST',body:{type:'image/png',size:12}})).status,403);
 assert.equal((await call('/api/auth/login',{method:'POST',body:{email:owner.email,password:'wrong'},auth:true})).status,401);
 assert.equal((await call('/api/auth/login',{method:'POST',body:{email:owner.email,password:'test-password'},auth:true})).status,200);
 assert.equal((await call('/admin',{auth:true})).status,200);
 assert.equal((await call('/api/admin',{method:'POST',body:{},auth:true,origin:'https://evil.example'})).status,403);
 const file=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 const prepare=await call('/api/upload',{method:'POST',body:{type:'image/png',size:file.length},auth:true});assert.equal(prepare.status,200,await prepare.clone().text());const signed=await prepare.json();
 assert.equal((await fetch(signed.url,{method:'PUT',headers:signed.headers,body:file})).status,200);
 assert.equal((await fetch(signed.url,{method:'PUT',headers:signed.headers,body:file})).status,412);
 const complete=await call('/api/upload/complete',{method:'POST',body:{key:signed.key},auth:true});assert.equal(complete.status,200,await complete.clone().text());const image=await complete.json();
 assert.equal((await call(image.url)).status,404);
 assert.equal((await call(image.url,{auth:true})).status,307);
 let product={code:'TEST-001',name:'Test saree',category:'Women',subcategory:'Sarees',price:1500,sizes:['Free Size'],colors:['Burgundy'],stock:'Available',description:'Contract test product',images:[image.url],flags:['Featured'],published:false};
 const save=await call('/api/admin',{method:'POST',body:{data:product},auth:true});assert.equal(save.status,200,await save.clone().text());product.id=(await save.json()).id;
 assert.equal((await (await call('/api/catalog')).json()).products.length,0);
 product.published=true;assert.equal((await call('/api/admin',{method:'POST',body:{data:product},auth:true})).status,200);
 assert.equal((await (await call('/api/catalog')).json()).products.length,1);
 const publicImage=await call(image.url);assert.equal(publicImage.status,307);assert.equal((await fetch(publicImage.headers.get('location'))).status,200);
 assert.equal((await call('/api/admin',{method:'POST',body:{data:{...product,id:undefined}},auth:true})).status,409);
 product.published=false;assert.equal((await call('/api/admin',{method:'POST',body:{data:product},auth:true})).status,200);
 assert.equal((await call(image.url)).status,404);
 const settings={phone:'9934863374',address:'Test store address',story:'Test story for the store',headline:'Where tradition meets style.',announcement:'Test announcement'};
 assert.equal((await call('/api/admin',{method:'POST',body:{type:'settings',data:settings},auth:true})).status,200);
 assert.equal((await (await call('/api/catalog')).json()).settings.announcement,'Test announcement');
 assert.equal((await call('/api/admin',{method:'DELETE',body:{id:product.id},auth:true})).status,200);
 assert.equal((await (await call('/api/admin',{auth:true})).json()).products.length,0);
 const badPrepare=await call('/api/upload',{method:'POST',body:{type:'image/png',size:16},auth:true});assert.equal(badPrepare.status,200);const badSigned=await badPrepare.json();
 assert.equal((await fetch(badSigned.url,{method:'PUT',headers:badSigned.headers,body:Buffer.from('not-a-real-image')})).status,200);
 assert.equal((await call('/api/upload/complete',{method:'POST',body:{key:badSigned.key},auth:true})).status,400);
 assert(!objects.has(badSigned.key));assert(!tables.uploads.some(x=>x.key===badSigned.key));
 assert.equal((await call('/api/upload',{method:'POST',body:{type:'image/png',size:8388609},auth:true})).status,400);
 assert.equal((await call('/api/auth/logout',{method:'POST',auth:true})).status,200);
 assert.equal((await call('/api/admin',{auth:true})).status,403);
 console.log('PASS: pages, login/logout, owner checks, CSRF, signed upload, no overwrite, verification, draft privacy, CRUD, publishing, duplicate code, settings, private image redirects, invalid-file cleanup, upload-size enforcement.');
 console.log('Local provider doubles only: real Supabase SQL/RLS and real R2/S3 CORS still require your credentials.');
}catch(e){console.error(output.slice(-4000));throw e}finally{if(app){app.kill('SIGTERM');await once(app,'exit')}provider.closeAllConnections();await new Promise(r=>provider.close(r))}
