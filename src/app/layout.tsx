import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Adega 5ª RM",description:"Sistema de gestão",icons:{icon:"/brand/gabinete-5rm-bordo.png",shortcut:"/brand/gabinete-5rm-bordo.png",apple:"/brand/gabinete-5rm-bordo.png"}};
export const viewport: Viewport={width:"device-width",initialScale:1,viewportFit:"cover"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
