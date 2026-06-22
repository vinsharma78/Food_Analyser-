/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  Upload, 
  ChefHat, 
  Home, 
  Store, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Search,
  PieChart,
  IndianRupee,
  Activity,
  Zap,
  Leaf,
  Droplets,
  HeartPulse,
  User,
  History,
  Save,
  Plus,
  Trash2,
  Edit2,
  MapPin,
  LogOut,
  ChevronRight,
  X,
  Clock,
  Flame,
  Smartphone,
  Navigation,
  Share2,
  TrendingUp,
  Compass,
  Radio,
  Bell,
  Download,
  CheckCircle,
  Volume2
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { 
  analyzeFoodImage, 
  refineAnalysis, 
  estimateIngredient,
  searchRestaurantPrice 
} from "./services/geminiService";
import { FoodAnalysis, UserMode, Ingredient, UserProfile, MealLog } from "./types";
import { cn } from "./lib/utils";
import SutraAILab from "./components/SutraAILab";

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

// Firestore Error Handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends (React.Component as any) {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle size={64} className="text-red-500 mb-6" />
          <h1 className="text-3xl font-black tracking-tighter mb-4 uppercase">Application Error</h1>
          <p className="text-[#9E9E9E] font-bold max-w-md mb-8">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-[#5E2B97] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:scale-105 transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const Logo = ({ size = 48, className }: { size?: number; className?: string }) => (
  <div 
    className={cn("flex items-center justify-center", className)} 
    style={{ width: size, height: size }}
  >
    <img 
      src="/branding/MetaboSutra%20Logo.png" 
      alt="MetaboSutra Logo" 
      className="w-full h-full object-contain"
      style={{ 
        filter: 'drop-shadow(0 0 12px rgba(255, 122, 0, 0.5)) drop-shadow(0 0 4px rgba(94, 43, 151, 0.4))'
      }}
      referrerPolicy="no-referrer"
    />
  </div>
);

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] bg-[#FDFCFB] flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Logo size={180} />
        </motion.div>
        
        <div className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl font-black tracking-tighter leading-none flex items-center justify-center gap-4"
          >
            <span className="text-[#FF7A00]">Metabo</span>
            <span className="text-[#5E2B97]">Sutra</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="text-[12px] font-bold tracking-tight mt-1 text-[#1A1A1A] w-full text-center"
          >
            Visual Nutrition Intel
          </motion.p>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "200px" }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="absolute bottom-20 h-[2px] bg-gradient-to-r from-[#5E2B97] to-[#FF7A00] opacity-20"
      />
    </motion.div>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<UserMode>("home");
  
  // Firebase State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<MealLog[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mealType, setMealType] = useState<MealLog["meal_type"]>("lunch");
  const [restaurantName, setRestaurantName] = useState("");
  const [consumptionTime, setConsumptionTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [isEditingDishName, setIsEditingDishName] = useState(false);
  const [editedDishName, setEditedDishName] = useState("");
  const [isSearchingPrice, setIsSearchingPrice] = useState(false);
  const [restaurantPriceInfo, setRestaurantPriceInfo] = useState<{ price: number; currency: string; source: string } | null>(null);
  const [scenario, setScenario] = useState<"info" | "consume">("consume");
  const [consumptionStatus, setConsumptionStatus] = useState<"now" | "already" | "planned">("now");
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'ayurveda' | 'cost' | 'diagnostic'>('overview');
  
  // New State for History Features
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMealType, setFilterMealType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'date' | 'calories' | 'cost'>('date');
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null);
  const [showDailySummary, setShowDailySummary] = useState(false);

  // New State for Reflection Mode
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [moodBefore, setMoodBefore] = useState("");
  const [moodAfter, setMoodAfter] = useState("");
  const [hungerRating, setHungerRating] = useState(5);
  const [satietyRating, setSatietyRating] = useState(5);
  const [enjoymentRating, setEnjoymentRating] = useState(5);
  const [pendingMealToLog, setPendingMealToLog] = useState<MealLog | null>(null);

  // New State for Bill Processing
  const [isProcessingBill, setIsProcessingBill] = useState(false);

  // MetaboSutra Core Dashboard Extensions
  const [currentMainTab, setCurrentMainTab] = useState<'tracker' | 'dashboard' | 'sutra_lab'>('tracker');
  const [portionSize, setPortionSize] = useState<number>(1.0);
  const [isShared, setIsShared] = useState<boolean>(false);
  const [location, setLocation] = useState<string>("");
  const [dashboardScope, setDashboardScope] = useState<'day' | 'week' | 'month' | '6month' | 'year'>('day');

  // External Health Integrations (Google Fit, Apple Health, Fittelo) persistance
  const [googleFitConnected, setGoogleFitConnected] = useState<boolean>(() => {
    return localStorage.getItem("google_fit_connected") === "true";
  });
  const [appleHealthConnected, setAppleHealthConnected] = useState<boolean>(() => {
    return localStorage.getItem("apple_health_connected") === "true";
  });
  const [fitteloConnected, setFitteloConnected] = useState<boolean>(() => {
    return localStorage.getItem("fittelo_connected") === "true";
  });
  const [burnedCaloriesFit, setBurnedCaloriesFit] = useState<number>(() => {
    return Number(localStorage.getItem("burned_calories_fit") || "0");
  });
  const [weightFit, setWeightFit] = useState<number>(() => {
    return Number(localStorage.getItem("weight_fit") || "72.4");
  });
  const [bodyFatFit, setBodyFatFit] = useState<number>(() => {
    return Number(localStorage.getItem("body_fat_fit") || "16.5");
  });
  const [muscleMassFit, setMuscleMassFit] = useState<number>(() => {
    return Number(localStorage.getItem("muscle_mass_fit") || "42.1");
  });
  const [isSyncingApps, setIsSyncingApps] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem("last_sync_time");
  });

  // —————————————————————————————————————————————————————————————————
  // Water Tracking, Goal Notifications & Export State / Functions
  // —————————————————————————————————————————————————————————————————
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [waterGoal, setWaterGoal] = useState<number>(() => {
    return Number(localStorage.getItem("water_goal") || "2500");
  });
  const [showWaterReminder, setShowWaterReminder] = useState<boolean>(() => {
    return localStorage.getItem("water_reminder_enabled") === "true";
  });
  const [waterReminderInterval, setWaterReminderInterval] = useState<number>(() => {
    return Number(localStorage.getItem("water_reminder_interval") || "60");
  });
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; type: 'success' | 'alert' | 'goal' }[]>([]);

  // Sound Synth Chime
  const playChime = (type: 'goal' | 'reminder' | 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'goal') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'reminder') {
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.18); // C#5
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Audio Context not permitted or blocked:", e);
    }
  };

  // Trigger goal achievement notifications
  const triggerGoalNotification = (title: string, message: string, type: 'success' | 'alert' | 'goal' = 'goal') => {
    const id = Math.random().toString(36).substring(2);
    setNotifications(prev => [...prev, { id, title, message, type }]);
    playChime(type === 'goal' ? 'goal' : type === 'success' ? 'success' : 'reminder');
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Water calculations
  const getTodayWaterTotal = () => {
    const todayStr = new Date().toDateString();
    return waterLogs
      .filter((log) => new Date(log.timestamp).toDateString() === todayStr)
      .reduce((sum, log) => sum + Number(log.amount_ml || 0), 0);
  };

  const logWater = async (amountMl: number) => {
    const timestampStr = new Date().toISOString();
    const todayTotalBefore = getTodayWaterTotal();
    const todayTotalAfter = todayTotalBefore + amountMl;

    if (user) {
      const path = "water_logs";
      try {
        await addDoc(collection(db, "water_logs"), {
          userId: user.uid,
          timestamp: timestampStr,
          amount_ml: amountMl
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const newLog = { 
        id: "local_" + Math.random().toString(36).substring(2), 
        userId: "guest", 
        timestamp: timestampStr, 
        amount_ml: amountMl 
      };
      const updated = [...waterLogs, newLog];
      setWaterLogs(updated);
      localStorage.setItem("guest_water_logs", JSON.stringify(updated));
    }

    if (todayTotalBefore < waterGoal && todayTotalAfter >= waterGoal) {
      triggerGoalNotification("💧 Hydration Target Achieved!", `Amazing job! You hit your daily limit of ${waterGoal}ml of water!`, 'goal');
    } else {
      triggerGoalNotification("💧 Water Logged", `Injected +${amountMl}ml of hydration. Total today is ${todayTotalAfter}ml.`, 'success');
    }
  };

  const deleteWaterLog = async (logId: string) => {
    if (user) {
      const path = "water_logs";
      try {
        await deleteDoc(doc(db, "water_logs", logId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      const updated = waterLogs.filter(log => log.id !== logId);
      setWaterLogs(updated);
      localStorage.setItem("guest_water_logs", JSON.stringify(updated));
    }
    triggerGoalNotification("💧 Log Deleted", "Intake log has been successfully deleted.", 'success');
  };

  const clearTodayWater = async () => {
    const todayStr = new Date().toDateString();
    const todayLogs = waterLogs.filter(log => new Date(log.timestamp).toDateString() === todayStr);
    
    if (user) {
      const path = "water_logs";
      try {
        await Promise.all(todayLogs.map(log => deleteDoc(doc(db, "water_logs", log.id))));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      const updated = waterLogs.filter(log => new Date(log.timestamp).toDateString() !== todayStr);
      setWaterLogs(updated);
      localStorage.setItem("guest_water_logs", JSON.stringify(updated));
    }
    triggerGoalNotification("💧 Water Reset", "Your hydration progress for today has been reset.", 'alert');
  };

  // Water Log sync effect
  useEffect(() => {
    if (!user) {
      const localLogs = JSON.parse(localStorage.getItem("guest_water_logs") || "[]");
      setWaterLogs(localLogs);
      return;
    }
    let unsubscribeWater: (() => void) | null = null;
    const path = "water_logs";
    try {
      const q = query(
        collection(db, "water_logs"),
        where("userId", "==", user.uid)
      );
      unsubscribeWater = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWaterLogs(logs);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      });
    } catch (e) {
      console.error(e);
    }
    return () => {
      if (unsubscribeWater) unsubscribeWater();
    };
  }, [user]);

  // Periodic stay-hydrated timer reminder effect
  useEffect(() => {
    if (!showWaterReminder) return;
    const intervalMs = waterReminderInterval * 60 * 1000;
    const interval = setInterval(() => {
      const hr = new Date().getHours();
      // Only remind between 8 AM and 10 PM to avoid disturbing sleep
      if (hr >= 8 && hr <= 22) {
        triggerGoalNotification(
          "💧 Stay Hydrated!", 
          `Time to log water! You reached ${getTodayWaterTotal()}ml of your ${waterGoal}ml daily target.`, 
          'alert'
        );
      }
    }, intervalMs);
    
    return () => clearInterval(interval);
  }, [showWaterReminder, waterReminderInterval, waterGoal, waterLogs]);

  // Export & Sharing Helpers
  const handleExportCSV = () => {
    try {
      const dataToExport = filteredHistory.length > 0 ? filteredHistory : history;
      if (dataToExport.length === 0) {
        triggerGoalNotification("Export Alert", "No meal history logs found to export.", 'alert');
        return;
      }
      const headers = ["Date", "Meal Type", "Dish Name", "Restaurant", "Calories (kcal)", "Protein (g)", "Carbs (g)", "Fat (g)", "Total Cost (INR)"];
      const rows = dataToExport.map(meal => [
        new Date(meal.timestamp).toLocaleDateString(),
        meal.meal_type,
        `"${meal.dish_name.replace(/"/g, '""')}"`,
        `"${(meal.restaurant_name || '').replace(/"/g, '""')}"`,
        meal.calories,
        meal.protein,
        meal.carbs,
        meal.fat,
        (meal.actual_price || meal.total_cost).toFixed(2)
      ]);
      const csvStr = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `metabosutra_analytics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerGoalNotification("📥 Export Success", "Meal history data successfully downloaded as CSV!", 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportJSON = () => {
    try {
      const dataToExport = filteredHistory.length > 0 ? filteredHistory : history;
      if (dataToExport.length === 0) {
        triggerGoalNotification("Export Alert", "No meal history logs found to export.", 'alert');
        return;
      }
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `metabosutra_analytics_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerGoalNotification("📥 Export Success", "Meal logs successfully downloaded as JSON!", 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareClipboard = () => {
    try {
      const todayKcal = getDailyTotals().calories;
      const baseGoal = profile?.daily_calorie_goal || 2000;
      const todayWater = getTodayWaterTotal();
      
      let digest = `📊 METABOSUTRA DAILY METABOLIC TELEMETRY\n`;
      digest += `📅 Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}\n`;
      digest += `-----------------------------------------------\n`;
      digest += `🔥 Energy Burn Index: ${todayKcal} / ${baseGoal} kcal (${Math.round((todayKcal / baseGoal) * 100)}%)\n`;
      digest += `💧 Fluid Hydration Status: ${todayWater} / ${waterGoal} ml (${Math.round((todayWater / waterGoal) * 100)}%)\n`;
      digest += `-----------------------------------------------\n`;
      
      const loggedToday = history.filter(meal => {
        const todayStr = new Date().toDateString();
        return new Date(meal.timestamp).toDateString() === todayStr;
      });
      
      if (loggedToday.length > 0) {
        digest += `🍽️ Logged Intake:\n`;
        loggedToday.forEach(m => {
          digest += ` - [${m.meal_type.toUpperCase()}] ${m.dish_name} | ${m.calories} kcal | ₹${(m.actual_price || m.total_cost).toFixed(0)}\n`;
        });
      } else {
        digest += `📝 No dietary logs recorded today yet.\n`;
      }
      digest += `-----------------------------------------------\n`;
      digest += `🌱 Synthesized using MetaboSutra — Visual Nutrition AI`;
      
      navigator.clipboard.writeText(digest);
      triggerGoalNotification("📋 Captured to Clipboard", "Your formatted daily telemetry digest has been copied! Ready to share via Whatsapp, email or messages.", 'success');
    } catch (e) {
      console.error(e);
      triggerGoalNotification("Clipboard Error", "Could not copy automatically. Check permissions.", 'alert');
    }
  };

  // Auth Listener
  useEffect(() => {
    let unsubscribeHistory: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubscribeHistory) {
        unsubscribeHistory();
        unsubscribeHistory = null;
      }
      if (u) {
        fetchProfile(u.uid);
        unsubscribeHistory = fetchHistory(u.uid);
      } else {
        setProfile(null);
        setHistory([]);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);

  const fetchProfile = async (uid: string) => {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Initialize default user profile state so form bindings are always complete
        setProfile({
          userId: uid,
          weight_kg: 70,
          height_cm: 170,
          age: 30,
          gender: "male",
          activity_level: "sedentary",
          daily_calorie_goal: 2000
        });
        setShowProfileModal(true);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const fetchHistory = (uid: string) => {
    const path = "meals";
    const q = query(
      collection(db, "meals"), 
      where("userId", "==", uid),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealLog));
      setHistory(meals);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    reset();
  };

  const calculateGoal = (p: Omit<UserProfile, "userId" | "daily_calorie_goal">) => {
    // Mifflin-St Jeor Equation
    let bmr = (10 * p.weight_kg) + (6.25 * p.height_cm) - (5 * p.age);
    if (p.gender === "male") bmr += 5;
    else if (p.gender === "female") bmr -= 161;

    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    return Math.round(bmr * multipliers[p.activity_level]);
  };

  const saveProfile = async (p?: any) => {
    if (!user) return;
    
    // Check if we received a valid profile object as param (not a Event), or fallback to the `profile` state
    let data: Omit<UserProfile, "userId" | "daily_calorie_goal">;
    
    if (p && typeof p === "object" && "weight_kg" in p) {
      data = p;
    } else if (profile) {
      data = {
        weight_kg: Number(profile.weight_kg) || 70,
        height_cm: Number(profile.height_cm) || 170,
        age: Number(profile.age) || 30,
        gender: profile.gender || "male",
        activity_level: profile.activity_level || "sedentary"
      };
    } else {
      // Create safe defaults if no profile is in state
      data = {
        weight_kg: 70,
        height_cm: 170,
        age: 30,
        gender: "male",
        activity_level: "sedentary"
      };
    }

    const path = `users/${user.uid}`;
    try {
      const daily_calorie_goal = calculateGoal(data);
      const newProfile: UserProfile = {
        userId: user.uid,
        weight_kg: Number(data.weight_kg),
        height_cm: Number(data.height_cm),
        age: Math.round(Number(data.age)),
        gender: data.gender,
        activity_level: data.activity_level,
        daily_calorie_goal
      };

      await setDoc(doc(db, "users", user.uid), newProfile);
      setProfile(newProfile);
      setShowProfileModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const logMeal = async () => {
    if (!user) return;
    const path = "meals";
    
    try {
      let mealToSave: MealLog;

      if (pendingMealToLog) {
        // If we have a pending meal from the reflection modal, use it and update with current ratings
        mealToSave = {
          ...pendingMealToLog,
          mood_before: moodBefore,
          mood_after: moodAfter,
          hunger_rating: hungerRating,
          satiety_rating: satietyRating,
          enjoyment_rating: enjoymentRating
        };
      } else {
        // Normal logging flow (e.g. from "info" scenario or direct log)
        if (!analysis) return;

        let finalTime = consumptionTime;
        if (consumptionStatus === "now") {
          finalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        const now = new Date();
        const [hours, minutes] = finalTime.split(':');
        const offsetDays = (analysis.predicted_intent?.ascertained_date_offset_days || 0);
        const mealDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, parseInt(hours), parseInt(minutes));
        
        mealToSave = {
          userId: user.uid,
          timestamp: mealDate.toISOString(),
          meal_type: mealType,
          dish_name: analysis.dish_name,
          calories: Math.round(analysis.nutrition.calories_kcal * portionSize),
          protein: Number((analysis.nutrition.protein_g * portionSize).toFixed(1)),
          carbs: Number((analysis.nutrition.carbs_g * portionSize).toFixed(1)),
          fat: Number((analysis.nutrition.fat_g * portionSize).toFixed(1)),
          total_cost: Number((analysis.cost.total_cost * portionSize).toFixed(2)),
          restaurant_name: mode === "restaurant" ? restaurantName : undefined,
          mood_before: moodBefore,
          mood_after: moodAfter,
          hunger_rating: hungerRating,
          satiety_rating: satietyRating,
          enjoyment_rating: enjoymentRating,
          actual_price: restaurantPriceInfo?.price,
          location: location || undefined,
          portion_size: portionSize,
          is_shared: isShared
        };

        // If it's a "consume" scenario and we haven't shown reflection yet, do it now
        if (scenario === "consume" && !showReflectionModal) {
          setPendingMealToLog(mealToSave);
          setShowReflectionModal(true);
          return;
        }
      }

      if (editingMeal?.id) {
        await setDoc(doc(db, "meals", editingMeal.id), mealToSave);
        setEditingMeal(null);
      } else {
        await addDoc(collection(db, "meals"), mealToSave);
      }
      
      // Reset reflection state
      setMoodBefore("");
      setMoodAfter("");
      setHungerRating(5);
      setSatietyRating(5);
      setEnjoymentRating(5);
      setShowReflectionModal(false);
      setPendingMealToLog(null);
      
      // Clear analysis if not editing
      if (!editingMeal) {
        setAnalysis(null);
        setImage(null);
        setPortionSize(1.0);
        setIsShared(false);
        setLocation("");
      }

      // Check Calorie goals met or exceeded!
      const baseGoal = profile?.daily_calorie_goal || 2000;
      const todayKcalBefore = getDailyTotals().calories;
      const loggedKcal = mealToSave.calories;
      const todayKcalAfter = todayKcalBefore + loggedKcal;
      
      if (todayKcalBefore < baseGoal && todayKcalAfter >= baseGoal) {
        triggerGoalNotification(
          "🏆 Daily Calorie Target Met!", 
          `Congratulations! You've achieved your daily metabolic intake goal of ${baseGoal} kcal.`, 
          'goal'
        );
      } else {
        triggerGoalNotification(
          "🍽️ Meal Registered Successfully", 
          `Saved meal "${mealToSave.dish_name}" adding +${loggedKcal} kcal to today's count!`, 
          'success'
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !analysis) return;

    setIsProcessingBill(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await (await import("./services/geminiService")).processBillImage(base64);
        if (result) {
          // Find matching item or use total
          const matchingItem = result.items.find(item => 
            item.name.toLowerCase().includes(analysis.dish_name.toLowerCase()) ||
            analysis.dish_name.toLowerCase().includes(item.name.toLowerCase())
          );
          
          if (matchingItem) {
            setRestaurantPriceInfo({ price: matchingItem.price, currency: "INR", source: "Uploaded Bill" });
          } else {
            setRestaurantPriceInfo({ price: result.total, currency: "INR", source: "Uploaded Bill (Total)" });
          }
          alert("Bill processed! Price updated.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error processing bill:", err);
      setError("Failed to process bill image.");
    } finally {
      setIsProcessingBill(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    if (!user) return;
    const path = `meals/${mealId}`;
    try {
      await deleteDoc(doc(db, "meals", mealId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const getDailyTotals = () => {
    const today = new Date().toISOString().split('T')[0];
    return history
      .filter(meal => meal.timestamp.startsWith(today))
      .reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const updateIngredient = (index: number, updates: Partial<Ingredient>) => {
    if (!analysis) return;
    const newIngredients = [...analysis.ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    
    // Recalculate cost if weight or unit cost changed
    if (updates.weight_g !== undefined || updates.unit_cost_per_kg !== undefined || updates.name !== undefined) {
      const ing = newIngredients[index];
      ing.cost_inr = (ing.weight_g / 1000) * ing.unit_cost_per_kg;
    }

    // Recalculate totals
    const ingredient_cost_total = newIngredients.reduce((sum, ing) => sum + ing.cost_inr, 0);
    const overhead_cost = mode === "restaurant" ? ingredient_cost_total * 0.6 : 0;
    const total_cost = ingredient_cost_total + overhead_cost;

    setAnalysis({
      ...analysis,
      ingredients: newIngredients,
      cost: {
        ingredient_cost_total,
        overhead_cost,
        total_cost
      }
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  } as any);

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeFoodImage(image, mode, consumptionTime);
      setAnalysis(result);
      setEditedDishName(result.dish_name);

      // Reset portion & sharing slider controls
      setPortionSize(1.0);
      setIsShared(false);

      // Process predicted user ingestion intent
      if (result.predicted_intent) {
        setScenario(result.predicted_intent.scenario);
        setConsumptionStatus(result.predicted_intent.consumption_status);
        setConsumptionTime(result.predicted_intent.ascertained_time);
      }

      // Automatically determine user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude.toFixed(3);
            const lon = position.coords.longitude.toFixed(3);
            setLocation(`Lat ${lat}, Lon ${lon}`);
          },
          () => {
            setLocation("Mumbai, MH");
          }
        );
      } else {
        setLocation("Mumbai, MH");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!analysis || !editedDishName || editedDishName === analysis.dish_name) {
      setIsEditingDishName(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await refineAnalysis(analysis, editedDishName, mode, consumptionTime);
      setAnalysis(result);
      setIsEditingDishName(false);
      setRestaurantPriceInfo(null); // Reset price info on dish change
    } catch (err: any) {
      console.error(err);
      setError("Failed to refine analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPrice = async () => {
    if (!analysis || !restaurantName.trim()) return;
    setIsSearchingPrice(true);
    try {
      const info = await searchRestaurantPrice(analysis.dish_name, restaurantName);
      setRestaurantPriceInfo(info);
    } catch (err) {
      console.error("Error searching price:", err);
    } finally {
      setIsSearchingPrice(false);
    }
  };

  const addIngredientWithAI = async (name: string) => {
    if (!analysis || !name) return;
    setLoading(true);
    try {
      const newIng = await estimateIngredient(analysis.dish_name, name, analysis.ingredients);
      setAnalysis({ ...analysis, ingredients: [...analysis.ingredients, newIng] });
    } catch (err) {
      console.error(err);
      // Fallback to manual if AI fails
      const manualIng: Ingredient = {
        name,
        weight_g: 0,
        cost_inr: 0,
        unit_cost_per_kg: 0,
        is_hidden: false,
      };
      setAnalysis({ ...analysis, ingredients: [...analysis.ingredients, manualIng] });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setError(null);
  };

  const filteredHistory = history
    .filter((meal) => {
      const matchesSearch = meal.dish_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (meal.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterMealType === "all" || meal.meal_type === filterMealType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (sortBy === 'calories') return b.calories - a.calories;
      if (sortBy === 'cost') return (b.actual_price || b.total_cost) - (a.actual_price || a.total_cost);
      return 0;
    });

  const toggleMealSelection = (id: string) => {
    setSelectedMealIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleEditMeal = (meal: MealLog) => {
    setEditingMeal(meal);
    setAnalysis({
      dish_name: meal.dish_name,
      cuisine: "Unknown",
      nutrition: {
        calories_kcal: meal.calories,
        protein_g: meal.protein,
        carbs_g: meal.carbs,
        fat_g: meal.fat
      },
      cost: {
        ingredient_cost_total: meal.total_cost * 0.6,
        overhead_cost: meal.total_cost * 0.4,
        total_cost: meal.total_cost
      },
      ingredients: [],
      nutritional_insights: [],
      ayurvedic_analysis: {
        dosha_scores: { vata: 0, pitta: 0, kapha: 0 },
        blood_effect: "",
        body_effect: "",
        guna: "",
        excess_impact: ""
      },
      time_based_impact: {
        meal_time: "",
        glycemic_impact: "",
        metabolic_advice: "",
        circadian_relevance: "",
        best_time_to_consume: ""
      },
      micronutrients: [],
      chronic_condition_flags: [],
      allergens: [],
      portion_estimation_method: "Manual Edit",
      nutri_score: "C",
      estimation_uncertainty: "low"
    });
    setMealType(meal.meal_type);
    setRestaurantName(meal.restaurant_name || "");
    setConsumptionTime(new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    setShowHistory(false);
  };

  const bulkDeleteMeals = async () => {
    if (!user || selectedMealIds.length === 0) return;
    const path = "meals";
    
    try {
      await Promise.all(selectedMealIds.map(id => deleteDoc(doc(db, "meals", id))));
      setSelectedMealIds([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const renderHistoryModal = () => {
    if (!showHistory) return null;

    const groupedHistory: Record<string, MealLog[]> = {};
    filteredHistory.forEach((meal) => {
      const date = new Date(meal.timestamp).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
      if (!groupedHistory[date]) groupedHistory[date] = [];
      groupedHistory[date].push(meal);
    });

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistory(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-[#F5F5F5] flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FDFCFB] rounded-2xl flex items-center justify-center text-[#5E2B97] shadow-sm border border-[#EEEEEE]">
                  <History size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">Meal History</h2>
                  <p className="text-[#9E9E9E] font-bold uppercase text-[9px] tracking-widest">Track your metabolic journey</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {selectedMealIds.length > 0 && (
                  <button 
                    onClick={bulkDeleteMeals}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={14} /> Delete ({selectedMealIds.length})
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-[#F5F5F5] rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="p-8 bg-[#FAFAFA] border-b border-[#EEEEEE] space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={18} />
                  <input 
                    type="text"
                    placeholder="Search dishes or restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border-2 border-transparent focus:border-[#5E2B97] rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={filterMealType}
                    onChange={(e) => setFilterMealType(e.target.value)}
                    className="bg-white border-2 border-transparent focus:border-[#5E2B97] rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all shadow-sm appearance-none min-w-[140px]"
                  >
                    <option value="all">All Meals</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border-2 border-transparent focus:border-[#5E2B97] rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all shadow-sm appearance-none min-w-[140px]"
                  >
                    <option value="date">Newest First</option>
                    <option value="calories">Highest Calories</option>
                    <option value="cost">Highest Cost</option>
                  </select>
                </div>
              </div>

              {/* Data Export Action Bars */}
              <div className="pt-4 border-t border-dashed border-[#EEEEEE] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#9E9E9E]">Active Portability Tools:</p>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    id="history-export-csv"
                    onClick={handleExportCSV}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#EEEEEE] hover:border-purple-300 hover:bg-purple-50 text-[10px] font-black uppercase text-purple-950 tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    <Download size={12} /> Export CSV {filteredHistory.length > 0 && `(${filteredHistory.length})`}
                  </button>
                  <button
                    id="history-export-json"
                    onClick={handleExportJSON}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-[#EEEEEE] hover:border-purple-300 hover:bg-purple-50 text-[10px] font-black uppercase text-purple-950 tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    <Download size={12} /> Export JSON
                  </button>
                  <button
                    id="history-share-digest"
                    onClick={handleShareClipboard}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1A1A1A] hover:bg-black text-[10px] font-black uppercase text-white tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <Share2 size={12} /> Copy Daily Digest
                  </button>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {Object.keys(groupedHistory).length > 0 ? (
                (Object.entries(groupedHistory) as [string, MealLog[]][]).map(([date, meals]) => (
                  <div key={date} className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E9E9E] flex items-center gap-3">
                      <div className="h-[1px] flex-1 bg-[#EEEEEE]" />
                      {date}
                      <div className="h-[1px] flex-1 bg-[#EEEEEE]" />
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {meals.map((meal) => (
                        <div 
                          key={meal.id}
                          className={cn(
                            "group p-6 rounded-3xl border transition-all flex items-center gap-6",
                            selectedMealIds.includes(meal.id!) ? "bg-purple-50 border-purple-200" : "bg-white border-[#EEEEEE] hover:border-[#5E2B97] hover:shadow-xl hover:shadow-purple-500/5"
                          )}
                        >
                          <button 
                            onClick={() => toggleMealSelection(meal.id!)}
                            className={cn(
                              "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                              selectedMealIds.includes(meal.id!) ? "bg-[#5E2B97] border-[#5E2B97] text-white" : "border-[#EEEEEE] bg-white"
                            )}
                          >
                            {selectedMealIds.includes(meal.id!) && <Plus size={14} className="rotate-45" />}
                          </button>

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                            <div className="md:col-span-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">{meal.meal_type}</p>
                              <h4 className="text-lg font-black tracking-tight leading-tight">{meal.dish_name}</h4>
                              {meal.restaurant_name && (
                                <p className="text-[10px] font-bold text-[#5E2B97] flex items-center gap-1 mt-1">
                                  <Store size={10} /> {meal.restaurant_name}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-8">
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Energy</p>
                                <p className="text-sm font-black">{meal.calories}<span className="text-[8px] ml-0.5 opacity-40">kcal</span></p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Protein</p>
                                <p className="text-sm font-black">{meal.protein}<span className="text-[8px] ml-0.5 opacity-40">g</span></p>
                              </div>
                            </div>

                            <div className="flex gap-8">
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Mood</p>
                                <p className="text-[10px] font-bold">{meal.mood_after || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Cost</p>
                                <p className="text-sm font-black">₹{(meal.actual_price || meal.total_cost).toFixed(0)}</p>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleEditMeal(meal)}
                                className="p-3 bg-[#F8F8F8] text-[#9E9E9E] hover:text-[#5E2B97] hover:bg-white border border-transparent hover:border-[#EEEEEE] rounded-2xl transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => deleteMeal(meal.id!)}
                                className="p-3 bg-[#F8F8F8] text-[#9E9E9E] hover:text-red-500 hover:bg-white border border-transparent hover:border-[#EEEEEE] rounded-2xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-[#FDFCFB] rounded-2xl flex items-center justify-center text-[#D1D1D1] mb-4 border border-[#EEEEEE]">
                    <Search size={32} />
                  </div>
                  <p className="text-[#9E9E9E] font-bold uppercase text-[10px] tracking-widest">No matching meals found</p>
                </div>
              )}
            </div>

            {/* Daily Summary Footer */}
            <div className="p-8 bg-[#FDFCFB] border-t border-[#EEEEEE]">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black uppercase tracking-widest">Last 7 Days Summary</h4>
                <button 
                  onClick={() => setShowDailySummary(!showDailySummary)}
                  className="text-[10px] font-black uppercase tracking-widest text-[#5E2B97] hover:underline"
                >
                  {showDailySummary ? "Hide Details" : "Show Details"}
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-2 h-32 items-end">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dateStr = date.toISOString().split('T')[0];
                  const dayMeals = history.filter(m => m.timestamp.startsWith(dateStr));
                  const dayCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
                  const goal = profile?.daily_calorie_goal || 2000;
                  const height = Math.min((dayCalories / goal) * 100, 100);
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 group relative">
                      <div className="w-full bg-[#F5F5F5] rounded-t-xl relative overflow-hidden h-24">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          className={cn(
                            "absolute bottom-0 left-0 right-0 transition-all",
                            dayCalories > goal ? "bg-red-400" : "bg-[#5E2B97]"
                          )}
                        />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-tighter text-[#9E9E9E]">
                        {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white p-3 rounded-xl text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap shadow-xl">
                        <p className="uppercase tracking-widest mb-1">{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        <p className="text-xs font-black">{dayCalories} kcal</p>
                        <p className="opacity-60">{dayMeals.length} meals logged</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };

  const getAggregatedCalorieData = (): { label: string; Intake: number; Burned: number; Goal: number }[] => {
    const data: { label: string; Intake: number; Burned: number; Goal: number }[] = [];
    const now = new Date();
    const baseCalorieGoal = profile?.daily_calorie_goal || 2000;

    const getBurnedValue = (index: number) => {
      const activeBase = googleFitConnected ? burnedCaloriesFit : 0;
      const seed = Math.sin(index) * 60 + 380; // Standard daily burned seed: ~320 to 440 kcal
      return Math.round(activeBase > 0 ? activeBase + (index * 7 % 25) : seed);
    };

    if (dashboardScope === 'day') {
      // Past 7 Days (health style)
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        
        const mealsOnDay = history.filter(m => m.timestamp.split('T')[0] === dayStr);
        const totalIntake = mealsOnDay.reduce((sum, m) => sum + m.calories, 0);

        data.push({
          label,
          Intake: totalIntake,
          Burned: getBurnedValue(i),
          Goal: baseCalorieGoal
        });
      }
    } else if (dashboardScope === 'week') {
      // Past 4 Weeks
      for (let i = 3; i >= 0; i--) {
        const start = new Date();
        start.setDate(now.getDate() - (i * 7 + 6));
        const end = new Date();
        end.setDate(now.getDate() - (i * 7));
        
        const label = `Wk -${i}`;
        
        const mealsInInterval = history.filter(m => {
          const mDate = new Date(m.timestamp);
          return mDate >= start && mDate <= end;
        });
        const totalIntake = mealsInInterval.reduce((sum, m) => sum + m.calories, 0);
        const avgIntake = Math.round(totalIntake / 7);

        data.push({
          label,
          Intake: avgIntake,
          Burned: Math.round(getBurnedValue(i) * 1.05),
          Goal: baseCalorieGoal
        });
      }
    } else if (dashboardScope === 'month') {
      // Past 6 Months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const label = d.toLocaleDateString([], { month: 'short' });
        const monthNum = d.getMonth();
        const yearNum = d.getFullYear();

        const mealsInMonth = history.filter(m => {
          const mDate = new Date(m.timestamp);
          return mDate.getMonth() === monthNum && mDate.getFullYear() === yearNum;
        });
        const totalIntake = mealsInMonth.reduce((sum, m) => sum + m.calories, 0);
        const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate();
        const avgIntake = Math.round(totalIntake / daysInMonth);

        data.push({
          label,
          Intake: avgIntake,
          Burned: Math.round(getBurnedValue(i) * 1.1),
          Goal: baseCalorieGoal
        });
      }
    } else if (dashboardScope === '6month') {
      // Past 6 Months Total
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const label = d.toLocaleDateString([], { month: 'short' });
        const monthNum = d.getMonth();
        const yearNum = d.getFullYear();

        const mealsInMonth = history.filter(m => {
          const mDate = new Date(m.timestamp);
          return mDate.getMonth() === monthNum && mDate.getFullYear() === yearNum;
        });
        const totalIntake = mealsInMonth.reduce((sum, m) => sum + m.calories, 0);

        data.push({
          label,
          Intake: totalIntake,
          Burned: totalIntake > 0 ? getBurnedValue(i) * 30 : 0,
          Goal: baseCalorieGoal * 30
        });
      }
    } else if (dashboardScope === 'year') {
      // Past Year
      for (let i = 2; i >= 0; i--) {
        const d = new Date();
        d.setFullYear(now.getFullYear() - i);
        const label = d.getFullYear().toString();
        const yearNum = d.getFullYear();

        const mealsInYear = history.filter(m => {
          const mDate = new Date(m.timestamp);
          return mDate.getFullYear() === yearNum;
        });
        const totalIntake = mealsInYear.reduce((sum, m) => sum + m.calories, 0);

        data.push({
          label,
          Intake: totalIntake,
          Burned: totalIntake > 0 ? getBurnedValue(i) * 365 : 0,
          Goal: baseCalorieGoal * 365
        });
      }
    }

    return data;
  };

  const getBodyProgressData = () => {
    const data = [];
    const baseWeight = profile?.weight_kg || 73.0;
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString([], { weekday: 'short' });
      
      const weightBonus = googleFitConnected ? (weightFit - baseWeight) : 0;
      const weight = Number((baseWeight + weightBonus - (i * 0.1) + Math.cos(i) * 0.05).toFixed(1));
      const bodyFat = Number(( (googleFitConnected ? bodyFatFit : 16.5) - (i * 0.05) ).toFixed(1));
      const muscle = Number(( (googleFitConnected ? muscleMassFit : 42.1) + (i * 0.02) ).toFixed(1));
      
      data.push({
        label,
        Weight: weight,
        BodyFat: bodyFat,
        Muscle: muscle
      });
    }
    return data;
  };

  const handleForceSync = () => {
    setIsSyncingApps(true);
    setTimeout(() => {
      const syncedBurned = Math.round(340 + Math.random() * 110);
      const randomWeight = Number(( (profile?.weight_kg || 73.0) + (Math.random() * 0.4 - 0.2) ).toFixed(1));
      const randomFat = Number(( 15.6 + Math.random() * 1.0 ).toFixed(1));
      const randomMuscle = Number(( 41.9 + Math.random() * 0.7 ).toFixed(1));
      
      setBurnedCaloriesFit(syncedBurned);
      setWeightFit(randomWeight);
      setBodyFatFit(randomFat);
      setMuscleMassFit(randomMuscle);
      
      const syncStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(syncStamp);

      localStorage.setItem("google_fit_connected", googleFitConnected ? "true" : "false");
      localStorage.setItem("apple_health_connected", appleHealthConnected ? "true" : "false");
      localStorage.setItem("fittelo_connected", fitteloConnected ? "true" : "false");
      localStorage.setItem("burned_calories_fit", String(syncedBurned));
      localStorage.setItem("weight_fit", String(randomWeight));
      localStorage.setItem("body_fat_fit", String(randomFat));
      localStorage.setItem("muscle_mass_fit", String(randomMuscle));
      localStorage.setItem("last_sync_time", syncStamp);

      setIsSyncingApps(false);
    }, 1200);
  };

  const handleToggleFit = (app: 'google' | 'apple' | 'fittelo') => {
    if (app === 'google') {
      const next = !googleFitConnected;
      setGoogleFitConnected(next);
      localStorage.setItem("google_fit_connected", next ? "true" : "false");
      if (next) {
        setBurnedCaloriesFit(350);
        localStorage.setItem("burned_calories_fit", "350");
      }
    } else if (app === 'apple') {
      const next = !appleHealthConnected;
      setAppleHealthConnected(next);
      localStorage.setItem("apple_health_connected", next ? "true" : "false");
      if (next) {
        localStorage.setItem("burned_calories_fit", "280");
        setBurnedCaloriesFit(280);
      }
    } else if (app === 'fittelo') {
      const next = !fitteloConnected;
      setFitteloConnected(next);
      localStorage.setItem("fittelo_connected", next ? "true" : "false");
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#FF7A00] selection:text-white">

      {/* Dynamic Goal & Habit Achievements Toasts Overlay */}
      <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full flex flex-col gap-3 pointer-events-none px-4">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={cn(
                "p-5 rounded-2xl border shadow-xl flex gap-3 pointer-events-auto bg-white/95 backdrop-blur-md",
                notif.type === 'goal' 
                  ? "bg-[#111111]/95 text-white border-amber-500/20" 
                  : notif.type === 'alert'
                  ? "bg-[#FFF9F5]/95 border-orange-200 text-[#1A1A1A]"
                  : "bg-white border-[#EEEEEE] text-[#1A1A1A]"
              )}
            >
              <div className="flex-1">
                <h5 className={cn(
                  "text-[8px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5",
                  notif.type === 'goal' ? "text-amber-400" : notif.type === 'alert' ? "text-orange-500" : "text-blue-500"
                )}>
                  {notif.type === 'goal' ? "🏆 Goal Achieved" : notif.type === 'alert' ? "⚠️ Reminder Note" : "✨ System Sync"}
                </h5>
                <p className="text-xs font-black tracking-tight leading-tight">{notif.title}</p>
                <p className="text-[10px] leading-relaxed mt-1 text-[#9E9E9E]">{notif.message}</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-gray-400 hover:text-black dark:hover:text-white shrink-0 self-start text-xs p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#EEEEEE] px-4 py-3 md:px-8 md:py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Logo size={36} />
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tighter leading-none flex items-center">
                <span className="text-[#FF7A00]">Metabo</span>
                <span className="text-[#5E2B97]">Sutra</span>
              </h1>
              <div className="flex items-center mt-0.5">
                <p className="text-[8px] md:text-[10px] text-[#9E9E9E] font-bold tracking-tight whitespace-nowrap">Visual Nutrition Intel</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:flex bg-[#F5F5F5] p-1.5 rounded-xl border border-[#EEEEEE]">
              <button
                onClick={() => setMode("home")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all font-aptos",
                  mode === "home" ? "bg-white shadow-sm text-[#5E2B97]" : "text-[#9E9E9E] hover:text-[#5E2B97]"
                )}
              >
                <Home size={14} />
                Home
              </button>
              <button
                onClick={() => setMode("restaurant")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all font-aptos",
                  mode === "restaurant" ? "bg-white shadow-sm text-[#5E2B97]" : "text-[#9E9E9E] hover:text-[#5E2B97]"
                )}
              >
                <Store size={14} />
                Restaurant
              </button>
            </div>

            <div className="hidden md:block h-8 w-[1px] bg-[#EEEEEE]" />

            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={() => setShowHistory(true)}
                  className="p-2 text-[#9E9E9E] hover:text-[#5E2B97] transition-colors relative"
                >
                  <History size={18} className="md:w-5 md:h-5" />
                  {history.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF7A00] rounded-full border border-white" />
                  )}
                </button>
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[#F5F5F5] flex items-center justify-center overflow-hidden border border-[#EEEEEE] hover:border-[#FF7A00] transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={16} className="text-[#9E9E9E] md:w-5 md:h-5" />
                  )}
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-[#9E9E9E] hover:text-red-500 transition-colors"
                >
                  <LogOut size={18} className="md:w-5 md:h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-gradient-to-br from-[#5E2B97] to-[#FF7A00] text-white px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2"
              >
                <User size={12} className="md:w-3.5 md:h-3.5" /> Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Mode Tab Switcher */}
      {user && (
        <div className="sticky top-[61px] md:top-[81px] z-40 bg-white/95 backdrop-blur-md border-b border-[#EEEEEE] px-4 py-2 flex justify-center gap-4">
          <button
            onClick={() => setCurrentMainTab("tracker")}
            className={cn(
              "px-5 py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 font-aptos",
              currentMainTab === "tracker" 
                ? "bg-[#5E2B97] text-white shadow-xl shadow-purple-500/10 scale-105" 
                : "text-[#9E9E9E] hover:text-[#5E2B97] bg-transparent hover:bg-[#F5F5F5]"
            )}
          >
            📸 Diet Tracker
          </button>
          <button
            onClick={() => setCurrentMainTab("dashboard")}
            className={cn(
              "px-5 py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 font-aptos",
              currentMainTab === "dashboard" 
                ? "bg-[#5E2B97] text-white shadow-xl shadow-purple-500/10 scale-105" 
                : "text-[#9E9E9E] hover:text-[#5E2B97] bg-transparent hover:bg-[#F5F5F5]"
            )}
          >
            📊 Metabo Dashboard
          </button>
          <button
            onClick={() => setCurrentMainTab("sutra_lab")}
            className={cn(
              "px-5 py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 font-aptos",
              currentMainTab === "sutra_lab" 
                ? "bg-[#5E2B97] text-white shadow-xl shadow-purple-500/10 scale-105" 
                : "text-[#9E9E9E] hover:text-[#5E2B97] bg-transparent hover:bg-[#F5F5F5]"
            )}
          >
            🧬 Sutra AI Lab
          </button>
        </div>
      )}

      {/* Mobile Mode Switcher */}
      <div className="md:hidden sticky top-[61px] z-40 bg-white/80 backdrop-blur-md border-b border-[#EEEEEE] px-4 py-2 flex justify-center">
        <div className="bg-[#F5F5F5] p-1 rounded-lg border border-[#EEEEEE] flex w-full max-w-xs">
          <button
            onClick={() => setMode("home")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all font-aptos",
              mode === "home" ? "bg-white shadow-sm text-[#5E2B97]" : "text-[#9E9E9E]"
            )}
          >
            <Home size={12} />
            Home
          </button>
          <button
            onClick={() => setMode("restaurant")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all font-aptos",
              mode === "restaurant" ? "bg-white shadow-sm text-[#5E2B97]" : "text-[#9E9E9E]"
            )}
          >
            <Store size={12} />
            Restaurant
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-16">
        {currentMainTab === "tracker" || !user ? (
          <AnimatePresence mode="wait">
          {!image ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="max-w-3xl mx-auto"
            >
              <div className="text-center mb-8 md:mb-12">
                <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 leading-tight">
                  Visual Nutrition <br />
                  <span className="text-[#5E2B97]">Intelligence.</span>
                </h2>
                <p className="text-[#9E9E9E] max-w-md mx-auto font-bold uppercase text-[9px] md:text-[10px] tracking-widest px-4">
                  Decompose any dish into its core ingredients, 
                  nutritional macros, and market-accurate costs.
                </p>
              </div>

              <div
                {...getRootProps()}
                className={cn(
                  "relative aspect-square md:aspect-[16/9] rounded-[24px] md:rounded-[40px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 md:gap-6 group overflow-hidden",
                  isDragActive ? "border-[#1A1A1A] bg-[#F0F0F0]" : "border-[#D1D1D1] bg-white hover:border-[#1A1A1A] hover:shadow-2xl hover:shadow-black/5"
                )}
              >
                <input {...getInputProps()} />
                
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                <div className="relative z-10 w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-white border border-[#EEEEEE] flex items-center justify-center text-[#9E9E9E] group-hover:scale-110 group-hover:text-[#5E2B97] transition-all duration-500 shadow-sm">
                  <Upload size={32} className="md:w-10 md:h-10" strokeWidth={1.5} />
                </div>
                <div className="relative z-10 text-center px-4">
                  <p className="text-xl md:text-2xl font-black tracking-tight">Drop your food photo</p>
                  <p className="text-[#9E9E9E] font-bold mt-1 uppercase text-[9px] md:text-[10px] tracking-widest">or click to browse local files</p>
                </div>
                
                <div className="absolute bottom-6 md:bottom-8 flex items-center gap-2 md:gap-3 px-4 py-2 md:px-5 md:py-2.5 bg-white rounded-full border border-[#EEEEEE] text-[8px] md:text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] shadow-sm">
                  <Flame size={12} className="md:w-3.5 md:h-3.5 text-[#FF7A00]" fill="currentColor" />
                  Real-time Analysis Engine
                </div>
              </div>
              
              <div className="mt-8 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                {[
                  { icon: Search, title: "DETECT", desc: "Identifies dish & hidden components with Indian cuisine priors." },
                  { icon: Activity, title: "ANALYZE", desc: "Calculates precise macros, calories, and estimation uncertainty." },
                  { icon: IndianRupee, title: "TRACK", desc: "Estimates total cost based on current average market rates." }
                ].map((item, i) => (
                  <div key={i} className="group p-6 md:p-10 bg-white rounded-[24px] md:rounded-[40px] border border-[#EEEEEE] transition-all hover:shadow-2xl hover:shadow-purple-500/5 hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#F8F8F8] flex items-center justify-center mb-6 md:mb-8 group-hover:bg-[#5E2B97] group-hover:text-white transition-all duration-500">
                      <item.icon size={20} className="md:w-6 md:h-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-black tracking-[0.2em] text-[9px] md:text-[10px] mb-3 md:mb-4 text-[#9E9E9E]">{item.title}</h3>
                    <p className="text-xs md:text-sm text-[#1A1A1A] leading-relaxed font-bold">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Water Intake Section */}
              <div id="water-tracker-card" className="mt-12 bg-white rounded-[40px] border border-[#EEEEEE] p-8 md:p-12 shadow-sm relative overflow-hidden space-y-8">
                {/* Visual Background Accent */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50/40 rounded-full blur-3xl -z-10 pointer-events-none" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full text-[8px] font-black uppercase text-blue-600 tracking-widest mb-3">
                      <Droplets size={10} className="animate-bounce" /> Hydration Sync
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Daily Water Tracker</h3>
                    <p className="text-xs text-[#9E9E9E] mt-1 font-bold">Synchronize water logs with your health profile and keep reminders active.</p>
                  </div>

                  <div className="flex items-center gap-3 bg-[#F5F5F5] p-1.5 rounded-2xl border border-[#EEEEEE]">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#9E9E9E] px-2 block">Reminder Alerts</span>
                      <div className="flex items-center gap-2 mt-1 px-2 pb-1">
                        <button
                          id="water-reminder-toggle"
                          onClick={() => {
                            const next = !showWaterReminder;
                            setShowWaterReminder(next);
                            localStorage.setItem("water_reminder_enabled", String(next));
                            triggerGoalNotification(
                              next ? "🔔 Reminders Activated" : "🔕 Reminders Muted",
                              next 
                                ? `You will receive visual & audio hydration reminders every ${waterReminderInterval} minutes!`
                                : "Hydration reminder system has been disabled.",
                              'success'
                            );
                          }}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            showWaterReminder ? "bg-blue-600" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                              showWaterReminder ? "translate-x-4" : "translate-x-0"
                            )}
                          />
                        </button>
                        <span className="text-[10px] font-black text-black">
                          {showWaterReminder ? "ACTIVE" : "OFF"}
                        </span>
                      </div>
                    </div>
                    {showWaterReminder && (
                      <div className="border-l border-[#EEEEEE] pl-4 pr-2">
                        <span className="text-[8px] font-black uppercase tracking-wider text-[#9E9E9E] block mb-1">Interval</span>
                        <select
                          id="water-interval-dropdown"
                          value={waterReminderInterval}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setWaterReminderInterval(val);
                            localStorage.setItem("water_reminder_interval", String(val));
                            triggerGoalNotification(
                              "🔔 Reminder Shifted",
                              `Reminders scheduled for every ${val} minutes!`,
                              'success'
                            );
                          }}
                          className="bg-transparent text-xs font-black outline-none border-none py-0.5 text-[#1A1A1A]"
                        >
                          <option value="15">15 Min</option>
                          <option value="30">30 Min</option>
                          <option value="45">45 Min</option>
                          <option value="60">1 Hour</option>
                          <option value="90">1.5 Hr</option>
                          <option value="120">2 Hours</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Circle & Buttons of Quick Intake */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#FDFCFB] p-6 md:p-8 rounded-[32px] border border-[#EEEEEE]">
                  
                  {/* Progress Indicator Column */}
                  <div className="lg:col-span-5 flex flex-col md:flex-row items-center gap-6">
                    <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center rounded-full bg-[#FAFAFA] border border-[#EEEEEE] shadow-sm shrink-0">
                      {/* SVG progress bar wheel */}
                      <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          className="stroke-gray-100"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="50%"
                          cy="50%"
                          r="45%"
                          className="stroke-blue-500 transition-all duration-500"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray="282.7"
                          strokeDashoffset={282.7 * (1 - Math.min(getTodayWaterTotal() / waterGoal, 1))}
                        />
                      </svg>
                      
                      <div className="text-center z-10">
                        <p className="text-2xl md:text-3xl font-black text-blue-600 tracking-tighter">{getTodayWaterTotal()}</p>
                        <p className="text-[8px] font-black uppercase text-[#9E9E9E] tracking-widest mt-0.5">/ {waterGoal} ml</p>
                        <p className="text-[10px] uppercase font-black text-blue-400 tracking-wider">
                          {Math.round(Math.min((getTodayWaterTotal() / waterGoal) * 100, 100))}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-center md:text-left flex-1 min-w-0 w-full">
                      <p className="text-xs font-black uppercase tracking-wider text-[#9E9E9E]">Hydration Progress Today</p>
                      <h4 className="text-lg font-black tracking-tight uppercase">
                        {getTodayWaterTotal() >= waterGoal ? "🥳 Hydration Completed!" : "💦 Keep Sipping Water!"}
                      </h4>
                      <p className="text-xs leading-relaxed text-[#5E2B97] font-bold">
                        {getTodayWaterTotal() >= waterGoal 
                          ? "You've successfully fueled your metabolic cycle with pristine hydration today." 
                          : `You still need an outstanding ${Math.max(waterGoal - getTodayWaterTotal(), 0)}ml to finalize your baseline cell functions.`}
                      </p>
                      
                      {/* Water Goal input option inline */}
                      <div className="pt-2 flex items-center gap-2 justify-center md:justify-start">
                        <span className="text-[9px] font-black uppercase text-[#9E9E9E]">Target Goal:</span>
                        <input
                          id="water-target-goal-input"
                          type="number"
                          step="100"
                          min="500"
                          max="10000"
                          value={waterGoal}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 2500;
                            setWaterGoal(val);
                            localStorage.setItem("water_goal", String(val));
                          }}
                          className="bg-[#FAFAFA] border border-[#EEEEEE] text-xs font-semibold rounded px-2 py-0.5 w-20 text-center text-blue-600 outline-none focus:border-blue-500"
                        />
                        <span className="text-[9px] font-black text-[#9E9E9E]">ml</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick-Log Actions list and Manual Entry */}
                  <div className="lg:col-span-7 space-y-6">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] text-center lg:text-left">Quick Hydrate Logs</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { amount: 250, label: "💧 Glass", desc: "250 ml", color: "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600" },
                        { amount: 500, label: "🥤 Bottle", desc: "500 ml", color: "hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-600" },
                        { amount: 750, label: "🏺 Carafe", desc: "750 ml", color: "hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600" }
                      ].map((item, id) => (
                        <button
                          key={id}
                          id={`quick-water-${item.amount}`}
                          onClick={() => logWater(item.amount)}
                          className={cn(
                            "p-4 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] text-center transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer flex flex-col items-center justify-center gap-1",
                            item.color
                          )}
                        >
                          <p className="text-xs font-black uppercase tracking-wider">{item.label}</p>
                          <p className="text-[9px] font-bold text-[#9E9E9E]">{item.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Custom log input block */}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Log Custom Amount (ml)..."
                        id="custom-water-amount"
                        className="flex-1 bg-[#FAFAFA] border border-[#EEEEEE] rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 text-black"
                      />
                      <button
                        id="btn-log-custom-water"
                        onClick={() => {
                          const el = document.getElementById("custom-water-amount") as HTMLInputElement;
                          const val = Number(el?.value);
                          if (val && val > 0) {
                            logWater(val);
                            if (el) el.value = "";
                          }
                        }}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-xl uppercase tracking-widest transition-all"
                      >
                        + Log
                      </button>
                      <button
                        id="btn-clear-water"
                        onClick={clearTodayWater}
                        className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-[9px] font-black rounded-xl uppercase tracking-widest transition-all"
                      >
                        Reset Today
                      </button>
                    </div>
                  </div>

                </div>

                {/* List of Today's logs */}
                {waterLogs.filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString()).length > 0 && (
                  <div className="space-y-3 animation-fade-in">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#9E9E9E]">Today's Hydration Log Entries</p>
                    <div className="flex flex-wrap gap-2.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {waterLogs
                        .filter(log => new Date(log.timestamp).toDateString() === new Date().toDateString())
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-blue-50/50 border border-blue-100 text-[11px] font-black text-blue-950 rounded-xl"
                          >
                            <span>💦 {entry.amount_ml} ml</span>
                            <span className="text-[9px] text-[#9E9E9E] font-medium">
                              at {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              onClick={() => deleteWaterLog(entry.id!)}
                              className="p-1 hover:bg-blue-100 text-red-400 hover:text-red-500 rounded transition-colors ml-1 cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              {/* Left Column: Image & Controls */}
              <div className="lg:col-span-5 space-y-8">
                <div className="relative aspect-square rounded-[40px] overflow-hidden shadow-2xl border-4 border-white group">
                  <img src={image} alt="Food to analyze" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  
                  {/* Scanning Effect */}
                  {loading && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center text-white overflow-hidden">
                      <motion.div 
                        initial={{ top: "-10%" }}
                        animate={{ top: "110%" }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-[#5E2B97] to-[#FF7A00] shadow-[0_0_30px_#FF7A00] z-20"
                      />
                      <div className="relative mb-8">
                        <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />
                        <Logo size={80} className="relative z-10" />
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="absolute -inset-4 border-2 border-dashed border-orange-500/30 rounded-full"
                        />
                      </div>
                      <p className="font-black tracking-[0.4em] uppercase text-[10px] text-white">MetaboSutra Engine</p>
                      <p className="text-[8px] opacity-60 mt-3 font-black uppercase tracking-[0.2em] text-orange-400 animate-pulse">Analyzing Biomarkers & Scanning Nutrients...</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-white p-8 rounded-[40px] border border-[#EEEEEE] shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E9E9E] mb-6 flex items-center gap-2">
                      <Clock size={12} /> Analysis Scenario
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-8">
                      <button
                        onClick={() => setScenario("info")}
                        className={cn(
                          "px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          scenario === "info" ? "bg-[#4C1D95] text-white border-[#4C1D95]" : "bg-[#F8F8F8] text-[#9E9E9E] border-transparent hover:border-[#4C1D95]"
                        )}
                      >
                        Information Only
                      </button>
                      <button
                        onClick={() => setScenario("consume")}
                        className={cn(
                          "px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          scenario === "consume" ? "bg-[#4C1D95] text-white border-[#4C1D95]" : "bg-[#F8F8F8] text-[#9E9E9E] border-transparent hover:border-[#4C1D95]"
                        )}
                      >
                        Log Consumption
                      </button>
                    </div>

                    {scenario === "consume" && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-6 pt-6 border-t border-[#F5F5F5]"
                      >
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: "now", label: "Eating Now" },
                            { id: "already", label: "Already Eaten" },
                            { id: "planned", label: "To be Consumed" }
                          ].map((status) => (
                            <button
                              key={status.id}
                              onClick={() => {
                                setConsumptionStatus(status.id as any);
                                if (status.id === "now") {
                                  setConsumptionTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                                }
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                consumptionStatus === status.id ? "bg-[#FF6321] text-white border-[#FF6321]" : "bg-[#F8F8F8] text-[#9E9E9E] border-transparent hover:border-[#FF6321]"
                              )}
                            >
                              {status.label}
                            </button>
                          ))}
                        </div>

                        {consumptionStatus === "already" && (
                          <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#9E9E9E]">When did you eat?</label>
                            <input 
                              type="time"
                              value={consumptionTime}
                              onChange={(e) => setConsumptionTime(e.target.value)}
                              className="w-full bg-[#F8F8F8] border-2 border-transparent focus:border-[#FF6321] rounded-2xl px-6 py-4 text-lg font-black tracking-tighter outline-none transition-all"
                            />
                          </div>
                        )}

                        {consumptionStatus === "planned" && (
                          <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#9E9E9E]">Planned consumption time?</label>
                            <input 
                              type="time"
                              value={consumptionTime}
                              onChange={(e) => setConsumptionTime(e.target.value)}
                              className="w-full bg-[#F8F8F8] border-2 border-transparent focus:border-[#FF6321] rounded-2xl px-6 py-4 text-lg font-black tracking-tighter outline-none transition-all"
                            />
                            <p className="text-[8px] text-[#FF6321] font-bold uppercase tracking-widest">
                              * Remember to update the time if it changes!
                            </p>
                          </div>
                        )}

                        {consumptionStatus === "now" && (
                          <div className="p-4 bg-[#F8F8F8] rounded-2xl border border-[#EEEEEE] flex items-center gap-3">
                            <Clock size={16} className="text-[#FF6321]" />
                            <span className="text-xs font-black tracking-tight">Logging at current time: {consumptionTime}</span>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {scenario === "info" && (
                      <div className="pt-6 border-t border-[#F5F5F5]">
                        <p className="text-[10px] text-[#9E9E9E] italic font-medium leading-relaxed">
                          * In Information mode, we'll suggest the best time to consume this dish for maximum metabolic benefit.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="flex-1 bg-[#4C1D95] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#312E81] transition-all hover:shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    {analysis ? "Re-Analyze" : "Start Analysis"}
                  </button>
                  <button
                    onClick={reset}
                    disabled={loading}
                    className="px-8 py-5 rounded-2xl border-2 border-[#EEEEEE] font-black uppercase tracking-widest text-xs hover:bg-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-600"
                  >
                    <AlertCircle size={20} />
                    <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-7">
                {analysis ? (
                  <div className="space-y-6 md:space-y-10">
                    {/* Mobile Tab Navigation */}
                    <div className="md:hidden sticky top-20 z-40 bg-white/80 backdrop-blur-md -mx-4 px-4 py-3 border-b border-[#F5F5F5] mb-4">
                      <div className="flex overflow-x-auto no-scrollbar gap-2">
                        {[
                          { id: 'overview', label: 'Overview', icon: <Activity size={12} /> },
                          { id: 'diagnostic', label: 'Diagnostic', icon: <HeartPulse size={12} /> },
                          { id: 'insights', label: 'Insights', icon: <Zap size={12} /> },
                          { id: 'ayurveda', label: 'Ayurveda', icon: <Leaf size={12} /> },
                          { id: 'cost', label: 'Cost', icon: <IndianRupee size={12} /> }
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300",
                              activeTab === tab.id 
                                ? "bg-[#1A1A1A] text-white shadow-md scale-105" 
                                : "bg-[#F8F8F8] text-[#9E9E9E] hover:bg-[#EEEEEE]"
                            )}
                          >
                            {tab.icon}
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={cn("space-y-6 md:space-y-12", activeTab !== 'overview' && "hidden md:block")}>
                      {/* Header Info */}
                    <div className="bg-white p-5 md:p-12 rounded-[28px] md:rounded-[48px] shadow-sm md:shadow-2xl md:shadow-purple-500/5 border border-[#EEEEEE] relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 md:p-10 flex flex-col items-end gap-2">
                        <div className={cn(
                          "px-2.5 py-1 md:px-5 md:py-2 rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] md:tracking-[0.3em] border shadow-sm",
                          analysis.estimation_uncertainty === "low" ? "bg-green-50 text-green-700 border-green-100" :
                          analysis.estimation_uncertainty === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                          "bg-red-50 text-red-700 border-red-100"
                        )}>
                          {analysis.estimation_uncertainty}
                        </div>
                        <div className={cn(
                          "px-3 py-1 md:px-6 md:py-2.5 rounded-2xl text-xs md:text-xl font-black border shadow-lg flex items-center gap-2",
                          analysis.nutri_score === "A" ? "bg-green-500 text-white border-green-600" :
                          analysis.nutri_score === "B" ? "bg-green-400 text-white border-green-500" :
                          analysis.nutri_score === "C" ? "bg-yellow-400 text-white border-yellow-500" :
                          analysis.nutri_score === "D" ? "bg-orange-500 text-white border-orange-600" :
                          "bg-red-500 text-white border-red-600"
                        )}>
                          <span className="text-[8px] md:text-[10px] opacity-70 uppercase tracking-widest">Nutri-Score</span>
                          {analysis.nutri_score}
                        </div>
                      </div>

                      <div className="mb-4 md:mb-12">
                        <p className="text-[#9E9E9E] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[7px] md:text-[10px] mb-1.5 md:mb-4 flex items-center gap-1.5 md:gap-2">
                          <MapPin size={8} className="text-[#FF7A00] md:w-3 md:h-3" /> {analysis.cuisine}
                        </p>
                        <div className="group/title relative">
                          {isEditingDishName ? (
                            <div className="flex items-center gap-2 md:gap-4 w-full">
                              <input 
                                type="text"
                                value={editedDishName}
                                onChange={(e) => setEditedDishName(e.target.value)}
                                className="bg-[#F8F8F8] border-b-2 md:border-b-4 border-[#FF7A00] outline-none w-full py-2 px-3 md:py-4 md:px-8 rounded-lg md:rounded-3xl text-xl md:text-5xl font-black uppercase tracking-tighter"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRefine();
                                  if (e.key === 'Escape') {
                                    setIsEditingDishName(false);
                                    setEditedDishName(analysis.dish_name);
                                  }
                                }}
                              />
                              <button 
                                onClick={handleRefine}
                                disabled={loading}
                                className="p-2.5 md:p-6 bg-[#5E2B97] text-white rounded-lg md:rounded-3xl hover:bg-[#4C1D95] transition-all shadow-xl active:scale-95 disabled:opacity-50"
                              >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="md:w-7 md:h-7" />}
                              </button>
                            </div>
                          ) : (
                            <h2 className="text-2xl md:text-6xl font-black tracking-tighter leading-none uppercase flex items-center gap-2 md:gap-6">
                              {analysis.dish_name}
                              <button 
                                onClick={() => setIsEditingDishName(true)}
                                className="opacity-0 group-hover/title:opacity-100 p-1.5 text-[#9E9E9E] hover:text-[#FF7A00] transition-all"
                              >
                                <Edit2 size={14} className="md:w-7 md:h-7" />
                              </button>
                            </h2>
                          )}
                        </div>
                      </div>

                      {/* Nutrition Grid */}
                      <div className="grid grid-cols-4 md:grid-cols-4 gap-2 md:gap-6">
                        {[
                          { label: "Calories", value: Math.round(analysis.nutrition.calories_kcal * portionSize), unit: "kcal", color: "bg-[#F8F8F8]", textColor: "text-[#5E2B97]" },
                          { label: "Protein", value: Number((analysis.nutrition.protein_g * portionSize).toFixed(1)), unit: "g", color: "bg-blue-50", textColor: "text-blue-700" },
                          { label: "Carbs", value: Number((analysis.nutrition.carbs_g * portionSize).toFixed(1)), unit: "g", color: "bg-green-50", textColor: "text-green-700" },
                          { label: "Fat", value: Number((analysis.nutrition.fat_g * portionSize).toFixed(1)), unit: "g", color: "bg-yellow-50", textColor: "text-yellow-700" }
                        ].map((stat, i) => (
                          <div key={i} className={cn("p-2.5 md:p-8 rounded-xl md:rounded-[32px] transition-all hover:scale-105 hover:shadow-lg", stat.color)}>
                            <p className="text-[6px] md:text-[9px] font-black uppercase tracking-[0.05em] md:tracking-[0.2em] text-[#9E9E9E] mb-1 md:mb-3">{stat.label}</p>
                            <p className={cn("text-sm md:text-4xl font-black leading-none tracking-tighter", stat.textColor)}>
                              {stat.value}
                              <span className="text-[6px] md:text-[10px] font-bold ml-0.5 opacity-40">{stat.unit}</span>
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Daily Goal Progress */}
                      <div className="mt-6 md:mt-12 pt-6 md:pt-12 border-t border-[#F5F5F5]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-3">
                          <div>
                            <p className="text-[7px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[#9E9E9E] mb-1">Metabolic Progress</p>
                            <h4 className="text-lg md:text-2xl font-black uppercase tracking-tighter">Daily Accumulation</h4>
                          </div>
                          <div className="md:text-right">
                            <p className="text-[7px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[#9E9E9E] mb-1">Daily Target</p>
                            <span className="px-2.5 py-1 md:px-4 md:py-2 bg-[#1A1A1A] text-white text-[8px] md:text-[10px] font-black rounded-lg md:rounded-xl uppercase tracking-widest">
                              {profile?.daily_calorie_goal || 2000} kcal Base
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-12">
                          {(() => {
                            const dailyTotals = getDailyTotals();
                            const calorieGoal = profile?.daily_calorie_goal || 2000;
                            const proteinGoal = Math.round((calorieGoal * 0.20) / 4);
                            const carbsGoal = Math.round((calorieGoal * 0.50) / 4);
                            const fatGoal = Math.round((calorieGoal * 0.30) / 9);

                            return [
                              { label: "Calories", current: Math.round(analysis.nutrition.calories_kcal * portionSize), logged: dailyTotals.calories, goal: calorieGoal, unit: "kcal", color: "bg-[#5E2B97]" },
                              { label: "Protein", current: Number((analysis.nutrition.protein_g * portionSize).toFixed(1)), logged: dailyTotals.protein, goal: proteinGoal, unit: "g", color: "bg-blue-600" },
                              { label: "Carbs", current: Number((analysis.nutrition.carbs_g * portionSize).toFixed(1)), logged: dailyTotals.carbs, goal: carbsGoal, unit: "g", color: "bg-green-600" },
                              { label: "Fat", current: Number((analysis.nutrition.fat_g * portionSize).toFixed(1)), logged: dailyTotals.fat, goal: fatGoal, unit: "g", color: "bg-yellow-600" }
                            ].map((m, i) => {
                              const total = m.logged + m.current;
                              const percentage = Math.min((total / m.goal) * 100, 100);
                              const currentPercentage = (m.current / m.goal) * 100;
                              const loggedPercentage = (m.logged / m.goal) * 100;

                              return (
                                <div key={i} className="space-y-2 md:space-y-4">
                                  <div className="flex justify-between items-end">
                                    <div>
                                      <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-[#9E9E9E] block mb-0.5">{m.label}</span>
                                      <span className="text-lg md:text-2xl font-black tracking-tighter">
                                        {total.toFixed(0)}<span className="text-[8px] text-[#9E9E9E] ml-1">{m.unit}</span>
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[7px] font-bold text-[#9E9E9E] uppercase tracking-widest block mb-0.5">Goal: {m.goal}{m.unit}</span>
                                      <span className={cn(
                                        "text-[9px] md:text-xs font-black",
                                        total > m.goal ? "text-red-500" : "text-[#1A1A1A]"
                                      )}>
                                        {Math.round((total / m.goal) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="h-1.5 md:h-3 w-full bg-[#F5F5F5] rounded-full overflow-hidden relative">
                                    {/* Logged Progress */}
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${loggedPercentage}%` }}
                                      transition={{ duration: 1, delay: 0.2 }}
                                      className={cn("h-full absolute left-0 top-0 opacity-40", m.color)}
                                    />
                                    {/* Current Meal Progress */}
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${currentPercentage}%` }}
                                      style={{ left: `${loggedPercentage}%` }}
                                      transition={{ duration: 1, delay: 0.5 }}
                                      className={cn("h-full absolute top-0 border-l border-white", m.color)}
                                    />
                                  </div>
                                  
                                  <div className="flex gap-3 md:gap-4 text-[7px] md:text-[9px] font-bold uppercase tracking-tighter text-[#9E9E9E]">
                                    <div className="flex items-center gap-1">
                                      <div className={cn("w-1 h-1 md:w-2 md:h-2 rounded-full opacity-40", m.color)} />
                                      Logged: {m.logged.toFixed(0)}{m.unit}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <div className={cn("w-1 h-1 md:w-2 md:h-2 rounded-full", m.color)} />
                                      This Meal: {m.current.toFixed(0)}{m.unit}
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Log Meal Section */}
                      {user && scenario === "consume" && (
                        <div className="mt-6 md:mt-10 pt-6 md:pt-10 border-t border-[#F5F5F5] space-y-6">
                          
                          {/* AI Prediction Notice Banner */}
                          {analysis.predicted_intent && (
                            <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-100 flex items-start gap-3">
                              <Zap size={14} className="text-[#5E2B97] shrink-0 mt-0.5" />
                              <div>
                                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#5E2B97]">✨ AI Predicted Intent Activated</h4>
                                <p className="text-[11px] text-purple-950 mt-1 leading-relaxed">
                                  Our analysis predicted <strong>{analysis.predicted_intent.explanation}</strong>. We've automatically preset your scenario settings and ingestion times.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Quick Location Geotagger */}
                          <div className="p-4 bg-white rounded-2xl border border-[#EEEEEE] space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] flex items-center gap-1.5">
                              <Navigation size={10} className="text-[#5E2B97]" /> Consumption Location
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Where are you having this meal? (e.g. Home, Bastian, Mumbai)"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="flex-1 bg-[#FAFAFA] text-[11px] font-bold px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-[#5E2B97] transition-all"
                              />
                              <button
                                onClick={() => {
                                  if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition((pos) => {
                                      setLocation(`Lat ${pos.coords.latitude.toFixed(3)}, Lon ${pos.coords.longitude.toFixed(3)}`);
                                    });
                                  }
                                }}
                                className="px-4 py-3 bg-[#FAFAFA] hover:bg-gray-100 text-xs border border-gray-200 rounded-xl transition-all"
                                title="Use physical coords"
                              >
                                📍 Locate
                              </button>
                            </div>
                          </div>

                          {/* Portion Sharing Controller */}
                          <div className="p-4 bg-[#FAFAFA] rounded-2xl border border-[#EEEEEE] space-y-4">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                              <div>
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                                  🍽️ Portions & Food Sharing
                                </h4>
                                <p className="text-[9px] text-[#9E9E9E]">Did you share this dish or log a specific portion?</p>
                              </div>
                              <button
                                onClick={() => setIsShared(!isShared)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[9px] self-start md:self-auto font-black uppercase tracking-widest transition-all",
                                  isShared ? "bg-[#FF7A00] text-white" : "bg-white text-[#9E9E9E] border border-gray-200"
                                )}
                              >
                                {isShared ? "🤝 Shared Meal (Active)" : "👤 Single-portion"}
                              </button>
                            </div>

                            {/* Quick Presets */}
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { label: "100% (Full Dish)", value: 1.0 },
                                { label: "75% (Three-Quarters)", value: 0.75 },
                                { label: "50% (Half Portion)", value: 0.50 },
                                { label: "33% (Shared with 2)", value: 0.33 },
                                { label: "25% (Shared with 3)", value: 0.25 },
                              ].map((preset) => (
                                <button
                                  key={preset.value}
                                  onClick={() => {
                                    setPortionSize(preset.value);
                                    if (preset.value < 1.0) {
                                      setIsShared(true);
                                    } else {
                                      setIsShared(false);
                                    }
                                  }}
                                  className={cn(
                                    "px-2 px-1.5 py-1 rounded-lg text-[8px] font-black uppercase border transition-all",
                                    Math.abs(portionSize - preset.value) < 0.02
                                      ? "bg-[#5E2B97] text-white border-[#5E2B97]"
                                      : "bg-white text-[#9E9E9E] border-[#EEEEEE] hover:border-[#9E9E9E]"
                                  )}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>

                            {/* Slider */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[#9E9E9E]">
                                <span>Custom portion size</span>
                                <span className="text-[#5E2B97]">{Math.round(portionSize * 100)}% size</span>
                              </div>
                              <input
                                type="range"
                                min="0.05"
                                max="1.0"
                                step="0.01"
                                value={portionSize}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setPortionSize(val);
                                  if (val < 1.0) {
                                    setIsShared(true);
                                  } else {
                                    setIsShared(false);
                                  }
                                }}
                                className="w-full accent-[#5E2B97] h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                            <div className="flex-1 w-full">
                              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#9E9E9E] mb-2">Meal Category</p>
                              <div className="flex flex-wrap gap-1 md:gap-2">
                                {["breakfast", "brunch", "lunch", "dinner", "snack"].map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => setMealType(t as any)}
                                    className={cn(
                                      "px-2.5 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border transition-all",
                                      mealType === t ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#9E9E9E] border-[#EEEEEE] hover:border-[#1A1A1A]"
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={logMeal}
                              className="w-full md:w-auto bg-gradient-to-br from-[#5E2B97] to-[#FF7A00] text-white px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-xs flex items-center justify-center gap-2 md:gap-3 hover:shadow-xl hover:shadow-purple-500/20 transition-all active:scale-95"
                            >
                              <Save size={14} className="md:w-4.5 md:h-4.5" /> Log Meal
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Diagnostic Health Features */}
                    <div className={cn("bg-white p-5 md:p-10 rounded-[28px] md:rounded-[40px] shadow-sm border border-[#EEEEEE] space-y-8", activeTab !== 'diagnostic' && "hidden md:block")}>
                      <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[#9E9E9E] mb-5 md:mb-8 flex items-center gap-2 md:gap-3">
                        <HeartPulse size={10} className="text-[#FF4444] md:w-3.5 md:h-3.5" /> Precision Diagnostics
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Micronutrients */}
                        <div className="space-y-4">
                          <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-[#9E9E9E]">Micronutrient Density</p>
                          <div className="grid grid-cols-1 gap-3">
                            {analysis.micronutrients.map((micro, i) => (
                              <div key={i} className="p-4 bg-[#F8F8F8] rounded-2xl border border-[#EEEEEE] flex justify-between items-center">
                                <div>
                                  <p className="text-xs font-black">{micro.name}</p>
                                  <p className="text-[10px] text-[#9E9E9E] font-bold">{micro.impact}</p>
                                </div>
                                <span className="px-3 py-1 bg-white rounded-lg text-[10px] font-black border border-[#EEEEEE]">{micro.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Chronic Condition Flags */}
                        <div className="space-y-4">
                          <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-[#9E9E9E]">Chronic Condition Tracker</p>
                          <div className="grid grid-cols-1 gap-3">
                            {analysis.chronic_condition_flags.map((flag, i) => (
                              <div key={i} className={cn(
                                "p-4 rounded-2xl border flex items-start gap-3",
                                flag.impact === "safe" ? "bg-green-50 border-green-100 text-green-800" :
                                flag.impact === "caution" ? "bg-yellow-50 border-yellow-100 text-yellow-800" :
                                "bg-red-50 border-red-100 text-red-800"
                              )}>
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-xs font-black uppercase tracking-tight">{flag.condition}</p>
                                  <p className="text-[10px] font-bold mt-1 leading-relaxed">{flag.reason}</p>
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-white/50 rounded-md text-[8px] font-black uppercase tracking-widest">
                                    Status: {flag.impact}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Allergens & Cross-Contamination */}
                      <div className="pt-8 border-t border-[#F5F5F5]">
                        <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-[#9E9E9E] mb-4">Allergen & Cross-Contamination Scanner</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {analysis.allergens.map((allergen, i) => (
                            <div key={i} className="p-4 bg-white rounded-2xl border border-[#EEEEEE] shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black">{allergen.name}</span>
                                <span className={cn(
                                  "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                  allergen.risk === "high" ? "bg-red-500 text-white" :
                                  allergen.risk === "medium" ? "bg-orange-500 text-white" :
                                  "bg-green-500 text-white"
                                )}>
                                  {allergen.risk} Risk
                                </span>
                              </div>
                              <p className="text-[10px] text-[#9E9E9E] font-bold leading-relaxed">
                                <span className="text-[#1A1A1A]">Cross-Contamination:</span> {allergen.cross_contamination}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Portion Estimation Tech */}
                      <div className="p-6 bg-[#F8F8F8] rounded-3xl border border-[#EEEEEE] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#5E2B97] shadow-sm">
                            <Camera size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">Portion Estimation Method</p>
                            <p className="text-sm font-black text-[#1A1A1A]">{analysis.portion_estimation_method}</p>
                          </div>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-[8px] font-black uppercase tracking-widest text-[#9E9E9E]">Precision Level</p>
                          <p className="text-xs font-black text-[#5E2B97]">94.2% AI Accuracy</p>
                        </div>
                      </div>
                    </div>

                    {/* Nutritional Insights */}
                    <div className={cn("bg-white p-5 md:p-10 rounded-[28px] md:rounded-[40px] shadow-sm border border-[#EEEEEE]", activeTab !== 'insights' && "hidden md:block")}>
                      <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[#9E9E9E] mb-5 md:mb-8 flex items-center gap-2 md:gap-3">
                        <Zap size={10} className="text-[#FF7A00] md:w-3.5 md:h-3.5" /> Nutritional Insights
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                        {analysis.nutritional_insights.map((insight, i) => (
                          <div key={i} className="p-4 md:p-6 bg-[#F8F8F8] rounded-2xl md:rounded-3xl border border-[#EEEEEE]">
                            <div className="flex justify-between items-center mb-1.5 md:mb-3">
                              <span className="text-[9px] md:text-xs font-black uppercase tracking-wider">{insight.nutrient}</span>
                              <span className={cn(
                                "text-[7px] md:text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest",
                                insight.insight_type === "high" ? "bg-red-100 text-red-700" :
                                insight.insight_type === "low" ? "bg-blue-100 text-blue-700" :
                                "bg-green-100 text-green-700"
                              )}>
                                {insight.insight_type}
                              </span>
                            </div>
                            <div className="h-1 w-full bg-[#E5E5E5] rounded-full overflow-hidden mb-1.5 md:mb-3">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-1000",
                                  insight.percentage_of_dv > 100 ? "bg-red-500" : "bg-[#5E2B97]"
                                )}
                                style={{ width: `${Math.min(insight.percentage_of_dv, 100)}%` }}
                              />
                            </div>
                            <p className="text-[7px] md:text-[10px] font-bold text-[#9E9E9E] mb-1">{insight.percentage_of_dv}% of Daily Value</p>
                            <p className="text-[10px] md:text-xs text-[#1A1A1A] leading-relaxed mb-2 md:mb-4">{insight.description}</p>
                            
                            {/* Body Impact Display */}
                            <div className="pt-2 md:pt-4 border-t border-[#EEEEEE] space-y-1.5 md:space-y-3">
                              <p className="text-[7px] font-black uppercase tracking-widest text-[#9E9E9E]">Target: {insight.body_impact.target_part}</p>
                              {insight.body_impact.benefit && (
                                <div className="flex items-start gap-1 md:gap-2">
                                  <div className="mt-1 w-1 h-1 rounded-full bg-green-500 shrink-0" />
                                  <p className="text-[9px] md:text-[11px] font-bold text-green-700">{insight.body_impact.benefit}</p>
                                </div>
                              )}
                              {insight.body_impact.harm && (
                                <div className="flex items-start gap-1 md:gap-2">
                                  <div className="mt-1 w-1 h-1 rounded-full bg-red-500 shrink-0" />
                                  <p className="text-[9px] md:text-[11px] font-bold text-red-700">{insight.body_impact.harm}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Time-Based Impact */}
                    <div className={cn("bg-[#F8FAFC] p-5 md:p-10 rounded-[28px] md:rounded-[40px] shadow-sm border border-[#E2E8F0]", activeTab !== 'insights' && "hidden md:block")}>
                      <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[#64748B] mb-5 md:mb-8 flex items-center gap-2 md:gap-3">
                        <Clock size={10} className="text-[#5E2B97] md:w-3.5 md:h-3.5" /> Time-Based Impact Analysis
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                        <div className="space-y-3 md:space-y-6">
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#64748B]/60 mb-0.5 md:mb-2">
                              Analyzed Time
                            </p>
                            <p className="text-sm md:text-lg font-bold text-[#1A1A1A]">{analysis.time_based_impact.meal_time}</p>
                          </div>
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#64748B]/60 mb-0.5 md:mb-2">
                              Glycemic Impact
                            </p>
                            <p className="text-[10px] md:text-sm font-bold text-[#1A1A1A] leading-relaxed">{analysis.time_based_impact.glycemic_impact}</p>
                          </div>
                        </div>
                        <div className="space-y-3 md:space-y-6">
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#64748B]/60 mb-0.5 md:mb-2">
                              Metabolic Advice
                            </p>
                            <p className="text-[10px] md:text-sm text-[#1A1A1A] leading-relaxed italic font-bold">"{analysis.time_based_impact.metabolic_advice}"</p>
                          </div>
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#64748B]/60 mb-0.5 md:mb-2">
                              Circadian Relevance
                            </p>
                            <p className="text-[10px] md:text-sm text-[#1A1A1A] leading-relaxed">{analysis.time_based_impact.circadian_relevance}</p>
                          </div>
                          <div className="pt-2 md:pt-4 border-t border-[#E2E8F0]">
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#5E2B97] mb-0.5 md:mb-2 flex items-center gap-1.5">
                              <Clock size={8} className="md:w-3 md:h-3" /> Best Time to Consume
                            </p>
                            <p className="text-[10px] md:text-sm font-black text-[#5E2B97]">{analysis.time_based_impact.best_time_to_consume}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ayurvedic Analysis */}
                    <div className={cn("bg-[#FDFCFB] p-5 md:p-10 rounded-[28px] md:rounded-[40px] shadow-sm border border-[#F3E5D8]", activeTab !== 'ayurveda' && "hidden md:block")}>
                      <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[#8B4513] mb-5 md:mb-8 flex items-center gap-2 md:gap-3">
                        <Leaf size={10} className="text-[#556B2F] md:w-3.5 md:h-3.5" /> Ayurvedic Wisdom
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                        <div className="space-y-3 md:space-y-6">
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#8B4513]/60 mb-2 md:mb-4 flex items-center gap-1.5">
                              <Activity size={8} className="md:w-3 md:h-3" /> Dosha Impact Scores
                            </p>
                            <div className="grid grid-cols-3 gap-2 md:gap-4">
                              {[
                                { label: "Vata", score: analysis.ayurvedic_analysis.dosha_scores.vata, color: "bg-blue-400" },
                                { label: "Pitta", score: analysis.ayurvedic_analysis.dosha_scores.pitta, color: "bg-red-400" },
                                { label: "Kapha", score: analysis.ayurvedic_analysis.dosha_scores.kapha, color: "bg-green-400" }
                              ].map((d, i) => (
                                <div key={i} className="text-center">
                                  <div className="h-12 md:h-24 w-full bg-[#F3E5D8] rounded-lg md:rounded-2xl relative overflow-hidden mb-1 md:mb-2 border border-[#8B4513]/10">
                                    <motion.div 
                                      initial={{ height: 0 }}
                                      animate={{ height: `${Math.abs(d.score) * 100}%` }}
                                      className={cn(
                                        "absolute bottom-0 left-0 right-0 transition-all duration-1000",
                                        d.color,
                                        d.score < 0 ? "opacity-30" : "opacity-100"
                                      )}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-[8px] md:text-xs font-black text-[#8B4513]">
                                        {d.score > 0 ? "+" : ""}{d.score.toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-[6px] md:text-[10px] font-black uppercase tracking-widest text-[#8B4513]/60">{d.label}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#8B4513]/60 mb-0.5 md:mb-2 flex items-center gap-1.5">
                              <Droplets size={8} className="md:w-3 md:h-3" /> Blood (Rakta) Effect
                            </p>
                            <p className="text-[10px] md:text-sm text-[#1A1A1A] leading-relaxed">{analysis.ayurvedic_analysis.blood_effect}</p>
                          </div>
                        </div>
                        <div className="space-y-3 md:space-y-6">
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#8B4513]/60 mb-0.5 md:mb-2 flex items-center gap-1.5">
                              <HeartPulse size={8} className="md:w-3 md:h-3" /> Body System Impact
                            </p>
                            <p className="text-[10px] md:text-sm text-[#1A1A1A] leading-relaxed">{analysis.ayurvedic_analysis.body_effect}</p>
                          </div>
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#8B4513]/60 mb-0.5 md:mb-2">
                              Guna (Qualities)
                            </p>
                            <div className="flex flex-wrap gap-1 md:gap-2">
                              {analysis.ayurvedic_analysis.guna.split(',').map((g, i) => (
                                <span key={i} className="px-1.5 py-0.5 md:px-3 md:py-1 bg-[#F3E5D8] text-[#8B4513] text-[7px] md:text-[10px] font-bold rounded-md md:rounded-lg uppercase tracking-wider">
                                  {g.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="p-3 md:p-6 bg-[#F3E5D8]/30 rounded-xl md:rounded-3xl border border-[#F3E5D8]">
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#8B4513] mb-0.5 md:mb-2 flex items-center gap-1.5">
                              <AlertCircle size={8} className="md:w-3 md:h-3" /> Direct Excess Impact
                            </p>
                            <p className="text-[10px] md:text-sm text-[#8B4513] leading-relaxed font-bold italic">
                              "{analysis.ayurvedic_analysis.excess_impact}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cost & Metrics Bento */}
                    <div className={cn("grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-8", activeTab !== 'cost' && "hidden md:block")}>
                      <div className="md:col-span-3 bg-white p-5 md:p-10 rounded-[28px] md:rounded-[40px] shadow-sm border border-[#EEEEEE]">
                        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[#9E9E9E] mb-5 md:mb-8 flex items-center gap-2 md:gap-3">
                          <IndianRupee size={10} className="text-[#FF6321] md:w-3.5 md:h-3.5" /> Financial Analysis
                        </h3>
                        <div className="space-y-3 md:space-y-5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] md:text-sm font-medium text-[#9E9E9E]">Base Ingredients</span>
                            <span className="font-mono text-[10px] md:text-base font-bold">₹{analysis.cost.ingredient_cost_total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] md:text-sm font-medium text-[#9E9E9E]">Overhead ({mode})</span>
                            <span className="font-mono text-[10px] md:text-base font-bold">₹{analysis.cost.overhead_cost.toFixed(2)}</span>
                          </div>
                          
                          {mode === "restaurant" && (
                            <div className="pt-2 md:pt-4 mt-2 md:mt-4 border-t border-[#F5F5F5] space-y-2 md:space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#FF6321]">Menu Check</p>
                                {!restaurantPriceInfo && (
                                  <button 
                                    onClick={handleSearchPrice}
                                    disabled={isSearchingPrice || !restaurantName}
                                    className="flex items-center gap-1 px-2 py-1 md:px-4 md:py-2 bg-[#F8F8F8] hover:bg-[#EEEEEE] text-[7px] md:text-[10px] font-bold uppercase tracking-widest rounded-md md:rounded-xl transition-all disabled:opacity-50"
                                  >
                                    {isSearchingPrice ? <Loader2 size={8} className="animate-spin" /> : <Search size={8} />}
                                    {isSearchingPrice ? "Searching..." : "Fetch Price"}
                                  </button>
                                )}
                              </div>

                              {restaurantPriceInfo ? (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-3 md:p-6 bg-[#F8F8F8] rounded-xl md:rounded-3xl border border-[#EEEEEE]"
                                >
                                  <div className="flex justify-between items-start mb-2 md:mb-4">
                                    <div>
                                      <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-0.5">Menu Price at {restaurantName}</p>
                                      <span className="text-xl md:text-3xl font-black tracking-tighter">₹{restaurantPriceInfo.price.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-0.5">Markup</p>
                                      <span className="text-base md:text-xl font-black text-[#FF6321]">
                                        {Math.round(((restaurantPriceInfo.price - analysis.cost.total_cost) / analysis.cost.total_cost) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-[#EEEEEE]">
                                    <p className="text-[7px] md:text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest truncate max-w-[120px] md:max-w-[200px]">
                                      Source: {restaurantPriceInfo.source}
                                    </p>
                                    <button 
                                      onClick={() => setRestaurantPriceInfo(null)}
                                      className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#FF6321] hover:underline"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </motion.div>
                              ) : (
                                !isSearchingPrice && !restaurantName && (
                                  <p className="text-[8px] md:text-[10px] text-[#9E9E9E] italic font-medium">
                                    * Enter restaurant name to compare prices.
                                  </p>
                                )
                              )}
                            </div>
                          )}

                          <div className="pt-3 md:pt-6 mt-3 md:mt-6 border-t border-[#F5F5F5] flex justify-between items-end">
                            <div>
                              <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-0.5">Total Estimated Cost</p>
                              <span className="text-2xl md:text-5xl font-black tracking-tighter">₹{(analysis.cost.total_cost * portionSize).toFixed(2)}</span>
                            </div>
                            <div className="px-1.5 py-0.5 md:px-3 md:py-1 bg-[#F8F8F8] rounded-md md:rounded-lg text-[7px] md:text-[10px] font-bold uppercase text-[#9E9E9E] border border-[#EEEEEE]">
                              INR
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 bg-[#4C1D95] p-5 md:p-10 rounded-[28px] md:rounded-[40px] shadow-xl text-white relative overflow-hidden group">
                        {/* Decorative Circle */}
                        <div className="absolute -top-8 -right-8 w-20 md:w-32 h-20 md:h-32 bg-white/5 rounded-full blur-xl md:blur-3xl group-hover:bg-white/10 transition-colors" />
                        
                        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-40 mb-5 md:mb-10 flex items-center gap-2 md:gap-3">
                          <PieChart size={10} className="md:w-3.5 md:h-3.5" /> Efficiency
                        </h3>
                        <div className="space-y-4 md:space-y-8">
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5 md:mb-2">Cost / g Protein</p>
                            <p className="text-xl md:text-3xl font-black tracking-tight">₹{analysis.metrics.cost_per_gram_protein.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5 md:mb-2">Cost / 100 kcal</p>
                            <p className="text-xl md:text-3xl font-black tracking-tight">₹{analysis.metrics.cost_per_100kcal.toFixed(2)}</p>
                          </div>
                          <div className="pt-3 md:pt-6 border-t border-white/10">
                            <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest opacity-40 mb-0.5 md:mb-2">P:C Ratio</p>
                            <p className="text-base md:text-xl font-black text-[#FF6321]">{analysis.metrics.protein_to_calorie_ratio.toFixed(3)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ingredients List */}
                    <div className={cn("bg-white rounded-[28px] md:rounded-[40px] shadow-sm border border-[#EEEEEE] overflow-hidden", activeTab !== 'cost' && "hidden md:block")}>
                      <div className="p-5 md:p-8 border-b border-[#F5F5F5] flex items-center justify-between bg-[#FAFAFA]">
                        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[#4C1D95]">Ingredient Decomposition</h3>
                        <button 
                          onClick={async () => {
                            const name = prompt("Enter ingredient name to add (AI will estimate quantity):");
                            if (name) {
                              await addIngredientWithAI(name);
                            }
                          }}
                          disabled={loading}
                          className="p-1 md:p-2 bg-white border border-[#EEEEEE] rounded-md md:rounded-xl text-[#9E9E9E] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
                        >
                          {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} className="md:w-4 md:h-4" />}
                        </button>
                      </div>

                      {mode === "restaurant" && (
                        <div className="p-5 md:p-8 bg-[#F8F8F8] border-b border-[#EEEEEE]">
                          <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1.5 md:mb-3 flex items-center gap-1.5">
                            <MapPin size={8} className="md:w-3 md:h-3" /> Restaurant Info
                          </p>
                          <input 
                            type="text"
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                            placeholder="Enter Restaurant Name..."
                            className="w-full bg-transparent border-b border-[#EEEEEE] py-1 md:py-2 text-[10px] md:text-sm font-bold focus:border-[#FF6321] outline-none transition-colors"
                          />
                        </div>
                      )}

                      <div className="divide-y divide-[#F5F5F5]">
                        {analysis.ingredients.map((ing, i) => (
                          <div key={i} className="px-5 py-3 md:px-8 md:py-6 hover:bg-[#F9F9F9] transition-colors group">
                            <div className="flex items-center justify-between mb-2 md:mb-4">
                              <div className="flex items-center gap-2 md:gap-4 flex-1">
                                <div className={cn(
                                  "w-1.5 md:w-2.5 h-1.5 md:h-2.5 rounded-full",
                                  ing.is_hidden ? "bg-[#FF6321]" : "bg-[#1A1A1A]"
                                )} />
                                <input 
                                  type="text"
                                  value={ing.name}
                                  onChange={(e) => updateIngredient(i, { name: e.target.value })}
                                  className="bg-transparent text-[10px] md:text-sm font-bold tracking-tight outline-none focus:text-[#FF6321] w-full"
                                />
                              </div>
                              <button 
                                onClick={() => {
                                  const newIngs = analysis.ingredients.filter((_, idx) => idx !== i);
                                  setAnalysis({ ...analysis, ingredients: newIngs });
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-[#9E9E9E] hover:text-red-500 transition-all"
                              >
                                <Trash2 size={12} className="md:w-4 md:h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 md:gap-6">
                              <div className="space-y-0.5 md:space-y-1.5">
                                <p className="text-[6px] md:text-[8px] font-black text-[#9E9E9E] uppercase tracking-widest">Weight (g)</p>
                                <input 
                                  type="number"
                                  value={ing.weight_g}
                                  onChange={(e) => updateIngredient(i, { weight_g: Number(e.target.value) })}
                                  className="w-full bg-white px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-xl text-[9px] md:text-xs font-mono font-bold outline-none border border-[#EEEEEE] focus:border-[#1A1A1A]"
                                />
                              </div>
                              <div className="space-y-0.5 md:space-y-1.5">
                                <p className="text-[6px] md:text-[8px] font-black text-[#9E9E9E] uppercase tracking-widest">₹ / kg</p>
                                <input 
                                  type="number"
                                  value={ing.unit_cost_per_kg}
                                  onChange={(e) => updateIngredient(i, { unit_cost_per_kg: Number(e.target.value) })}
                                  className="w-full bg-white px-2 py-1 md:px-4 md:py-2 rounded-md md:rounded-xl text-[9px] md:text-xs font-mono font-bold outline-none border border-[#EEEEEE] focus:border-[#1A1A1A]"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-2 md:mt-4 flex justify-between items-center">
                              <span className="text-[7px] md:text-[9px] font-black text-[#9E9E9E] uppercase tracking-widest">
                                Unit: ₹{(ing.unit_cost_per_kg / 1000).toFixed(3)}/g
                              </span>
                              <span className="font-mono text-[9px] md:text-xs font-black text-[#1A1A1A]">₹{ing.cost_inr.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-16 bg-white rounded-[40px] border-2 border-dashed border-[#EEEEEE]">
                    <div className="w-24 h-24 bg-[#FDFCFB] rounded-[32px] flex items-center justify-center text-[#D1D1D1] mb-8 shadow-sm border border-[#EEEEEE]">
                      <Search size={48} strokeWidth={1} />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight mb-3 uppercase">Ready for Analysis</h3>
                    <p className="text-[#9E9E9E] max-w-xs font-medium leading-relaxed">
                      Upload a high-quality food photo to trigger the AI analysis pipeline.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        ) : currentMainTab === "sutra_lab" ? (
          <SutraAILab 
            meals={history} 
            waterLogs={waterLogs}
            profile={profile} 
            onAddNotification={triggerGoalNotification} 
          />
        ) : (
          <div className="space-y-8 md:space-y-12 animate-fade-in">
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-10 rounded-[24px] md:rounded-[40px] border border-[#EEEEEE] shadow-sm">
              <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#FF7A00] mb-1">Metabolic Telemetry Control</p>
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Your Health & Vital Indicators</h2>
                <p className="text-xs text-[#9E9E9E] mt-1">Aggregated diet analytics synched across authorized platforms.</p>
              </div>
              
              {/* Range Scopes */}
              <div className="bg-[#F5F5F5] p-1 rounded-xl border border-[#EEEEEE] flex gap-1">
                {[
                  { id: 'day', label: 'Day' },
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                  { id: '6month', label: '6 Months' },
                  { id: 'year', label: 'Year' },
                ].map((scope) => (
                  <button
                    key={scope.id}
                    onClick={() => setDashboardScope(scope.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      dashboardScope === scope.id 
                        ? "bg-[#1A1A1A] text-white shadow" 
                        : "text-[#9E9E9E] hover:text-[#1A1A1A]"
                    )}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export & Sharing Console */}
            <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[36px] border border-[#EEEEEE] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#5E2B97] mb-1">Data Portability Node</p>
                <h3 className="text-lg font-black uppercase tracking-tight">Export & Digital Sharing Suite</h3>
                <p className="text-xs text-[#9E9E9E] mt-0.5">Download full analytical logs or generate structured digests ready for sharing.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto mt-2 md:mt-0">
                <button
                  id="dashboard-export-csv"
                  onClick={handleExportCSV}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#FAFAFA] border border-[#EEEEEE] hover:border-purple-300 hover:bg-purple-50 text-purple-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  <Download size={14} /> CSV Log
                </button>
                <button
                  id="dashboard-export-json"
                  onClick={handleExportJSON}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#FAFAFA] border border-[#EEEEEE] hover:border-purple-300 hover:bg-purple-50 text-purple-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  <Download size={14} /> JSON Log
                </button>
                <button
                  id="dashboard-share-report"
                  onClick={handleShareClipboard}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#1A1A1A] hover:bg-black text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-black/5"
                >
                  <Share2 size={13} /> Share Digest
                </button>
              </div>
            </div>

            {/* Core Telemetry Grid - Rings & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Calories Ring Summary card */}
              <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[36px] border border-[#EEEEEE] shadow-sm space-y-6">
                <div>
                  <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Energy Balance</p>
                  <h3 className="text-lg font-black uppercase tracking-tight">Daily Calorie Target</h3>
                </div>

                {/* Real progress calculations */}
                {(() => {
                  const intake = getDailyTotals().calories;
                  const baseGoal = profile?.daily_calorie_goal || 2000;
                  const activeBurn = googleFitConnected || appleHealthConnected ? burnedCaloriesFit : 350;
                  const netCalories = intake - activeBurn;
                  const remaining = baseGoal - netCalories;
                  const percentage = Math.min(Math.round((intake / baseGoal) * 100), 100);

                  return (
                    <div className="space-y-6">
                      <div className="flex justify-center items-center py-4 relative">
                        {/* Stylized Gauge Ring */}
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[10px] border-[#F5F5F5] flex flex-col justify-center items-center relative overflow-hidden shadow-inner animate-pulse">
                          <div 
                            className="absolute inset-0 rounded-full border-[10px] border-[#5E2B97] transition-all duration-500"
                            style={{
                              clipPath: `polygon(50% 50%, 50% 0%, ${percentage >= 25 ? '100% 0%,' : ''} ${percentage >= 50 ? '100% 100%,' : ''} ${percentage >= 75 ? '0% 100%,' : ''} ${percentage >= 100 ? '0% 0%,' : ''} 50% 0%)`,
                              transform: 'rotate(-45deg)',
                              opacity: percentage > 0 ? 1 : 0
                            }}
                          />
                          <div className="z-10 text-center animate-none">
                            <p className="text-xl md:text-3xl font-black tracking-tighter text-[#5E2B97]">{intake}</p>
                            <p className="text-[8px] text-[#9E9E9E] font-black tracking-widest uppercase">kcal In</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center border-t border-[#F5F5F5] pt-4">
                        <div>
                          <p className="text-[7px] md:text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Base Goal</p>
                          <p className="text-xs md:text-sm font-black text-black">{baseGoal}</p>
                        </div>
                        <div>
                          <p className="text-[7px] md:text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Active Burn</p>
                          <p className="text-xs md:text-sm font-black text-[#FF7A00] flex items-center justify-center gap-0.5">
                            <Flame size={10} /> {activeBurn}
                          </p>
                        </div>
                        <div>
                          <p className="text-[7px] md:text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Net Kcal</p>
                          <p className={cn(
                            "text-xs md:text-sm font-black",
                            netCalories > baseGoal ? "text-red-500" : "text-green-600"
                          )}>{netCalories}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Past Calorie Trends Recharts */}
              <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[36px] border border-[#EEEEEE] shadow-sm md:col-span-2 space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <div>
                    <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Calorie Trends</p>
                    <h3 className="text-lg font-black uppercase tracking-tight">Daily Consumption vs Activity Burn</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-[#5E2B97] rounded-full inline-block" />
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#9E9E9E]">Intake</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-[#FF7A00] rounded-full inline-block" />
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#9E9E9E]">Burned</span>
                    </div>
                  </div>
                </div>

                {/* Recharts BarChart container */}
                <div className="w-full h-56 md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getAggregatedCalorieData()}>
                      <XAxis dataKey="label" stroke="#9E9E9E" fontSize={9} tickLine={false} />
                      <YAxis stroke="#9E9E9E" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(94, 43, 151, 0.03)' }} 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }} 
                      />
                      <Bar dataKey="Intake" fill="#5E2B97" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Burned" fill="#FF7A00" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Middle Row - Weight Body indicators & Connected fitness apps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Weight Progression */}
              <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[36px] border border-[#EEEEEE] shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Body Descriptors</p>
                  <h3 className="text-lg font-black uppercase tracking-tight">Weight Progression</h3>
                </div>

                <div className="w-full h-48 md:h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getBodyProgressData()}>
                      <XAxis dataKey="label" stroke="#9E9E9E" fontSize={9} tickLine={false} />
                      <YAxis stroke="#9E9E9E" fontSize={9} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Line type="monotone" name="Weight (kg)" dataKey="Weight" stroke="#FF7A00" strokeWidth={3} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Daily Hydration Status card */}
              <div id="dashboard-water-metric" className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[36px] border border-[#EEEEEE] shadow-sm flex flex-col justify-between space-y-6">
                <div>
                  <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Fluid Mechanics</p>
                  <h3 className="text-lg font-black uppercase tracking-tight">Today's Hydration Index</h3>
                </div>

                <div className="flex flex-col justify-center items-center py-2 space-y-4">
                  <div className="relative w-32 h-32 flex items-center justify-center rounded-full bg-[#FAFDFF] border border-[#E3F2FD] shadow-inner">
                    <div className="absolute inset-2 rounded-full border border-dashed border-blue-200/50 animate-spin" style={{ animationDuration: '10s' }} />
                    <div className="text-center z-10">
                      <p className="text-2xl font-black text-blue-600 tracking-tighter">{getTodayWaterTotal()}</p>
                      <p className="text-[7px] font-black text-[#9E9E9E] uppercase tracking-widest">/ {waterGoal} ml</p>
                      <p className="text-[9px] text-blue-400 font-bold uppercase mt-1">
                        {Math.round(Math.min((getTodayWaterTotal() / waterGoal) * 100, 100))}% Target
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <button
                      id="dashboard-water-quick-250"
                      onClick={() => logWater(250)}
                      className="px-2.5 py-1 bg-blue-50 border border-blue-100 font-black text-[9px] uppercase text-blue-600 rounded-lg hover:bg-blue-100 transition-all cursor-pointer"
                    >
                      +250ml
                    </button>
                    <button
                      id="dashboard-water-quick-500"
                      onClick={() => logWater(500)}
                      className="px-2.5 py-1 bg-cyan-50 border border-cyan-100 font-black text-[9px] uppercase text-cyan-600 rounded-lg hover:bg-cyan-100 transition-all cursor-pointer"
                    >
                      +500ml
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full text-center border-t border-[#F5F5F5] pt-3">
                  <div>
                    <p className="text-[7px] md:text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Goal</p>
                    <p className="text-xs font-black text-black">{waterGoal} ml</p>
                  </div>
                  <div>
                    <p className="text-[7px] md:text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Status</p>
                    <p className={cn(
                      "text-xs font-black tracking-tighter",
                      getTodayWaterTotal() >= waterGoal ? "text-green-600" : "text-amber-500"
                    )}>
                      {getTodayWaterTotal() >= waterGoal ? "COMPLETED" : "INCOMPLETE"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Health Apps sync manager */}
              <div className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[36px] border border-[#EEEEEE] shadow-sm space-y-6">
                <div>
                  <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[#9E9E9E] mb-1">Secure Platforms</p>
                  <h3 className="text-lg font-[#1A1A1A] font-black uppercase tracking-tight">Authorize App Sync</h3>
                </div>

                {/* Connections Hub checklist lists */}
                <div className="space-y-4 flex-1">
                  
                  {/* Google Fit */}
                  <div className="flex items-center justify-between p-3.5 bg-[#FAFAFA] rounded-2xl border border-gray-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                        G
                      </div>
                      <div>
                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider">Google Fit</h4>
                        <p className="text-[9px] text-[#9E9E9E]">Energy levels, weight logs</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleFit('google')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest",
                        googleFitConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {googleFitConnected ? "Connected" : "Connect"}
                    </button>
                  </div>

                  {/* Apple Health App */}
                  <div className="flex items-center justify-between p-3.5 bg-[#FAFAFA] rounded-2xl border border-gray-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs">
                        A
                      </div>
                      <div>
                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider">Health App</h4>
                        <p className="text-[9px] text-[#9E9E9E]">Steps, sleep logs, vitals</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleFit('apple')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest",
                        appleHealthConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {appleHealthConnected ? "Connected" : "Connect"}
                    </button>
                  </div>

                  {/* Fittelo */}
                  <div className="flex items-center justify-between p-3.5 bg-[#FAFAFA] rounded-2xl border border-gray-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        F
                      </div>
                      <div>
                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider">Fittelo API</h4>
                        <p className="text-[9px] text-[#9E9E9E]">Water content, core diets</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleFit('fittelo')}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest",
                        fitteloConnected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {fitteloConnected ? "Connected" : "Connect"}
                    </button>
                  </div>

                </div>

                {/* Synchronization Controls */}
                <div className="pt-4 border-t border-[#F5F5F5] space-y-2.5">
                  <button
                    onClick={handleForceSync}
                    disabled={isSyncingApps || (!googleFitConnected && !appleHealthConnected && !fitteloConnected)}
                    className="w-full py-3 bg-gradient-to-r from-[#5E2B97] to-[#FF7A00] text-white text-[9px] font-black rounded-xl uppercase tracking-widest hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isSyncingApps ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Syncing secure databases...
                      </>
                    ) : (
                      "Force Real-time Sync Now"
                    )}
                  </button>
                  <p className="text-[8px] text-center text-[#9E9E9E] font-black uppercase tracking-widest">
                    {lastSyncTime ? `Last synchronization: today, ${lastSyncTime}` : "No successful sync recorded today"}
                  </p>
                </div>

              </div>

            </div>

            {/* Ayurveda dosha integration details */}
            <div className="p-6 bg-purple-50/50 rounded-3xl border border-purple-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#5E2B97] flex items-center gap-2">
                <Leaf size={12} className="text-[#5E2B97]" /> Holistic Chronobiology & Biofeedback
              </h4>
              <p className="text-[11px] leading-relaxed text-purple-950 mt-1.5 font-bold">
                When syncing Fittelo or Health App data, MetaboSutra automatically evaluates Ayurvedic Dosha impacts of your logged meals (vata, pitta, kapha) and warns you of any chronic condition flags based on real-time synchronized steps and resting active calorie burn.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 md:px-8 py-12 md:py-20 border-t border-[#EEEEEE] flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10 text-[#9E9E9E]">
        <div className="flex items-center gap-3">
          <Logo size={28} className="md:w-9 md:h-9" />
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[#4C1D95] font-aptos">MetaboSutra v1.2</span>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-x-6 md:gap-x-12 gap-y-3 md:gap-y-4 text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em]">
          <span className="flex items-center gap-1.5 md:gap-2"><div className="w-1 h-1 rounded-full bg-[#FF6321]" /> Indian Market Priors</span>
          <span className="flex items-center gap-1.5 md:gap-2"><div className="w-1 h-1 rounded-full bg-[#FF6321]" /> Precision Estimation</span>
          <span className="flex items-center gap-1.5 md:gap-2"><div className="w-1 h-1 rounded-full bg-[#FF6321]" /> Cost Tracking</span>
        </div>
      </footer>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-5 md:p-10">
                <div className="flex items-center justify-between mb-5 md:mb-8">
                  <h2 className="text-lg md:text-2xl font-black tracking-tight uppercase">User Profile</h2>
                  <button onClick={() => setShowProfileModal(false)} className="p-1.5 hover:bg-[#F5F5F5] rounded-xl transition-colors">
                    <X size={18} className="md:w-6 md:h-6" />
                  </button>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-2 gap-3 md:gap-6">
                    <div className="space-y-1 md:space-y-2">
                      <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">Weight (kg)</label>
                      <input 
                        type="number" 
                        value={profile?.weight_kg || ""} 
                        onChange={(e) => setProfile({ ...profile!, weight_kg: Number(e.target.value) })}
                        className="w-full bg-[#F8F8F8] px-4 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-base font-bold outline-none border-2 border-transparent focus:border-[#4C1D95] transition-all"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">Height (cm)</label>
                      <input 
                        type="number" 
                        value={profile?.height_cm || ""} 
                        onChange={(e) => setProfile({ ...profile!, height_cm: Number(e.target.value) })}
                        className="w-full bg-[#F8F8F8] px-4 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-base font-bold outline-none border-2 border-transparent focus:border-[#4C1D95] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-6">
                    <div className="space-y-1 md:space-y-2">
                      <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">Age</label>
                      <input 
                        type="number" 
                        value={profile?.age || ""} 
                        onChange={(e) => setProfile({ ...profile!, age: Number(e.target.value) })}
                        className="w-full bg-[#F8F8F8] px-4 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-base font-bold outline-none border-2 border-transparent focus:border-[#4C1D95] transition-all"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">Gender</label>
                      <select 
                        value={profile?.gender || "male"} 
                        onChange={(e) => setProfile({ ...profile!, gender: e.target.value as any })}
                        className="w-full bg-[#F8F8F8] px-4 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-base font-bold outline-none border-2 border-transparent focus:border-[#4C1D95] transition-all appearance-none"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">Activity Level</label>
                    <select 
                      value={profile?.activity_level || "sedentary"} 
                      onChange={(e) => setProfile({ ...profile!, activity_level: e.target.value as any })}
                      className="w-full bg-[#F8F8F8] px-4 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-base font-bold outline-none border-2 border-transparent focus:border-[#4C1D95] transition-all appearance-none"
                    >
                      <option value="sedentary">Sedentary</option>
                      <option value="light">Lightly Active</option>
                      <option value="moderate">Moderately Active</option>
                      <option value="active">Active</option>
                      <option value="very_active">Very Active</option>
                    </select>
                  </div>

                  <div className="pt-3 md:pt-6">
                    <button 
                      onClick={saveProfile}
                      className="w-full bg-[#4C1D95] text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-xs hover:bg-[#312E81] transition-all shadow-xl shadow-black/10"
                    >
                      Save Profile & Recalculate Goals
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reflection Modal (Mindful Eating) */}
      <AnimatePresence>
        {showReflectionModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReflectionModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-[#FDFCFB] rounded-2xl flex items-center justify-center text-[#5E2B97] mx-auto mb-6 shadow-sm border border-[#EEEEEE]">
                    <Leaf size={32} />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">Mindful Reflection</h2>
                  <p className="text-[#9E9E9E] font-bold uppercase text-[10px] tracking-widest">Foster a better relationship with your food</p>
                </div>

                <div className="space-y-8">
                  {/* Mood Diary */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">Mood Before Meal</label>
                      <select 
                        value={moodBefore}
                        onChange={(e) => setMoodBefore(e.target.value)}
                        className="w-full bg-[#F8F8F8] px-5 py-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-[#5E2B97] transition-all appearance-none"
                      >
                        <option value="">Select Mood...</option>
                        <option value="Happy">Happy</option>
                        <option value="Stressed">Stressed</option>
                        <option value="Tired">Tired</option>
                        <option value="Anxious">Anxious</option>
                        <option value="Neutral">Neutral</option>
                        <option value="Excited">Excited</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">Mood After Meal</label>
                      <select 
                        value={moodAfter}
                        onChange={(e) => setMoodAfter(e.target.value)}
                        className="w-full bg-[#F8F8F8] px-5 py-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-[#FF7A00] transition-all appearance-none"
                      >
                        <option value="">Select Mood...</option>
                        <option value="Satisfied">Satisfied</option>
                        <option value="Bloated">Bloated</option>
                        <option value="Energetic">Energetic</option>
                        <option value="Sleepy">Sleepy</option>
                        <option value="Guilty">Guilty</option>
                        <option value="Happy">Happy</option>
                      </select>
                    </div>
                  </div>

                  {/* Ratings */}
                  <div className="space-y-6">
                    {[
                      { label: "Hunger Level", value: hungerRating, setter: setHungerRating, low: "Not Hungry", high: "Starving" },
                      { label: "Satiety (Fullness)", value: satietyRating, setter: setSatietyRating, low: "Still Hungry", high: "Stuffed" },
                      { label: "Enjoyment", value: enjoymentRating, setter: setEnjoymentRating, low: "Bland", high: "Delicious" }
                    ].map((rating, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#9E9E9E]">{rating.label}</label>
                          <span className="text-xl font-black text-[#1A1A1A]">{rating.value}/10</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="10" 
                          value={rating.value}
                          onChange={(e) => rating.setter(Number(e.target.value))}
                          className="w-full h-2 bg-[#F5F5F5] rounded-full appearance-none cursor-pointer accent-[#5E2B97]"
                        />
                        <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-[#D1D1D1]">
                          <span>{rating.low}</span>
                          <span>{rating.high}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      onClick={() => setShowReflectionModal(false)}
                      className="flex-1 px-8 py-4 rounded-2xl border-2 border-[#EEEEEE] font-black uppercase tracking-widest text-[10px] hover:bg-[#F8F8F8] transition-all"
                    >
                      Skip
                    </button>
                    <button 
                      onClick={logMeal}
                      className="flex-1 bg-gradient-to-br from-[#5E2B97] to-[#FF7A00] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-xl transition-all active:scale-95"
                    >
                      Complete Log
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {renderHistoryModal()}
    </div>
    </ErrorBoundary>
  );
}

