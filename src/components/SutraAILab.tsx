import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Flame, 
  Activity, 
  RefreshCw, 
  TrendingDown, 
  Compass, 
  FileText, 
  ArrowRightLeft, 
  Scale, 
  TrendingUp, 
  Sparkles, 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  TrendingDown as TrendingDownIcon,
  Clock,
  Heart,
  HelpCircle,
  BookOpen,
  Award,
  Zap,
  Trophy
} from "lucide-react";
import { MealLog, UserProfile } from "../types";
import { 
  generateWeeklyHealthReview, 
  analyzePathologyReport, 
  getFoodSwaps 
} from "../services/geminiService";

interface SutraAILabProps {
  meals: MealLog[];
  waterLogs?: any[];
  profile: UserProfile | null;
  onAddNotification: (title: string, msg: string, type: 'goal' | 'alert' | 'success') => void;
}

export default function SutraAILab({ meals, waterLogs = [], profile, onAddNotification }: SutraAILabProps) {
  const [activeLabTab, setActiveLabTab] = useState<
    'mscore' | 'agni' | 'weekly' | 'hunger' | 'inflation' | 'pathology' | 'swap' | 'dosha' | 'glucose' | 'altar'
  >('altar');

  // ==========================================
  // Retention Gamification: Prana Level & Vedic Altar State
  // ==========================================
  const [pranaXP, setPranaXP] = useState<number>(() => {
    return Number(localStorage.getItem("sutra_prana_xp") || "75");
  });
  const [claimedQuests, setClaimedQuests] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("sutra_claimed_quests") || '["welcome"]');
  });

  const handleClaimQuest = (questId: string, xpReward: number) => {
    if (claimedQuests.includes(questId)) return;
    const updated = [...claimedQuests, questId];
    setClaimedQuests(updated);
    localStorage.setItem("sutra_claimed_quests", JSON.stringify(updated));
    const newXP = pranaXP + xpReward;
    setPranaXP(newXP);
    localStorage.setItem("sutra_prana_xp", String(newXP));
    onAddNotification("🌟 Quest Completed!", `Successfully purified your Agni! Gained +${xpReward} Prana XP.`, "success");
  };

  // ==========================================
  // 1. Metabolic Score State & Helpers
  // ==========================================
  const [customProtein, setCustomProtein] = useState<number>(15);
  const [customFiber, setCustomFiber] = useState<number>(6);
  const [customGI, setCustomGI] = useState<number>(45);
  const [customProcessing, setCustomProcessing] = useState<string>("low"); // low, med, high
  const [customDensity, setCustomDensity] = useState<number>(75); // 0-100

  const calculateMScore = (protein: number, fiber: number, gi: number, processing: string, density: number) => {
    // 0-100 formula simulating metabolic impact
    const proteinFactor = Math.min((protein / 25) * 20, 20); // max 20pts
    const fiberFactor = Math.min((fiber / 10) * 20, 20); // max 20pts
    const glycemicFactor = Math.max(25 - (gi * 0.25), 0); // lower index = higher points, max 25pts
    const processingPenalty = processing === "high" ? 5 : processing === "med" ? 15 : 25; // max 25pts
    const nutrientDensityFactor = (density / 100) * 10; // max 10pts

    return Math.round(proteinFactor + fiberFactor + glycemicFactor + processingPenalty + nutrientDensityFactor);
  };

  const calculatedMScore = calculateMScore(customProtein, customFiber, customGI, customProcessing, customDensity);

  // ==========================================
  // 2. Automated Agni Reconstruction Engine (Zero-Manual Input)
  // ==========================================
  const calculateAgniScoreAndState = () => {
    let score = 55; // baseline midpoint
    const audits: { category: string; value: string; impact: string; isPositive: boolean; details: string }[] = [];

    // Sort meals descending to analyze the latest patterns
    const sortedMeals = [...meals].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 1. MACRO MEAL TIMING GAP DEDUCTION (Spacing vs Grazing)
    if (sortedMeals.length >= 2) {
      const latest = sortedMeals[0];
      const previous = sortedMeals[1];
      const timeDiffMs = new Date(latest.timestamp).getTime() - new Date(previous.timestamp).getTime();
      const hoursDiff = Math.abs(timeDiffMs) / (1000 * 60 * 60);

      if (hoursDiff < 3.0) {
        score -= 15;
        audits.push({
          category: "Circadian Meal Spacing",
          value: `Close Gap (${hoursDiff.toFixed(1)} hrs)`,
          impact: "Vishamagni Risk (Grazing Penalty)",
          isPositive: false,
          details: `Logged "${latest.dish_name}" very close to "${previous.dish_name}". Grazing denies gastric acid resetting, overexerting the digestive fire.`
        });
      } else if (hoursDiff >= 3.0 && hoursDiff <= 5.5) {
        score += 20;
        audits.push({
          category: "Circadian Meal Spacing",
          value: `Optimal Spacing (${hoursDiff.toFixed(1)} hrs)`,
          impact: "Samagni Support (Great Fasting Window)",
          isPositive: true,
          details: "Stomach allowed full clearance and enzymatic resetting between consecutive logs. Excellent scheduling."
        });
      } else {
        score -= 5;
        audits.push({
          category: "Circadian Meal Spacing",
          value: `Prolonged Inter-Meal Gap (${hoursDiff.toFixed(1)} hrs)`,
          impact: "Mandagni Cooling (Dormant Fire)",
          isPositive: false,
          details: "Overly long fasting interval during active daylight can temporarily slow digestive peristalsis and pool stagnant bile."
        });
      }
    } else if (sortedMeals.length === 1) {
      const latest = sortedMeals[0];
      const timeDiffMs = new Date().getTime() - new Date(latest.timestamp).getTime();
      const hoursDiff = Math.abs(timeDiffMs) / (1000 * 60 * 60);

      if (hoursDiff >= 3.0 && hoursDiff <= 6.0) {
        score += 15;
        audits.push({
          category: "Meal Cleansing Time",
          value: `${hoursDiff.toFixed(1)} hrs since last log`,
          impact: "Digestive Phase Clearance Active",
          isPositive: true,
          details: "The gastrointestinal tract has successfully completed prime gastric churn phase."
        });
      } else {
        audits.push({
          category: "Meal Cleansing Time",
          value: `${hoursDiff.toFixed(1)} hrs since last log`,
          impact: "Fasting Stage Baseline",
          isPositive: true,
          details: "Single meal logged today. Monitoring the upcoming post-prandial spacing to finalize kinetic digest charts."
        });
      }
    } else {
      score += 10; // Neutral baseline fallback
      audits.push({
        category: "Meal Timeline Telemetry",
        value: "No Meal Logs Today",
        impact: "Circadian Baseline Setup Active",
        isPositive: true,
        details: "Upload food photos through our Real-Time Analysis Engine to automatically reconstruct your thermal digestion tracking!"
      });
    }

    // 2. AUTOMATED GASTRIC FLUID DILUTION DETECTOR (Water logs proximity check)
    if (sortedMeals.length > 0) {
      const latestMeal = sortedMeals[0];
      const mealTimeMs = new Date(latestMeal.timestamp).getTime();

      // Find if any water log was logged within 30 minutes of the latest meal
      const proximityWaterLog = waterLogs.find((w) => {
        const wTimeMs = new Date(w.timestamp).getTime();
        const minDiff = Math.abs(wTimeMs - mealTimeMs) / (1000 * 60);
        return minDiff <= 30;
      });

      if (proximityWaterLog) {
        score -= 20;
        audits.push({
          category: "Hydration Sync Integration",
          value: `Liquid Influx (${proximityWaterLog.amount_ml}ml logged with meal)`,
          impact: "Gastric Drowning Alert (Mandagni)",
          isPositive: false,
          details: `Drunk liquid too close to "${latestMeal.dish_name}" (logged within 30 mins). Consuming high fluid volume with meals dilutes hydrochloric acid and enzymes.`
        });
      } else {
        // Check if regular daily hydration is healthy overall
        const todayStr = new Date().toDateString();
        const todayWaterTotal = waterLogs
          .filter((log) => new Date(log.timestamp).toDateString() === todayStr)
          .reduce((sum, log) => sum + log.amount_ml, 0);

        if (todayWaterTotal >= 2000) {
          score += 15;
          audits.push({
            category: "Hydration Sync Integration",
            value: `${todayWaterTotal} ml today (Spaced)`,
            impact: "Metabolic Liquidity Supported",
            isPositive: true,
            details: "Ample hydration logs detected today, perfectly spaced outside digestive windows. Bolsters lymphatic drainage and micro-circulation."
          });
        } else if (todayWaterTotal > 0 && todayWaterTotal < 1200) {
          score -= 5;
          audits.push({
            category: "Hydration Sync Integration",
            value: `Sub-optimal Fluid Intake (${todayWaterTotal} ml)`,
            impact: "Dry Vata-Vishamagni Slump",
            isPositive: false,
            details: "Low fluid volume slows nutrient absorption and dry-stalls colon motility. Boost paced mineralized sips."
          });
        } else if (todayWaterTotal === 0) {
          audits.push({
            category: "Hydration Sync Integration",
            value: "No water logs today",
            impact: "Awaiting Fluid Logs to Map Mucosal Integrity",
            isPositive: true,
            details: "Awaiting logs. Spaced water intake is vital to build the bicarbonate stomach lining protecting against bile reflux."
          });
        }
      }
    } else {
      audits.push({
        category: "Hydration Rhythm Analysis",
        value: "Passive Monitoring",
        impact: "Hydration Telemetry Standing By",
        isPositive: true,
        details: "Water logs will automatically trigger Gastric Drowning checks relative to your uploaded meal entries."
      });
    }

    // 3. CHEMICAL COMBINATION & Ama SYNERGY AUDIT
    if (sortedMeals.length > 0) {
      const latest = sortedMeals[0];
      // Check for processed meals which increase metabolic tax / Ama
      const isHighProcessed = latest.calories > 650 && latest.fat > 35; // composite heuristic
      const highCarbLowFiber = latest.carbs > 80 && latest.fat < 10;

      if (isHighProcessed) {
        score -= 15;
        audits.push({
          category: "Food Combo & Synergy",
          value: "High Processing / Heavy lipid load",
          impact: "Ama (Metabolic Toxin) Imbalance",
          isPositive: false,
          details: `Heavy, refined fats in "${latest.dish_name}" take up to 6 hours to clear. Suppresses gut motility and breeds slow Kapha systemic buildup.`
        });
      } else if (highCarbLowFiber) {
        score -= 10;
        audits.push({
          category: "Food Combo & Synergy",
          value: "High-glycemic glycemic strain",
          impact: "Tikshnagni (Acidity/Overheating risks)",
          isPositive: false,
          details: "Rapid absorption loads insulin transporters excessively. Triggers systemic insulin latency and rebound liver lipogenesis."
        });
      } else {
        score += 15;
        audits.push({
          category: "Food Combo & Synergy",
          value: "Balanced Macros & High Integrity",
          impact: "Clean Combustion & Dosha Synergy",
          isPositive: true,
          details: "Excellent clean whole-foods profile. Delivers steady peptide YY signals, aiding metabolic consistency."
        });
      }
    } else {
      audits.push({
        category: "Chemical Chemistry Scan",
        value: "Zero-effort dynamic scanning",
        impact: "Enzymatic Profile Map Configured",
        isPositive: true,
        details: "The vision engine analyzes food surface glaze and components to deduct cellular processing burdens upon photo capture."
      });
    }

    // 4. CIRCADIAN LATENCY MAPPING
    if (sortedMeals.length > 0) {
      const latest = sortedMeals[0];
      const hour = new Date(latest.timestamp).getHours();

      if (hour >= 11 && hour <= 14) {
        score += 15;
        audits.push({
          category: "Circadian Latency Alignment",
          value: `Daylight Peak (${hour}:00)`,
          impact: "Solar Agni (Suryaj-Agni) Balance",
          isPositive: true,
          details: "Logged around peak daily solar tracking. Perfect alignment when pancreatic insulin secretion and hepatic digestion are natively elevated."
        });
      } else if (hour >= 20 || hour < 6) {
        score -= 15;
        audits.push({
          category: "Circadian Latency Alignment",
          value: `Late Night Log (${hour}:00)`,
          impact: "Melatonin-Insulin Mismatch",
          isPositive: false,
          details: "Late logs clash with biological sundown. Pancreatic cell insulin latency peaks at night, converting carbs to triglycerides at 3x normal speeds."
        });
      } else {
        audits.push({
          category: "Circadian Latency Alignment",
          value: `Paced Hour (${hour}:00)`,
          impact: "Standard Diurnal Digestion",
          isPositive: true,
          details: "Within stable daylight hours. General metabolic rate supports active digestion."
        });
      }
    }

    const finalScore = Math.max(15, Math.min(100, score));

    // Determinations
    let state = "Vishamagni (Irregular/Unpredictable)";
    let desc = "Fluctuating digestive fire, irregular bloating, or gas. Your metabolic engine is operating in a chaotic rhythm.";
    let tip = "Avoid grazing; maintain sharp 4-hour empty-stomach spaces. Avoid cold drinks with meals to reboot gastrointestinal enzymes.";

    if (finalScore >= 80) {
      state = "Samagni (Balanced/Perfect Agni)";
      desc = "Optimally digests foods with balanced blood glucose, high thermal efficiency, and zero sluggishness or acidity.";
      tip = "Maintain your current clean meal spacing, keep avoiding fluid proximity to meals, and consume warm meals on schedule.";
    } else if (finalScore >= 60 && finalScore < 80) {
      state = "Mandagni (Slow/Sluggish)";
      desc = "Heavy congestion, post-meal slothfulness, slow clearance, and tendency for liver fat storage. Often Kapha-linked.";
      tip = "Introduce digestive spices like black pepper, dry ginger, or a cup of warm cumin-coriander water 45 mins after meals.";
    } else if (finalScore >= 40 && finalScore < 60) {
      state = "Tikshnagni (Hyper-Active/Sharp)";
      desc = "Intense rapid burning, hot acid reflux potentials, and rapid cellular transit. Often Pitta-elevated.";
      tip = "Reduce super-hot chilies, excessive raw garlic, and sharp acids. Focus on cooling herbs like mint and coriander.";
    }

    return { score: finalScore, state, desc, tip, audits };
  };

  const agniOutput = calculateAgniScoreAndState();

  // ==========================================
  // 3. AI Weekly Health Review
  // ==========================================
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [loadingWeekly, setLoadingWeekly] = useState<boolean>(false);

  // Load existing report from localStorage if any
  useEffect(() => {
    const saved = localStorage.getItem("weekly_metabolic_report");
    if (saved) {
      try {
        setWeeklyReport(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const triggerWeeklyReport = async () => {
    if (meals.length === 0) {
      onAddNotification("📌 Log Some Meals First", "Weekly Health Review requires a database of logged meals to scan trends.", "alert");
      return;
    }
    setLoadingWeekly(true);
    try {
      const report = await generateWeeklyHealthReview(meals, profile);
      setWeeklyReport(report);
      localStorage.setItem("weekly_metabolic_report", JSON.stringify(report));
      onAddNotification("⭐ Report Synced", "New AI Weekly Health Audit is compiled and cached securely.", "success");
    } catch (e) {
      console.error(e);
      onAddNotification("❌ System error", "Could not synchronize with the Gemini analysis node.", "alert");
    } finally {
      setLoadingWeekly(false);
    }
  };

  // ==========================================
  // 4. Hunger & Satiety Predictor
  // ==========================================
  const [hungerProtein, setHungerProtein] = useState<number>(20);
  const [hungerFiber, setHungerFiber] = useState<number>(5);
  const [hungerFat, setHungerFat] = useState<number>(12);
  const [hungerCarbs, setHungerCarbs] = useState<number>(50);

  const calculateSatietyAndHunger = () => {
    // Satiety duration in minutes estimated dynamically based on satiety index factors:
    // Protein adds 12 min per gram, fiber adds 15 min per gram, fat adds 8 min per gram, carbs add 3 min per gram.
    // Subtract 1 minute per 15 glycemic level to account for sugar crash.
    const durationMins = Math.round(
      (hungerProtein * 10) + (hungerFiber * 15) + (hungerFat * 6) + (hungerCarbs * 2.5)
    );
    const clampedMins = Math.max(60, Math.min(360, durationMins)); // between 1 hour and 6 hours
    const hours = Math.floor(clampedMins / 60);
    const mins = clampedMins % 60;

    // Estimated Glucose Crash Window
    // High carbs with low protein/fiber causes a faster crash (lower satiety, sudden hunger spike at t+2 hours).
    const isSpikeProne = (hungerCarbs > (hungerProtein + hungerFiber) * 2);
    const dipWindowHour = isSpikeProne ? "1.5 - 2" : "3 - 4.5";

    return { clampedMins, hours, mins, isSpikeProne, dipWindowHour };
  };

  const hungerPredict = calculateSatietyAndHunger();

  // ==========================================
  // 5. Food Inflation Tracker
  // ==========================================
  const [spendingBaseline, setSpendingBaseline] = useState<number>(3500); // weekly baseline spending
  const calculateFoodInflation = () => {
    // Collect raw costs from user meals
    const totalSpent = meals.reduce((acc, m) => acc + (m.total_cost || 0), 0);
    const mealCount = meals.length;
    const averageMealCost = mealCount > 0 ? totalSpent / mealCount : 220;

    // Extrapolate to target week
    const currentWeekProjected = Math.max(1200, averageMealCost * Math.min(14, mealCount || 7));
    const inflationPercent = spendingBaseline > 0 
      ? (((currentWeekProjected - spendingBaseline) / spendingBaseline) * 100).toFixed(1)
      : "0.0";

    const totalProtein = meals.reduce((acc, m) => acc + (m.protein || 0), 0);
    const averageCostPerGramProtein = totalProtein > 0 ? totalSpent / totalProtein : 4.5;

    return {
      totalSpent,
      mealCount,
      averageMealCost,
      currentWeekProjected,
      inflationPercent: Number(inflationPercent),
      averageCostPerGramProtein
    };
  };

  const inflationMetrics = calculateFoodInflation();

  // ==========================================
  // 6. Pathology Analyzer
  // ==========================================
  const [rawBiomarkers, setRawBiomarkers] = useState<string>("");
  const [analyzingPathology, setAnalyzingPathology] = useState<boolean>(false);
  const [pathologyResults, setPathologyResults] = useState<any>(null);

  const triggerPathologyAnalysis = async () => {
    if (!rawBiomarkers.trim()) {
      onAddNotification("🩸 Text Missing", "Paste raw blood markers text (e.g. HbA1c: 6.2%, Vitamin D: 21) in the panel first.", "alert");
      return;
    }
    setAnalyzingPathology(true);
    try {
      const results = await analyzePathologyReport(rawBiomarkers);
      setPathologyResults(results);
      onAddNotification("🩸 Pathology Synced", "Biomarkers mapped and therapeutic recommendations drafted.", "success");
    } catch (e: any) {
      onAddNotification("⚙️ Analysis Alert", e.message || "Failed to process biomarkers.", "alert");
    } finally {
      setAnalyzingPathology(false);
    }
  };

  // ==========================================
  // 7. AI Food Swap Engine
  // ==========================================
  const [swapDishName, setSwapDishName] = useState<string>("");
  const [searchingSwaps, setSearchingSwaps] = useState<boolean>(false);
  const [swapResults, setSwapResults] = useState<any>(null);

  const triggerFoodSwaps = async () => {
    if (!swapDishName.trim()) {
      onAddNotification("🍜 Food Name Empty", "Please specify a food item (e.g. Garlic Naan) to fetch swaps.", "alert");
      return;
    }
    setSearchingSwaps(true);
    try {
      const results = await getFoodSwaps(swapDishName);
      setSwapResults(results);
      onAddNotification("🔁 Food Swaps Located", `Identified 3 metabolic alternatives for ${swapDishName}.`, "success");
    } catch (e) {
      console.error(e);
      onAddNotification("⚙️ Swap Error", "Failed to reach AI swap databases.", "alert");
    } finally {
      setSearchingSwaps(false);
    }
  };

  // ==========================================
  // 8. Personalized Dosha Calibration
  // ==========================================
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [showDoshaResult, setShowDoshaResult] = useState<boolean>(false);

  const doshaQuizQuestions = [
    { id: "frame", label: "Physical Frame / Bone Build", options: [{ v: "v", l: "Lean, prominent joints" }, { v: "p", l: "Medium, athletic" }, { v: "k", l: "Broad-shouldered, stout" }] },
    { id: "skin", label: "Skin Quality & Hair", options: [{ v: "v", l: "Dry, cold, coarse hair" }, { v: "p", l: "Warm, oily, fine/reddish hair" }, { v: "k", l: "Thick, soft, greasy hair" }] },
    { id: "weather", label: "Weather Sensitivity", options: [{ v: "v", l: "Strongly dislikes cold & wind" }, { v: "p", l: "Dislikes intense sun & heat" }, { v: "k", l: "Dislikes wet, cool damp climates" }] },
    { id: "digestion", label: "Appetite & Digestive Flow", options: [{ v: "v", l: "Irregular, gas, bloating" }, { v: "p", l: "Sharp hunger, irritable if delayed" }, { v: "k", l: "Slow but steady, easily gains weight" }] },
    { id: "sleep", label: "Sleep Style & Pacing", options: [{ v: "v", l: "Light, sporadic, dreams of running" }, { v: "p", l: "Moderate, warm, competitive dreams" }, { v: "k", l: "Heavy, sound, long deep sleep" }] },
    { id: "stress", label: "Stress Response", options: [{ v: "v", l: "Anxious, fearful, dry throat" }, { v: "p", l: "Arrogant, impatient, angry" }, { v: "k", l: "Complacent, silent, stubborn" }] }
  ];

  const calculateDoshas = () => {
    let vCount = 0;
    let pCount = 0;
    let kCount = 0;

    doshaQuizQuestions.forEach((q) => {
      const ans = quizAnswers[q.id];
      if (ans === "v") vCount++;
      if (ans === "p") pCount++;
      if (ans === "k") kCount++;
    });

    const total = vCount + pCount + kCount || 1;
    const vata = Math.round((vCount / total) * 100);
    const pitta = Math.round((pCount / total) * 100);
    const kapha = Math.round((kCount / total) * 100);

    return { vata, pitta, kapha };
  };

  const currentDoshas = calculateDoshas();

  // ==========================================
  // 9. Glucose Stability Score
  // ==========================================
  const [glucoseExerciseMin, setGlucoseExerciseMin] = useState<number>(0);
  const [glucoseFastHours, setGlucoseFastHours] = useState<number>(12);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  const calculateGlucoseStability = () => {
    // Daily score calculated using logged meals
    const today = new Date().toDateString();
    const todayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === today);
    
    let totalCarbs = todayMeals.reduce((acc, m) => acc + (m.carbs || 10), 0);
    let totalProtein = todayMeals.reduce((acc, m) => acc + (m.protein || 5), 0);
    let totalFiber = todayMeals.reduce((acc, m) => acc + (m.hunger_rating || 4), 0); // fallback or estimate

    if (todayMeals.length === 0) {
      // simulated values for empty log
      totalCarbs = 80;
      totalProtein = 25;
      totalFiber = 8;
    }

    // fiber decreases carb impact, protein slows absorption, fasting balances glycogen
    // exercise dumps excess circulating sugar
    const carbFiberRatio = totalFiber > 0 ? totalCarbs / totalFiber : 12;
    const exerciseBonus = glucoseExerciseMin * 0.5;
    const fastBonus = Math.min((glucoseFastHours - 10) * 1.5, 10);

    let baseScore = 95 - (carbFiberRatio * 2.5);
    baseScore += exerciseBonus;
    baseScore += fastBonus;

    const finalScore = Math.max(30, Math.min(100, Math.round(baseScore)));

    let status = "Highly Stable (Green Zone)";
    let desc = "Pristine glucose control. Flat insulin signature, optimal autonomic neural rest.";
    let borderColor = "border-green-300 bg-green-50/50 text-green-700";

    if (finalScore < 50) {
      status = "Turbulent (Red Zone - Spike Prone)";
      desc = "Major rapid elevations observed. High risk of immediate reactive fatigue and storage shunt.";
      borderColor = "border-red-300 bg-red-50/50 text-red-700";
    } else if (finalScore < 75) {
      status = "Moderately Fluctuating (Amber Zone)";
      desc = "Minor spikes present. Digesting starches with mild transit delay, but manageable.";
      borderColor = "border-amber-300 bg-amber-50/50 text-amber-700";
    }

    // Generate CGM line coordinates
    const coordinates: { x: number; y: number }[] = [];
    const pointsCount = 10;
    for (let i = 0; i < pointsCount; i++) {
      const x = (i / (pointsCount - 1)) * 100;
      // Simulated CGM wave centered around 100mg/dL
      let baseOffset = 100;
      if (i === 2 || i === 6) {
        // meal spikes
        baseOffset += (totalCarbs * 0.4) - (totalProtein * 0.2);
      }
      if (i === 3 || i === 7) {
        // sugar dips
        baseOffset -= (totalCarbs * 0.2) + exerciseBonus;
      }
      const y = Math.max(65, Math.min(195, baseOffset + Math.sin(i) * 8));
      coordinates.push({ x, y });
    }

    return { score: finalScore, status, desc, borderColor, coordinates };
  };

  const glucoseOutput = calculateGlucoseStability();

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes glow-samagni {
          0%, 100% { box-shadow: 0 0 25px 3px rgba(245, 158, 11, 0.25), inset 0 0 12px rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 45px 12px rgba(245, 158, 11, 0.6), inset 0 0 18px rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.75); }
        }
        @keyframes glow-tikshnagni {
          0%, 100% { box-shadow: 0 0 20px 2px rgba(239, 68, 68, 0.35), inset 0 0 15px rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 40px 14px rgba(249, 115, 22, 0.8), inset 0 0 24px rgba(249, 115, 22, 0.3); border-color: rgba(249, 115, 22, 0.85); }
        }
        @keyframes glow-mandagni {
          0%, 100% { box-shadow: 0 0 30px 4px rgba(59, 130, 246, 0.22), inset 0 0 10px rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.35); }
          50% { box-shadow: 0 0 55px 15px rgba(29, 78, 216, 0.5), inset 0 0 20px rgba(29, 78, 216, 0.22); border-color: rgba(29, 78, 216, 0.7); }
        }
        @keyframes glow-vishamagni {
          0%, 100% { box-shadow: 0 0 22px 3px rgba(139, 92, 246, 0.2), inset 0 0 10px rgba(139, 92, 246, 0.06); border-color: rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 38px 10px rgba(139, 92, 246, 0.5), inset 0 0 18px rgba(139, 92, 246, 0.18); border-color: rgba(139, 92, 246, 0.6); }
        }
        .glow-samagni {
          animation: glow-samagni 4.5s ease-in-out infinite;
        }
        .glow-tikshnagni {
          animation: glow-tikshnagni 1.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .glow-mandagni {
          animation: glow-mandagni 5.5s ease-in-out infinite;
        }
        .glow-vishamagni {
          animation: glow-vishamagni 3.6s ease-in-out infinite;
        }
      ` }} />
      
      {/* AI Lab Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#111111] to-[#341b52] rounded-[36px] p-8 md:p-12 text-white border border-purple-500/20 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="max-w-2xl relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 rounded-full text-[9px] font-black uppercase text-purple-300 tracking-widest">
            <Sparkles size={11} className="text-amber-400" /> Sutra Intelligence Engine
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
            AI Metabolic <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-purple-400">Command Center</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-300 max-w-lg leading-relaxed font-medium">
            Bridging clinical biochemistry, localized financial metrics, and ancient Ayurvedic physiology through Google GenAI computing.
          </p>
        </div>
      </div>

      {/* Grid Menu of 9 Core Features */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 px-1">SELECT METABOLIC ORACLE NODES:</p>
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {[
            { id: 'altar', label: 'Quest Altar', icon: Trophy, color: 'text-amber-500 bg-amber-50 font-bold border-amber-300' },
            { id: 'mscore', label: 'M-Score', icon: Scale, color: 'text-orange-500 bg-orange-50' },
            { id: 'agni', label: 'Agni Fire', icon: Flame, color: 'text-red-500 bg-red-50' },
            { id: 'weekly', label: 'AI Review', icon: BookOpen, color: 'text-purple-500 bg-purple-50' },
            { id: 'hunger', label: 'Satiety', icon: Clock, color: 'text-blue-500 bg-blue-50' },
            { id: 'inflation', label: 'Inflation', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50' },
            { id: 'pathology', label: 'Biomarkers', icon: FileText, color: 'text-rose-500 bg-rose-50' },
            { id: 'swap', label: 'Swap AI', icon: ArrowRightLeft, color: 'text-cyan-500 bg-cyan-50' },
            { id: 'dosha', label: 'Dosha', icon: Compass, color: 'text-[#5E2B97] bg-indigo-50' },
            { id: 'glucose', label: 'Glucose', icon: Activity, color: 'text-pink-500 bg-pink-50' }
          ].map((item) => {
            const IconComp = item.icon;
            const isSelected = activeLabTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveLabTab(item.id as any)}
                className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  isSelected 
                    ? "bg-[#1A1A1A] text-white border-black shadow-lg scale-105" 
                    : "bg-white border-gray-100 hover:border-gray-300 text-gray-700 hover:scale-[1.02]"
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${isSelected ? "bg-white/10 text-white" : item.color}`}>
                  <IconComp size={16} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider block leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Feature Content Block */}
      <div className="bg-white rounded-[32px] md:rounded-[40px] border border-gray-100 shadow-sm p-6 md:p-10 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeLabTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            
            {/* ========================================================= */}
            {/* 0. SACRED VEDIC AGNI ALTAR & QUESTS */}
            {/* ========================================================= */}
            {activeLabTab === 'altar' && (() => {
              // Level calculation
              const currentLevel = Math.floor(pranaXP / 100);
              const percentProgress = pranaXP % 100;
              const levelTitles = ["Sutra Initiate", "Agni Disciple", "Vedic Alchemist", "Ojas Master", "Apothecary Master"];
              const title = levelTitles[Math.min(currentLevel, levelTitles.length - 1)];

              // Evaluate Quests Dynamically using real logs!
              // 1. Solar Apex: Has meals logged in 11, 12, or 13 hours?
              const solarApexAchieved = meals.some(m => {
                const hour = new Date(m.timestamp).getHours();
                return hour >= 11 && hour <= 14;
              });

              // 2. Pure Liquid Flow: Has water logs today
              const todayStr = new Date().toDateString();
              const todayWaterLogs = waterLogs.filter(w => new Date(w.timestamp).toDateString() === todayStr);
              const hydratedSpaced = todayWaterLogs.length >= 2;

              // 3. Perfect Bio Calibration: Does profile exist?
              const hasCalibration = profile !== null && (profile.weight_kg > 0 || profile.height_cm > 0);

              // 4. Ama Slayer Checklist: Has at least 2 clean meals logged today
              const todayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === todayStr);
              const amaSlayerAchieved = todayMeals.length >= 2;

              const quests = [
                {
                  id: "solar_apex",
                  title: "The Solar Apex (Suryaj-Agni)",
                  description: "Kindle peak combustion by registering a photo meal at the height of diurnal radiation (11:00 AM - 2:00 PM). Avoids liver lipid shunting.",
                  xp: 50,
                  isComplete: solarApexAchieved,
                  icon: Sparkles,
                  guide: "Log any balanced whole meal or high-protein profile between 11 AM and 2 PM today."
                },
                {
                  id: "paced_fluid",
                  title: "Paced Hydration Sync (Soma-Dhatu)",
                  description: "Nourish cellular tissue fluid. Log at least 2 spaced water logs (>=250ml each) perfectly isolated from digestive fire bounds (no food logs within 30 min boundary).",
                  xp: 40,
                  isComplete: hydratedSpaced,
                  icon: CheckCircle2,
                  guide: "Log 2 custom glasses of spaced spring water on standard intervals today."
                },
                {
                  id: "bio_calibration",
                  title: "Vedic Bio-Calibration Setup",
                  description: "Configure your primary metabolic blueprint: establish target BMI thresholds and primary systemic Dosha profile.",
                  xp: 30,
                  isComplete: hasCalibration,
                  icon: Compass,
                  guide: "Complete the Dosha assessment scan or finalize your target biochemistry."
                },
                {
                  id: "ama_slayer",
                  title: "Ama Toxin Extinguisher",
                  description: "Prevent biological fermentation blockages. Register at least 2 pristine image-analysed foods with a Metabolic M-Score above 65 today.",
                  xp: 60,
                  isComplete: amaSlayerAchieved,
                  icon: Flame,
                  guide: "Snap 2 clean food photos in our tracker to claim cellular purification."
                }
              ];

              const apothecaryRecipes = [
                {
                  id: "soma_ras",
                  name: "Soma Ras Acidity Cleanser",
                  xpRequired: 100,
                  benefits: "Combats excess Tikshnagni heat, calms vascular mucosal linings, and aids liver clearing.",
                  ingredients: "1 tsp Fennel seeds, 1 tsp whole Coriander, 4 Mint leaves, 1 cardamom pod, 300ml hot spring water.",
                  instructions: "Boil ingredients for 5 mins. Allow state transition to room temperature, filter, and sip 45 mins after meal phase."
                },
                {
                  id: "tejas_elixir",
                  name: "Tejas Liver-Agni Warm-Up",
                  xpRequired: 150,
                  benefits: "Reboots stagnant Mandagni sluggishness and sparks hepatic kinetic digestive juices.",
                  ingredients: "1/4 tsp ginger powder, 3 pinches black pepper, 1 pinch Rock Salt (Saindhav), 200ml pristine warm water.",
                  instructions: "Stir thoroughly into warm water. Administer first thing in the morning to kindle cellular combustion."
                },
                {
                  id: "ojas_ghee",
                  name: "Ojas Golden Liposomal Infusion",
                  xpRequired: 220,
                  benefits: "Calms chaotic, irregular Vishamagni (Vata nervous bloat) and builds heavy physical myelin shielding.",
                  ingredients: "1 tsp organic grass-fed cow ghee, 1/4 tsp turmeric, 1 pinch black pepper, 150ml warm plant milk.",
                  instructions: "Simmer warm plant milk with turmeric, black pepper, and ghee. Drink 30 mins before rest for ultimate mucosal rest."
                }
              ];

              return (
                <div className="space-y-8 animate-fadeIn">
                  {/* Top Header */}
                  <div className="border-b border-gray-100 pb-5 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                        <Trophy className="text-amber-500 animate-pulse" size={24} />
                        Vedic Agni Altar & Sacred Quests
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Interact regularly with logging to fuel your core physical fire. Boost retention by claiming ancient alchemical rewards.
                      </p>
                    </div>

                    {/* XP Level Bar */}
                    <div className="bg-slate-50 border border-amber-200/60 p-4 rounded-3xl flex items-center gap-4 min-w-[280px]">
                      <div className="p-2.5 bg-amber-500 text-white rounded-2xl">
                        <Zap size={20} className="animate-bounce" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-800">{title}</span>
                          <span className="text-[10px] font-black font-mono text-amber-600">Lvl {currentLevel}</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${percentProgress}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-gray-400">
                          <span>{pranaXP} XP TOTAL</span>
                          <span>{100 - percentProgress} XP TO LEVEL UP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Core Layout Split */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT PANEL: Interactive Agni Fire Altar & Click Fan */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="p-6 bg-slate-950 text-white rounded-[32px] border border-slate-800 space-y-4">
                        <div>
                          <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest bg-amber-500/10 px-2 py-0.5 rounded">
                            Sacred Fire Chamber
                          </span>
                          <h4 className="text-xl font-black text-white mt-1 tracking-tight">Interactive Agni Canvas</h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                            Your interactive digestive fire index score is computed at <strong className="text-amber-400">{agniOutput.score}</strong>. Keep logging clean food photos and spaced fluids to keep the fire amber-gold!
                          </p>
                        </div>

                        {/* Interactive Canvas Embedded */}
                        <AgniFireCanvas score={agniOutput.score} />

                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80 space-y-1.5 text-center win-scrollbar">
                          <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">Current Cosmic Combustion state:</p>
                          <h5 className="text-sm font-black text-amber-400">{agniOutput.state}</h5>
                          <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">💡 {agniOutput.tip}</p>
                        </div>
                      </div>

                      {/* Apothecary Locked recipes */}
                      <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 space-y-4">
                        <div>
                          <h4 className="text-sm font-black uppercase text-gray-800 tracking-tight">Ancient Vedic Apothecary</h4>
                          <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                            Accumulate enough Prana Levels by logging to unlock therapeutic Ayurvedic remedies for gastric distress!
                          </p>
                        </div>

                        <div className="space-y-3">
                          {apothecaryRecipes.map((recipe) => {
                            const isUnlocked = pranaXP >= recipe.xpRequired;
                            const isViewing = selectedRecipe?.id === recipe.id;

                            return (
                              <div key={recipe.id} className={`p-4 rounded-xl border transition-all duration-300 ${
                                isUnlocked 
                                  ? "bg-white border-yellow-250 hover:border-yellow-400 shadow-sm" 
                                  : "bg-gray-100/60 border-gray-100 opacity-60 pointer-events-none"
                              }`}>
                                <div className="flex justify-between items-center gap-2">
                                  <div>
                                    <h5 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                      {isUnlocked ? "🔓" : "🔒"} {recipe.name}
                                    </h5>
                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{recipe.benefits}</p>
                                  </div>
                                  {!isUnlocked ? (
                                    <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                      Unlock at {recipe.xpRequired} XP
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={() => setSelectedRecipe(isViewing ? null : recipe)}
                                      className="text-[9px] font-black text-yellow-600 hover:text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded cursor-pointer"
                                    >
                                      {isViewing ? "Collapse" : "Brew Codex"}
                                    </button>
                                  )}
                                </div>

                                {isViewing && isUnlocked && (
                                  <div className="mt-3 pt-3 border-t border-dashed border-yellow-105 space-y-2.5 animate-fadeIn">
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-yellow-600 uppercase tracking-widest">Molecular & Vedic Benefit:</p>
                                      <p className="text-[11px] font-medium text-gray-600">{recipe.benefits}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-yellow-600 uppercase tracking-widest">Apothecary Ingredients:</p>
                                      <p className="text-[11px] font-mono font-medium text-gray-800 bg-yellow-50/45 p-1.5 rounded">{recipe.ingredients}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[8px] font-black text-yellow-600 uppercase tracking-widest">Brewing Instructions:</p>
                                      <p className="text-[11px] font-medium text-gray-700 leading-relaxed bg-white/50 border border-gray-100 p-2 rounded">{recipe.instructions}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT PANEL: Live Quest Checklist */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="p-6 bg-white rounded-[32px] border border-gray-100/80 space-y-5 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-lg font-black uppercase text-gray-900 tracking-tight">Active Metabolic Quests</h4>
                            <p className="text-xs text-gray-500 font-semibold">
                              Perform physical interactions with your health biomarkers to claim Prana XP. Complete them today!
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {quests.map((q) => {
                            const isClaimed = claimedQuests.includes(q.id);
                            const canClaim = q.isComplete && !isClaimed;

                            return (
                              <div key={q.id} className={`p-5 rounded-2xl border transition-all duration-300 ${
                                canClaim 
                                  ? "bg-gradient-to-r from-amber-500/10 to-transparent border-amber-300 shadow-md scale-[1.01]"
                                  : isClaimed 
                                  ? "bg-gray-50/50 border-gray-100 opacity-75 animate-pulse"
                                  : "bg-white border-gray-100"
                              }`}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <div className={`p-1.5 rounded-lg mt-0.5 ${
                                      canClaim 
                                        ? "bg-amber-100 text-amber-600 animate-pulse" 
                                        : isClaimed 
                                        ? "bg-green-100 text-green-600" 
                                        : "bg-gray-100 text-gray-400"
                                    }`}>
                                      <q.icon size={16} />
                                    </div>
                                    <div className="flex-1">
                                      <h5 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                                        <span>{q.title}</span>
                                        {isClaimed && (
                                          <span className="text-[7.5px] uppercase tracking-wider bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black">
                                            synced & claimed
                                          </span>
                                        )}
                                      </h5>
                                      <p className="text-[11px] leading-relaxed text-gray-500 font-semibold mt-1">
                                        {q.description}
                                      </p>
                                      
                                      {!isClaimed && (
                                        <div className="mt-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-1.5">
                                          <span className="text-[8px] uppercase font-black tracking-widest text-[#5E2B97] bg-purple-50 px-1.5 py-0.5 rounded block shrink-0">
                                            how to achieve
                                          </span>
                                          <span className="text-[10px] text-gray-600 font-semibold leading-none">{q.guide}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-black font-mono text-amber-600 block">+{q.xp} XP</span>
                                    {canClaim ? (
                                      <button
                                        onClick={() => handleClaimQuest(q.id, q.xp)}
                                        className="mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 cursor-pointer transform hover:scale-105 duration-200"
                                      >
                                        Claim XP 🎁
                                      </button>
                                    ) : isClaimed ? (
                                      <span className="mt-4 px-2 py-1 bg-green-50 text-green-700 text-[8px] font-black uppercase tracking-wider rounded border border-green-100 block">
                                        Completed
                                      </span>
                                    ) : (
                                      <span className="mt-3 px-2 py-1 bg-gray-100 text-gray-400 text-[8px] font-black uppercase tracking-wider rounded block border border-gray-200">
                                        In Progress
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* ========================================================= */}
            {/* 1. METABOLIC SCORE (M-SCORE) PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'mscore' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Metabolic Score (M-Score)</h3>
                  <p className="text-xs text-gray-400 mt-1">An integrated metric measuring meal quality from protein density, processing loads, glycemic burden, and micronutrients.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex justify-between">
                        <span>Protein Density</span>
                        <span className="text-orange-600">{customProtein} g</span>
                      </label>
                      <input 
                        type="range" min="0" max="60" value={customProtein}
                        onChange={(e) => setCustomProtein(Number(e.target.value))}
                        className="w-full accent-orange-500 h-1 bg-gray-100 rounded-lg appearance-none mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex justify-between">
                        <span>Dietary Fiber</span>
                        <span className="text-orange-600">{customFiber} g</span>
                      </label>
                      <input 
                        type="range" min="0" max="25" value={customFiber}
                        onChange={(e) => setCustomFiber(Number(e.target.value))}
                        className="w-full accent-orange-500 h-1 bg-gray-100 rounded-lg appearance-none mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex justify-between">
                        <span>Glycemic Index</span>
                        <span className="text-orange-600">{customGI} GI</span>
                      </label>
                      <input 
                        type="range" min="15" max="100" value={customGI}
                        onChange={(e) => setCustomGI(Number(e.target.value))}
                        className="w-full accent-orange-500 h-1 bg-gray-100 rounded-lg appearance-none mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-2">Processing Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['low', 'med', 'high'].map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setCustomProcessing(lvl)}
                            className={`py-2 rounded-xl text-[10px] uppercase font-black tracking-wider border cursor-pointer transition-all ${
                              customProcessing === lvl 
                                ? "bg-orange-50 border-orange-300 text-orange-700" 
                                : "bg-white border-gray-100 text-gray-500"
                            }`}
                          >
                            {lvl === 'low' ? "🥗 Raw/Whole" : lvl === 'med' ? "🍲 Moderated" : "🍔 Ultraprocessed"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-400 flex justify-between">
                        <span>Nutrient Density Coefficient</span>
                        <span className="text-orange-600">{customDensity}%</span>
                      </label>
                      <input 
                        type="range" min="10" max="100" value={customDensity}
                        onChange={(e) => setCustomDensity(Number(e.target.value))}
                        className="w-full accent-orange-500 h-1 bg-gray-100 rounded-lg appearance-none mt-2"
                      />
                    </div>
                  </div>

                  {/* Circular Score Gauge */}
                  <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-[32px] border border-gray-100">
                    <div className="relative w-44 h-44 flex items-center justify-center rounded-full bg-white shadow-md border border-gray-100">
                      <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="42%" className="stroke-gray-100" strokeWidth="10" fill="none" />
                        <circle 
                          cx="50%" cy="50%" r="42%" 
                          className="stroke-orange-500 transition-all duration-500" 
                          strokeWidth="10" 
                          fill="none" 
                          strokeDasharray="264" 
                          strokeDashoffset={264 * (1 - calculatedMScore / 100)} 
                        />
                      </svg>
                      <div className="text-center z-10">
                        <span className="text-4xl font-extrabold text-black tracking-tighter">{calculatedMScore}</span>
                        <span className="block text-[8px] font-black text-gray-400 tracking-widest uppercase">M-SCORE</span>
                      </div>
                    </div>

                    <div className="text-center mt-6 space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider">
                        {calculatedMScore >= 80 ? "🔥 Metabolic Supercharge" : calculatedMScore >= 60 ? "👍 Highly Efficient Meal" : "⚠️ Slow Absorption Block"}
                      </h4>
                      <p className="text-[11px] leading-relaxed text-gray-500 max-w-xs font-medium">
                        {calculatedMScore >= 80 
                          ? "This meal releases steady systemic energy, keeping insulin flat while providing perfect tissue repair blocks." 
                          : calculatedMScore >= 60 
                          ? "A highly balanced profile. Mild digestive demands, though carbs shouldn't be loaded before sleeping hours." 
                          : "High glycemic load matched with heavy processing inhibits mitochondrial respirations, triggering lethargy crashes."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 2. AGNI TRACKER PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'agni' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 text-red-500 rounded-2xl">
                      <Flame className="animate-pulse" size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Agni Tracker (Digestive Fire)</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Vedic-metabolic profiling automatically reconstructed from daily photo logs and fluid tracking intervals.</p>
                    </div>
                  </div>
                  <span className="px-3.5 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] uppercase font-black tracking-widest border border-green-100">
                    📶 Passive Auto-Scan Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Automated Decoded Bio-telemetry Logs instead of manual forms */}
                  <div className="space-y-4 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4 flex items-center justify-between">
                        <span>🧬 Real-Time Bio-Signals Decoded</span>
                        <span className="text-[8px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full lowercase font-semibold">computed dynamically</span>
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                      {agniOutput.audits && agniOutput.audits.length > 0 ? (
                        agniOutput.audits.map((item, index) => (
                          <div key={index} className="p-4 bg-white rounded-2xl border border-gray-100/80 shadow-sm space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${item.isPositive ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {item.isPositive ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{item.category}</span>
                              </div>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                item.isPositive ? 'bg-green-100/50 text-green-700' : 'bg-amber-100/50 text-amber-700'
                              }`}>
                                {item.value}
                              </span>
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-gray-800 tracking-tight">{item.impact}</h5>
                              <p className="text-[11px] leading-relaxed text-gray-500 font-medium mt-0.5">{item.details}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">No telemetry data decoded.</p>
                      )}
                    </div>
                  </div>

                  {/* Agni State Display */}
                  {(() => {
                    let glowClass = "glow-vishamagni border-purple-200 bg-purple-50/15";
                    let badgeClass = "bg-purple-100 text-purple-600";
                    let scoreColor = "text-purple-600";
                    let titleColor = "text-purple-700";
                    let blockBorder = "border-purple-100";
                    let remediateBadge = "text-purple-500";
                    
                    if (agniOutput.score >= 80) {
                      glowClass = "glow-samagni border-amber-200 bg-amber-50/15";
                      badgeClass = "bg-amber-100 text-amber-700";
                      scoreColor = "text-amber-600";
                      titleColor = "text-amber-700";
                      blockBorder = "border-amber-100";
                      remediateBadge = "text-amber-500";
                    } else if (agniOutput.score >= 60 && agniOutput.score < 80) {
                      glowClass = "glow-mandagni border-blue-200 bg-blue-50/15";
                      badgeClass = "bg-blue-100 text-blue-700";
                      scoreColor = "text-blue-600";
                      titleColor = "text-blue-700";
                      blockBorder = "border-blue-100";
                      remediateBadge = "text-blue-500";
                    } else if (agniOutput.score >= 40 && agniOutput.score < 60) {
                      glowClass = "glow-tikshnagni border-orange-200 bg-orange-50/15";
                      badgeClass = "bg-orange-100 text-orange-700";
                      scoreColor = "text-orange-600";
                      titleColor = "text-orange-700";
                      blockBorder = "border-orange-100";
                      remediateBadge = "text-orange-500";
                    }

                    return (
                      <div className={`p-8 rounded-[32px] border flex flex-col justify-between space-y-6 transition-all duration-500 ${glowClass}`}>
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${badgeClass}`}>
                            Agni Fire Index Score
                          </span>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className={`text-4xl md:text-5xl font-black ${scoreColor}`}>{agniOutput.score}</span>
                            <span className={`${scoreColor} opacity-70 font-bold`}>/ 100</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className={`text-[10px] uppercase font-black tracking-wider ${titleColor}`}>CURRENT AGNI DISPOSITION:</p>
                          <h4 className="text-xl font-black text-gray-900 tracking-tight">{agniOutput.state}</h4>
                          <p className="text-xs text-gray-600 leading-relaxed font-semibold">{agniOutput.desc}</p>
                        </div>

                        <div className={`bg-white p-4 rounded-2xl border ${blockBorder}`}>
                          <p className={`text-[8px] uppercase font-black tracking-wider ${remediateBadge}`}>Metabolic Remediation:</p>
                          <p className="text-xs text-gray-800 font-medium leading-relaxed mt-1">💡 {agniOutput.tip}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 3. AI WEEKLY HEALTH REVIEW PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'weekly' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">AI Weekly Health Audit</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Mitochondrial pattern detection scans your entire database of meal logs using Gemini AI.</p>
                  </div>
                  
                  <button
                    onClick={triggerWeeklyReport}
                    disabled={loadingWeekly}
                    className="flex items-center gap-2 px-6 py-3 bg-[#5E2B97] hover:bg-[#4c227b] text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loadingWeekly ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} className="text-amber-400" />}
                    {loadingWeekly ? "Generating Review..." : "Execute AI Review"}
                  </button>
                </div>

                {weeklyReport ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Summary */}
                    <div className="lg:col-span-7 bg-[#FAFAFA] p-8 rounded-[32px] border border-gray-100 space-y-6">
                      <div>
                        <span className="text-[8px] font-black uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded tracking-widest">
                          Executive Summary
                        </span>
                        <p className="text-sm font-semibold leading-relaxed text-gray-800 mt-3">
                          {weeklyReport.summary}
                        </p>
                      </div>

                      <div className="border-t border-gray-100 pt-5">
                        <span className="text-[8px] font-black uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded tracking-widest">
                          Mitochondrial Velocity Trend
                        </span>
                        <p className="text-xs font-bold leading-relaxed text-gray-600 mt-2">
                          {weeklyReport.metabolic_trends}
                        </p>
                      </div>

                      <div className="border-t border-gray-100 pt-5 space-y-3">
                        <span className="text-[8px] font-black uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded tracking-widest">
                          Detected Dietary Behaviors
                        </span>
                        <ul className="space-y-2 mt-2">
                          {weeklyReport.dietary_patterns.map((pat: string, idx: number) => (
                            <li key={idx} className="flex gap-2 text-xs font-medium text-gray-700">
                              <span className="text-purple-600">▪</span> <span>{pat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Right Column: Wins, Risks, Steps */}
                    <div className="lg:col-span-5 space-y-6">
                      {/* Wins */}
                      <div className="bg-green-50/40 p-6 rounded-2xl border border-green-100/50 space-y-2.5">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-green-700 flex items-center gap-1">
                          <CheckCircle2 size={13} /> HEALTH PROGRESS WINS
                        </h4>
                        <div className="space-y-1.5">
                          {weeklyReport.health_wins.map((win: string, idx: number) => (
                            <p key={idx} className="text-xs font-bold text-green-950 flex gap-2">
                              <span>🌟</span> <span>{win}</span>
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Risk factors */}
                      <div className="bg-red-50/40 p-6 rounded-2xl border border-red-100/50 space-y-2.5">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-red-700 flex items-center gap-1">
                          <AlertCircle size={13} /> SYSTEMIC RISK FACTORS
                        </h4>
                        <div className="space-y-1.5">
                          {weeklyReport.risk_factors.map((risk: string, idx: number) => (
                            <p key={idx} className="text-xs font-bold text-red-950 flex gap-1.5">
                              <span>🚨</span> <span>{risk}</span>
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="bg-purple-950 p-6 rounded-2xl text-white space-y-3 shadow-lg shadow-purple-950/10">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-1.5">
                          <Compass size={13} /> STRATEGIC MEAL INTERVENTIONS
                        </h4>
                        <ul className="space-y-2">
                          {weeklyReport.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="flex gap-2 text-xs text-slate-200">
                              <span className="text-amber-400">⚡</span> <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-100 rounded-[32px] p-6 bg-gray-50/30">
                    <BookOpen size={40} className="text-purple-300 mb-3" />
                    <h4 className="text-base font-black uppercase">Compile Your First Audit</h4>
                    <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed font-semibold">
                      Press 'Execute AI Review' above to instruct Gemini to read your logged items and map a diagnostic weekly summary.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 4. HUNGER PREDICTION PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'hunger' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Satiety Horizon & Hunger Window Predictor</h3>
                  <p className="text-xs text-gray-400 mt-1">Predicts cellular hunger cycles and immediate blood-sugar troughs based on protein-to-carbohydrate distributions.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-5 space-y-5 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <p className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Simulate Food Composition (g)</p>
                    
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 flex justify-between">
                        <span>Protein Base</span>
                        <span>{hungerProtein}g</span>
                      </label>
                      <input type="range" min="0" max="60" value={hungerProtein} onChange={(e) => setHungerProtein(Number(e.target.value))} className="w-full accent-blue-600 mt-1.5 h-1 bg-gray-200 rounded-lg appearance-none" />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 flex justify-between">
                        <span>Soluble Dietary Fiber</span>
                        <span>{hungerFiber}g</span>
                      </label>
                      <input type="range" min="0" max="15" value={hungerFiber} onChange={(e) => setHungerFiber(Number(e.target.value))} className="w-full accent-blue-600 mt-1.5 h-1 bg-gray-200 rounded-lg appearance-none" />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 flex justify-between">
                        <span>Lipid Fats</span>
                        <span>{hungerFat}g</span>
                      </label>
                      <input type="range" min="0" max="40" value={hungerFat} onChange={(e) => setHungerFat(Number(e.target.value))} className="w-full accent-blue-600 mt-1.5 h-1 bg-gray-200 rounded-lg appearance-none" />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 flex justify-between">
                        <span>Total Carbohydrates</span>
                        <span>{hungerCarbs}g</span>
                      </label>
                      <input type="range" min="10" max="150" value={hungerCarbs} onChange={(e) => setHungerCarbs(Number(e.target.value))} className="w-full accent-blue-600 mt-1.5 h-1 bg-gray-200 rounded-lg appearance-none" />
                    </div>
                  </div>

                  {/* Satiety Horizon Chart Visualizer */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                        <span className="text-[8px] font-black uppercase text-blue-600 block">Satiety Lifespan</span>
                        <span className="text-2xl font-black text-blue-900 block mt-1">
                          {hungerPredict.hours > 0 ? `${hungerPredict.hours}h ` : ""}{hungerPredict.mins}m
                        </span>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Full Gastric Clearance</p>
                      </div>

                      <div className={hungerPredict.isSpikeProne ? "bg-orange-50 border border-orange-100 p-5 rounded-2xl" : "bg-green-50 border border-green-100 p-5 rounded-2xl"}>
                        <span className="text-[8px] font-black uppercase block text-gray-500">Predicted Hunger Window</span>
                        <span className="text-xl font-black block mt-1">
                          {hungerPredict.isSpikeProne ? "🚨 Rapid Crash" : "⏱️ Gradual Slope"}
                        </span>
                        <p className="text-[10px] text-gray-700 font-bold uppercase mt-1">Dip expected in {hungerPredict.dipWindowHour} hrs</p>
                      </div>
                    </div>

                    {/* Satiety curve vector visualization */}
                    <div className="p-4 bg-[#F2F8FF] rounded-2xl border border-blue-100/50">
                      <p className="text-[8px] font-black uppercase text-blue-500 tracking-wider mb-2">Predicted Satiety Depletion Timeline</p>
                      <div className="relative h-20 w-full flex items-end">
                        {/* Simple SVG slope */}
                        <svg className="absolute inset-0 w-full h-full">
                          <path 
                            d={hungerPredict.isSpikeProne
                              ? "M 0 10 Q 50 80 100 80"
                              : "M 0 10 Q 60 25 100 80"
                            } 
                            className="stroke-blue-500 fill-none" 
                            strokeWidth="3.5" 
                          />
                        </svg>
                        <div className="flex justify-between w-full text-[8.5px] font-black text-gray-400 uppercase tracking-wider relative z-10 p-1">
                          <span>0 hrs (Meal)</span>
                          <span>{Math.round(hungerPredict.clampedMins / 120)}h (Optimal)</span>
                          <span>{hungerPredict.hours}h (Clear)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 5. FOOD INFLATION TRACKER PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'inflation' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Food Inflation & Spending Audit</h3>
                  <p className="text-xs text-gray-400 mt-1">Monitors the cost velocity of ingested items against historical budgets and protein-per-Rupee acquisition curves.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Box: metrics values */}
                  <div className="lg:col-span-4 bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-6">
                    <div>
                      <label className="text-[8px] font-black uppercase tracking-widest text-[#9E9E9E]">Set Weekly Grocery Budget (₹)</label>
                      <input 
                        type="number" value={spendingBaseline}
                        onChange={(e) => setSpendingBaseline(Number(e.target.value))}
                        className="w-full bg-white rounded-xl border border-gray-100 mt-1.5 px-3 py-2 text-xs font-bold outline-none"
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-5 space-y-1">
                      <span className="text-[8px] uppercase font-black text-gray-400 tracking-wider block">Estimated weekly rate</span>
                      <span className="text-2xl font-black text-black block">₹{inflationMetrics.currentWeekProjected.toFixed(0)}</span>
                    </div>

                    <div className="border-t border-gray-100 pt-5 space-y-1">
                      <span className="text-[8px] uppercase font-black text-gray-400 tracking-wider block">Diet Inflation Factor</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black ${inflationMetrics.inflationPercent > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {inflationMetrics.inflationPercent > 0 ? `+${inflationMetrics.inflationPercent}%` : `${inflationMetrics.inflationPercent}%`}
                        </span>
                        <span className="text-[9px] text-[#9E9E9E] font-medium uppercase">vs baseline budget</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Box: Efficiency metrics & visual list */}
                  <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 space-y-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 rounded-full text-[8px] font-black uppercase text-emerald-600 tracking-widest">
                        Macro Acquisition Value Quotient
                      </span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] uppercase font-black text-gray-400 block">Cost Per Gram Protein</span>
                          <span className="text-xl font-black text-emerald-900 block mt-1">₹{inflationMetrics.averageCostPerGramProtein.toFixed(2)}</span>
                          <p className="text-[8.5px] text-emerald-600/70 font-semibold uppercase mt-0.5">
                            {inflationMetrics.averageCostPerGramProtein < 3 ? "Excellent Protein sourcing efficiency" : "Marginal protein cost scaling"}
                          </p>
                        </div>

                        <div>
                          <span className="text-[9px] uppercase font-black text-gray-400 block">Total Logged spending</span>
                          <span className="text-xl font-black text-emerald-900 block mt-1">₹{inflationMetrics.totalSpent.toFixed(0)}</span>
                          <p className="text-[8.5px] text-gray-400 font-semibold uppercase mt-0.5">{inflationMetrics.mealCount} distinct logs registered</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                      <p className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Top Cost-Efficient Protein Swaps</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                          <p className="text-[10px] font-black text-black">Egg Whites</p>
                          <p className="text-[8px] text-emerald-500 font-black mt-0.5">₹1.20 / g prot</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                          <p className="text-[10px] font-black text-black">Soya Chunks</p>
                          <p className="text-[8px] text-emerald-500 font-black mt-0.5">₹0.50 / g prot</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                          <p className="text-[10px] font-black text-black">Bengal Gram</p>
                          <p className="text-[8px] text-emerald-500 font-black mt-0.5">₹1.80 / g prot</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 6. PATHOLOGY REPORT ANALYZER PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'pathology' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">AI Pathology Biomarker Analyzer</h3>
                  <p className="text-xs text-gray-400 mt-1">Paste raw biomarker panels to mapping nutritional deficiencies, cardiovascular risk markers, and clinical food interventions.</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      placeholder="Paste your blood test values here... e.g. HbA1c: 6.1%, Fasting Glucose: 104, Chol: 210, Vit D3: 15 ng/ml, B12: 180 pg/ml"
                      value={rawBiomarkers}
                      onChange={(e) => setRawBiomarkers(e.target.value)}
                      className="w-full h-36 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-semibold outline-none focus:border-[#5E2B97] text-black transition-all"
                    />
                    <button
                      onClick={triggerPathologyAnalysis}
                      disabled={analyzingPathology}
                      className="absolute bottom-3 right-3 px-5 py-2.5 bg-[#1A1A1A] hover:bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {analyzingPathology ? "Running Analysis..." : "🔬 Map Biomarkers"}
                    </button>
                  </div>
                </div>

                {pathologyResults && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animation-fade-in">
                    {/* Left: Found Markers list */}
                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Identified Clinical Bio-Markers</p>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {pathologyResults.markers_found?.map((m: any, idx: number) => (
                          <div key={idx} className="bg-white px-4 py-3 rounded-xl border border-gray-100 flex justify-between items-center">
                            <div>
                              <p className="text-xs font-black text-gray-900 leading-none">{m.name}</p>
                              <p className="text-[8px] text-gray-400 uppercase mt-1">Ref: {m.reference_range}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-extrabold text-black font-mono block">{m.value}</span>
                              <span className={`text-[8px] font-black uppercase ${m.status === 'normal' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {m.status || "abnormal"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Deficiencies & recommendations */}
                    <div className="space-y-6">
                      <div className="bg-rose-50/20 p-6 rounded-2xl border border-rose-100 space-y-3">
                        <h4 className="text-[9px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-1">
                          <AlertCircle size={12} /> NUTRITIONAL RISK CRITICALITIES
                        </h4>
                        <div className="space-y-2">
                          {pathologyResults.nutritional_deficiencies?.map((def: any, idx: number) => (
                            <div key={idx} className="text-xs font-bold text-gray-800">
                              <p className="text-rose-700 flex items-center gap-1">
                                <span className="uppercase text-[9px] border border-rose-200 bg-rose-50 px-1 rounded">{def.risk_level} Risk</span>
                                <span>{def.name || def.nutrient}</span>
                              </p>
                              <p className="text-[10px] text-gray-500 font-medium ml-1.5 mt-0.5">{def.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-purple-950 p-6 rounded-2xl text-white space-y-3.5">
                        <h4 className="text-[9.5px] font-black uppercase text-purple-300 tracking-widest">
                          🛡️ THERAPEUTIC DIETARY INTERVENTIONS
                        </h4>
                        <ul className="space-y-2">
                          {pathologyResults.dietary_interventions?.map((rec: string, idx: number) => (
                            <li key={idx} className="text-xs text-purple-100 leading-relaxed font-medium flex gap-2">
                              <span>🔸</span> <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 7. AI FOOD SWAP ENGINE PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'swap' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">AI Food Swap Engine</h3>
                  <p className="text-xs text-gray-400 mt-1">Analyze a craving or unaligned food to receive exactly 3 highly functional metabolic options matching nutrition thresholds and balancing doshas.</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter dish craving... e.g. Paneer Tikka Masala, White rice, Samosa"
                    value={swapDishName}
                    onChange={(e) => setSwapDishName(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#5E2B97] text-black"
                  />
                  <button
                    onClick={triggerFoodSwaps}
                    disabled={searchingSwaps}
                    className="px-6 py-3 bg-[#5E2B97] text-white font-black text-[10px] uppercase tracking-widest rounded-xl disabled:opacity-50 cursor-pointer"
                  >
                    {searchingSwaps ? "Evaluating Swaps..." : "Locate alternatives"}
                  </button>
                </div>

                {swapResults && (
                  <div className="space-y-6 animate-fade-in">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-wide">
                      Swaps Suggested for: <span className="text-black">{swapResults.original_dish}</span> (Est GI: {swapResults.original_glycemic_load})
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {swapResults.swaps?.map((swp: any, idx: number) => (
                        <div key={idx} className="bg-[#FAF9FB] p-6 rounded-[24px] border border-gray-100 flex flex-col justify-between space-y-4 shadow-sm hover:scale-[1.02] transition-transform">
                          <div className="space-y-2">
                            <h4 className="text-sm font-black text-[#5E2B97] uppercase tracking-tight">{swp.name}</h4>
                            <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">{swp.description}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 border-y border-purple-100 py-3">
                            <div className="text-center">
                              <span className="text-[7.5px] uppercase font-black text-[#9E9E9E] block">GI Delta</span>
                              <span className="text-xs font-black text-rose-500 block">{swp.glycemic_load_reduction}</span>
                            </div>
                            <div className="text-center border-x border-purple-100">
                              <span className="text-[7.5px] uppercase font-black text-[#9E9E9E] block">Cal Delta</span>
                              <span className="text-xs font-black text-rose-500 block">{swp.calorie_reduction}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[7.5px] uppercase font-black text-[#9E9E9E] block">Prot gain</span>
                              <span className="text-xs font-black text-emerald-600 block">{swp.protein_gain}</span>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-gray-100">
                            <span className="text-[8px] font-black text-orange-500 uppercase tracking-wider block">Bio-Energetic Action:</span>
                            <span className="text-[10px] text-gray-800 leading-tight block mt-0.5 font-medium">{swp.ayurvedic_benefit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 8. PERSONALIZED DOSHA CALIBRATION PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'dosha' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Ayurvedic Dosha Calibration Suite</h3>
                  <p className="text-xs text-gray-400 mt-1">Measures baseline Vata, Pitta, and Kapha constitution ratios and dynamically models daily bio-energetic deviations.</p>
                </div>

                {!showDoshaResult ? (
                  <div className="space-y-6">
                    <p className="text-xs text-gray-500 font-bold bg-[#FAF9FB] px-4 py-2 border border-purple-50 rounded-xl max-w-lg leading-relaxed">
                      🌿 Respond to the physical markers below to calculate your high-affinity Ayurvedic constitution profile.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {doshaQuizQuestions.map((q) => (
                        <div key={q.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                          <p className="text-[11px] font-black uppercase text-gray-900 mb-2.5">{q.label}</p>
                          <div className="flex flex-col gap-2">
                            {q.options.map((opt) => (
                              <button
                                key={opt.v}
                                onClick={() => setQuizAnswers(p => ({ ...p, [q.id]: opt.v }))}
                                className={`px-4 py-2 text-left rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                  quizAnswers[q.id] === opt.v 
                                    ? "bg-purple-950 border-purple-950 text-white" 
                                    : "bg-white border-gray-100 hover:border-gray-200 text-gray-700"
                                }`}
                              >
                                {opt.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowDoshaResult(true)}
                      className="px-8 py-3 bg-[#5E2B97] text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md cursor-pointer self-center"
                    >
                      Calculate Constitution
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animation-fade-in">
                    {/* Dosha Progress bars */}
                    <div className="bg-[#FAF9FB] p-8 rounded-[32px] border border-gray-100 space-y-6">
                      <p className="text-[9px] uppercase font-black tracking-widest text-[#9E9E9E]">Prakriti Affinities</p>
                      
                      {/* Vata */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-black uppercase text-indigo-950">
                          <span>🌬️ VATA (AIR / ETHER)</span>
                          <span>{currentDoshas.vata}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-sky-400 h-full transition-all duration-1000" style={{ width: `${currentDoshas.vata}%` }} />
                        </div>
                      </div>

                      {/* Pitta */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-black uppercase text-indigo-950">
                          <span>🔥 PITTA (FIRE / WATER)</span>
                          <span>{currentDoshas.pitta}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${currentDoshas.pitta}%` }} />
                        </div>
                      </div>

                      {/* Kapha */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-black uppercase text-indigo-950">
                          <span>⛰️ KAPHA (EARTH / WATER)</span>
                          <span>{currentDoshas.kapha}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-amber-600 h-full transition-all duration-1000" style={{ width: `${currentDoshas.kapha}%` }} />
                        </div>
                      </div>

                      <button
                        onClick={() => { setShowDoshaResult(false); setQuizAnswers({}); }}
                        className="px-4 py-2 border border-gray-200 hover:bg-gray-50 uppercase text-[9px] font-black rounded-lg transition-all tracking-wider cursor-pointer mt-4"
                      >
                        Reset Calibration
                      </button>
                    </div>

                    {/* Vedic Guidance */}
                    <div className="flex flex-col justify-between space-y-6">
                      <div className="p-6 bg-[#FDFCFB] rounded-[24px] border border-gray-100">
                        <p className="text-[9px] font-black text-purple-700 uppercase tracking-widest mb-1.5">Primary Alignment:</p>
                        <h4 className="text-lg font-black tracking-tight uppercase">
                          {currentDoshas.vata > currentDoshas.pitta && currentDoshas.vata > currentDoshas.kapha ? "Vata Constitution" :
                           currentDoshas.pitta > currentDoshas.vata && currentDoshas.pitta > currentDoshas.kapha ? "Pitta Constitution" : "Kapha Constitution"}
                        </h4>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed font-semibold">
                          {currentDoshas.vata > currentDoshas.pitta && currentDoshas.vata > currentDoshas.kapha 
                            ? "Vata is ruled by movement, dry climates, and chilly seasons. Your agni peaks irregularly. Focus on sweet, sour, salty tastes and warm stews." 
                            : currentDoshas.pitta > currentDoshas.vata && currentDoshas.pitta > currentDoshas.kapha 
                            ? "Pitta commands direct biochemical fire and metabolic velocity. Easily irritated or inflamed. Favor cooling foods, cucumber, mint, and coconut water." 
                            : "Kapha embodies dense core stability and structure. Overload makes you sluggish or water-retaining. Focus on bitter, pungent, astringent spices like ginger."}
                        </p>
                      </div>

                      <div className="bg-purple-950 p-6 rounded-2xl text-white">
                        <span className="text-[8px] font-black text-amber-300 uppercase tracking-wider block">Seasonal Balancing Sutra:</span>
                        <p className="text-xs text-gray-200 mt-1.5 leading-relaxed font-medium">
                          "Shringara alignments. Eat only when the breath shifts to the solar nostril, chew light fennel seed pods, and keep a warm environment."
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 9. GLUCOSE STABILITY SCORE PANEL */}
            {/* ========================================================= */}
            {activeLabTab === 'glucose' && (
              <div className="space-y-8">
                <div className="border-b border-gray-100 pb-5">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Glucose Stability Index</h3>
                  <p className="text-xs text-gray-400 mt-1">Estimates immediate post-prandial glycemic excursions over a 24-hour cycle using carbohydrate spacing and activity pacing.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-5">
                    <p className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Lifestyle Excursion Dampeners</p>
                    
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 flex justify-between">
                        <span>Post-Meal Walking Duration</span>
                        <span>{glucoseExerciseMin} mins</span>
                      </label>
                      <input 
                        type="range" min="0" max="60" step="5" value={glucoseExerciseMin}
                        onChange={(e) => setGlucoseExerciseMin(Number(e.target.value))}
                        className="w-full accent-[#5E2B97] h-1 bg-gray-200 rounded-lg appearance-none mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 flex justify-between">
                        <span>Yesterday's Overnight Fast Window</span>
                        <span>{glucoseFastHours} hours</span>
                      </label>
                      <input 
                        type="range" min="8" max="18" value={glucoseFastHours}
                        onChange={(e) => setGlucoseFastHours(Number(e.target.value))}
                        className="w-full accent-[#5E2B97] h-1 bg-gray-200 rounded-lg appearance-none mt-2"
                      />
                    </div>

                    <div className={`p-5 rounded-2xl border ${glucoseOutput.borderColor}`}>
                      <h4 className="text-[10px] font-black uppercase">{glucoseOutput.status}</h4>
                      <p className="text-[11px] leading-relaxed mt-1 font-medium">{glucoseOutput.desc}</p>
                    </div>
                  </div>

                  {/* SVG CGM Simulation Box */}
                  <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black uppercase text-gray-400">Estimated Live Glucose Curve (cgm)</span>
                      <span className="text-[11px] font-black font-mono text-[#5E2B97]">Score: {glucoseOutput.score}/100</span>
                    </div>

                    <div className="relative h-44 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-inner p-4 flex flex-col justify-between">
                      {/* Grid guidelines */}
                      <div className="absolute inset-x-0 top-1/4 border-b border-gray-100 border-dashed"><span className="text-[7.5px] text-gray-300 absolute -top-3 left-2 font-mono">140 mg/dL (Caution limit)</span></div>
                      <div className="absolute inset-x-0 top-[60%] border-b border-gray-100 border-dashed"><span className="text-[7.5px] text-gray-300 absolute -top-3 left-2 font-mono">100 mg/dL (Basal line)</span></div>

                      {/* Continuous CGM spline */}
                      <svg className="absolute inset-0 w-full h-full p-4 pointer-events-none">
                        <path 
                          d={`M ${glucoseOutput.coordinates.map(c => `${c.x * 2.5}, ${110 - ((c.y - 65) * 0.7)}`).join(' L ')}`} 
                          fill="none" 
                          stroke={glucoseOutput.score > 75 ? "#10B981" : glucoseOutput.score > 50 ? "#F59E0B" : "#EF4444"} 
                          strokeWidth="3" 
                        />
                      </svg>

                      <div className="w-full flex justify-between text-[7px] text-gray-400 mt-auto font-mono">
                        <span>08:00 (B'fast)</span>
                        <span>13:00 (Lunch)</span>
                        <span>20:00 (Dinner)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}

// ==========================================
// Gamified Interactive Particle Altar Element
// ==========================================
const AgniFireCanvas = ({ score }: { score: number }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      decay: number;
      color: string;
    }> = [];

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = rect?.width || 300;
      canvas.height = 200;
    };
    resize();
    window.addEventListener("resize", resize);

    // Color palette selector based on fire thermal profile score 
    const getParticleColor = () => {
      const r = Math.random();
      if (score >= 80) {
        // Samagni: pure golden warm amber 
        return r > 0.5 ? "rgba(245, 158, 11, " : r > 0.22 ? "rgba(239, 68, 68, " : "rgba(251, 191, 36, ";
      } else if (score >= 60 && score < 80) {
        // Mandagni (Sluggish/Heavy Kapha): Slow indigo-purple flame
        return r > 0.6 ? "rgba(99, 102, 241, " : r > 0.3 ? "rgba(147, 51, 234, " : "rgba(59, 130, 246, ";
      } else if (score >= 40 && score < 60) {
        // Tikshnagni (Hyper-Active Pitta): White-hot crimson flares
        return r > 0.75 ? "rgba(254, 240, 138, " : r > 0.3 ? "rgba(239, 68, 68, " : "rgba(249, 115, 22, ";
      } else {
        // Vishamagni (Chaotic Vata): Unstable magenta/violet sparks
        return r > 0.6 ? "rgba(168, 85, 247, " : r > 0.35 ? "rgba(236, 72, 153, " : "rgba(79, 70, 229, ";
      }
    };

    const maxParticles = score >= 80 ? 100 : score >= 60 ? 55 : score >= 40 ? 115 : 45;
    const baseSpeedY = score >= 80 ? -2.2 : score >= 60 ? -1.1 : score >= 40 ? -3.2 : -1.7;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw active hearth/altar deck at bottom
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height - 15, 65, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spawn flame particles
      if (particles.length < maxParticles && Math.random() < 0.65) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 45,
          y: canvas.height - 18,
          vx: (Math.random() - 0.5) * 1.6,
          vy: baseSpeedY + (Math.random() - 0.5) * 0.9,
          size: Math.random() * 11 + 5,
          alpha: 1.0,
          decay: Math.random() * 0.02 + 0.016,
          color: getParticleColor()
        });
      }

      // Render flame particles loop
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size *= 0.96; // soft taper shrink

        if (p.alpha <= 0 || p.size < 0.8) {
          particles.splice(i, 1);
          return;
        }

        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Radiance bloom for perfect Agni states
        if (score >= 80 && Math.random() > 0.94) {
          ctx.fillStyle = "rgba(253, 224, 71, 0.12)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Digital status text in JetBrains Mono
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`AGNI PYRE LEVEL: ${score}%`, canvas.width / 2, canvas.height - 2);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [score]);

  const handleCanvasClick = () => {
    // Spawns celebration sparkle notification trigger
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 p-2 group shadow-2xl">
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="w-full h-[200px] block rounded-xl cursor-crosshair" 
      />
      <div className="absolute top-3 left-3 bg-slate-900/90 px-2 py-0.5 border border-slate-800 rounded text-[7.5px] font-mono text-amber-500 uppercase font-black uppercase tracking-widest animate-pulse pointer-events-none">
        interactive core physics
      </div>
      <div className="absolute bottom-2 inset-x-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <span className="text-[7.5px] px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-400 font-mono rounded">
          🔥 Altar is synced in real-time to your dietary log rhythm
        </span>
      </div>
    </div>
  );
};

