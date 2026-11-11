"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  XCircle,
  BarChart3,
  RefreshCw,
  KeyRound,
  LogOut,
  Printer,
  Users,
  Download,
  Search,
  Clock,
  Megaphone,
} from "lucide-react";

interface VoteResults {
  total_votes: number;
  cand1: { si: number; no: number };
  cand2: { si: number; no: number };
  voters?: Array<{ dni: string; created_at: string }>;
}

export default function Home() {
  // Estados de Administración (Protegido por código)
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [savedAdminCode, setSavedAdminCode] = useState("");
  const [results, setResults] = useState<VoteResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"tally" | "audit">("tally");
  const [dniSearchTerm, setDniSearchTerm] = useState("");

  const downloadVotersCsv = () => {
    if (!results?.voters || results.voters.length === 0) return;
    const header = "N,DNI,Fecha y Hora de Emision,Estado\n";
    const rows = results.voters
      .map(
        (v, i) =>
          `${i + 1},${v.dni},"${new Date(v.created_at).toLocaleString("es-PE")}",Voto Emitido y Valido`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `padron_electoral_jiapeng_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Autenticación de Administrador
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    setLoadingResults(true);

    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-code": adminCodeInput.trim(),
        },
        body: JSON.stringify({ adminCode: adminCodeInput.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAdminAuthenticated(true);
        setSavedAdminCode(adminCodeInput.trim());
        setResults(data.data);
        setShowAdminLogin(false);
        setAdminCodeInput("");
      } else {
        setAdminAuthError(data.message || "Código de administrador no válido.");
      }
    } catch {
      setAdminAuthError("Error de conexión con el servidor.");
    } finally {
      setLoadingResults(false);
    }
  };

  const refreshAdminResults = async () => {
    if (!savedAdminCode) return;
    setLoadingResults(true);
    setResultsError(null);
    try {
      const res = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-code": savedAdminCode,
        },
        body: JSON.stringify({ adminCode: savedAdminCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResults(data.data);
      } else {
        setResultsError(data.message || "Error al actualizar resultados.");
      }
    } catch {
      setResultsError("Error al refrescar escrutinio.");
    } finally {
      setLoadingResults(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setSavedAdminCode("");
    setResults(null);
  };

  // Cálculo de Porcentajes
  const getPercentages = (si: number, no: number) => {
    const total = si + no;
    if (total === 0) return { siPercent: 0, noPercent: 0, total: 0 };
    return {
      siPercent: Math.round((si / total) * 100),
      noPercent: Math.round((no / total) * 100),
      total,
    };
  };

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-start text-slate-800">
      {/* Contenedor Principal */}
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl border border-slate-200 overflow-hidden transition-all">
        
        {/* Cabecera Corporativa Jiapeng */}
        <header className="bg-gradient-to-r from-[#0c2f62] via-[#0f3d7a] to-[#144b91] text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="bg-white p-2 rounded-2xl shadow-md shrink-0 flex items-center justify-center">
                <Image
                  src="/candidates/logo-hd.png"
                  alt="Logo Jiapeng"
                  width={76}
                  height={34}
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Jiapeng <span className="text-blue-300 font-light">•</span> Proceso electoral 2026
                </h1>
                <p className="text-xs text-blue-100 font-medium mt-0.5 flex items-center gap-1.5 justify-center sm:justify-start">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Votación Oficial • Individual y Reservada
                </p>
              </div>
            </div>

            {/* Distintivo de Cierre de Votación */}
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-500/20 border border-amber-300/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              Votación Finalizada (6:00 p.m.)
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* VISTA: MENSAJE OFICIAL DE CIERRE DE VOTACIÓN (6:00 P.M.)  */}
        {/* ========================================================= */}
        {!isAdminAuthenticated && (
          <div className="p-6 sm:p-10 space-y-8">
            {/* Cabecera del Cierre con Icono Oficial */}
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-blue-50 text-blue-900 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-blue-50/60 shadow-sm">
                <Clock className="w-10 h-10 text-blue-700 stroke-[2.2]" />
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Votación Finalizada a las 6:00 p.m.
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Proceso de Votación Concluido
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                El plazo oficial para la emisión del voto de los trabajadores culminó hoy a las <strong>6:00 p.m.</strong>
              </p>
            </div>

            {/* Tarjeta de Agradecimiento y Próximos Pasos */}
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 border-2 border-blue-100 rounded-3xl p-6 sm:p-7 text-center space-y-4 shadow-sm">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-600/20">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  ¡Muchas gracias por su valioso tiempo y participación!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2 max-w-lg mx-auto">
                  Agradecemos a todos los trabajadores de <strong>Jiapeng</strong> por haber sido parte de este importante proceso electoral para la conformación del <strong>Comité de Intervención frente al Hostigamiento Sexual 2026</strong>.
                </p>
              </div>

              {/* Mensaje de Próximo Comunicado */}
              <div className="mt-4 pt-4 border-t border-blue-100/80 bg-white/80 rounded-2xl p-4 flex items-center justify-center gap-3 text-xs sm:text-sm font-bold text-blue-950 border border-blue-100">
                <Megaphone className="w-5 h-5 text-blue-600 shrink-0" />
                <span>
                  Los resultados oficiales del escrutinio se darán a conocer en un <strong>siguiente comunicado</strong>.
                </span>
              </div>
            </div>

            {/* Presentación de las Candidaturas Presentadas */}
            <div className="space-y-3">
              <div className="text-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Candidaturas del Proceso Electoral
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Candidato 1 */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <div
                    className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shadow-inner mx-auto mb-3"
                    style={{ aspectRatio: "4/5", maxHeight: "170px", width: "100%", position: "relative" }}
                  >
                    <Image
                      src="/candidates/leo-voto-hd.jpg"
                      alt="Leonardo Frank Vásquez"
                      fill
                      className="object-cover object-top"
                      sizes="200px"
                      unoptimized
                    />
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-100/70 px-2 py-0.5 rounded">
                    Candidato 1
                  </span>
                  <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 mt-1">
                    Leonardo Frank Vásquez
                  </h5>
                  <p className="text-[11px] text-slate-500 font-medium">Auditor interno</p>
                </div>

                {/* Candidata 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <div
                    className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shadow-inner mx-auto mb-3"
                    style={{ aspectRatio: "4/5", maxHeight: "170px", width: "100%", position: "relative" }}
                  >
                    <Image
                      src="/candidates/vanesa-voto-hd.jpg"
                      alt="Vanessa Saire"
                      fill
                      className="object-cover object-[52%_15%]"
                      sizes="200px"
                      unoptimized
                    />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-100/70 px-2 py-0.5 rounded">
                    Candidata 2
                  </span>
                  <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 mt-1">
                    Vanessa Saire
                  </h5>
                  <p className="text-[11px] text-slate-500 font-medium">Asistente administrativa</p>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* ========================================================= */}
        {/* VISTA 2: PANEL DE ADMINISTRACIÓN / ESCRUTINIO EXCLUSIVO     */}
        {/* ========================================================= */}
        {isAdminAuthenticated && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Acceso Restringido • Comité Electoral
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Acta de Escrutinio en Vivo
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conteo oficial en tiempo real almacenado en Supabase
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshAdminResults}
                  disabled={loadingResults}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingResults ? "animate-spin text-blue-600" : ""}`} />
                  Actualizar
                </button>

                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar Sesión
                </button>
              </div>
            </div>

            {resultsError && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
                <p className="font-bold">{resultsError}</p>
              </div>
            )}

            {/* Selector de Pestañas de Administración */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setAdminTab("tally")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  adminTab === "tally"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Conteo y Escrutinio de Votos
              </button>

              <button
                type="button"
                onClick={() => setAdminTab("audit")}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  adminTab === "audit"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4 text-indigo-600" />
                Padrón de DNIs (Auditoría)
              </button>
            </div>

            {results && adminTab === "tally" && (
              <div className="space-y-6">
                {/* Total Votos */}
                <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-6 text-center shadow-lg">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                    Total de Votantes Participantes
                  </span>
                  <div className="text-4xl sm:text-5xl font-black mt-1 font-mono tracking-tight text-white">
                    {results.total_votes}
                  </div>
                  <p className="text-xs text-blue-200 mt-1">
                    Cédulas emitidas en la urna digital de forma anónima
                  </p>
                </div>

                {/* Escrutinio Candidato 1 */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                      <Image
                        src="/candidates/leo-voto-hd.jpg"
                        alt="Leonardo Vásquez"
                        fill
                        className="object-cover object-top"
                        unoptimized
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">
                        CANDIDATO 1
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900">
                        Leonardo Frank Vásquez
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Auditor interno</p>
                    </div>
                  </div>

                  {(() => {
                    const stats = getPercentages(results.cand1.si, results.cand1.no);
                    return (
                      <div className="space-y-3 pt-2">
                        {/* Sí */}
                        <div>
                          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                            <span className="flex items-center gap-1.5 text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sí, lo ratifico ({results.cand1.si} votos)
                            </span>
                            <span className="text-slate-900">{stats.siPercent}%</span>
                          </div>
                          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-700 rounded-full"
                              style={{ width: `${stats.siPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* No */}
                        <div>
                          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                            <span className="flex items-center gap-1.5 text-rose-700">
                              <XCircle className="w-3.5 h-3.5" /> No ({results.cand1.no} votos)
                            </span>
                            <span className="text-slate-900">{stats.noPercent}%</span>
                          </div>
                          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-rose-500 transition-all duration-700 rounded-full"
                              style={{ width: `${stats.noPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Escrutinio Candidata 2 */}
                <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                      <Image
                        src="/candidates/vanesa-voto-hd.jpg"
                        alt="Vanessa Saire"
                        fill
                        className="object-cover object-[52%_15%]"
                        unoptimized
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                        CANDIDATA 2
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900">
                        Vanessa Saire
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Asistente administrativa</p>
                    </div>
                  </div>

                  {(() => {
                    const stats = getPercentages(results.cand2.si, results.cand2.no);
                    return (
                      <div className="space-y-3 pt-2">
                        {/* Sí */}
                        <div>
                          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                            <span className="flex items-center gap-1.5 text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sí, la ratifico ({results.cand2.si} votos)
                            </span>
                            <span className="text-slate-900">{stats.siPercent}%</span>
                          </div>
                          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-700 rounded-full"
                              style={{ width: `${stats.siPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* No */}
                        <div>
                          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                            <span className="flex items-center gap-1.5 text-rose-700">
                              <XCircle className="w-3.5 h-3.5" /> No ({results.cand2.no} votos)
                            </span>
                            <span className="text-slate-900">{stats.noPercent}%</span>
                          </div>
                          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-rose-500 transition-all duration-700 rounded-full"
                              style={{ width: `${stats.noPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Acta Electoral
                  </button>
                </div>
              </div>
            )}

            {/* PESTAÑA 2: PADRÓN DE AUDITORÍA DE DNIs */}
            {results && adminTab === "audit" && (
              <div className="space-y-5">
                {/* Cabecera de la auditoría */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      Padrón Oficial de Trabajadores Votantes
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total participantes: <strong>{results.voters?.length || results.total_votes}</strong> trabajadores. El voto individual sigue siendo secreto.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={downloadVotersCsv}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
                  >
                    <Download className="w-4 h-4" />
                    Exportar a Excel (CSV)
                  </button>
                </div>

                {/* Buscador de DNI */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dniSearchTerm}
                    onChange={(e) => setDniSearchTerm(e.target.value)}
                    placeholder="Buscar DNI en el padrón..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>

                {/* Tabla de Votantes */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">DNI Registrado</th>
                          <th className="py-2.5 px-3">Fecha y Hora</th>
                          <th className="py-2.5 px-3 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {(() => {
                          const list = results.voters || [];
                          const filtered = dniSearchTerm.trim()
                            ? list.filter((v) => v.dni.includes(dniSearchTerm.trim()))
                            : list;

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-slate-400">
                                  {list.length === 0
                                    ? "Aún no hay votos registrados en la urna digital."
                                    : "No se encontró ningún votante con ese DNI."}
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((v, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {v.dni}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {new Date(v.created_at).toLocaleString("es-PE", {
                                  dateStyle: "short",
                                  timeStyle: "medium",
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  Voto Emitido
                                </span>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic text-center">
                  * Este registro audita la participación de los trabajadores sin revelar por quién votaron.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer Oficial */}
        <footer className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p className="text-center sm:text-left">
            © 2026 Jiapeng • Comité de Intervención frente al Hostigamiento Sexual
          </p>

          {!isAdminAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                setShowAdminLogin(true);
                setAdminAuthError(null);
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Acceso Administrador
            </button>
          ) : (
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Modo Administrador Activo
            </span>
          )}
        </footer>
      </div>

      {/* MODAL DE INGRESO PARA EL USUARIO ADMINISTRADOR */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">
              Acceso a Escrutinio Electoral
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Ingresa el código secreto de administración para visualizar los resultados en vivo.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                autoFocus
                value={adminCodeInput}
                onChange={(e) => setAdminCodeInput(e.target.value)}
                placeholder="Código de Administrador"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 text-center font-mono tracking-wider text-sm"
                required
              />

              {adminAuthError && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {adminAuthError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingResults || !adminCodeInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer disabled:bg-slate-200 disabled:cursor-not-allowed"
                >
                  {loadingResults ? "Verificando..." : "Ingresar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
