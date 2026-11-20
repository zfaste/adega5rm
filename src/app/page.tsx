"use client";

import { FormEvent, useState } from "react";

type Mode = "login" | "forgot" | "request";

const inputStyle = { display: "block", width: "100%", marginTop: 7, padding: "13px", border: "1px solid #dacfd2", borderRadius: 9, fontSize: 15 };

export default function Home() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    const response = await fetch(mode === "request" ? "/api/access-request" : "/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mode === "request" ? { email } : { action: mode, email, password }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    if (mode === "login") window.location.href = "/painel";
    else setMessage(data.message);
  };

  const heading = mode === "login" ? "Entrar" : mode === "forgot" ? "Recuperar senha" : "Solicitar acesso";
  const description = mode === "login" ? "Use seu e-mail e senha institucional para acessar o sistema." : mode === "forgot" ? "Informe seu e-mail para receber as instruções." : "Informe seu e-mail. O pedido será enviado para análise de um administrador.";

  return <main className="auth-shell">
    <section className="auth-identity">
      <div className="identity-content">
        <img className="identity-emblem" src="/brand/gabinete-5rm-bordo.png" alt="Símbolo do Gabinete da 5ª Região Militar" />
        <div><h1>Adega da<br />5ª Região Militar</h1><p>Sistema institucional para gestão, controle e rastreabilidade do acervo de vinhos.</p></div>
      </div>
      <span>GESTÃO DE ADEGA · ACESSO RESTRITO</span>
    </section>
    <section className="auth-form-area"><div className="auth-form-card">
      <p className="eyebrow">ADEGA 5ª RM</p><h2>{heading}</h2><p className="form-description">{description}</p>
      <form onSubmit={submit}>
        <label>E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@exemplo.com" style={inputStyle} /></label>
        {mode === "login" && <label>Senha<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" style={inputStyle} /></label>}
        <button className="primary-button">{mode === "login" ? "Entrar" : mode === "forgot" ? "Enviar instruções" : "Enviar solicitação"}</button>
      </form>
      {message && <p className="form-message">{message}</p>}
      <div className="auth-links">{mode === "login" ? <><button onClick={() => { setMessage(""); setMode("forgot"); }}>Esqueci minha senha</button><button onClick={() => { setMessage(""); setMode("request"); }}>Precisa de acesso? Solicitar acesso</button></> : <button onClick={() => { setMessage(""); setMode("login"); }}>← Voltar para entrar</button>}</div>
    </div></section>
  </main>;
}
