import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plane, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  AlertOctagon, 
  Activity,
  ArrowRight,
  User,
  RefreshCw,
  Trash2,
  AlertCircle,
  Timer,
  Shuffle // New Icon for Randomize
} from 'lucide-react';

/* ========================================================================
   1. UTILITY FUNCTIONS & DATA
   ======================================================================== */
const formatCurrency = (val) => {
  if (!val) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

const formatPercent = (val) => {
  if (!val && val !== 0) return '0%';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(val);
};

// Data Scenarios for Randomizer
const SCENARIOS = [
  { 
    id: 'green',
    label: "On Track", 
    yesterday: '980', 
    goal: '1000', 
    budget: '1000' 
  },
  { 
    id: 'blue',
    label: "Strategic Catch-Up", 
    yesterday: '800', 
    goal: '1000', 
    budget: '1200' 
  },
  { 
    id: 'orange',
    label: "Delivery Risk", 
    yesterday: '200', 
    goal: '1000', 
    budget: '1000' 
  },
  { 
    id: 'red',
    label: "High Discrepancy", 
    yesterday: '1000', 
    goal: '1000', 
    budget: '1500' 
  },
  { 
    id: 'yellow_push',
    label: "Strategic Gap (Aggressive)", 
    yesterday: '1100', 
    goal: '1000', 
    budget: '1250' 
  },
  { 
    id: 'yellow_pull',
    label: "Strategic Gap (Conservative)", 
    yesterday: '1000', 
    goal: '1000', 
    budget: '800' 
  }
];

/* ========================================================================
   2. MAIN COMPONENT
   ======================================================================== */
export default function App() {
  // --- State: The Three Inputs ---
  const [yesterdaySpend, setYesterdaySpend] = useState('');
  const [pacerGoal, setPacerGoal] = useState('');
  const [platformBudget, setPlatformBudget] = useState('');
  
  // --- UI State ---
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // --- Actions ---
  const handleRandomize = () => {
    // Pick a random index
    const randomIndex = Math.floor(Math.random() * SCENARIOS.length);
    const scenario = SCENARIOS[randomIndex];
    
    setYesterdaySpend(scenario.yesterday);
    setPacerGoal(scenario.goal);
    setPlatformBudget(scenario.budget);
    setShowUserMenu(false);
  };

  const handleReset = () => {
    setYesterdaySpend('');
    setPacerGoal('');
    setPlatformBudget('');
    setShowUserMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  // --- Logic Engine ---
  const calculationResult = useMemo(() => {
    // 1. Validate Inputs
    const ySpend = parseFloat(yesterdaySpend);
    const pGoal = parseFloat(pacerGoal);
    const cBudget = parseFloat(platformBudget);

    if (isNaN(pGoal) || isNaN(cBudget)) {
      return { status: 'waiting', variance: 0 };
    }

    if (pGoal === 0) return { status: 'error', variance: 0 };

    // 2. Calculate Variance
    const varianceRaw = cBudget - pGoal;
    const variancePercent = varianceRaw / pGoal; // e.g., 0.15 for 15%
    const absVariance = Math.abs(variancePercent);
    
    // 3. Determine Context Variables
    const underspentYesterday = !isNaN(ySpend) && ySpend < pGoal;
    const underspentYesterdaySevere = !isNaN(ySpend) && ySpend < (pGoal * 0.8);
    const budgetNotAggressive = cBudget <= (pGoal * 1.1);

    // 4. Determine Verdict Status (Order Matters!)

    // Priority 1: RED FLAG (> 30% Variance)
    if (absVariance > 0.30) {
      return { 
        status: 'red', 
        variance: variancePercent,
        headline: '🔴 High Discrepancy - Stop',
        subtext: 'Unless there is a specific aggressive strategy, this setting is likely too high/low compared to the goal. Double check your filters.'
      };
    }

    // Priority 2: STRATEGIC CATCH-UP (BLUE)
    // Variance > 10% (positive) AND we underspent yesterday
    if (variancePercent > 0.10 && underspentYesterday) {
      return {
        status: 'blue',
        variance: variancePercent,
        headline: '🔵 Catch-Up Strategy Detected',
        subtext: "You are budgeting higher today to cover yesterday's underspend. This is a valid pacing move. Monitor closely. Return to matching the goal as soon as the gap is closed."
      };
    }

    // Priority 3: DELIVERY BOTTLENECK (ORANGE)
    if (underspentYesterdaySevere && budgetNotAggressive) {
      return {
        status: 'orange',
        variance: variancePercent,
        headline: '🟠 Delivery Risk: Check Bids',
        subtext: "We missed yesterday's goal significantly, but today's budget is set to 'Normal.' The budget likely isn't the bottleneck.",
        checklist: [
          "Are bids too low to capture traffic?",
          "Is the campaign limited by Rank (Search Lost IS)?",
          "Action: Consider increasing Bids, not just Budget."
        ]
      };
    }

    // Priority 4: ON TRACK (GREEN)
    // Variance within +/- 10%
    if (absVariance <= 0.10) {
      return {
        status: 'green',
        variance: variancePercent,
        headline: '🟢 On Track',
        subtext: 'The platform settings align closely with the daily goal. No changes needed.'
      };
    }

    // Priority 5: STRATEGIC GAP (YELLOW)
    // Variance is 10%-30% but NOT explained by catch-up logic
    return {
      status: 'yellow',
      variance: variancePercent,
      headline: '🟡 Notable Variance Detected',
      checklist: [
        'Are we intentionally pushing spend?',
        'Do these campaigns historically underspend their caps?',
        'Note: If "No" to both, check your settings.'
      ]
    };

  }, [yesterdaySpend, pacerGoal, platformBudget]);

  /* ========================================================================
     3. RENDER HELPERS
     ======================================================================== */
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'blue': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'green': return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'yellow': return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'red': return 'bg-red-50 border-red-200 text-red-900';
      case 'orange': return 'bg-orange-50 border-orange-200 text-orange-900';
      default: return 'bg-slate-50 border-slate-200 text-slate-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'blue': return <TrendingUp className="w-12 h-12 text-blue-600 mb-4" />;
      case 'green': return <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-4" />;
      case 'yellow': return <AlertTriangle className="w-12 h-12 text-amber-600 mb-4" />;
      case 'red': return <AlertOctagon className="w-12 h-12 text-red-600 mb-4" />;
      case 'orange': return <AlertCircle className="w-12 h-12 text-orange-600 mb-4" />;
      default: return <Activity className="w-12 h-12 text-slate-300 mb-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 p-4 md:p-8">
      {/* --- HEADER --- */}
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-3 rounded-xl shadow-lg">
            <Plane className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pacing Flight Check</h1>
            <p className="text-slate-500 text-sm font-medium">Daily Budget Validation Tool</p>
          </div>
        </div>

        {/* User Button & Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all"
          >
            <User size={20} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 border-b border-slate-100 mb-2">
                 <p className="text-xs font-bold text-slate-400 uppercase">Simulator Options</p>
              </div>
              <button 
                onClick={handleRandomize}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
              >
                <Shuffle size={16} /> Random Scenario
              </button>
              <button 
                onClick={handleReset}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
              >
                <Trash2 size={16} /> Reset Application
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT COLUMN: COCKPIT INPUTS --- */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" /> 
                Flight Controls
              </h2>
              {(yesterdaySpend || pacerGoal || platformBudget) && (
                  <button 
                    onClick={handleReset} 
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 underline"
                  >
                    Clear All
                  </button>
              )}
            </div>
            
            <div className="p-6 space-y-8">
              
              {/* INPUT A */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Yesterday's Actual Spend
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                  <input
                    type="number"
                    value={yesterdaySpend}
                    onChange={(e) => setYesterdaySpend(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 ml-1">
                  Did we underspend yesterday?
                </p>
              </div>

              <div className="border-t border-slate-100"></div>

              {/* INPUT B */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
                  2. Today's Pacer Goal (Excel)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                  <input
                    type="number"
                    value={pacerGoal}
                    onChange={(e) => setPacerGoal(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-blue-50/50 border border-blue-200 rounded-xl py-3 pl-8 pr-4 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 ml-1">
                  The anchor number from the spreadsheet.
                </p>
              </div>

              {/* INPUT C */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  3. Current Shared Budget Setting
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                  <input
                    type="number"
                    value={platformBudget}
                    onChange={(e) => setPlatformBudget(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 ml-1">
                  What is actually live in the platform?
                </p>
              </div>

            </div>
          </div>

          {/* MARATHON RUNNER STRATEGY CARD (HIERARCHY UPDATE) */}
          <div className="bg-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
             {/* Header */}
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Timer size={100} />
             </div>
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                <Timer size={18} className="text-blue-400" />
                Pacing Strategy Matrix
             </h3>
             
             {/* 1. THE STANDARD (Highlighted) */}
             <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4 mb-5 relative overflow-hidden z-10">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                <div className="flex items-start gap-3">
                   <span className="text-2xl mt-0.5">🚗</span>
                   <div>
                      <span className="block font-bold text-emerald-100 text-xs uppercase tracking-wide mb-1">On Pace? (Standard)</span>
                      <span className="block font-bold text-white text-lg">Cruise <span className="text-emerald-200/60 font-medium text-sm">(Set Budget = Goal)</span></span>
                      <span className="text-slate-300 text-xs mt-1 block leading-snug">Our primary goal is to spend in full evenly.</span>
                   </div>
                </div>
             </div>

             {/* Divider Label */}
             <div className="flex items-center gap-2 mb-4 opacity-60">
                <div className="h-px bg-slate-500 flex-1"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Only if off-track</span>
                <div className="h-px bg-slate-500 flex-1"></div>
             </div>

             {/* 2. COURSE CORRECTIONS */}
             <div className="space-y-4 mb-6 pl-2 relative z-10">
                <div className="flex items-center gap-3 text-sm group">
                   <span className="text-2xl group-hover:scale-110 transition-transform">🏃‍♂️</span>
                   <div>
                      <span className="block font-bold text-blue-200 text-xs uppercase mb-0.5">Behind Pace? (Underspent)</span>
                      <span className="text-white font-bold">Sprint <span className="text-slate-400 font-normal">(Set Budget &gt; Goal)</span></span>
                   </div>
                </div>
                <div className="flex items-center gap-3 text-sm group">
                   <span className="text-2xl group-hover:scale-110 transition-transform">🚶‍♂️</span>
                   <div>
                      <span className="block font-bold text-amber-200 text-xs uppercase mb-0.5">Ahead of Pace? (Overspent)</span>
                      <span className="text-white font-bold">Jog <span className="text-slate-400 font-normal">(Set Budget &lt; Goal)</span></span>
                   </div>
                </div>
             </div>

             {/* Footer Labels */}
             <div className="mt-4 pt-4 border-t border-slate-700 flex flex-col gap-3 text-xs font-medium text-slate-400 relative z-10">
                <div className="flex justify-between items-center">
                   <span>Budget Setting</span>
                   <span className="text-white bg-slate-700 px-2 py-1 rounded">Your Current Speed</span>
                </div>
                <div className="flex justify-between items-center">
                   <span>Today's Pacer Goal</span>
                   <span className="text-white bg-slate-700 px-2 py-1 rounded">Required Pace</span>
                </div>
             </div>
          </div>
        </section>

        {/* --- RIGHT COLUMN: VERDICT DASHBOARD --- */}
        <section className="lg:col-span-7">
          <div className={`h-full rounded-3xl border-2 p-8 transition-all duration-500 flex flex-col justify-center items-center text-center relative overflow-hidden shadow-xl ${getStatusColor(calculationResult.status)}`}>
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>

            {/* Waiting State */}
            {calculationResult.status === 'waiting' && (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-200 rounded-full mb-4"></div>
                <div className="h-6 w-48 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 w-64 bg-slate-200 rounded"></div>
                <p className="mt-8 text-slate-400 font-medium">Enter Flight Data to Begin Check</p>
              </div>
            )}

            {/* Error State */}
            {calculationResult.status === 'error' && (
               <div className="text-red-500 font-bold">Pacer Goal cannot be zero.</div>
            )}

            {/* Active Result State */}
            {calculationResult.status !== 'waiting' && calculationResult.status !== 'error' && (
              <div className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in duration-300">
                
                {/* Variance Badge */}
                <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-current">
                   <span className="text-xs font-bold uppercase tracking-widest opacity-70">Variance</span>
                   <span className="text-lg font-black">
                     {calculationResult.variance > 0 ? '+' : ''}{formatPercent(calculationResult.variance)}
                   </span>
                </div>

                {/* Icon */}
                <div className="flex justify-center">
                  {getStatusIcon(calculationResult.status)}
                </div>

                {/* Headline */}
                <h2 className="text-3xl md:text-4xl font-black mb-6 leading-tight">
                  {calculationResult.headline}
                </h2>

                {/* Subtext or Checklist */}
                {calculationResult.subtext && (
                  <p className="text-lg md:text-xl font-medium opacity-90 leading-relaxed">
                    {calculationResult.subtext}
                  </p>
                )}

                {calculationResult.checklist && (
                  <div className="bg-white/60 text-left p-6 rounded-2xl backdrop-blur-sm mt-4 border border-current border-opacity-20">
                    <p className="text-xs font-bold uppercase opacity-60 mb-3 tracking-wider">Verification Checklist</p>
                    <ul className="space-y-3">
                      {calculationResult.checklist.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 font-medium opacity-90">
                          <ArrowRight className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-60" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Comparison Details Footer */}
                <div className="mt-12 pt-8 border-t border-current border-opacity-20 grid grid-cols-2 gap-4 text-sm opacity-80">
                   <div className="text-right pr-4 border-r border-current border-opacity-20">
                      <div className="text-xs uppercase font-bold mb-1 opacity-70">Goal</div>
                      <div className="font-mono font-bold text-lg">{formatCurrency(pacerGoal)}</div>
                   </div>
                   <div className="text-left pl-4">
                      <div className="text-xs uppercase font-bold mb-1 opacity-70">Setting</div>
                      <div className="font-mono font-bold text-lg">{formatCurrency(platformBudget)}</div>
                   </div>
                </div>

              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}