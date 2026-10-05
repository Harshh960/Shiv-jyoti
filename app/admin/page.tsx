import { redirect } from "next/navigation";
import { getOwner } from "../../lib/auth";
import Admin from "./ui";
export const dynamic="force-dynamic";
export default async function Page(){if(!await getOwner())redirect("/login");return <Admin/>;}
