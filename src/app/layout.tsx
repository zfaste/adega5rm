import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"Adega", description:"Controle inteligente de vinhos", manifest:"/manifest.webmanifest", applicationName:"Adega" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
