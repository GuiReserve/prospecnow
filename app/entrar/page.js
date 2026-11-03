'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/client';
import s from './entrar.module.css';

function Form() {
  const router = useRouter();
  const sp = useSearchParams();
  const [criar, setCriar] = useState(sp.get('criar') === '1');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(sp.get('erro') || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => { if (data.session) router.replace('/app'); });
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    setBusy(true);
    try {
      if (criar) {
        const { data, error } = await supabase().auth.signUp({ email, password: senha, options: { data: { full_name: nome }, emailRedirectTo: location.origin + '/planos' } });
        if (error) throw error;
        if (data.session) router.push('/planos');
        else setMsg('Conta criada. Confira seu e-mail e clique no link para entrar.');
      } else {
        const { error } = await supabase().auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        router.push('/app');
      }
    } catch (e2) {
      const m = String(e2.message || '');
      setErr(/Invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /already registered/i.test(m) ? 'Esse e-mail já tem conta. Entre com ele.' : /Password should/i.test(m) ? 'A senha precisa ter pelo menos 6 caracteres.' : m || 'Não deu certo. Tente de novo.');
    } finally { setBusy(false); }
  }

  async function google() {
    setErr('');
    const { data, error } = await supabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/app', skipBrowserRedirect: true } });
    if (error || !data?.url) { setErr('O login com Google ainda não está ativado. Use e-mail e senha.'); return; }
    // confere antes de sair da página: com o Google desligado, o Supabase mostraria uma tela de erro
    try {
      const r = await fetch(data.url, { redirect: 'manual' });
      if (r.status >= 400) { setErr('O login com Google ainda não está ativado. Use e-mail e senha.'); return; }
    } catch (e) { /* o navegador pode bloquear a conferência; segue normalmente */ }
    location.href = data.url;
  }

  async function esqueci() {
    setErr(''); setMsg('');
    if (!email) { setErr('Digite seu e-mail primeiro.'); return; }
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/app' });
    if (error) setErr(error.message); else setMsg('Enviamos um link para criar uma senha nova.');
  }

  return (
    <div className={s.wrap}>
      <Link href="/" className="logo"><i /><span>Prospec<b>Now</b></span></Link>
      <form className={s.box} onSubmit={submit}>
        <h1>{criar ? 'Crie sua conta' : 'Entrar'}</h1>
        <p className="muted">{criar ? 'Depois, ative 7 dias por R$ 10 (pagamento único, não renova).' : 'Bem-vindo de volta.'}</p>
        <button type="button" className="btn ghost" onClick={google}>Continuar com Google</button>
        <div className={s.or}><span>ou com e-mail</span></div>
        {criar && <div className="field"><label htmlFor="nome">Seu nome</label><input id="nome" value={nome} onChange={e => setNome(e.target.value)} required autoComplete="name" /></div>}
        <div className="field"><label htmlFor="email">E-mail</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div className="field"><label htmlFor="senha">Senha</label><input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} autoComplete={criar ? 'new-password' : 'current-password'} /></div>
        {err && <p className="err">{err}</p>}
        {msg && <p className="okmsg">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Aguarde…' : criar ? 'Criar conta e começar' : 'Entrar'}</button>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button type="button" className={s.link} onClick={() => { setCriar(!criar); setErr(''); setMsg(''); }}>{criar ? 'Já tenho conta' : 'Criar conta'}</button>
          {!criar && <button type="button" className={s.link} onClick={esqueci}>Esqueci a senha</button>}
        </div>
        {criar && <p className={s.terms}>Ao criar a conta você concorda com os <Link href="/termos">termos</Link> e a <Link href="/privacidade">política de privacidade</Link>.</p>}
      </form>
    </div>
  );
}

export default function Entrar() {
  return <Suspense><Form /></Suspense>;
}
