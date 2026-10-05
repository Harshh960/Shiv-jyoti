import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"New Shiv Jyoti | Where Tradition Meets Style",description:"Explore family fashion at New Shiv Jyoti, Mangal Hatt Chowk, Vaishali. Browse women’s, men’s and kids’ clothing and enquire on WhatsApp.",icons:{icon:"/favicon.svg"}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
