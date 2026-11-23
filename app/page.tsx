"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Service = { id?: string; name: string; category: string; price: number; active?: boolean };
const demoServices: Service[] = [
  {name:"Fio a Fio",category:"Cílios",price:90},
  {name:"Volume Brasileiro",category:"Cílios",price:110},
  {name:"Volume Egípcio",category:"Cílios",price:120},
  {name:"Manutenção de Cílios",category:"Cílios",price:60},
  {name:"Design de Sobrancelhas",category:"Sobrancelhas",price:25},
  {name:"Design com Henna",category:"Sobrancelhas",price:35},
  {name:"Brow Lamination",category:"Sobrancelhas",price:80},
  {name:"Coloração de Sobrancelhas",category:"Sobrancelhas",price:30},
];
const brl = (v:number) => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today = () => {
  const d = new Date(); const local = new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
};

export default function Home() {
  const [services,setServices] = useState<Service[]>(demoServices);
  const [selected,setSelected] = useState<Service>(demoServices[0]);
  const [name,setName] = useState(""); const [phone,setPhone] = useState("");
  const [date,setDate] = useState(""); const [time,setTime] = useState("");
  const [notes,setNotes] = useState(""); const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState(""); const [booking,setBooking] = useState<{id?:string;code:string;total:number;date:string;time:string}|null>(null);
  const [occupied,setOccupied] = useState<string[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [dayBlocked, setDayBlocked] = useState(false);
  const pix = process.env.NEXT_PUBLIC_STUDIO_PIX_KEY || "93991262037";
const studioAddress = {
  street: "Rua das Flores",
  number: "123",
  neighborhood: "Centro",
  city: "Óbidos - PA"
};
  const slots = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00"];

  useEffect(() => {
  if (!date || !supabase) {
    setBlockedTimes([]);
    setDayBlocked(false);
    return;
  }

  supabase
    .from("blocked_slots")
    .select("blocked_time")
    .eq("blocked_date", date)
    .then(({ data, error }) => {
      if (error) {
        console.error("Erro ao consultar bloqueios:", error);
        return;
      }

      const blocks = data || [];

      setDayBlocked(blocks.some(item => item.blocked_time === null));
      setBlockedTimes(
        blocks
          .map(item => item.blocked_time)
          .filter((time): time is string => time !== null)
      );
    });
}, [date]);

  const deposit = useMemo(()=>Math.round(selected.price*50)/100,[selected]);
  
async function submit(e: React.FormEvent) {
  e.preventDefault();
  setMessage("");

  if (!name.trim() || !phone.trim() || !date || !time) {
    setMessage("Preencha todos os campos obrigatórios.");
    return;
  }

  if (date < today()) {
    setMessage("Escolha uma data futura.");
    return;
  }

  
setBusy(true);

if (supabase) {
  const [
    { data: busySlots, error: busyError },
    { data: blocks, error: blockError }
  ] = await Promise.all([
    supabase.rpc("get_busy_slots", { target_date: date }),
    supabase
      .from("blocked_slots")
      .select("blocked_time")
      .eq("blocked_date", date)
  ]);

  if (busyError || blockError) {
    setMessage("Não foi possível verificar a disponibilidade. Tente novamente.");
    setBusy(false);
    return;
  }

  const occupiedNow = (busySlots || []).map(
    (item: { slot_time: string }) => item.slot_time
  );

  const blocksNow = blocks || [];

  const wholeDayBlocked = blocksNow.some(
    item => item.blocked_time === null
  );

  const timeBlocked = blocksNow.some(
    item => item.blocked_time === time
  );

  if (wholeDayBlocked || timeBlocked || occupiedNow.includes(time)) {
    setMessage("Esse horário não está mais disponível. Escolha outro.");
    setTime("");
    setBusy(false);
    return;
  }
}

const code = "ST-" + Math.random().toString(36).slice(2, 8).toUpperCase();

const payload = {
  customer_name: name.trim(),
  customer_phone: phone.trim(),
  service_name: selected.name,
  total_price: selected.price,
  deposit_amount: deposit,
  appointment_date: date,
  time,
  notes: notes.trim(),
  status: "pending_payment",
  booking_code: code
};

if (supabase) {
  const { error } = await supabase
    .from("appointments")
    .insert(payload);

  if (error) {
    console.error("Erro Supabase:", error);
    setMessage(`Erro: ${error.message} | Código: ${error.code}`);
    setBusy(false);
    return;
  }

  setBooking({
    code,
    total: selected.price,
    date,
    time
  });
} else {
  setMessage("Supabase não configurado. Agendamento não foi salvo.");
}

setBusy(false);
}

  async function copyPix() {
    try { await navigator.clipboard.writeText(pix); setMessage("Chave Pix copiada!"); }
    catch { setMessage("Copie a chave Pix exibida na tela."); }
  }
  return <main className="container py-8 md:py-12">
    <header className="rounded-3xl p-8 md:p-12 text-center mb-8" style={{background:"linear-gradient(130deg,#f3d8e2,#fff0e8)",color:"#704354"}}>
      <p className="text-xs tracking-[.3em] uppercase mb-3">Beauty • Elegance • Care</p>
      <h1 className="serif text-4xl md:text-5xl mb-3">Studio de Cílios</h1>
      <p className="text-sm md:text-base">Realce sua beleza, valorize seu olhar ✨</p>
      <p className="text-xs tracking-widest mt-5">CÍLIOS & SOBRANCELHAS</p>
    </header>
    {!booking ? <section className="max-w-2xl mx-auto space-y-5">
      <div><h2 className="text-2xl font-semibold">Agende seu atendimento</h2><p className="muted text-sm mt-1">Escolha o procedimento, a data e o melhor horário.</p></div>
      <form onSubmit={submit} className="space-y-5">
<div className="card space-y-2">
  <h3 className="font-bold">📍 Local do atendimento</h3>
  <p className="text-sm muted">
    Seu atendimento será realizado no endereço do nosso estúdio:
  </p>
  <p className="font-semibold">
    {studioAddress.street}, nº {studioAddress.number}
  </p>
  <p className="text-sm muted">
    {studioAddress.neighborhood} — {studioAddress.city}
  </p>
</div>
        {["Cílios","Sobrancelhas"].map(category=><div className="card" key={category}>
          <h3 className="font-bold mb-3">{category}</h3><div className="grid sm:grid-cols-2 gap-2">
            {services.filter(s=>s.category===category).map(s=><button type="button" className="service" key={s.id||s.name} aria-pressed={selected.name===s.name} onClick={()=>setSelected(s)}>
              <span className="block font-semibold">{s.name}</span><span className="text-sm muted">{brl(s.price)}</span>
            </button>)}
          </div>
        </div>)}
        <div className="card space-y-3">
          <h3 className="font-bold">Resumo do pagamento</h3>
          <div className="flex justify-between text-sm"><span className="muted">Procedimento</span><b>{selected.name}</b></div>
          <div className="flex justify-between"><span>Valor total</span><b>{brl(selected.price)}</b></div>
          <div className="flex justify-between"><span className="muted">Sinal de 50%</span><b style={{color:"#a65d7b"}}>{brl(deposit)}</b></div>
          <div className="flex justify-between text-sm"><span className="muted">Restante após o serviço</span><b>{brl(selected.price-deposit)}</b></div>

        </div>

        <div className="card space-y-3">
          <h3 className="font-bold">Seus dados</h3>

          <label className="block text-sm">
            Nome completo
            <input
              className="field mt-1"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="Digite seu nome completo"
            />
          </label>

          <label className="block text-sm">
            WhatsApp
            <input
              className="field mt-1"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              maxLength={25}
              placeholder="(00) 00000-0000"
            />
          </label>

          <label className="block text-sm">
            Data do atendimento
            <input
              className="field mt-1"
              type="date"
              min={today()}
              value={date}
              onChange={e => {
                setDate(e.target.value);
                setTime("");
              }}
              required
            />
          </label>

          <label className="block text-sm">
            Horário
            <select
              className="field mt-1"
              value={time}
              onChange={e => setTime(e.target.value)}
              required
              disabled={dayBlocked}
            >
              <option value="">Selecione</option>
              {slots.map(t => {
                const unavailable =
                  occupied.includes(t) || blockedTimes.includes(t);

                return (
                  <option key={t} value={t} disabled={unavailable}>
                    {t}{unavailable ? " — indisponível" : ""}
                  </option>
                );
              })}
            </select>

            {dayBlocked && (
              <p className="text-sm mt-2" style={{ color: "#a65d7b" }}>
                Esta data está bloqueada para agendamentos.
              </p>
            )}
          </label>

          <label className="block text-sm">
            Observações (opcional)
            <textarea
              className="field mt-1"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
            />
          </label>
        </div>

        {message && <p role="alert" className="text-sm rounded-xl p-3" style={{background:"#fff0f2",color:"#8c3453"}}>{message}</p>}
        <button className="primary w-full" disabled={busy}>{busy?"Registrando...":"Continuar para pagamento do sinal"}</button>
        <p className="muted text-xs text-center">O horário fica pendente até a confirmação do pagamento do sinal.</p>
      </form>
    </section> : <section className="max-w-xl mx-auto card space-y-4">
      <div className="text-center"><div className="text-3xl mb-2">💗</div><h2 className="text-2xl font-semibold">Pedido de agendamento registrado!</h2><p className="muted text-sm mt-1">Guarde seu código de atendimento: <b>{booking.code}</b></p></div>
      <div className="rounded-xl p-4 space-y-2" style={{background:"#fff5f8"}}>
        <h3 className="font-bold">Pagamento do sinal via Pix</h3>
        <div className="flex justify-between"><span className="muted">Total</span><b>{brl(booking.total)}</b></div>
        <div className="flex justify-between"><span>Sinal (50%)</span><b>{brl(Math.round(booking.total*50)/100)}</b></div>
        <div className="pt-2"><p className="text-xs muted mb-1">CHAVE PIX</p><div className="flex items-center gap-2"><code className="font-bold flex-1 break-all">{pix}</code><button type="button" className="secondary" onClick={copyPix}>Copiar</button></div></div>
        <p className="text-xs muted">Envie o comprovante ao estúdio. O agendamento só será confirmado após a conferência do pagamento.</p>
      </div>
      <div className="flex justify-between"><span className="muted">Restante após o atendimento</span>
<div className="card space-y-2">
  <h3 className="font-bold">📍 Endereço do atendimento</h3>
  <p className="text-sm">
    {studioAddress.street}, nº {studioAddress.number}
  </p>
  <p className="text-sm muted">
    {studioAddress.neighborhood} — {studioAddress.city}
  </p>
</div>
<b>{brl(booking.total-Math.round(booking.total*50)/100)}</b></div>
      {message && <p className="text-sm muted">{message}</p>}
      <button className="primary w-full" onClick={()=>{setBooking(null);setMessage("");setName("");setPhone("");setDate("");setTime("");setNotes("");}}>Voltar ao início</button>
    </section>}
    <footer className="text-center muted text-xs mt-10">Studio de Cílios • Sua beleza em cada detalhe ♡</footer>
  </main>;
}
