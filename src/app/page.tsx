"use client";

import { FormEvent, useState } from "react";

type Mode = "login" | "register" | "forgot";

const inputStyle = { display: "block", width: "100%", marginTop: 7, padding: "13px", border: "1px solid #dacfd2", borderRadius: 9, fontSize: 15 };

export default function Home() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    if (mode === "register" && password !== confirm) return setMessage("As senhas não coincidem.");
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, email, password }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    if (mode === "login") window.location.href = "/painel";
    else setMessage(data.message);
  };

  const heading = mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar senha";
  const description = mode === "login" ? "Use seu e-mail e senha para acessar o sistema." : mode === "register" ? "Crie sua conta para começar a usar a Adega." : "Informe seu e-mail para receber as instruções.";

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
        {mode !== "forgot" && <label>Senha<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" style={inputStyle} /></label>}
        {mode === "register" && <label>Confirmar senha<input required type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} style={inputStyle} /></label>}
        <button className="primary-button">{mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar instruções"}</button>
      </form>
      {message && <p className="form-message">{message}</p>}
      <div className="auth-links">{mode === "login" ? <><button onClick={() => setMode("forgot")}>Esqueci minha senha</button><button onClick={() => setMode("register")}>Não tem conta? <b>Cadastre-se</b></button></> : <button onClick={() => setMode("login")}>← Voltar para entrar</button>}</div>
    </div></section>
  </main>;
}
