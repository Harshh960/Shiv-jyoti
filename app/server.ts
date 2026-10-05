import "server-only";
import { database } from "../lib/supabase/database";
import { defaults, type Product } from "./data";
export { sameOrigin } from "../lib/security";
export { getOwner } from "../lib/auth";
export async function loadProducts(all=false): Promise<Product[]> {
  const db=database(); const products:Product[]=[];
  for(let offset=0;offset<10000;offset+=1000){
    let query=db.from("products").select("*").order("updated",{ascending:false}).order("id").range(offset,offset+999);
    if(!all)query=query.eq("published",true);
    const {data,error}=await query; if(error)throw error;
    products.push(...(data as Product[])); if(data.length<1000)return products;
  }
  throw new Error("Catalogue exceeds 10,000 products; add pagination before growing further.");
}
export async function loadSettings(){
  const {data,error}=await database().from("settings").select("content").eq("id","store").maybeSingle();
  if(error)throw error;
  return {...defaults,...(data?.content||{})};
}
