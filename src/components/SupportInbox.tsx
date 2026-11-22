"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, LifeBuoy, LoaderCircle, MessageCircle, Plus, RefreshCw, Send, TicketCheck } from "lucide-react";

type Scope = "admin" | "super";
type Status = "OPEN" | "IN_PROGRESS" | "WAITING_ON_RESTAURANT" | "RESOLVED" | "CLOSED";
type Message = { id: string; authorName: string; authorRole: "OWNER" | "STAFF" | "SUPER_ADMIN"; body: string; createdAt: string };
type Ticket = {
  id: string; subject: string; category: string; status: Status; createdAt: string; updatedAt: string;
  createdByName?: string; createdByEmail?: string;
  restaurant?: { id: string; name: string; slug: string; isActive: boolean };
  _count?: { messages: number };
  messages: (Message | Pick<Message, "body" | "authorName" | "authorRole" | "createdAt">)[];
};

const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Pending", IN_PROGRESS: "In progress", WAITING_ON_RESTAURANT: "Waiting on restaurant", RESOLVED: "Resolved", CLOSED: "Closed",
};
const STATUS_STYLE: Record<Status, string> = {
  OPEN: "bg-amber-50 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-800 border-blue-200",
  WAITING_ON_RESTAURANT: "bg-violet-50 text-violet-800 border-violet-200",
  RESOLVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
};
const STATUSES: Status[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_RESTAURANT", "RESOLVED", "CLOSED"];
const CATEGORIES = ["Orders", "Billing", "Menu", "Tables & QR", "Account", "Other"];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default function SupportInbox({ scope }: { scope: Scope }) {
  const base = `/api/${scope}/support/tickets`;
  const isSuper = scope === "super";
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [newMessage, setNewMessage] = useState("");
  const listRequestInFlight = useRef(false);
  const detailRequestsInFlight = useRef(new Set<string>());

  const loadTickets = useCallback(async (quiet = false) => {
    if (listRequestInFlight.current) return;
    listRequestInFlight.current = true;
    if (!quiet) setLoadingList(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (isSuper && search.trim()) params.set("q", search.trim());
      const response = await fetch(`${base}?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load support tickets.");
      setTickets(data.tickets ?? []);
      setHasMore(Boolean(data.hasMore));
      setSelectedId((current) => current && (data.tickets ?? []).some((ticket: Ticket) => ticket.id === current) ? current : "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load support tickets.");
    } finally { listRequestInFlight.current = false; setLoadingList(false); }
  }, [base, isSuper, page, search, statusFilter]);

  useEffect(() => {
    void loadTickets();
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadTickets(true);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [loadTickets]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) { setSelected(null); return; }
    if (detailRequestsInFlight.current.has(id)) return;
    detailRequestsInFlight.current.add(id);
    setLoadingDetail(true);
    setError("");
    try {
      const response = await fetch(`${base}/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open this ticket.");
      setSelected(data.ticket);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open this ticket.");
      setSelected(null);
    } finally { detailRequestsInFlight.current.delete(id); setLoadingDetail(false); }
  }, [base]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadDetail(selectedId);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [loadDetail, selectedId]);

  async function createTicket(event: FormEvent) {
    event.preventDefault();
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, category, message: newMessage }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the ticket.");
      setCreating(false); setSubject(""); setNewMessage(""); setPage(0); setStatusFilter("ALL"); setSearch(""); setSelectedId(data.ticket.id);
      setNotice("Ticket sent to InfoRyse support.");
      await loadTickets();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the ticket.");
    } finally { setSending(false); }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !newMessage.trim()) return;
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${base}/${encodeURIComponent(selected.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: newMessage }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send your message.");
      setNewMessage("");
      await Promise.all([loadDetail(selected.id), loadTickets()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send your message.");
    } finally { setSending(false); }
  }

  async function updateStatus(status: Status) {
    if (!selected) return;
    setSending(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${base}/${encodeURIComponent(selected.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update ticket status.");
      setNotice(`Ticket marked ${STATUS_LABEL[status].toLowerCase()}.`);
      await Promise.all([loadDetail(selected.id), loadTickets()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update ticket status.");
    } finally { setSending(false); }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-950 text-amber-300"><LifeBuoy className="h-5 w-5" /></div><div><h1 className="text-xl font-black text-slate-900">{isSuper ? "Support tickets" : "Help & support"}</h1><p className="text-sm text-slate-500">{isSuper ? "Review and respond to restaurant issues." : "Send an issue to InfoRyse support and follow the conversation."}</p></div></div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadTickets()} disabled={loadingList} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />Refresh</button>
          {!isSuper && <button onClick={() => { setCreating((value) => !value); setError(""); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white"><Plus className="h-4 w-4" />New ticket</button>}
        </div>
      </header>

      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</p>}

      {creating && !isSuper && <form onSubmit={createTicket} className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:grid-cols-2">
        <h2 className="font-extrabold text-slate-900 sm:col-span-2">Describe the issue</h2>
        <input required minLength={4} maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Short issue title" className="input sm:col-span-2" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="input">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
        <div className="hidden sm:block" />
        <textarea required minLength={10} maxLength={5000} rows={4} value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="What happened? Include steps to reproduce and any useful details." className="input resize-y sm:col-span-2" />
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setCreating(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{sending && <LoaderCircle className="h-4 w-4 animate-spin" />}Send ticket</button></div>
      </form>}

      <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(300px,370px)_1fr]">
        <section className={`${selectedId ? "hidden lg:flex" : "flex"} min-w-0 flex-col border-r border-slate-200`}>
          <div className="space-y-2 border-b border-slate-100 p-3">
            {isSuper && <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search restaurant or issue" className="input h-10 w-full text-sm" />}
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }} className="input h-10 w-full text-sm"><option value="ALL">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select>
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {loadingList && tickets.length === 0 ? <div className="flex justify-center p-10"><LoaderCircle className="h-5 w-5 animate-spin text-emerald-800" /></div> : tickets.length === 0 ? <div className="p-8 text-center"><TicketCheck className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-600">No tickets here</p><p className="mt-1 text-xs text-slate-400">{isSuper ? "New restaurant issues will appear here." : "Your support requests will appear here."}</p></div> : tickets.map((ticket) => <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`block w-full border-l-2 p-4 text-left transition hover:bg-slate-50 ${selectedId === ticket.id ? "border-emerald-700 bg-emerald-50/50" : "border-transparent"}`}>
              <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-extrabold text-slate-900">{ticket.subject}</p><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[ticket.status]}`}>{STATUS_LABEL[ticket.status]}</span></div>
              {isSuper && <p className="mt-1 truncate text-xs font-semibold text-emerald-800">{ticket.restaurant?.name || "Restaurant"}</p>}
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{ticket.messages[0]?.body || "No messages"}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>{ticket.category}{ticket._count ? ` · ${ticket._count.messages} messages` : ""}</span><span>{dateLabel(ticket.updatedAt)}</span></div>
            </button>)}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-500"><button disabled={page === 0 || loadingList} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg px-2 py-1 font-bold disabled:opacity-40">Previous</button><span>Page {page + 1}</span><button disabled={!hasMore || loadingList} onClick={() => setPage((value) => value + 1)} className="rounded-lg px-2 py-1 font-bold disabled:opacity-40">Next</button></div>
        </section>

        <section className={`${selectedId ? "flex" : "hidden lg:flex"} min-w-0 flex-col`}>
          {!selectedId ? <div className="m-auto max-w-sm p-8 text-center"><MessageCircle className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Select a ticket</p><p className="mt-1 text-sm text-slate-500">Open a support conversation to view details and replies.</p></div> : loadingDetail && !selected ? <div className="m-auto"><LoaderCircle className="h-6 w-6 animate-spin text-emerald-800" /></div> : selected ? <>
            <header className="border-b border-slate-100 p-4 sm:p-5"><div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex min-w-0 items-start gap-2 sm:flex-1"><button onClick={() => setSelectedId("")} className="mt-0.5 rounded-lg p-1 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Back to tickets"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{selected.category}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLE[selected.status]}`}>{STATUS_LABEL[selected.status]}</span></div><h2 className="mt-2 break-words text-lg font-black text-slate-900">{selected.subject}</h2><p className="mt-1 break-words text-xs text-slate-500">{isSuper ? `${selected.restaurant?.name || "Restaurant"} · ${selected.createdByName || selected.createdByEmail || "Restaurant user"}` : `Opened ${dateLabel(selected.createdAt)}`}</p></div></div>
              {isSuper && <select aria-label="Ticket status" value={selected.status} disabled={sending} onChange={(event) => void updateStatus(event.target.value as Status)} className="input h-10 !w-full min-w-0 shrink-0 text-xs font-bold sm:!w-52">{STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select>}
            </div></header>
            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
              {selected.messages.map((message, index) => { const fromSupport = message.authorRole === "SUPER_ADMIN"; return <div key={(message as Message).id || `${message.createdAt}-${index}`} className={`flex ${fromSupport ? "justify-start" : "justify-end"}`}><article className={`max-w-[min(42rem,92%)] rounded-2xl border px-4 py-3 shadow-sm ${fromSupport ? "border-slate-200 bg-white" : "border-emerald-900/10 bg-emerald-950 text-white"}`}><div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><p className={`text-xs font-extrabold ${fromSupport ? "text-slate-800" : "text-emerald-100"}`}>{message.authorName}{fromSupport && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] uppercase text-amber-900">InfoRyse Support</span>}</p><time className={`text-[10px] ${fromSupport ? "text-slate-400" : "text-emerald-200/70"}`}>{dateLabel(message.createdAt)}</time></div><p className={`mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed ${fromSupport ? "text-slate-700" : "text-white"}`}>{message.body}</p></article></div>; })}
            </div>
            {selected.status === "CLOSED" && <p className="border-t border-slate-100 px-4 pt-3 text-center text-xs text-slate-500">A reply will reopen this ticket.</p>}
            <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-100 bg-white p-3 sm:p-4"><textarea required maxLength={5000} rows={2} value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Write a reply…" className="input min-h-12 flex-1 resize-y" /><button disabled={sending || !newMessage.trim()} aria-label="Send reply" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" /><span className="hidden sm:inline">Reply</span></button></form>
          </> : <div className="m-auto p-8 text-center text-sm text-slate-500">Could not load this ticket.</div>}
        </section>
      </div>
    </div>
  );
}
