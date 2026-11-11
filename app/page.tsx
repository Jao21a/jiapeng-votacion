"use client";

import { useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Vote,
  BarChart3,
  RefreshCw,
  FileCheck2,
  Copy,
  UserCheck,
  KeyRound,
  LogOut,
  Printer,
  Ban,
} from "lucide-react";

interface VoteResults {
  total_votes: number;
  cand1: { si: number; no: number };
  cand2: { si: number; no: number };
}

export default function Home() {
  // Estado del formulario de votación
  const [dni, setDni] = useState("");
  const [cand1Vote, setCand1Vote] = useState<"si" | "no" | null>(null);
  const [cand2Vote, setCand2Vote] = useState<"si" | "no" | null>(null);

  // Estados de proceso y feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    code: string;
    timestamp: string;
  } | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Estados de Administración (Protegido por código)
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [savedAdminCode, setSavedAdminCode] = useState("");
  const [results, setResults] = useState<VoteResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  // Validaciones de formulario
  const isDniValid = dni.trim().length === 8 && /^\d+$/.test(dni.trim());
  const isFormComplete = isDniValid && (cand1Vote !== null || cand2Vote !== null);

  // Lógica de exclusión mutua para la opción 'Sí'
  const handleSelectCand1 = (choice: "si" | "no") => {
    setCand1Vote(choice);
    setErrorMessage(null);
    if (choice === "si") {
      // Al ratificar al Candidato 1, la Candidata 2 queda automáticamente anulada/no
      setCand2Vote("no");
    }
  };

  const handleSelectCand2 = (choice: "si" | "no") => {
    setCand2Vote(choice);
    setErrorMessage(null);
    if (choice === "si") {
      // Al ratificar a la Candidata 2, el Candidato 1 queda automáticamente anulado/no
      setCand1Vote("no");
    }
  };

  // Manejar envío del voto
  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNeedsSetup(false);

    if (!isDniValid) {
      setErrorMessage("Por favor ingresa un número de DNI válido de 8 dígitos.");
      return;
    }
    const payloadCand1 = cand1Vote || "no";
    const payloadCand2 = cand2Vote || "no";

    if (!cand1Vote && !cand2Vote) {
      setErrorMessage("Por favor selecciona al menos un candidato.");
      return;
    }

    if (cand1Vote === "si" && cand2Vote === "si") {
      setErrorMessage("Solo puedes ratificar con 'Sí' a un candidato.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: dni.trim(),
          cand1: payloadCand1,
          cand2: payloadCand2,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Lanzar animación de confeti
        triggerConfetti();

        setReceiptData({
          code: data.receiptCode || "JP26-REGISTRADO",
          timestamp: new Date().toLocaleString("es-PE", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        });

        // Limpiar campos del formulario
        setDni("");
        setCand1Vote(null);
        setCand2Vote(null);
      } else {
        if (data.needsSetup) {
          setNeedsSetup(true);
        }
        setErrorMessage(data.message || "No se pudo registrar el voto.");
      }
    } catch {
      setErrorMessage("Error de conexión al registrar el voto. Verifica tu internet.");
    } finally {
      setLoading(false);
    }
  };

  const triggerConfetti = () => {
    const count = 180;
    const defaults = { origin: { y: 0.65 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const copyReceiptCode = () => {
    if (receiptData?.code) {
      navigator.clipboard.writeText(receiptData.code);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    }
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

            {/* Distintivo de Seguridad */}
            <div className="hidden sm:flex items-center gap-1.5 bg-blue-950/60 border border-blue-400/30 px-3 py-1.5 rounded-full text-[11px] font-semibold text-blue-200">
              <Lock className="w-3 h-3 text-emerald-400" />
              1 Voto por DNI • Voto Secreto
            </div>
          </div>
        </header>

        {/* ALERTA DE CONFIGURACIÓN SUPABASE */}
        {needsSetup && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 text-amber-900 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-950">
                Paso inicial requerido en Supabase
              </p>
              <p className="text-xs text-amber-800 mt-1">
                Abre el SQL Editor de Supabase y ejecuta el archivo{" "}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-950">
                  supabase_schema.sql
                </code>{" "}
                para inicializar las tablas.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VISTA 1: FORMULARIO DE VOTACIÓN                           */}
        {/* ========================================================= */}
        {!isAdminAuthenticated && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Texto Descriptivo Oficial */}
            <section className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-center sm:text-left">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-2 leading-snug">
                Elección de representantes de los trabajadores ante el Comité de Intervención frente al Hostigamiento Sexual
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Se presentaron dos candidaturas. Vota por cada candidato para ratificarlo como representante. El voto es <strong>individual y reservado</strong>: los demás no ven lo que elegiste y <strong>solo puedes votar una vez</strong>.
              </p>

              {/* Indicación de Exclusión Mutua */}
              <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-1.5 text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span><strong>Regla de ratificación:</strong> Solo puedes ratificar con <strong>&quot;Sí&quot;</strong> a un solo candidato.</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Voto 100% Anónimo</span>
                </div>
              </div>
            </section>

            <form onSubmit={handleSubmitVote} className="space-y-7">
              {/* PASO 1: DNI */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 hover:border-blue-400 focus-within:border-blue-600 transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label htmlFor="dni-input" className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Paso 1: Ingresa tu número de DNI
                  </label>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-all ${
                      isDniValid
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : dni.length > 0
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isDniValid ? "✓ DNI Válido (8 dígitos)" : `${dni.length}/8 dígitos`}
                  </span>
                </div>

                <input
                  id="dni-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 8) setDni(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Ej. 74839201"
                  className="w-full text-lg sm:text-xl font-mono tracking-widest px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 transition-all text-center sm:text-left"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-2">
                  * Solo se permite una emisión de voto por cada número de DNI.
                </p>
              </div>

              {/* PASO 2: CANDIDATOS */}
              <div className="text-center pt-1">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Candidatos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona tu ratificación. Al ratificar con <strong>&quot;Sí&quot;</strong> a uno, el otro se bloquea automáticamente en esa opción.
                </p>
              </div>

              {/* GRID DE CANDIDATOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* CANDIDATO 1: Leonardo Frank Vásquez */}
                <div
                  className={`relative flex flex-col justify-between bg-white rounded-2xl border-2 transition-all p-5 shadow-sm hover:shadow-md ${
                    cand1Vote === "si"
                      ? "border-emerald-500 ring-4 ring-emerald-500/10"
                      : cand1Vote === "no"
                      ? "border-slate-300 bg-slate-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full uppercase">
                        CANDIDATO 1
                      </span>
                      {cand1Vote === "si" && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ratificado
                        </span>
                      )}
                      {cand1Vote === "no" && (
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> No ratificado
                        </span>
                      )}
                    </div>

                    {/* Foto en Máxima Resolución Original */}
                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner group">
                      <Image
                        src="/candidates/leo-voto-hd.jpg"
                        alt="Leonardo Frank Vásquez"
                        fill
                        className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 400px"
                        unoptimized
                        priority
                      />
                    </div>

                    <div className="mt-4 text-center sm:text-left">
                      <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                        Leonardo Frank Vásquez
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Auditor interno
                      </p>
                    </div>
                  </div>

                  {/* Aviso si la opción 'Sí' está bloqueada por haber ratificado a Vanessa */}
                  {cand2Vote === "si" && (
                    <div className="mt-3 p-2 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                      <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Opción &quot;Sí&quot; bloqueada (Ya ratificaste a Vanessa Saire)</span>
                    </div>
                  )}

                  {/* Botones de Opción */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={cand2Vote === "si"}
                      onClick={() => handleSelectCand1("si")}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-1.5 ${
                        cand2Vote === "si"
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-40 shadow-none"
                          : cand1Vote === "si"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 scale-[1.02] cursor-pointer"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${cand1Vote === "si" ? "text-white" : cand2Vote === "si" ? "text-slate-400" : "text-emerald-600"}`} />
                      Sí, lo ratifico
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectCand1("no")}
                      className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        cand1Vote === "no"
                          ? "bg-slate-700 text-white border-slate-700 shadow-md shadow-slate-700/20 scale-[1.02]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300"
                      }`}
                    >
                      <XCircle className={`w-4 h-4 ${cand1Vote === "no" ? "text-white" : "text-rose-600"}`} />
                      No
                    </button>
                  </div>
                </div>

                {/* CANDIDATA 2: Vanessa Saire */}
                <div
                  className={`relative flex flex-col justify-between bg-white rounded-2xl border-2 transition-all p-5 shadow-sm hover:shadow-md ${
                    cand2Vote === "si"
                      ? "border-emerald-500 ring-4 ring-emerald-500/10"
                      : cand2Vote === "no"
                      ? "border-slate-300 bg-slate-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase">
                        CANDIDATA 2
                      </span>
                      {cand2Vote === "si" && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ratificada
                        </span>
                      )}
                      {cand2Vote === "no" && (
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> No ratificada
                        </span>
                      )}
                    </div>

                    {/* Foto en Máxima Resolución Original */}
                    <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner group">
                      <Image
                        src="/candidates/vanesa-voto-hd.jpg"
                        alt="Vanessa Saire"
                        fill
                        className="object-cover object-[52%_15%] group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, 400px"
                        unoptimized
                        priority
                      />
                    </div>

                    <div className="mt-4 text-center sm:text-left">
                      <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                        Vanessa Saire
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        Asistente administrativa
                      </p>
                    </div>
                  </div>

                  {/* Aviso si la opción 'Sí' está bloqueada por haber ratificado a Leonardo */}
                  {cand1Vote === "si" && (
                    <div className="mt-3 p-2 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                      <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Opción &quot;Sí&quot; bloqueada (Ya ratificaste a Leonardo Vásquez)</span>
                    </div>
                  )}

                  {/* Botones de Opción */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={cand1Vote === "si"}
                      onClick={() => handleSelectCand2("si")}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-1.5 ${
                        cand1Vote === "si"
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-40 shadow-none"
                          : cand2Vote === "si"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 scale-[1.02] cursor-pointer"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer"
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${cand2Vote === "si" ? "text-white" : cand1Vote === "si" ? "text-slate-400" : "text-emerald-600"}`} />
                      Sí, la ratifico
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectCand2("no")}
                      className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                        cand2Vote === "no"
                          ? "bg-slate-700 text-white border-slate-700 shadow-md shadow-slate-700/20 scale-[1.02]"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300"
                      }`}
                    >
                      <XCircle className={`w-4 h-4 ${cand2Vote === "no" ? "text-white" : "text-rose-600"}`} />
                      No
                    </button>
                  </div>
                </div>
              </div>

              {/* ALERTA DE ERROR */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* BOTÓN ENVIAR VOTO */}
              <div className="pt-2 text-center">
                <button
                  type="submit"
                  disabled={loading || !isFormComplete}
                  className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                    isFormComplete && !loading
                      ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white shadow-blue-600/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Procesando voto anónimo...
                    </>
                  ) : (
                    <>
                      <Vote className="w-5 h-5" />
                      Enviar voto
                    </>
                  )}
                </button>

                {!isFormComplete && (
                  <p className="text-xs text-slate-400 mt-2">
                    {!isDniValid
                      ? "Ingresa tu DNI de 8 dígitos para habilitar el envío."
                      : !cand1Vote || !cand2Vote
                      ? "Selecciona a qué candidato deseas ratificar para habilitar el envío."
                      : ""}
                  </p>
                )}
              </div>
            </form>
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

            {results && (
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

      {/* MODAL DE CONFIRMACIÓN DE VOTO PARA EL VOTANTE */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center relative border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              ¡Voto Registrado con Éxito!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Tu participación en el <strong>Proceso Electoral Jiapeng 2026</strong> ha sido contabilizada de manera <strong>100% anónima e irreversible</strong>.
            </p>

            {/* Constancia Digital */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                  Constancia Digital
                </span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Válido
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500">Código de Confirmación:</span>
                <div className="flex items-center justify-between mt-0.5 bg-white p-2 rounded-xl border border-slate-200 font-mono text-sm font-bold text-slate-900">
                  <span>{receiptData.code}</span>
                  <button
                    type="button"
                    onClick={copyReceiptCode}
                    className="text-xs text-blue-600 hover:text-blue-800 font-sans flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedReceipt ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-600 pt-1">
                <span className="text-slate-400">Fecha y hora:</span>
                <span className="font-semibold text-slate-700">{receiptData.timestamp}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-600">
                <span className="text-slate-400">Privacidad:</span>
                <span className="font-bold text-emerald-700">DNI disociado (Voto Secreto)</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Finalizar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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
