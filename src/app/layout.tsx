import type { Metadata } from "next";
export const metadata: Metadata={title:"Adega 5ª RM",description:"Sistema de gestão"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
