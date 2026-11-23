"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "cilios@gmail.com";

type Appointment = {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  total_price: number;
  deposit_amount: number;
  appointment_date: string;
  time: string;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
};
type BlockedSlot = {
  id: string;
  blocked_date: string;
  blocked_time: string | null;
  reason: string | null;
};

type Filter = "all" | Appointment["status"];

const brl = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dateBR = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const statusLabels: Record<Appointment["status"], string> = {
  pending_payment: "Aguardando Pix",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColors: Record<Appointment["status"], { color: string; background: string }> = {
  pending_payment: { color: "#93611b", background: "#fff4dc" },
  confirmed: { color: "#28734d", background: "#e8f7ef" },
  completed: { color: "#53617e", background: "#eef1f8" },
  cancelled: { color: "#9a4054", background: "#fff0f2" },
};

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
const [financialMonth, setFinancialMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
});
  const [blockedRows, setBlockedRows] = useState<BlockedSlot[]>([]);
const [blockDate, setBlockDate] = useState("");
const [blockTime, setBlockTime] = useState("");
const [blockReason, setBlockReason] = useState("");
const [blockBusy, setBlockBusy] = useState(false);

const availableTimes = [
  "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("appointments")
      .select("id,booking_code,customer_name,customer_phone,service_name,total_price,deposit_amount,appointment_date,time,status,notes")
      .order("appointment_date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.error("Erro ao carregar agenda:", error);
      setMsg("Não foi possível carregar os agendamentos. Confira o acesso administrativo.");
      return;
    }
    setRows((data || []) as Appointment[]);
    setMsg("");
  }, []);

const loadBlocks = useCallback(async () => {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("blocked_slots")
    .select("id,blocked_date,blocked_time,reason")
    .order("blocked_date", { ascending: true });

  if (error) {
    console.error("Erro ao carregar bloqueios:", error);
    setMsg("Não foi possível carregar os bloqueios.");
    return;
  }

  setBlockedRows((data || []) as BlockedSlot[]);
}, []);

async function addBlock(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!supabase || !blockDate) {
    setMsg("Selecione uma data para bloquear.");
    return;
  }

  setBlockBusy(true);
  setMsg("");

  const { error } = await supabase
    .from("blocked_slots")
    .insert({
      blocked_date: blockDate,
      blocked_time: blockTime || null,
      reason: blockReason.trim() || null
    });

  if (error) {
    console.error("Erro ao criar bloqueio:", error);

    setMsg(
      error.code === "23505"
        ? "Esse dia ou horário já está bloqueado."
        : "Não foi possível criar o bloqueio. Confira as permissões."
    );

    setBlockBusy(false);
    return;
  }

  setBlockDate("");
  setBlockTime("");
  setBlockReason("");

  await loadBlocks();

  setMsg("Bloqueio criado com sucesso!");
  setBlockBusy(false);
}

async function removeBlock(id: string) {
  if (!supabase) return;

  if (!window.confirm("Deseja realmente remover este bloqueio?")) {
    return;
  }

  setBlockBusy(true);
  setMsg("");

  const { error } = await supabase
    .from("blocked_slots")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao remover bloqueio:", error);
    setMsg("Não foi possível remover o bloqueio.");
  } else {
    await loadBlocks();
    setMsg("Bloqueio removido com sucesso!");
  }

  setBlockBusy(false);
}

  useEffect(() => {
    let active = true;
    async function checkSession() {
      if (!supabase) {
        setMsg("Supabase não configurado. Confira o arquivo .env.local.");
        setChecking(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const user = data.session?.user;
      if (user?.email?.toLowerCase() === ADMIN_EMAIL) {
        setLogged(true);
await load();
await loadBlocks();
      } else if (user) {
        await supabase.auth.signOut();
        setMsg("Esta conta não tem autorização para acessar o painel.");
      }
      setChecking(false);
    }
    void checkSession();
    return () => { active = false; };
  }, [load, loadBlocks]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMsg("");
    if (!supabase) {
      setMsg("Supabase não configurado. Confira o arquivo .env.local.");
      return;
    }
    setChecking(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      if (!error && data.user) await supabase.auth.signOut();
      setMsg(error ? "E-mail ou senha inválidos." : "Esta conta não está autorizada como administradora.");
      setChecking(false);
      return;
    }
    setLogged(true);
    await load();
    setChecking(false);
  }

  async function changeStatus(id: string, status: Appointment["status"]) {
    if (!supabase) return;
    setBusyId(id);
    setMsg("");
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      console.error("Erro ao atualizar agendamento:", error);
      setMsg("Não foi possível atualizar. Verifique se a política de segurança foi aplicada.");
    } else {
      await load();
    }
    setBusyId(null);
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setLogged(false);
    setRows([]);
    setPassword("");
  }

  const stats = useMemo(() => {
    const pending = rows.filter((row) => row.status === "pending_payment");
    const confirmed = rows.filter((row) => row.status === "confirmed");
    const completed = rows.filter((row) => row.status === "completed");
    const received = rows
      .filter((row) => row.status === "confirmed" || row.status === "completed")
      .reduce((sum, row) => sum + Number(row.deposit_amount || 0), 0);
    return { pending: pending.length, confirmed: confirmed.length, completed: completed.length, received };
  }, [rows]);
const financialStats = useMemo(() => {
  const monthRows = rows.filter(row =>
    row.appointment_date.startsWith(financialMonth)
  );

  const received = monthRows.reduce((sum, row) => {
    if (row.status === "completed") {
      return sum + Number(row.total_price || 0);
    }

    if (row.status === "confirmed") {
      return sum + Number(row.deposit_amount || 0);
    }

    return sum;
  }, 0);

  const pending = monthRows
    .filter(row => row.status === "pending_payment")
    .reduce((sum, row) => sum + Number(row.deposit_amount || 0), 0);

  const forecast = monthRows
    .filter(row => row.status !== "cancelled")
    .reduce((sum, row) => sum + Number(row.total_price || 0), 0);

  const completed = monthRows.filter(
    row => row.status === "completed"
  ).length;

  const cancelled = monthRows.filter(
    row => row.status === "cancelled"
  ).length;

  return { received, pending, forecast, completed, cancelled };
}, [rows, financialMonth]);

const monthlyChart = useMemo(() => {
  const [year, month] = financialMonth.split("-").map(Number);

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 1 - (5 - index), 1);

    const key = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    const monthRows = rows.filter(row =>
      row.appointment_date.startsWith(key)
    );

    const received = monthRows.reduce((sum, row) => {
      if (row.status === "completed") {
        return sum + Number(row.total_price || 0);
      }

      if (row.status === "confirmed") {
        return sum + Number(row.deposit_amount || 0);
      }

      return sum;
    }, 0);

    return {
      key,
      label: date.toLocaleDateString("pt-BR", {
        month: "short",
      }),
      received,
    };
  });
}, [rows, financialMonth]);

const chartMax = Math.max(
  ...monthlyChart.map(item => item.received),
  1
);

const financialDetails = useMemo(() => {
  return rows
    .filter(row => row.appointment_date.startsWith(financialMonth))
    .sort((a, b) => {
      const dateCompare = a.appointment_date.localeCompare(
        b.appointment_date
      );

      if (dateCompare !== 0) return dateCompare;

      return a.time.localeCompare(b.time);
    })
    .map(row => {
      let receivedAmount = 0;
      let paymentLabel = "";

      if (row.status === "completed") {
        receivedAmount = Number(row.total_price || 0);
        paymentLabel = "Pagamento completo";
      } else if (row.status === "confirmed") {
        receivedAmount = Number(row.deposit_amount || 0);
        paymentLabel = "Sinal recebido";
      } else if (row.status === "pending_payment") {
        paymentLabel = "Aguardando Pix";
      } else {
        paymentLabel = "Cancelado";
      }

      return {
        ...row,
        receivedAmount,
        paymentLabel,
      };
    });
}, [rows, financialMonth]);

  const calendarCells = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const appointments = rows.filter((row) => row.appointment_date === key);
      return {
        date,
        key,
        inMonth: date.getMonth() === calendarMonth.getMonth(),
        appointments,
        activeCount: appointments.filter((row) => row.status !== "cancelled").length,
        pendingCount: appointments.filter((row) => row.status === "pending_payment").length,
        confirmedCount: appointments.filter((row) => row.status === "confirmed").length,
        completedCount: appointments.filter((row) => row.status === "completed").length,
      };
    });
  }, [calendarMonth, rows]);

  const calendarTitle = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(calendarMonth);

  function moveCalendarMonth(amount: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  const visibleRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return rows.filter((row) => {
      const matchesFilter = filter === "all" || row.status === filter;
      const matchesDay = !day || row.appointment_date === day;
      const matchesSearch = !term || [row.customer_name, row.customer_phone, row.booking_code, row.service_name]
        .some((value) => value.toLocaleLowerCase("pt-BR").includes(term));
      return matchesFilter && matchesDay && matchesSearch;
    });
  }, [rows, filter, day, search]);

  if (checking) {
    return <main className="container py-16"><div className="card text-center muted">Carregando painel administrativo...</div></main>;
  }

  if (!logged) {
    return (
      <main className="container max-w-md py-12 md:py-20">
        <div className="card space-y-5">
          <a href="/" className="muted text-sm">← Voltar ao site</a>
          <div className="text-center">
            <div className="text-3xl mb-2">♡</div>
            <p className="text-xs tracking-[.25em] uppercase muted">Studio de Cílios</p>
            <h1 className="serif text-3xl mt-2">Área administrativa</h1>
            <p className="muted text-sm mt-2">Entre com a conta autorizada da proprietária.</p>
          </div>
          <form onSubmit={login} className="space-y-3">
            <label className="block text-sm">E-mail
              <input className="field mt-1" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="block text-sm">Senha
              <input className="field mt-1" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <button className="primary w-full" disabled={checking}>{checking ? "Entrando..." : "Entrar no painel"}</button>
          </form>
          {msg && <p role="alert" className="text-sm rounded-xl p-3" style={{ background: "#fff0f2", color: "#8c3453" }}>{msg}</p>}
          <p className="muted text-xs text-center">Acesso restrito. Os dados das clientes não são públicos.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-7 md:py-10 space-y-6">
      <header className="rounded-3xl p-6 md:p-8 flex flex-wrap items-center justify-between gap-4" style={{ background: "linear-gradient(130deg,#f3d8e2,#fff0e8)", color: "#704354" }}>
        <div>
          <a href="/" className="text-sm opacity-75">← Ver site público</a>
          <p className="text-xs tracking-[.25em] uppercase mt-4">Studio de Cílios</p>
          <h1 className="serif text-3xl md:text-4xl mt-1">Painel da agenda</h1>
          <p className="text-sm mt-2 opacity-80">Gerencie reservas e pagamentos em um só lugar.</p>
        </div>
        <button className="secondary" onClick={logout}>Sair da conta</button>
      </header>

      {msg && <p role="alert" className="text-sm rounded-xl p-3" style={{ background: "#fff0f2", color: "#8c3453" }}>{msg}</p>}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card"><p className="muted text-xs">Aguardando Pix</p><p className="text-2xl font-bold mt-2">{stats.pending}</p></div>
        <div className="card"><p className="muted text-xs">Confirmados</p><p className="text-2xl font-bold mt-2">{stats.confirmed}</p></div>
        <div className="card"><p className="muted text-xs">Concluídos</p><p className="text-2xl font-bold mt-2">{stats.completed}</p></div>
        <div className="card"><p className="muted text-xs">Sinais confirmados*</p><p className="text-xl md:text-2xl font-bold mt-2">{brl(stats.received)}</p></div>
      </section>
      <p className="muted text-xs">* Soma dos sinais de agendamentos confirmados ou concluídos; não é uma conciliação automática com o banco.</p>

<section className="card space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-semibold">Controle financeiro</h2>
      <p className="muted text-sm">
        Resumo financeiro dos atendimentos.
      </p>
    </div>

    <input
      className="field sm:max-w-48"
      type="month"
      value={financialMonth}
      onChange={e => setFinancialMonth(e.target.value)}
    />
  </div>

  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    <div className="rounded-xl p-4" style={{ background: "#e8f7ef" }}>
      <p className="text-xs text-green-800">Total recebido</p>
      <p className="text-xl font-bold mt-2 text-green-900">
        {brl(financialStats.received)}
      </p>
    </div>

    <div className="rounded-xl p-4" style={{ background: "#fff4dc" }}>
      <p className="text-xs" style={{ color: "#93611b" }}>Aguardando Pix</p>
      <p className="text-xl font-bold mt-2" style={{ color: "#93611b" }}>
        {brl(financialStats.pending)}
      </p>
    </div>

    <div className="rounded-xl p-4" style={{ background: "#f3eafa" }}>
      <p className="text-xs" style={{ color: "#704354" }}>Faturamento previsto</p>
      <p className="text-xl font-bold mt-2" style={{ color: "#704354" }}>
        {brl(financialStats.forecast)}
      </p>
    </div>

    <div className="rounded-xl p-4" style={{ background: "#eef1f8" }}>
      <p className="text-xs" style={{ color: "#53617e" }}>Concluídos</p>
      <p className="text-2xl font-bold mt-2" style={{ color: "#53617e" }}>
        {financialStats.completed}
      </p>
    </div>

    <div className="rounded-xl p-4" style={{ background: "#fff0f2" }}>
      <p className="text-xs" style={{ color: "#9a4054" }}>Cancelamentos</p>
      <p className="text-2xl font-bold mt-2" style={{ color: "#9a4054" }}>
        {financialStats.cancelled}
      </p>
    </div>
  </div>
</section>

<section className="card space-y-4">
  <div>
    <h2 className="text-xl font-semibold">
      Faturamento dos últimos 6 meses
    </h2>
    <p className="muted text-sm">
      Comparativo dos valores efetivamente recebidos.
    </p>
  </div>

  <div className="flex items-end gap-3 h-56 pt-4">
    {monthlyChart.map((item) => (
      <div
        key={item.key}
        className="flex-1 flex flex-col items-center justify-end gap-2 h-full"
      >
        <span className="text-xs font-semibold text-center">
          {brl(item.received)}
        </span>

        <div className="w-full flex-1 flex items-end">
          <div
            className="w-full rounded-t-lg"
            style={{
              height: `${Math.max(
                (item.received / chartMax) * 100,
                item.received > 0 ? 5 : 0
              )}%`,
              background: "#a855f7",
              minHeight: item.received > 0 ? "4px" : "0",
            }}
          />
        </div>

        <span className="text-xs muted capitalize">
          {item.label}
        </span>
      </div>
    ))}
  </div>
</section>

<section className="card space-y-4 financial-report">
  <div className="flex flex-wrap items-center justify-between gap-3">
  <div>
    <h2 className="text-xl font-semibold">
      Relatório financeiro detalhado
    </h2>
    <p className="muted text-sm">
      Atendimentos registrados no mês selecionado.
    </p>
  </div>

  <button
    type="button"
    onClick={() => window.print()}
    className="btn-primary"
  >
    Gerar PDF
  </button>
</div>

  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="border-b">
          <th className="p-3">Data</th>
          <th className="p-3">Horário</th>
          <th className="p-3">Cliente</th>
          <th className="p-3">Serviço</th>
          <th className="p-3">Recebido</th>
          <th className="p-3">Situação</th>
        </tr>
      </thead>

      <tbody>
        {financialDetails.map(row => (
          <tr key={row.id} className="border-b">
            <td className="p-3">
              {new Date(`${row.appointment_date}T12:00:00`).toLocaleDateString("pt-BR")}
            </td>

            <td className="p-3">{row.time}</td>

            <td className="p-3">{row.customer_name}</td>

            <td className="p-3">{row.service_name}</td>

            <td className="p-3 font-semibold">
              {brl(row.receivedAmount)}
            </td>

            <td className="p-3">
              {row.paymentLabel}
            </td>
          </tr>
        ))}

        {financialDetails.length === 0 && (
          <tr>
            <td colSpan={6} className="p-5 text-center muted">
              Nenhum atendimento encontrado neste mês.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  <div className="border-t pt-4 flex justify-between items-center gap-3">
    <span className="font-semibold">
      Total recebido no mês
    </span>

    <span className="text-xl font-bold">
      {brl(financialStats.received)}
    </span>
  </div>
</section>

<section className="card space-y-4">
  <div>
    <h2 className="text-xl font-semibold">Gerenciar disponibilidade</h2>
    <p className="muted text-sm">
      Bloqueie dias inteiros ou horários específicos da agenda.
    </p>
  </div>

  <form onSubmit={addBlock} className="space-y-3">
    <label className="block text-sm">
      Data do bloqueio
      <input
        className="field mt-1"
        type="date"
        min={new Date().toLocaleDateString("en-CA")}
        value={blockDate}
        onChange={e => setBlockDate(e.target.value)}
        required
      />
    </label>

    <label className="block text-sm">
      O que deseja bloquear?
      <select
        className="field mt-1"
        value={blockTime}
        onChange={e => setBlockTime(e.target.value)}
      >
        <option value="">Dia inteiro</option>
        {availableTimes.map(time => (
          <option key={time} value={time}>
            Somente {time}
          </option>
        ))}
      </select>
    </label>

    <label className="block text-sm">
      Motivo do bloqueio
      <input
        className="field mt-1"
        value={blockReason}
        onChange={e => setBlockReason(e.target.value)}
        placeholder="Ex.: Folga, compromisso..."
        maxLength={100}
      />
    </label>

    <button
      className="primary w-full"
      type="submit"
      disabled={blockBusy}
    >
      {blockBusy ? "Salvando..." : "Bloquear disponibilidade"}
    </button>
  </form>

  <div className="border-t pt-4 space-y-3">
    <h3 className="font-semibold">Bloqueios cadastrados</h3>

    {blockedRows.length === 0 ? (
      <p className="muted text-sm">
        Nenhum bloqueio cadastrado.
      </p>
    ) : (
      blockedRows.map(block => (
        <div
          key={block.id}
          className="rounded-xl p-3 flex flex-wrap justify-between items-center gap-3"
          style={{ background: "#fff5f8" }}
        >
          <div>
            <p className="font-semibold text-sm">
              {dateBR(block.blocked_date)}
              {" — "}
              {block.blocked_time || "Dia inteiro"}
            </p>

            {block.reason && (
              <p className="muted text-xs mt-1">
                Motivo: {block.reason}
              </p>
            )}
          </div>

          <button
            type="button"
            className="secondary text-sm"
            disabled={blockBusy}
            onClick={() => void removeBlock(block.id)}
          >
            Desbloquear
          </button>
        </div>
      ))
    )}
  </div>
</section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Calendário da agenda</h2>
            <p className="muted text-sm">Selecione um dia para ver os atendimentos correspondentes.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="secondary" aria-label="Mês anterior" onClick={() => moveCalendarMonth(-1)}>‹</button>
            <button type="button" className="secondary capitalize min-w-36" onClick={() => { setCalendarMonth(new Date()); setDay(""); }}>Hoje</button>
            <button type="button" className="secondary" aria-label="Próximo mês" onClick={() => moveCalendarMonth(1)}>›</button>
          </div>
        </div>
        <p className="serif text-2xl capitalize">{calendarTitle}</p>
        <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-label="Calendário mensal">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((weekday) => (
            <div key={weekday} className="text-center muted text-xs font-semibold py-2">{weekday}</div>
          ))}
          {calendarCells.map((cell) => {
            const selectedDay = day === cell.key;
            const hasAppointments = cell.activeCount > 0;
            return (
              <button
                type="button"
                key={cell.key}
                onClick={() => setDay(cell.key)}
                aria-pressed={selectedDay}
                aria-label={`${cell.date.getDate()} de ${calendarTitle}, ${cell.activeCount} atendimentos ativos`}
                className="min-h-[66px] sm:min-h-[82px] rounded-xl border p-1.5 sm:p-2 text-left transition"
                style={{
                  borderColor: selectedDay ? '#a65d7b' : '#eee1e5',
                  background: selectedDay ? '#fff0f5' : cell.inMonth ? '#fff' : '#faf7f7',
                  color: cell.inMonth ? '#493d43' : '#b8aeb2',
                  boxShadow: selectedDay ? 'inset 0 0 0 1px #a65d7b' : 'none',
                }}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="text-sm font-semibold">{cell.date.getDate()}</span>
                  {hasAppointments && <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: '#f6e2ea', color: '#8c4965' }}>{cell.activeCount}</span>}
                </span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {cell.pendingCount > 0 && <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#d59b36' }} />}
                  {cell.confirmedCount > 0 && <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#3c9a69' }} />}
                  {cell.completedCount > 0 && <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#71809f' }} />}
                </span>
                {cell.activeCount > 0 && <span className="block mt-1 text-[10px] leading-tight">{cell.activeCount === 1 ? 'atendimento' : 'atendimentos'}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs muted">
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: '#d59b36' }} /> Aguardando Pix</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: '#3c9a69' }} /> Confirmado</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: '#71809f' }} /> Concluído</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl p-3" style={{ background: '#fff7fa' }}>
          <p className="text-sm">{day ? <>Dia selecionado: <b>{dateBR(day)}</b></> : 'Nenhum dia selecionado'}</p>
          <div className="flex gap-2">
            {day && <button type="button" className="text-sm underline muted" onClick={() => setDay("")}>Mostrar todos</button>}
            <button type="button" className="text-sm font-semibold underline" style={{ color: '#965873' }} onClick={() => { setCalendarMonth(new Date()); setDay(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`); }}>Ir para hoje</button>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Agendamentos</h2><p className="muted text-sm">{visibleRows.length} de {rows.length} reservas</p></div>
          <button className="secondary" onClick={() => void load()}>↻ Atualizar agenda</button>
        </div>
        <input className="field" placeholder="Pesquisar cliente, WhatsApp, serviço ou código..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Filtrar por data
            <input className="field mt-1" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
          </label>
          <label className="text-sm">Situação
            <select className="field mt-1" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
              <option value="all">Todas as situações</option>
              <option value="pending_payment">Aguardando Pix</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </label>
        </div>
        {(search || day || filter !== "all") && <button className="text-sm underline muted" onClick={() => { setSearch(""); setDay(""); setFilter("all"); }}>Limpar filtros</button>}
      </section>

      <section className="space-y-3">
        {visibleRows.length === 0 ? (
          <div className="card text-center py-10"><p className="text-2xl mb-2">♡</p><p className="font-semibold">Nenhum agendamento encontrado</p><p className="muted text-sm mt-1">Quando uma cliente reservar um horário, ele aparecerá aqui.</p></div>
        ) : visibleRows.map((appointment) => {
          const style = statusColors[appointment.status];
          const busy = busyId === appointment.id;
          return (
            <article className="card space-y-3" key={appointment.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h3 className="font-bold text-lg">{appointment.customer_name}</h3><p className="muted text-xs">Código: {appointment.booking_code}</p></div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ color: style.color, background: style.background }}>{statusLabels[appointment.status]}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <p><span className="muted">Procedimento:</span> <b>{appointment.service_name}</b></p>
                <p><span className="muted">Data e horário:</span> <b>{dateBR(appointment.appointment_date)} às {appointment.time}</b></p>
                <p><span className="muted">WhatsApp:</span> <a className="underline" href={`https://wa.me/55${appointment.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{appointment.customer_phone}</a></p>
                <p><span className="muted">Valor total:</span> <b>{brl(appointment.total_price)}</b></p>
                <p><span className="muted">Sinal (50%):</span> <b>{brl(appointment.deposit_amount)}</b></p>
                <p><span className="muted">Restante:</span> <b>{brl(appointment.total_price - appointment.deposit_amount)}</b></p>
              </div>
              {appointment.notes && <p className="text-sm rounded-lg p-3" style={{ background: "#fff8fa" }}><span className="muted">Observações:</span> {appointment.notes}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {appointment.status === "pending_payment" && <button className="primary text-sm" disabled={busy} onClick={() => void changeStatus(appointment.id, "confirmed")}>{busy ? "Salvando..." : "✓ Confirmar Pix"}</button>}
                {appointment.status === "confirmed" && <button className="primary text-sm" disabled={busy} onClick={() => void changeStatus(appointment.id, "completed")}>{busy ? "Salvando..." : "Concluir atendimento"}</button>}
                {appointment.status !== "cancelled" && appointment.status !== "completed" && <button className="secondary text-sm" disabled={busy} onClick={() => { if (window.confirm("Deseja realmente cancelar este agendamento?")) void changeStatus(appointment.id, "cancelled"); }}>Cancelar</button>}
              </div>
            </article>
          );
        })}
      </section>
      <footer className="text-center muted text-xs py-3">Studio de Cílios • Painel administrativo</footer>
    </main>
  );
}
