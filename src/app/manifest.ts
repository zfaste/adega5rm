import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name:"Adega — Gabinete Militar", short_name:"Adega", description:"Gestão e controle institucional de vinhos.", start_url:"/", display:"standalone", background_color:"#1d0d12", theme_color:"#1d0d12", lang:"pt-BR" };
}
