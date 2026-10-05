import Storefront from "../../storefront";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Storefront route="product" productId={id}/>;}
