import { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";

// ── Brand ─────────────────────────────────────────────────────────
const B = {
  blue:"#1d4ed8", teal:"#0891b2", green:"#059669", purple:"#7c3aed",
  orange:"#d97706", red:"#dc2626", grey:"#f8fafc", border:"#e2e8f0",
  text:"#0f172a", sub:"#64748b", light:"#94a3b8",
};

// ── Equipment ─────────────────────────────────────────────────────
const EQUIPMENT = [
  {
    id:"BR-101", name:"Bioreactor Vessel", type:"Bioreactor", location:"Suite A — Cell Culture",
    icon:"🧫", color:B.blue, validationStatus:"VALIDATED", qualificationRef:"OQ-BR-101-v3.2",
    lastCIP:"3h 42m ago", nextScheduled:"8h 18m", aiRecommended:"On Schedule",
    soilingIndex:0.38, bioburdenRisk:"LOW", residualType:"Growth media / proteins",
    cipStatus:"completed",
    toc:{ val:0.42, limit:0.5, unit:"mg/L" },
    conductivity:{ val:1.12, limit:1.3, unit:"µS/cm" },
    endotoxin:{ val:"< 0.25", limit:"0.5", unit:"EU/mL" },
    aiAlert:"All parameters within validated limits. Next scheduled CIP confirmed by AI — no early intervention required.",
    savings:{ water:"16%", chemical:"20%", time:"22 min" },
    deviations:0, cipCycles247:41, passRate:"100%",
  },
  {
    id:"FT-204", name:"Formulation Tank", type:"API Vessel", location:"Suite B — Formulation",
    icon:"⚗️", color:B.purple,
    lastCIP:"1h 05m ago", nextScheduled:"Running", aiRecommended:"In Progress",
    validationStatus:"VALIDATED", qualificationRef:"OQ-FT-204-v2.1",
    soilingIndex:0.55, bioburdenRisk:"MEDIUM", residualType:"Active pharmaceutical ingredient",
    cipStatus:"in_progress",
    toc:{ val:3.8, limit:0.5, unit:"mg/L" },
    conductivity:{ val:8.6, limit:1.3, unit:"µS/cm" },
    endotoxin:{ val:"< 0.25", limit:"0.5", unit:"EU/mL" },
    aiAlert:"CIP running — Phase 3/6 (WFI Rinse 1). TOC clearing as expected. AI monitoring residual clearance curve.",
    savings:{ water:"19%", chemical:"23%", time:"18 min" },
    deviations:1, cipCycles247:38, passRate:"97.4%",
  },
  {
    id:"FF-305", name:"Fill-Finish Line", type:"Aseptic Filling", location:"Suite C — Sterile Fill",
    icon:"💊", color:B.teal,
    lastCIP:"5h 20m ago", nextScheduled:"2h 40m", aiRecommended:"1h 50m",
    validationStatus:"VALIDATED", qualificationRef:"OQ-FF-305-v4.0",
    soilingIndex:0.78, bioburdenRisk:"HIGH", residualType:"Excipient / surfactant residual",
    cipStatus:"due_early",
    toc:{ val:0.81, limit:0.5, unit:"mg/L" },
    conductivity:{ val:1.28, limit:1.3, unit:"µS/cm" },
    endotoxin:{ val:"< 0.25", limit:"0.5", unit:"EU/mL" },
    aiAlert:"TOC trending above limit (0.81 vs 0.5 mg/L). AI recommends advancing CIP by 50 min to prevent residual exceedance.",
    savings:{ water:"21%", chemical:"18%", time:"25 min" },
    deviations:2, cipCycles247:44, passRate:"95.5%",
  },
  {
    id:"WS-401", name:"WFI Storage & Loop", type:"Water System", location:"Utility — WFI Loop",
    icon:"💧", color:B.teal,
    lastCIP:"12h 00m ago", nextScheduled:"Overdue", aiRecommended:"IMMEDIATE",
    validationStatus:"VALIDATED", qualificationRef:"OQ-WS-401-v1.8",
    soilingIndex:0.92, bioburdenRisk:"CRITICAL", residualType:"Biofilm / endotoxin risk",
    cipStatus:"overdue",
    toc:{ val:0.48, limit:0.5, unit:"mg/L" },
    conductivity:{ val:1.29, limit:1.3, unit:"µS/cm" },
    endotoxin:{ val:"0.38", limit:"0.5", unit:"EU/mL" },
    aiAlert:"CRITICAL: WFI loop soiling 0.92. Biofilm formation risk HIGH. Endotoxin approaching limit. Immediate sanitisation required — regulatory deviation risk.",
    savings:{ water:"10%", chemical:"8%", time:"8 min" },
    deviations:1, cipCycles247:29, passRate:"96.6%",
  },
  {
    id:"CP-502", name:"CIP Skid", type:"CIP Supply Unit", location:"Central Utility",
    icon:"🔧", color:B.green,
    lastCIP:"6h 10m ago", nextScheduled:"Self-Sanitising", aiRecommended:"On Schedule",
    validationStatus:"VALIDATED", qualificationRef:"OQ-CP-502-v2.5",
    soilingIndex:0.22, bioburdenRisk:"LOW", residualType:"Chemical carryover — minimal",
    cipStatus:"completed",
    toc:{ val:0.18, limit:0.5, unit:"mg/L" },
    conductivity:{ val:0.62, limit:1.3, unit:"µS/cm" },
    endotoxin:{ val:"< 0.25", limit:"0.5", unit:"EU/mL" },
    aiAlert:"CIP skid fully sanitised and within spec. All supply parameters validated. Ready for next demand cycle.",
    savings:{ water:"24%", chemical:"28%", time:"30 min" },
    deviations:0, cipCycles247:52, passRate:"100%",
  },
];

// ── Pharma CIP Phases (GMP-validated) ────────────────────────────
const CIP_PHASES = [
  { id:"prerinse",    label:"WFI Pre-rinse",     icon:"💧", color:B.teal,   duration:8,  temp:25,  agent:"WFI",         conc:"—",     flow:600, gmpNote:"Removes gross contamination — WFI only per USP <1231>" },
  { id:"alkaline",   label:"Alkaline Wash",      icon:"🧪", color:B.orange, duration:20, temp:80,  agent:"NaOH",        conc:"1.0%",  flow:500, gmpNote:"Protein & organic residual removal — validated at 80°C ±2°C" },
  { id:"wfirinse1",  label:"WFI Rinse 1",        icon:"🚿", color:B.teal,   duration:10, temp:25,  agent:"WFI",         conc:"—",     flow:700, gmpNote:"Conductivity monitored — must reach <1.3 µS/cm" },
  { id:"acid",       label:"Acid Wash",           icon:"⚗️", color:B.purple, duration:15, temp:70,  agent:"Citric Acid", conc:"0.5%",  flow:500, gmpNote:"Mineral deposit removal — pH 2.5–3.5 validated range" },
  { id:"wfirinse2",  label:"WFI Final Rinse",     icon:"💎", color:B.blue,   duration:12, temp:25,  agent:"WFI",         conc:"—",     flow:700, gmpNote:"TOC sampled here — must be ≤0.5 mg/L before release" },
  { id:"sanitise",   label:"Steam Sanitisation",  icon:"♨️", color:B.red,    duration:30, temp:121, agent:"Pure Steam",  conc:"—",     flow:400, gmpNote:"Sterility assurance — 121°C for 30 min F₀ ≥ 15 (validated)" },
];

// ── 21 CFR Part 11 Electronic Records ────────────────────────────
const ESIG_USERS = [
  { name:"Dr. Sarah Chen",  role:"QA Manager",        initials:"SC", color:B.blue },
  { name:"James Holloway",  role:"Production Supvr.",  initials:"JH", color:B.purple },
  { name:"Priya Nair",      role:"Validation Engr.",   initials:"PN", color:B.green },
  { name:"Marcus Webb",     role:"QC Analyst",         initials:"MW", color:B.orange },
];

const AUDIT_TRAIL = [
  { id:"CIP-2026-0320-008", eq:"FT-204", date:"2026-03-20 10:42", phase:"In Progress", operator:"Auto (System)", esig:null,     result:"RUNNING",     toc:"3.8→clearing", deviation:false, cfr11:"SYSTEM_ACTION" },
  { id:"CIP-2026-0320-007", eq:"BR-101", date:"2026-03-20 07:15", phase:"All 6",       operator:"Auto (System)", esig:"SC",     result:"RELEASED",    toc:"0.42 mg/L",    deviation:false, cfr11:"ESIG_APPROVED" },
  { id:"CIP-2026-0320-006", eq:"CP-502", date:"2026-03-20 05:08", phase:"All 6",       operator:"Auto (System)", esig:"JH",     result:"RELEASED",    toc:"0.18 mg/L",    deviation:false, cfr11:"ESIG_APPROVED" },
  { id:"CIP-2026-0319-005", eq:"FF-305", date:"2026-03-19 22:30", phase:"All 6",       operator:"Auto (System)", esig:"SC",     result:"DEVIATION",   toc:"0.62 mg/L",    deviation:true,  cfr11:"DEVIATION_RAISED" },
  { id:"CIP-2026-0319-004", eq:"WS-401", date:"2026-03-19 18:45", phase:"All 6",       operator:"Manual",        esig:"PN/SC",  result:"RELEASED",    toc:"0.44 mg/L",    deviation:false, cfr11:"ESIG_APPROVED" },
  { id:"CIP-2026-0319-003", eq:"BR-101", date:"2026-03-19 14:22", phase:"All 6",       operator:"Auto (System)", esig:"JH",     result:"RELEASED",    toc:"0.39 mg/L",    deviation:false, cfr11:"ESIG_APPROVED" },
  { id:"CIP-2026-0319-002", eq:"FT-204", date:"2026-03-19 09:55", phase:"All 6",       operator:"Auto (System)", esig:"MW",     result:"RELEASED",    toc:"0.47 mg/L",    deviation:false, cfr11:"ESIG_APPROVED" },
  { id:"CIP-2026-0319-001", eq:"FF-305", date:"2026-03-19 05:30", phase:"All 6",       operator:"Auto (System)", esig:"SC",     result:"RELEASED",    toc:"0.43 mg/L",    deviation:false, cfr11:"ESIG_APPROVED" },
];

const DEVIATIONS = [
  { id:"DEV-2026-0319-002", eq:"FF-305", date:"2026-03-19 22:30", finding:"TOC exceeded limit (0.62 vs 0.50 mg/L) after WFI Final Rinse", root:"Excipient surfactant carryover — additional rinse cycle required", action:"Extended WFI rinse added to validated procedure. Change control CR-2026-041 raised.", status:"CLOSED", raisedBy:"SC", closedBy:"SC/PN" },
  { id:"DEV-2026-0318-001", eq:"WS-401", date:"2026-03-18 14:10", finding:"CIP overdue by 2h 15m — manual scheduling delay", root:"Shift handover miscommunication — schedule not transferred to incoming operator", action:"AI auto-alert escalation added. SOP-CIP-005 revised. Training completed.", status:"CLOSED", raisedBy:"MW", closedBy:"JH/SC" },
];

// ── Synthetic data generators ─────────────────────────────────────
const genTOCClearance = () => Array.from({length:24},(_,i)=>({
  t:`${i*5}min`,
  toc: i<4 ? +(8+Math.random()*2).toFixed(2) : +(Math.max(0.1, 8*Math.exp(-i*0.22)+Math.random()*0.15)).toFixed(2),
  limit:0.5,
}));

const genConductivity = () => Array.from({length:20},(_,i)=>({
  t:`${i*30}s`,
  conductivity: i<3 ? +(8+Math.random()*2).toFixed(2) : +(Math.max(0.5,8*Math.exp(-i*0.3)+Math.random()*0.2)).toFixed(2),
  limit:1.3,
}));

const genHistory = () => Array.from({length:30},(_,i)=>({
  day:`D${i+1}`,
  toc: +(0.3+Math.random()*0.18).toFixed(2),
  duration: Math.round(92+Math.random()*8-(i>20?6:0)),
  wfi: Math.round(2200+Math.random()*200-(i>20?280:0)),
}));

const HISTORY = genHistory();
const TOC_DATA = genTOCClearance();
const COND_DATA = genConductivity();

// ── Helper Components ─────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const cfg = {
    in_progress:["#eff6ff","#1d4ed8","● IN PROGRESS"],
    due_early:  ["#fffbeb","#d97706","⚠ DUE EARLY"],
    overdue:    ["#fff5f5","#dc2626","🔴 OVERDUE"],
    completed:  ["#f0fdf4","#059669","✓ RELEASED"],
  };
  const [bg,col,lbl] = cfg[status]||["#f8fafc","#94a3b8","—"];
  return <span style={{background:bg,color:col,border:`1px solid ${col}40`,borderRadius:4,padding:"2px 9px",fontSize:10,fontWeight:700,letterSpacing:0.8,whiteSpace:"nowrap"}}>{lbl}</span>;
};

const CfrBadge = ({ type }) => {
  const cfg = {
    ESIG_APPROVED:   ["#f0fdf4","#059669","✍ e-Signed"],
    DEVIATION_RAISED:["#fff5f5","#dc2626","⚠ Deviation"],
    SYSTEM_ACTION:   ["#eff6ff","#1d4ed8","🔄 System"],
  };
  const [bg,col,lbl] = cfg[type]||["#f8fafc","#94a3b8","—"];
  return <span style={{background:bg,color:col,border:`1px solid ${col}40`,borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>{lbl}</span>;
};

const CT = ({ active, payload, label }) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
      <div style={{color:"#64748b",fontWeight:600,marginBottom:5}}>{label}</div>
      {payload.map((p,i)=>(<div key={i} style={{color:p.color,fontWeight:600}}>{p.name}: {p.value}</div>))}
    </div>
  );
};

// ── Live CIP Simulator ────────────────────────────────────────────
function LiveCIPRun({ equipment }) {
  const [phase, setPhase] = useState(2);
  const [elapsed, setElapsed] = useState(7);
  const [running, setRunning] = useState(true);
  const [eSign, setESign] = useState(false);
  const [selectedSigner, setSelectedSigner] = useState(null);
  const [signed, setSigned] = useState(false);
  const [anomaly, setAnomaly] = useState(null);
  const ref = useRef(null);

  const totalDur = CIP_PHASES.reduce((s,p)=>s+p.duration,0);
  const doneTime = CIP_PHASES.slice(0,phase).reduce((s,p)=>s+p.duration,0);
  const overall = Math.min(100,Math.round(((doneTime+elapsed)/totalDur)*100));
  const phasePct = Math.min(100,Math.round((elapsed/CIP_PHASES[phase].duration)*100));
  const cur = CIP_PHASES[phase];

  useEffect(()=>{
    if(running){
      ref.current = setInterval(()=>{
        setElapsed(e=>{
          if(e>=CIP_PHASES[phase].duration-1){
            setPhase(p=>Math.min(p+1,CIP_PHASES.length-1));
            return 0;
          }
          if(Math.random()<0.012&&!anomaly) setAnomaly("Conductivity deviation — AI checking against validated window...");
          return e+1;
        });
      },700);
    }
    return()=>clearInterval(ref.current);
  },[running,phase]);

  return (
    <div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:800,color:B.text}}>Live CIP — {equipment.id} · {equipment.name}</div>
            <div style={{fontSize:12,color:B.sub,marginTop:2}}>{equipment.type} · {equipment.location}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,color:B.blue}}>Overall: {overall}%</div>
            <button onClick={()=>setRunning(r=>!r)} style={{background:running?"#fff5f5":"#f0fdf4",border:`1px solid ${running?"#fecaca":"#bbf7d0"}`,color:running?"#dc2626":"#059669",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{running?"⏸ Pause":"▶ Resume"}</button>
          </div>
        </div>

        {/* Phase progress */}
        <div style={{display:"flex",gap:3,marginBottom:10}}>
          {CIP_PHASES.map((p,i)=>(
            <div key={p.id} style={{flex:1,textAlign:"center",cursor:"pointer"}} onClick={()=>{setPhase(i);setElapsed(0);}}>
              <div style={{height:6,borderRadius:3,background:i<phase?"#059669":i===phase?p.color:"#e2e8f0",marginBottom:3,transition:"background 0.4s"}}/>
              <div style={{fontSize:8,color:i===phase?p.color:i<phase?"#059669":B.light,fontWeight:700}}>{p.icon} {p.label}</div>
            </div>
          ))}
        </div>

        {/* Current phase */}
        <div style={{background:`${cur.color}08`,border:`2px solid ${cur.color}30`,borderRadius:10,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:cur.color}}>Phase {phase+1}/6 — {cur.icon} {cur.label}</div>
              <div style={{fontSize:11,color:B.sub,marginTop:2}}>📋 GMP Note: {cur.gmpNote}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:20,fontWeight:800,color:cur.color}}>{elapsed}<span style={{fontSize:11,color:B.light}}>/{cur.duration} min</span></div>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:4,height:6,marginTop:10}}>
            <div style={{height:6,borderRadius:4,background:cur.color,width:`${phasePct}%`,transition:"width 0.7s"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12}}>
            {[{l:"Agent",v:cur.agent},{l:"Concentration",v:cur.conc},{l:"Temperature",v:`${cur.temp}°C`},{l:"Flow",v:`${cur.flow} L/min`}].map((k,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:7,padding:"7px 9px",textAlign:"center",border:`1px solid ${cur.color}20`}}>
                <div style={{fontSize:9,color:B.light,marginBottom:2}}>{k.l}</div>
                <div style={{fontSize:12,fontWeight:800,color:cur.color}}>{k.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TOC & Conductivity live */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
          {[
            {label:"TOC Reading",val:cur.id==="wfirinse2"||cur.id==="sanitise"?"0.48 mg/L":"Measuring...",limit:"≤ 0.5 mg/L",ok:true,color:B.green,icon:"🧬"},
            {label:"Conductivity",val:`${(0.5+Math.random()*0.3).toFixed(2)} µS/cm`,limit:"≤ 1.3 µS/cm",ok:true,color:B.blue,icon:"⚡"},
          ].map((s,i)=>(
            <div key={i} style={{background:`${s.color}08`,border:`1px solid ${s.color}30`,borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:20}}>{s.icon}</div>
              <div>
                <div style={{fontSize:9,color:B.light}}>{s.label} · Limit: {s.limit}</div>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:s.color}}>{s.val}</div>
                <div style={{fontSize:9,color:s.ok?B.green:B.red,fontWeight:700}}>{s.ok?"✓ Within validated limit":"⚠ EXCEEDS LIMIT"}</div>
              </div>
            </div>
          ))}
        </div>

        {anomaly&&<div style={{marginTop:10,background:"#fffbeb",border:"1px solid #fde68a",borderLeft:`4px solid ${B.orange}`,borderRadius:8,padding:"8px 14px",fontSize:12,color:B.orange,fontWeight:600,display:"flex",justifyContent:"space-between",alignItems:"center"}}>⚠ {anomaly}<button onClick={()=>setAnomaly(null)} style={{background:"none",border:"none",cursor:"pointer",color:B.light}}>✕</button></div>}
      </div>

      {/* 21 CFR Part 11 e-Signature block */}
      <div style={{background:"#fff",border:`2px solid ${B.blue}30`,borderRadius:12,padding:"18px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:20}}>✍</div>
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text}}>21 CFR Part 11 — Electronic Release</div>
            <div style={{fontSize:12,color:B.sub}}>Batch record requires QA e-signature before equipment release</div>
          </div>
          {signed&&<div style={{marginLeft:"auto",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:700,color:B.green}}>✓ Signed & Released</div>}
        </div>
        {!signed ? (
          <div>
            <div style={{fontSize:12,color:B.sub,marginBottom:10}}>Select authorised signatory:</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {ESIG_USERS.map(u=>(
                <button key={u.initials} onClick={()=>setSelectedSigner(u)}
                  style={{display:"flex",alignItems:"center",gap:8,background:selectedSigner?.initials===u.initials?`${u.color}15`:"#f8fafc",border:`2px solid ${selectedSigner?.initials===u.initials?u.color:"#e2e8f0"}`,borderRadius:8,padding:"8px 12px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:u.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{u.initials}</div>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:12,fontWeight:700,color:B.text}}>{u.name}</div>
                    <div style={{fontSize:10,color:B.sub}}>{u.role}</div>
                  </div>
                </button>
              ))}
            </div>
            {selectedSigner&&(
              <div>
                <input placeholder={`Enter ${selectedSigner.name}'s password to sign`} type="password" style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1.5px solid #e2e8f0",fontSize:13,fontFamily:"Inter,sans-serif",outline:"none",marginBottom:10}}/>
                <button onClick={()=>setSigned(true)} style={{width:"100%",padding:"11px",background:`linear-gradient(135deg,${B.blue},${B.purple})`,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                  ✍ Apply Electronic Signature — 21 CFR Part 11
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:13,fontWeight:700,color:B.green,marginBottom:6}}>✓ Electronically Signed & Equipment Released</div>
            {[{l:"Signatory",v:`${selectedSigner?.name} (${selectedSigner?.initials})`},{l:"Role",v:selectedSigner?.role},{l:"Timestamp",v:new Date().toISOString().replace("T"," ").substring(0,19)+" UTC"},{l:"Record ID",v:`CIP-2026-0320-${Math.floor(Math.random()*900+100)}`},{l:"Hash",v:"SHA-256: a3f8...c912"},{l:"21 CFR §11",v:"Compliant — Audit Trail Entry Created"}].map((r,i)=>(
              <div key={i} style={{display:"flex",gap:8,fontSize:11,marginBottom:4}}>
                <span style={{color:B.light,minWidth:100}}>{r.l}:</span>
                <span style={{color:B.text,fontWeight:600}}>{r.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
//  MAIN COMPONENT
// ================================================================
export default function PharmaCIP() {
  const [section, setSection] = useState("equipment");
  const [selectedEq, setSelectedEq] = useState(EQUIPMENT[1]);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [devModal, setDevModal] = useState(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(()=>{ const t=setInterval(()=>setTime(new Date().toLocaleTimeString()),1000); return()=>clearInterval(t); },[]);

  const overdueCount = EQUIPMENT.filter(e=>e.cipStatus==="overdue").length;
  const dueEarlyCount = EQUIPMENT.filter(e=>e.cipStatus==="due_early").length;
  const inProgressCount = EQUIPMENT.filter(e=>e.cipStatus==="in_progress").length;

  const sections = [
    {key:"equipment", icon:"🏭", label:"Equipment Status"},
    {key:"live",      icon:"▶",  label:"Live CIP Run"},
    {key:"cfr11",     icon:"📜", label:"21 CFR Part 11"},
    {key:"ai",        icon:"🤖", label:"AI Intelligence"},
    {key:"analytics", icon:"📊", label:"Analytics"},
    {key:"deviations",icon:"⚠️", label:"Deviations"},
  ];

  return (
    <div style={{background:B.grey,minHeight:"100vh",color:B.text,fontFamily:"Inter,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.05);}
        .sec-btn{padding:12px 16px;border:none;background:none;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;transition:all 0.2s;white-space:nowrap;}
        .sec-btn:hover{color:#0f172a;background:#f1f5f9;}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
        .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
        .g5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;}
        .hdr{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,0.04);}
        .sec-bar{background:#fff;border-bottom:2px solid #e2e8f0;padding:0 24px;display:flex;overflow-x:auto;}
        .pp{padding:20px 24px 32px;}
        .fw{padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;background:#fff;}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
        @media(max-width:900px){.g3{grid-template-columns:repeat(2,1fr);}.g4{grid-template-columns:repeat(2,1fr);}.g5{grid-template-columns:repeat(3,1fr);}.g2{grid-template-columns:1fr;}.pp{padding:14px 16px;}.hdr{padding:10px 14px;}.sec-bar{padding:0 12px;}}
        @media(max-width:600px){.g3{grid-template-columns:1fr;}.g4{grid-template-columns:repeat(2,1fr);}.g5{grid-template-columns:repeat(2,1fr);}.g2{grid-template-columns:1fr;}.pp{padding:10px 12px;}.sec-btn{padding:10px 12px;font-size:12px;}.hdr{flex-direction:column;align-items:flex-start;}.fw{flex-direction:column;}}
      `}</style>

      {/* Header */}
      <div className="hdr">
        <div style={{flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.blue}}>AriLinc <span style={{color:B.purple}}>Pharma</span> CIP</div>
            <span style={{background:"#f0fdf4",color:B.green,border:"1px solid #bbf7d0",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700}}>GMP COMPLIANT</span>
            <span style={{background:"#eff6ff",color:B.blue,border:"1px solid #bfdbfe",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700}}>21 CFR Part 11</span>
          </div>
          <div style={{fontSize:11,color:B.light,marginTop:2}}>Pharmaceutical CIP Intelligence · FDA/GMP Ready · Powered by AriPrus</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {overdueCount>0&&<div style={{background:"#fff5f5",border:"1px solid #fecaca",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:B.red}}>🔴 {overdueCount} Overdue</div>}
          {dueEarlyCount>0&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:B.orange}}>⚠ {dueEarlyCount} AI Alert</div>}
          {inProgressCount>0&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,color:B.blue,display:"flex",alignItems:"center",gap:5}}><span style={{animation:"blink 1s infinite"}}>●</span>{inProgressCount} Running</div>}
          <div style={{fontSize:12,color:B.light}}>{time}</div>
        </div>
      </div>

      {/* Section bar */}
      <div className="sec-bar">
        {sections.map(s=>(
          <button key={s.key} className="sec-btn"
            style={{color:section===s.key?B.blue:B.sub,borderBottom:`3px solid ${section===s.key?B.blue:"transparent"}`,fontWeight:section===s.key?800:600}}
            onClick={()=>setSection(s.key)}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="pp">

        {/* ── EQUIPMENT STATUS ── */}
        {section==="equipment" && (
          <div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🏭",label:"Equipment Validated",value:"5 / 5",sub:"All OQ/PQ qualified",color:B.blue},
                {icon:"🔴",label:"Overdue CIP",value:overdueCount,sub:"Regulatory deviation risk",color:B.red},
                {icon:"🤖",label:"AI Early Alerts",value:dueEarlyCount,sub:"Advancing schedule",color:B.orange},
                {icon:"📋",label:"Compliance Rate",value:"98.7%",sub:"Last 30 days",color:B.green},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:26,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{fontFamily:"Inter,sans-serif",fontSize:17,fontWeight:800,color:B.text,marginBottom:14}}>CIP Status — All Pharmaceutical Equipment</div>
            <div className="g3">
              {EQUIPMENT.map(eq=>(
                <div key={eq.id} style={{background:"#fff",border:`2px solid ${eq.cipStatus==="overdue"?"#fecaca":eq.cipStatus==="in_progress"?"#bfdbfe":eq.cipStatus==="due_early"?"#fde68a":"#e2e8f0"}`,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                  {/* Header */}
                  <div style={{padding:"12px 16px",borderBottom:`3px solid ${eq.color}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontSize:18}}>{eq.icon}</span>
                        <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:B.text}}>{eq.id}</div>
                      </div>
                      <div style={{fontSize:11,color:B.sub}}>{eq.name}</div>
                      <div style={{fontSize:10,color:B.light}}>{eq.type} · {eq.location}</div>
                    </div>
                    <StatusPill status={eq.cipStatus}/>
                  </div>

                  {/* Validation badge */}
                  <div style={{padding:"6px 14px",background:"#f0fdf4",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10,fontWeight:700,color:B.green}}>✓ {eq.validationStatus}</span>
                    <span style={{fontSize:10,color:B.light}}>Ref: {eq.qualificationRef}</span>
                  </div>

                  {/* Critical quality attributes */}
                  <div style={{padding:"10px 14px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,borderBottom:"1px solid #f1f5f9"}}>
                    {[
                      {label:"TOC",val:eq.toc.val,limit:eq.toc.limit,unit:eq.toc.unit,isOver:parseFloat(eq.toc.val)>eq.toc.limit},
                      {label:"Conductivity",val:eq.conductivity.val,limit:eq.conductivity.limit,unit:eq.conductivity.unit,isOver:eq.conductivity.val>eq.conductivity.limit},
                      {label:"Endotoxin",val:eq.endotoxin.val,limit:eq.endotoxin.limit,unit:eq.endotoxin.unit,isOver:false},
                    ].map((s,i)=>{
                      const col = s.isOver?B.red:B.green;
                      return (
                        <div key={i} style={{background:`${col}08`,border:`1px solid ${col}25`,borderRadius:6,padding:"5px 7px",textAlign:"center"}}>
                          <div style={{fontSize:8,color:B.light,marginBottom:1}}>{s.label}</div>
                          <div style={{fontSize:11,fontWeight:800,color:col}}>{s.val}</div>
                          <div style={{fontSize:8,color:B.light}}>{s.unit}</div>
                          <div style={{fontSize:7,color:col,fontWeight:700,marginTop:1}}>Lmt:{s.limit}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CIP info */}
                  <div style={{padding:"10px 14px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                      {[{l:"Last CIP",v:eq.lastCIP},{l:"Scheduled",v:eq.nextScheduled},{l:"AI Recommends",v:eq.aiRecommended,alert:eq.cipStatus==="overdue"||eq.cipStatus==="due_early"},{l:"Soiling Index",v:eq.soilingIndex,alert:eq.soilingIndex>0.7}].map((f,i)=>(
                        <div key={i}>
                          <div style={{fontSize:9,color:B.light}}>{f.l}</div>
                          <div style={{fontSize:11,fontWeight:700,color:f.alert?B.red:B.sub}}>{f.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* AI Alert */}
                    <div style={{background:`${eq.cipStatus==="overdue"?"#fff5f5":eq.cipStatus==="due_early"?"#fffbeb":"#f0fdf4"}`,border:`1px solid ${eq.cipStatus==="overdue"?"#fecaca":eq.cipStatus==="due_early"?"#fde68a":"#bbf7d0"}`,borderRadius:7,padding:"6px 10px",fontSize:11,color:B.text,lineHeight:1.5,marginBottom:8}}>
                      <strong style={{color:eq.cipStatus==="overdue"?B.red:eq.cipStatus==="due_early"?B.orange:B.green}}>🤖 AI: </strong>{eq.aiAlert}
                    </div>

                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{setSelectedEq(eq);setSection("live");}} style={{flex:1,padding:"7px",background:`${eq.color}10`,border:`1px solid ${eq.color}40`,borderRadius:7,fontSize:11,fontWeight:700,color:eq.color,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                        {eq.cipStatus==="in_progress"?"▶ View Live":"▶ Start CIP"}
                      </button>
                      <button onClick={()=>setScheduleModal(eq)} style={{padding:"7px 10px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:7,fontSize:11,color:B.sub,cursor:"pointer",fontWeight:700}}>📅</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LIVE CIP RUN ── */}
        {section==="live" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text}}>Live CIP Monitor — GMP Mode</div>
                <div style={{fontSize:12,color:B.sub,marginTop:2}}>Real-time · Validated parameters · 21 CFR Part 11 ready</div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {EQUIPMENT.map(e=>(<button key={e.id} onClick={()=>setSelectedEq(e)} style={{background:selectedEq.id===e.id?e.color:"#fff",color:selectedEq.id===e.id?"#fff":B.sub,border:`2px solid ${selectedEq.id===e.id?e.color:B.border}`,borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{e.id}</button>))}
              </div>
            </div>
            <LiveCIPRun equipment={selectedEq}/>

            {/* Phase reference */}
            <div style={{marginTop:16}}>
              <div style={{fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:800,color:B.text,marginBottom:10}}>Validated CIP Phase Parameters</div>
              <div className="g5">
                {CIP_PHASES.map(p=>(
                  <div key={p.id} style={{background:"#fff",border:`2px solid ${p.color}25`,borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${p.color}`}}>
                    <div style={{fontSize:16,marginBottom:4}}>{p.icon}</div>
                    <div style={{fontFamily:"Inter,sans-serif",fontSize:11,fontWeight:800,color:p.color,marginBottom:5}}>{p.label}</div>
                    {[{l:"Duration",v:`${p.duration} min`},{l:"Temp",v:`${p.temp}°C`},{l:"Agent",v:p.agent},{l:"Conc.",v:p.conc},{l:"Flow",v:`${p.flow} L/min`}].map((r,j)=>(
                      <div key={j} style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:2}}>
                        <span style={{color:B.light}}>{r.l}</span>
                        <span style={{fontWeight:600,color:B.text}}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{marginTop:6,fontSize:8,color:B.purple,lineHeight:1.4,background:"#faf5ff",borderRadius:4,padding:"4px 5px"}}>{p.gmpNote}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 21 CFR PART 11 ── */}
        {section==="cfr11" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>📜 21 CFR Part 11 — Electronic Records & Signatures</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Full audit trail · Electronic signatures · Data integrity · Tamper-evident records</div>

            {/* CFR capabilities */}
            <div className="g3" style={{marginBottom:20}}>
              {[
                {icon:"✍",title:"Electronic Signatures",desc:"Every CIP release requires authorised QA e-signature with username, password and timestamp. Biometric option available.",color:B.blue,items:["Role-based signatory authority","Multi-signature workflows","Signature meaning recorded","Cannot be repudiated"]},
                {icon:"📋",title:"Audit Trail",desc:"Every system action, parameter change and user interaction is automatically logged — immutable and timestamped.",color:B.purple,items:["Timestamped to millisecond","User ID + action recorded","Before/after values captured","SHA-256 hash integrity"]},
                {icon:"🔒",title:"Data Integrity (ALCOA+)",desc:"All CIP data is Attributable, Legible, Contemporaneous, Original and Accurate — meeting FDA and EMA expectations.",color:B.green,items:["Attributable to individual","Legible & permanent","Contemporaneous recording","Original raw data preserved"]},
                {icon:"🗄",title:"Electronic Records",desc:"All batch records, CIP certificates and deviation logs stored electronically with retention policy and access controls.",color:B.teal,items:["21 CFR §11.10 compliant","Backup & disaster recovery","Retention per ICH Q10","Inspection-ready exports"]},
                {icon:"🛡",title:"System Validation",desc:"AriLinc CIP module is validated per GAMP 5 Category 4 — IQ, OQ, PQ documented and version-controlled.",color:B.orange,items:["GAMP 5 Category 4","IQ/OQ/PQ documented","CSV package available","Change control managed"]},
                {icon:"🔑",title:"Access Control",desc:"Role-based access ensures only authorised personnel can approve, modify or release CIP records.",color:B.red,items:["Role-based permissions","Session timeout controls","Failed login lockout","Access log maintained"]},
              ].map((f,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${f.color}20`,borderRadius:12,padding:"18px",borderTop:`4px solid ${f.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:24,marginBottom:8}}>{f.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:f.color,marginBottom:6}}>{f.title}</div>
                  <div style={{fontSize:12,color:B.sub,lineHeight:1.6,marginBottom:10}}>{f.desc}</div>
                  <ul style={{paddingLeft:14}}>
                    {f.items.map((it,j)=>(<li key={j} style={{fontSize:11,color:B.text,marginBottom:3,lineHeight:1.5}}>{it}</li>))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Audit trail table */}
            <div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text}}>Audit Trail — Recent CIP Records</div>
                <div style={{display:"flex",gap:8}}>
                  <button style={{background:B.blue,color:"#fff",border:"none",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>⬇ Export PDF</button>
                  <button style={{background:"#f8fafc",color:B.sub,border:"1px solid #e2e8f0",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>🔍 Filter</button>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:760}}>
                  <thead>
                    <tr style={{background:"#f8fafc"}}>
                      {["Record ID","Equipment","Date / Time","Phase","Operator","e-Signature","TOC Result","Deviation","CFR §11"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontWeight:700,borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AUDIT_TRAIL.map((r,i)=>(
                      <tr key={r.id} style={{borderBottom:"1px solid #f1f5f9",background:r.deviation?"#fff5f5":i%2===0?"#fff":"#fafafa"}}>
                        <td style={{padding:"7px 10px",fontWeight:700,color:B.blue,fontFamily:"monospace",fontSize:10}}>{r.id}</td>
                        <td style={{padding:"7px 10px",fontWeight:600,color:B.text}}>{r.eq}</td>
                        <td style={{padding:"7px 10px",color:B.sub,whiteSpace:"nowrap"}}>{r.date}</td>
                        <td style={{padding:"7px 10px",color:B.sub}}>{r.phase}</td>
                        <td style={{padding:"7px 10px",color:B.sub,fontSize:10}}>{r.operator}</td>
                        <td style={{padding:"7px 10px"}}>
                          {r.esig ? (
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <div style={{width:20,height:20,borderRadius:"50%",background:B.purple,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800}}>{r.esig.split("/")[0]}</div>
                              <span style={{fontSize:10,color:B.purple,fontWeight:600}}>{r.esig}</span>
                            </div>
                          ) : <span style={{fontSize:10,color:B.light}}>—</span>}
                        </td>
                        <td style={{padding:"7px 10px"}}>
                          <span style={{fontSize:10,fontWeight:700,color:r.toc.includes("clearing")?B.orange:B.green}}>{r.toc}</span>
                        </td>
                        <td style={{padding:"7px 10px"}}>
                          {r.deviation ? <span style={{background:"#fff5f5",color:B.red,border:"1px solid #fecaca",borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700}}>⚠ YES</span> : <span style={{color:B.light,fontSize:10}}>None</span>}
                        </td>
                        <td style={{padding:"7px 10px"}}><CfrBadge type={r.cfr11}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── AI INTELLIGENCE ── */}
        {section==="ai" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>🤖 Pharma CIP AI Intelligence</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>Predictive scheduling · TOC forecasting · Chemical optimisation · Regulatory risk scoring</div>
            <div className="g2" style={{marginBottom:20}}>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.blue,marginBottom:4}}>🗓 Predictive CIP Scheduling</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>AI learns soiling patterns per product — advances CIP before TOC limit breach</div>
                {EQUIPMENT.map(eq=>(
                  <div key={eq.id} style={{background:`${eq.cipStatus==="overdue"?"#fff5f5":eq.cipStatus==="due_early"?"#fffbeb":"#f8fafc"}`,border:`1px solid ${eq.cipStatus==="overdue"?"#fecaca":eq.cipStatus==="due_early"?"#fde68a":"#e2e8f0"}`,borderRadius:8,padding:"10px 12px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span>{eq.icon}</span>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:B.text}}>{eq.id}</div>
                          <div style={{fontSize:9,color:B.light}}>Sched: {eq.nextScheduled} · AI: <strong style={{color:eq.cipStatus==="overdue"?B.red:eq.cipStatus==="due_early"?B.orange:B.green}}>{eq.aiRecommended}</strong></div>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:800,color:eq.soilingIndex>0.8?B.red:eq.soilingIndex>0.6?B.orange:B.green}}>{eq.soilingIndex}</div>
                        <div style={{fontSize:9,color:B.light}}>Soiling</div>
                      </div>
                    </div>
                    <div style={{marginTop:5,background:"#fff",borderRadius:3,height:4}}>
                      <div style={{height:4,borderRadius:3,width:`${eq.soilingIndex*100}%`,background:eq.soilingIndex>0.8?B.red:eq.soilingIndex>0.6?B.orange:B.green}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.green,marginBottom:4}}>🧬 TOC Clearance Prediction</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>AI predicts TOC clearance curve — ensures limit met before release</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={TOC_DATA} margin={{top:4,right:16,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="t" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={3}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={36} unit=" mg/L"/>
                    <Tooltip content={<CT/>}/>
                    <ReferenceLine y={0.5} stroke={B.red} strokeDasharray="4 3" label={{value:"Limit 0.5 mg/L",fill:B.red,fontSize:9}}/>
                    <Line type="monotone" dataKey="toc" stroke={B.purple} strokeWidth={2.5} dot={false} name="TOC (mg/L)"/>
                  </LineChart>
                </ResponsiveContainer>
                <div style={{marginTop:10,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:7,padding:"8px 12px",fontSize:12}}>
                  <strong style={{color:B.green}}>AI Prediction: </strong>TOC will reach ≤0.5 mg/L at ~90 min. Safe to proceed to steam sanitisation.
                </div>
              </div>
            </div>
            <div className="g2">
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.purple,marginBottom:4}}>⚗️ Chemical Dosing Optimisation</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>AI reduces chemical use while staying within validated concentration ranges</div>
                {[
                  {phase:"Alkaline Wash (NaOH)",std:"1.0%",ai:"0.78%",range:"0.5–1.5%",saving:"22%",color:B.orange},
                  {phase:"Acid Wash (Citric Acid)",std:"0.5%",ai:"0.38%",range:"0.3–0.8%",saving:"24%",color:B.purple},
                ].map((c,i)=>(
                  <div key={i} style={{background:`${c.color}06`,border:`1px solid ${c.color}25`,borderRadius:8,padding:"10px 12px",marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:B.text,marginBottom:6}}>{c.phase}</div>
                    <div style={{fontSize:10,color:B.light,marginBottom:8}}>Validated range: {c.range}</div>
                    <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
                      <div style={{textAlign:"center"}}><div style={{fontSize:9,color:B.light}}>Standard</div><div style={{fontSize:13,fontWeight:700,color:B.red}}>{c.std}</div></div>
                      <div style={{color:"#e2e8f0",fontSize:14}}>→</div>
                      <div style={{textAlign:"center"}}><div style={{fontSize:9,color:B.light}}>AI Optimised</div><div style={{fontSize:13,fontWeight:700,color:B.green}}>{c.ai}</div></div>
                      <div style={{marginLeft:"auto",background:`${c.color}15`,border:`1px solid ${c.color}40`,borderRadius:5,padding:"3px 8px",fontSize:11,fontWeight:700,color:c.color}}>↓ {c.saving} saved</div>
                    </div>
                  </div>
                ))}
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 12px",fontSize:12,marginTop:4}}>
                  <strong style={{color:B.green}}>Monthly: </strong>340 L chemical reduction · ₹38,000 saved · All within validated ranges
                </div>
              </div>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.red,marginBottom:4}}>🌡 Regulatory Risk Scoring</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>AI assigns regulatory risk score — flags potential FDA/GMP violations before they occur</div>
                {EQUIPMENT.map(eq=>{
                  const riskScore = eq.cipStatus==="overdue"?92:eq.cipStatus==="due_early"?61:eq.cipStatus==="in_progress"?30:12;
                  const riskColor = riskScore>70?B.red:riskScore>40?B.orange:B.green;
                  const riskLabel = riskScore>70?"HIGH RISK":riskScore>40?"MEDIUM":"LOW";
                  return (
                    <div key={eq.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 10px",background:"#f8fafc",borderRadius:8,border:`1px solid ${riskColor}25`}}>
                      <span style={{fontSize:15}}>{eq.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <span style={{fontSize:11,fontWeight:700,color:B.text}}>{eq.id}</span>
                          <span style={{fontSize:10,fontWeight:700,color:riskColor}}>{riskLabel}</span>
                        </div>
                        <div style={{background:"#e2e8f0",borderRadius:3,height:5}}>
                          <div style={{height:5,borderRadius:3,background:riskColor,width:`${riskScore}%`,transition:"width 1s"}}/>
                        </div>
                      </div>
                      <span style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:riskColor,minWidth:28}}>{riskScore}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {section==="analytics" && (
          <div>
            <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text,marginBottom:4}}>📊 CIP Analytics — 30 Day GMP Summary</div>
            <div style={{fontSize:13,color:B.sub,marginBottom:20}}>TOC trends · WFI usage · Cycle duration · Compliance KPIs</div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"🧬",label:"Avg TOC at Release",value:"0.41 mg/L",sub:"↓ 18% vs manual CIP",color:B.purple},
                {icon:"💧",label:"WFI per Cycle",value:"2,180 L",sub:"↓ 19% with AI optimisation",color:B.teal},
                {icon:"⏱",label:"Avg Cycle Duration",value:"91 min",sub:"↓ 7 min vs baseline",color:B.blue},
                {icon:"✅",label:"Compliance Rate",value:"98.7%",sub:"243 of 247 released clean",color:B.green},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:12,padding:"16px 18px",borderTop:`4px solid ${k.color}`,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{fontSize:20,marginBottom:5}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              <div className="card">
                <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:3}}>TOC Release Values — 30 Days</div>
                <div style={{fontSize:12,color:B.sub,marginBottom:14}}>All release samples must be ≤0.5 mg/L per USP &lt;643&gt; — AI optimisation keeping average at 0.41</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={HISTORY} margin={{top:4,right:16,bottom:4,left:0}}>
                    <defs><linearGradient id="tocg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={B.purple} stopOpacity={0.2}/><stop offset="95%" stopColor={B.purple} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="day" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} interval={4}/>
                    <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:10}} width={38} unit=" mg/L" domain={[0,0.6]}/>
                    <Tooltip content={<CT/>}/>
                    <ReferenceLine y={0.5} stroke={B.red} strokeDasharray="4 3" label={{value:"Limit 0.5",fill:B.red,fontSize:10}}/>
                    <Area type="monotone" dataKey="toc" stroke={B.purple} fill="url(#tocg)" strokeWidth={2} dot={false} name="TOC (mg/L)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="g2">
                <div className="card">
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>CIP Cycle Duration (30 Days)</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={HISTORY} margin={{top:4,right:12,bottom:4,left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="day" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={4}/>
                      <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={36} unit=" min"/>
                      <Tooltip content={<CT/>}/>
                      <ReferenceLine y={98} stroke={B.orange} strokeDasharray="4 3" label={{value:"Baseline",fill:B.orange,fontSize:9}}/>
                      <Line type="monotone" dataKey="duration" stroke={B.blue} strokeWidth={2.5} dot={false} name="Duration (min)"/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:B.text,marginBottom:14}}>WFI Consumption per Cycle</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={HISTORY.filter((_,i)=>i%3===0)} margin={{top:4,right:10,bottom:4,left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="day" stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} interval={2}/>
                      <YAxis stroke="#e2e8f0" tick={{fill:"#94a3b8",fontSize:9}} width={40} unit=" L"/>
                      <Tooltip content={<CT/>}/>
                      <ReferenceLine y={2700} stroke={B.orange} strokeDasharray="4 3" label={{value:"Baseline",fill:B.orange,fontSize:9}}/>
                      <Bar dataKey="wfi" fill={B.teal} name="WFI (L)" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DEVIATIONS ── */}
        {section==="deviations" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{fontFamily:"Inter,sans-serif",fontSize:18,fontWeight:800,color:B.text}}>⚠️ Deviation Management</div>
                <div style={{fontSize:13,color:B.sub,marginTop:2}}>GMP deviations · Root cause · CAPA · 21 CFR Part 11 documented</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={{background:B.blue,color:"#fff",border:"none",borderRadius:7,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>⬇ Export Report</button>
              </div>
            </div>
            <div className="g4" style={{marginBottom:20}}>
              {[
                {icon:"📋",label:"Total Deviations",value:"4",sub:"Last 30 days",color:B.blue},
                {icon:"✅",label:"Closed",value:"4",sub:"100% closure rate",color:B.green},
                {icon:"⚠️",label:"Open",value:"0",sub:"None pending",color:B.orange},
                {icon:"🔁",label:"Recurrent",value:"0",sub:"No repeat deviations",color:B.purple},
              ].map((k,i)=>(
                <div key={i} style={{background:"#fff",border:`2px solid ${k.color}25`,borderRadius:10,padding:"14px 16px",borderTop:`3px solid ${k.color}`}}>
                  <div style={{fontSize:20,marginBottom:5}}>{k.icon}</div>
                  <div style={{fontFamily:"Inter,sans-serif",fontSize:22,fontWeight:800,color:k.color}}>{k.value}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#334155",marginTop:3}}>{k.label}</div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {DEVIATIONS.map((d,i)=>(
              <div key={d.id} style={{background:"#fff",border:"2px solid #fecaca",borderRadius:12,padding:"20px",marginBottom:16,boxShadow:"0 2px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <span style={{background:"#fff5f5",color:B.red,border:"1px solid #fecaca",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700}}>{d.id}</span>
                      <span style={{background:"#f0fdf4",color:B.green,border:"1px solid #bbf7d0",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700}}>● {d.status}</span>
                    </div>
                    <div style={{fontSize:12,color:B.sub}}>{d.eq} · {d.date}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",fontSize:11}}>
                      <span style={{color:B.light}}>Raised by: </span><strong style={{color:B.text}}>{d.raisedBy}</strong>
                    </div>
                    <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 10px",fontSize:11}}>
                      <span style={{color:B.light}}>Closed by: </span><strong style={{color:B.text}}>{d.closedBy}</strong>
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {label:"🔍 Finding",value:d.finding,color:B.red},
                    {label:"🧠 Root Cause",value:d.root,color:B.orange},
                    {label:"✅ Corrective Action (CAPA)",value:d.action,color:B.green},
                  ].map((f,j)=>(
                    <div key={j} style={{background:`${f.color}06`,border:`1px solid ${f.color}20`,borderRadius:8,padding:"10px 14px"}}>
                      <div style={{fontSize:11,fontWeight:700,color:f.color,marginBottom:4}}>{f.label}</div>
                      <div style={{fontSize:12,color:B.text,lineHeight:1.6}}>{f.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 14px",fontSize:11,color:B.blue}}>
                  <strong>21 CFR Part 11: </strong>Deviation record electronically signed, timestamped and immutably stored. Reference: {d.id}.
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setScheduleModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:"28px",width:"100%",maxWidth:440,boxShadow:"0 24px 64px rgba(0,0,0,0.25)",fontFamily:"Inter,sans-serif"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
              <div><div style={{fontFamily:"Inter,sans-serif",fontSize:16,fontWeight:800,color:B.text}}>📅 Schedule CIP — {scheduleModal.id}</div><div style={{fontSize:12,color:B.sub,marginTop:2}}>{scheduleModal.name} · {scheduleModal.qualificationRef}</div></div>
              <button onClick={()=>setScheduleModal(null)} style={{background:"#f1f5f9",border:"none",borderRadius:7,padding:"5px 10px",cursor:"pointer",color:B.sub}}>✕</button>
            </div>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12}}>
              <strong style={{color:B.blue}}>🤖 AI: </strong>{scheduleModal.aiAlert}
            </div>
            {[{l:"Validation Ref",v:scheduleModal.qualificationRef},{l:"Last CIP",v:scheduleModal.lastCIP},{l:"Scheduled",v:scheduleModal.nextScheduled},{l:"AI Recommends",v:scheduleModal.aiRecommended},{l:"Soiling Index",v:scheduleModal.soilingIndex},{l:"Bioburden Risk",v:scheduleModal.bioburdenRisk},{l:"TOC Current",v:`${scheduleModal.toc.val} ${scheduleModal.toc.unit} (Limit: ${scheduleModal.toc.limit})`}].map((f,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f1f5f9",fontSize:12}}>
                <span style={{color:B.sub}}>{f.l}</span><strong style={{color:B.text}}>{f.v}</strong>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button onClick={()=>{setSelectedEq(scheduleModal);setSection("live");setScheduleModal(null);}} style={{flex:1,padding:"12px",background:`linear-gradient(135deg,${B.blue},${B.purple})`,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>▶ Start CIP Now</button>
              <button onClick={()=>setScheduleModal(null)} style={{padding:"12px 16px",background:"#f8fafc",color:B.sub,border:"1px solid #e2e8f0",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="fw">
        <div style={{fontSize:12,color:B.light}}>
          <span style={{color:B.green}}>●</span> AriLinc Pharma CIP Intelligence · GMP Compliant · 21 CFR Part 11 · Powered by AriPrus
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <a href="mailto:info@ariprus.com" style={{fontSize:12,color:B.sub,textDecoration:"none"}}>✉ info@ariprus.com</a>
          <a href="https://arilinc.ariprus.com" target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:B.blue,fontWeight:700,textDecoration:"none"}}>Explore AriLinc Platform →</a>
        </div>
      </div>
    </div>
  );
}
