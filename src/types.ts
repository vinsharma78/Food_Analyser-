export interface Ingredient {
  name: string;
  weight_g: number;
  cost_inr: number;
  unit_cost_per_kg: number; // Added for manual editing
  is_hidden: boolean;
}

export interface UserProfile {
  userId: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: "male" | "female" | "other";
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  daily_calorie_goal: number;
}

export interface MealLog {
  id?: string;
  userId: string;
  timestamp: string;
  meal_type: "breakfast" | "brunch" | "lunch" | "dinner" | "snack";
  dish_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  total_cost: number;
  restaurant_name?: string;
  mood_before?: string;
  mood_after?: string;
  hunger_rating?: number;
  satiety_rating?: number;
  enjoyment_rating?: number;
  bill_image_url?: string;
  actual_price?: number;
}

export interface Micronutrient {
  name: string;
  amount: string;
  impact: string;
}

export interface Allergen {
  name: string;
  risk: "high" | "medium" | "low";
  cross_contamination: string;
}

export interface ChronicConditionFlag {
  condition: "PCOS" | "Diabetes" | "IBS" | "General";
  impact: "safe" | "caution" | "avoid";
  reason: string;
}

export interface NutritionalInsight {
  nutrient: string;
  percentage_of_dv: number;
  insight_type: "high" | "low" | "balanced";
  description: string;
  body_impact: {
    benefit?: string; // Layman-friendly benefit (e.g., "Good for eyes")
    harm?: string; // Layman-friendly harm (e.g., "May increase acidity")
    target_part: string; // Specific body part (e.g., "Eyes", "Stomach")
  };
}

export interface AyurvedicAnalysis {
  dosha_effect: string; // e.g., "Increases Pitta, Decreases Vata"
  body_effect: string; // Effect on specific body parts
  blood_effect: string; // Effect on blood (Rakta)
  guna: string; // Qualities (e.g., Laghu, Guru, Snigdha)
  dosha_scores: {
    vata: number; // -1 to 1 (decrease to increase)
    pitta: number;
    kapha: number;
  };
  excess_impact: string; // Direct impact if consumed in excess (e.g., "Increases Vata, leading to bloating")
}

export interface Nutrition {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Cost {
  ingredient_cost_total: number;
  overhead_cost: number;
  total_cost: number;
}

export interface Metrics {
  cost_per_gram_protein: number;
  cost_per_100kcal: number;
  protein_to_calorie_ratio: number;
}

export interface TimeBasedImpact {
  meal_time: string;
  glycemic_impact: string;
  metabolic_advice: string;
  circadian_relevance: string;
  best_time_to_consume: string; // Added for informational scenario
}

export interface FoodAnalysis {
  dish_name: string;
  cuisine: string;
  estimation_uncertainty: "low" | "medium" | "high";
  nutri_score: "A" | "B" | "C" | "D" | "E";
  processing_level: "low" | "medium" | "high";
  glycemic_load: number;
  micronutrients: Micronutrient[];
  allergens: Allergen[];
  chronic_condition_flags: ChronicConditionFlag[];
  portion_estimation_method: string;
  ingredients: Ingredient[];
  nutrition: Nutrition;
  nutritional_insights: NutritionalInsight[];
  ayurvedic_analysis: AyurvedicAnalysis;
  cost: Cost;
  metrics: Metrics;
  time_based_impact: TimeBasedImpact;
}

export type UserMode = "home" | "restaurant";
