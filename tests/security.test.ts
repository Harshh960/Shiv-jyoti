import test from "node:test";
import assert from "node:assert/strict";
import {sameOrigin} from "../lib/security";
import {IMAGE_KEY,MAX_IMAGE_BYTES,imageType,productSchema,uploadSchema} from "../lib/validation";
test("reject missing and cross-site origins",()=>{
  assert.equal(sameOrigin(new Request("https://shop.example/api/admin")),false);
  assert.equal(sameOrigin(new Request("https://shop.example/api/admin",{headers:{origin:"https://evil.example"}})),false);
  assert.equal(sameOrigin(new Request("https://shop.example/api/admin",{headers:{origin:"https://shop.example"}})),true);
});
test("upload boundary and file signatures",()=>{
  assert(uploadSchema.safeParse({type:"image/png",size:MAX_IMAGE_BYTES}).success);
  assert(!uploadSchema.safeParse({type:"image/png",size:MAX_IMAGE_BYTES+1}).success);
  assert(!uploadSchema.safeParse({type:"image/svg+xml",size:100}).success);
  assert.equal(imageType(new Uint8Array([137,80,78,71,13,10,26,10])),"image/png");
  assert.equal(imageType(new TextEncoder().encode("<svg onload='x'>")),null);
  assert(!IMAGE_KEY.test("../../secrets.jpg"));
});
test("drafts allow zero images, publishing requires a validated image path",()=>{
  const draft={code:"A1",name:"Saree",category:"Women",subcategory:"Sarees",price:1000,sizes:[],colors:[],stock:"Available",description:"",images:[],flags:[],published:false};
  assert(productSchema.safeParse(draft).success);
  assert(!productSchema.safeParse({...draft,published:true}).success);
  assert(!productSchema.safeParse({...draft,images:["https://evil.example/x.jpg"],published:true}).success);
  assert(productSchema.safeParse({...draft,images:["/api/images/9b19d27c-8e53-4ec6-bd3f-7eedc184878f.jpg"],published:true}).success);
});
