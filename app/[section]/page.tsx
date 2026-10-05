import Storefront from "../storefront";
import {notFound} from "next/navigation";
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!["women","men","kids","other","collections","about","contact"].includes(section))notFound();return <Storefront route={section}/>;}
