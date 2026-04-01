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
  Flame
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { 
  analyzeFoodImage, 
  refineAnalysis, 
  estimateIngredient,
  searchRestaurantPrice 
} from "./services/geminiService";
import { FoodAnalysis, UserMode, Ingredient, UserProfile, MealLog } from "./types";
import { cn } from "./lib/utils";

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

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchProfile(u.uid);
        fetchHistory(u.uid);
      } else {
        setProfile(null);
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setShowProfileModal(true);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchHistory = (uid: string) => {
    const q = query(
      collection(db, "meals"), 
      where("userId", "==", uid),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealLog));
      setHistory(meals);
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

  const saveProfile = async (p: Omit<UserProfile, "userId" | "daily_calorie_goal">) => {
    if (!user) return;
    const daily_calorie_goal = calculateGoal(p);
    const newProfile: UserProfile = { ...p, userId: user.uid, daily_calorie_goal };
    await setDoc(doc(db, "users", user.uid), newProfile);
    setProfile(newProfile);
    setShowProfileModal(false);
  };

  const logMeal = async () => {
    if (!user || !analysis) return;
    try {
      let finalTime = consumptionTime;
      if (consumptionStatus === "now") {
        finalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      const now = new Date();
      const [hours, minutes] = finalTime.split(':');
      const mealDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes));
      
      const meal: MealLog = {
        userId: user.uid,
        timestamp: mealDate.toISOString(),
        meal_type: mealType,
        dish_name: analysis.dish_name,
        calories: analysis.nutrition.calories_kcal,
        protein: analysis.nutrition.protein_g,
        carbs: analysis.nutrition.carbs_g,
        fat: analysis.nutrition.fat_g,
        total_cost: analysis.cost.total_cost,
        restaurant_name: mode === "restaurant" ? restaurantName : undefined,
        mood_before: moodBefore,
        mood_after: moodAfter,
        hunger_rating: hungerRating,
        satiety_rating: satietyRating,
        enjoyment_rating: enjoymentRating,
        actual_price: restaurantPriceInfo?.price
      };

      if (scenario === "consume" && !showReflectionModal) {
        setPendingMealToLog(meal);
        setShowReflectionModal(true);
        return;
      }

      if (editingMeal?.id) {
        await setDoc(doc(db, "meals", editingMeal.id), meal);
        setEditingMeal(null);
        alert("Meal updated successfully!");
      } else {
        await addDoc(collection(db, "meals"), meal);
        alert("Meal logged successfully!");
      }
      
      // Reset reflection state
      setMoodBefore("");
      setMoodAfter("");
      setHungerRating(5);
      setSatietyRating(5);
      setEnjoymentRating(5);
      setShowReflectionModal(false);
      setPendingMealToLog(null);
    } catch (err) {
      console.error("Error logging meal:", err);
      setError("Failed to log meal.");
    }
  };

  const bulkDeleteMeals = async () => {
    if (!user || selectedMealIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedMealIds.length} entries?`)) return;
    
    try {
      await Promise.all(selectedMealIds.map(id => deleteDoc(doc(db, "meals", id))));
      setSelectedMealIds([]);
      alert("Selected meals deleted.");
    } catch (err) {
      console.error("Error bulk deleting:", err);
      setError("Failed to delete some meals.");
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
    try {
      await deleteDoc(doc(db, "meals", mealId));
    } catch (err) {
      console.error("Error deleting meal:", err);
      setError("Failed to delete meal.");
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


  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#FF7A00] selection:text-white">
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
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  mode === "home" ? "bg-white shadow-sm text-[#5E2B97]" : "text-[#9E9E9E] hover:text-[#5E2B97]"
                )}
              >
                <Home size={14} />
                Home
              </button>
              <button
                onClick={() => setMode("restaurant")}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
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

      {/* Mobile Mode Switcher */}
      <div className="md:hidden sticky top-[61px] z-40 bg-white/80 backdrop-blur-md border-b border-[#EEEEEE] px-4 py-2 flex justify-center">
        <div className="bg-[#F5F5F5] p-1 rounded-lg border border-[#EEEEEE] flex w-full max-w-xs">
          <button
            onClick={() => setMode("home")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
              mode === "home" ? "bg-white shadow-sm text-[#5E2B97]" : "text-[#9E9E9E]"
            )}
          >
            <Home size={12} />
            Home
          </button>
          <button
            onClick={() => setMode("restaurant")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
              mode === "restaurant" ? "bg-white shadow-sm text-[#5E2B97]" : "text-[#9E9E9E]"
            )}
          >
            <Store size={12} />
            Restaurant
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-16">
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
                      <div className="absolute top-0 right-0 p-4 md:p-10">
                        <div className={cn(
                          "px-2.5 py-1 md:px-5 md:py-2 rounded-full text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] md:tracking-[0.3em] border shadow-sm",
                          analysis.estimation_uncertainty === "low" ? "bg-green-50 text-green-700 border-green-100" :
                          analysis.estimation_uncertainty === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                          "bg-red-50 text-red-700 border-red-100"
                        )}>
                          {analysis.estimation_uncertainty}
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
                          { label: "Calories", value: analysis.nutrition.calories_kcal, unit: "kcal", color: "bg-[#F8F8F8]", textColor: "text-[#5E2B97]" },
                          { label: "Protein", value: analysis.nutrition.protein_g, unit: "g", color: "bg-blue-50", textColor: "text-blue-700" },
                          { label: "Carbs", value: analysis.nutrition.carbs_g, unit: "g", color: "bg-green-50", textColor: "text-green-700" },
                          { label: "Fat", value: analysis.nutrition.fat_g, unit: "g", color: "bg-yellow-50", textColor: "text-yellow-700" }
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
                              { label: "Calories", current: analysis.nutrition.calories_kcal, logged: dailyTotals.calories, goal: calorieGoal, unit: "kcal", color: "bg-[#5E2B97]" },
                              { label: "Protein", current: analysis.nutrition.protein_g, logged: dailyTotals.protein, goal: proteinGoal, unit: "g", color: "bg-blue-600" },
                              { label: "Carbs", current: analysis.nutrition.carbs_g, logged: dailyTotals.carbs, goal: carbsGoal, unit: "g", color: "bg-green-600" },
                              { label: "Fat", current: analysis.nutrition.fat_g, logged: dailyTotals.fat, goal: fatGoal, unit: "g", color: "bg-yellow-600" }
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
                        <div className="mt-6 md:mt-10 pt-6 md:pt-10 border-t border-[#F5F5F5] flex flex-col md:flex-row items-center gap-4 md:gap-6">
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
                      )}
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
                              <span className="text-2xl md:text-5xl font-black tracking-tighter">₹{analysis.cost.total_cost.toFixed(2)}</span>
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
      </main>

      <footer className="max-w-6xl mx-auto px-6 md:px-8 py-12 md:py-20 border-t border-[#EEEEEE] flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10 text-[#9E9E9E]">
        <div className="flex items-center gap-3">
          <Logo size={28} className="md:w-9 md:h-9" />
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[#4C1D95]">MetaboSutra v1.2</span>
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
                      <option value="active">Very Active</option>
                      <option value="extra">Extra Active</option>
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

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] md:max-h-[80vh] flex flex-col"
            >
              <div className="p-5 md:p-10 border-b border-[#F5F5F5]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-2xl font-black tracking-tight uppercase">Meal History</h2>
                  <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-[#F5F5F5] rounded-xl transition-colors">
                    <X size={18} className="md:w-6 md:h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-8">
                {history.length === 0 ? (
                  <div className="text-center py-12 md:py-20">
                    <History size={32} className="mx-auto text-[#D1D1D1] mb-3 md:w-12 md:h-12" />
                    <p className="text-[#9E9E9E] font-bold uppercase tracking-widest text-[7px] md:text-[10px]">No meals logged yet</p>
                  </div>
                ) : (
                  Object.entries(
                    history.reduce((acc, meal) => {
                      const date = new Date(meal.timestamp).toLocaleDateString(undefined, { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(meal);
                      return acc;
                    }, {} as Record<string, MealLog[]>)
                  ).map(([date, meals]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-[1px] flex-1 bg-[#EEEEEE]" />
                        <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-[#9E9E9E] whitespace-nowrap">
                          {date === new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) ? "Today" : date}
                        </h3>
                        <div className="h-[1px] flex-1 bg-[#EEEEEE]" />
                      </div>
                      
                      <div className="space-y-4">
                        {(meals as MealLog[]).map((meal) => (
                          <div key={meal.id} className="p-3.5 md:p-6 bg-[#F8F8F8] rounded-2xl md:rounded-3xl border border-[#EEEEEE] hover:border-[#1A1A1A] transition-all group">
                            <div className="flex justify-between items-start mb-2.5 md:mb-4">
                              <div>
                                <p className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.2em] text-[#FF6321] mb-0.5 md:mb-1">{meal.meal_type}</p>
                                <h4 className="text-sm md:text-lg font-black tracking-tight leading-none">{meal.dish_name}</h4>
                                {meal.restaurant_name && (
                                  <p className="text-[8px] md:text-[10px] font-bold text-[#9E9E9E] mt-1 md:mt-2 flex items-center gap-1">
                                    <MapPin size={7} className="md:w-2.5 md:h-2.5" /> {meal.restaurant_name}
                                  </p>
                                )}
                              </div>
                              <p className="text-[7px] md:text-[10px] font-mono font-bold text-[#9E9E9E]">
                                {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="grid grid-cols-4 gap-2 md:gap-4 pt-2.5 md:pt-4 border-t border-[#EEEEEE]">
                              <div>
                                <p className="text-[6px] md:text-[8px] font-black uppercase text-[#9E9E9E] mb-0.5 md:mb-1">Calories</p>
                                <p className="text-[9px] md:text-xs font-black">{meal.calories} kcal</p>
                              </div>
                              <div>
                                <p className="text-[6px] md:text-[8px] font-black uppercase text-[#9E9E9E] mb-0.5 md:mb-1">Protein</p>
                                <p className="text-[9px] md:text-xs font-black">{meal.protein}g</p>
                              </div>
                              <div>
                                <p className="text-[6px] md:text-[8px] font-black uppercase text-[#9E9E9E] mb-0.5 md:mb-1">Cost</p>
                                <p className="text-[9px] md:text-xs font-black text-[#FF6321]">₹{meal.total_cost.toFixed(0)}</p>
                              </div>
                              <div className="flex justify-end items-end">
                                <button 
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this meal entry?")) {
                                      meal.id && deleteMeal(meal.id);
                                    }
                                  }}
                                  className="p-1.5 md:p-2.5 bg-white rounded-lg md:rounded-xl text-[#D1D1D1] hover:text-[#FF4444] hover:bg-[#FFF5F5] transition-all shadow-sm border border-[#EEEEEE] active:scale-95"
                                  title="Delete entry"
                                >
                                  <Trash2 size={12} className="md:w-4 md:h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

