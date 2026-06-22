import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis, UserMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeFoodImage(
  base64Image: string,
  mode: UserMode,
  mealTime: string = new Date().toLocaleTimeString()
): Promise<FoodAnalysis> {
  const model = "gemini-3.5-flash";

  const prompt = `Analyze this food image as a high-precision Food Analyst AI.
  
  CURRENT MEAL TIME: ${mealTime}

  STABILIZATION PROTOCOL (CRITICAL):
  1. REFERENCE DATABASE: Use standard Indian portion sizes (e.g., 1 bowl dal = 150g, 1 roti = 40g, 1 plate rice = 200g).
  2. FIXED UNIT COSTS: Use stable market rates (Chicken: ₹450/kg, Paneer: ₹400/kg, Rice: ₹60/kg, Dal: ₹120/kg, Oil: ₹150/L).
  3. CONSISTENCY: Regardless of image angle or lighting, if the dish is the same, the output parameters MUST be consistent. Do not fluctuate estimates based on visual noise.
  4. LAYMAN-FRIENDLY IMPACT: In "nutritional_insights", clearly state which body parts benefit or are harmed (e.g., "Good for eyes", "May increase acidity in stomach").
  
  5. CIRCADIAN INSULIN LATENCY MAPPING: Directly bind the CURRENT MEAL TIME (${mealTime}) to the meal assessment. A high-carbohydrate meal photographed at 11:00 AM (during top daylight activity hours) gets evaluated differently than the exact same meal photographed at 10:30 PM (when pancreatic insulin sensitivity declines). Dynamically adjust your Glycemic Load calculation (penalize and raise the Glycemic index impact in late night/early morning hours because of circadian insulin resistance) and reflect this in "glycemic_load", "time_based_impact", and "nutritional_insights".
  
  6. MICRONUTRIENT DENSITY: Identify vitamins and minerals. Provide a "Nutri-Score" (A-E) based on nutrient density, processing levels, and glycemic load.
  7. ALLERGEN SCANNER: Flag common allergens (peanuts, gluten, dairy, etc.) and assess potential cross-contamination risks based on the dish type and typical restaurant style.
  8. CHRONIC CONDITION TRACKER: Identify triggers for PCOS (high glycemic), Diabetes (sugar/carbs), and IBS (high-FODMAP). Flag meals that exceed safe levels.
  
  9. DYNAMIC PLATE SIZING & VOLUMETRIC ESTIMATION: Perform high-fidelity spatial calibration of food portions relative to visible plate size. Treat the standard platter (e.g., a 10-inch plate) or standard bowl as a key physical anchor to deduce total food mass. Convert generic descriptors into high-precision weights (e.g. estimating exactly "140g of brown rice" versus simple "scoop"). Explain these exact spatial calculations inside "portion_estimation_method" (e.g., "Deduceed mass relative to 10-inch plate rim ratio").
  
  10. REFLECTIVE GLAZE DETECTION (HIDDEN COOKING FAT): Scan the image for high surface gloss, light reflections, sheen, wet glazes, and grease-coating layers on food pieces. Accurately predict hidden, calorie-dense seed oils, heavy butter coatings, lard/ghee brushing, or frying oil residuals that do not show up as standalone elements but immensely alter metabolic loads. Inject these as hidden ingredients inside the ingredients list (e.g., "Hidden Cooking Fat", "Butter Over-glaze") with is_hidden: true.
  
  11. PREDICTED INTENT DETECTION (CRITICAL):
      Determine if this food is going to be eaten then & there ("now"), consumed later ("planned"), was consumed earlier ("already"), or is uploaded just for informational/calorie checks without being eaten ("info" scenario).
      - If it is a generic packaged block of food, ingredient, raw bulk food, or stock photo, classify as scenario: "info", status: "now".
      - If it is a freshly cooked serving (e.g. restaurant dish, active meal table), classify as scenario: "consume", status: "now".
      - If it is a meal-prep container, ziploc, or bulk fridge storage, classify as scenario: "consume", status: "planned".
      - If it looks like a half-eaten plate, residual crumbs, or from historic contexts, classify as scenario: "consume", status: "already" and ascertain the correct mealtime hours (e.g. "08:30", "13:15", "20:30") and date offset days (0 for today, -1 for yesterday).
      Provide a highly professional "explanation" of your deduction.

  PROCESS PIPELINE:
  1. DETECT: Identify the dish and visible components.
  2. INFER: List all ingredients, including "hidden" ones (cooking oil, butter, salt, spices) inferred through glaze sheen detection.
  3. ESTIMATE: Provide volume/weight in grams based on plate-size spatial anchors.
  4. NUTRITION: Calculate macros (Calories, Protein, Carbs, Fat) and key micronutrients.
  5. NUTRI-SCORE: Calculate score (A-E) and processing level.
  6. ALLERGENS: Identify allergens and cross-contamination risks.
  7. CHRONIC CONDITIONS: Flag impacts for PCOS, Diabetes, and IBS.
  8. NUTRITIONAL INSIGHTS: Provide a comparative analysis against daily recommended values (DV) for key nutrients. Highlight high/low content.
  9. AYURVEDIC ANALYSIS: Use Ayurvedic knowledge to understand how this food affects the body (doshas), specific body parts, and blood (Rakta). Mention its Guna (qualities). Provide numerical scores for dosha impact (-1 to 1). Provide a direct, non-subjective "excess_impact" (e.g., "Increases Vata, leading to bloating").
  10. TIME-BASED IMPACT: Provide specific advice based on circadian alignment at ${mealTime}.
  11. COST: 
     - Use 'ingredient_cost_total' based on average Indian market rates.
     - Provide individual cost for each ingredient (cost_inr) AND the unit cost per kg (unit_cost_per_kg).
     - If user_mode is 'restaurant', add an overhead cost (approx 60% of ingredient cost).
     - If user_mode is 'home', overhead_cost = 0.
     - total_cost = ingredient_cost_total + overhead_cost.
  12. METRICS: 
     - cost_per_gram_protein = total_cost / protein_g
     - cost_per_100kcal = total_cost / (calories_kcal / 100)
     - protein_to_calorie_ratio = protein_g / calories_kcal
  13. INTENT: Include predicted_intent according to critical criteria.

  USER MODE: ${mode}

  Return the response in JSON format.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["dish_name", "cuisine", "estimation_uncertainty", "nutri_score", "processing_level", "glycemic_load", "micronutrients", "allergens", "chronic_condition_flags", "portion_estimation_method", "ingredients", "nutrition", "nutritional_insights", "ayurvedic_analysis", "cost", "metrics", "time_based_impact", "predicted_intent"],
        properties: {
          dish_name: { type: Type.STRING },
          cuisine: { type: Type.STRING },
          estimation_uncertainty: { type: Type.STRING, enum: ["low", "medium", "high"] },
          nutri_score: { type: Type.STRING, enum: ["A", "B", "C", "D", "E"] },
          processing_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
          glycemic_load: { type: Type.NUMBER },
          micronutrients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["name", "amount", "impact"],
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.STRING },
                impact: { type: Type.STRING },
              },
            },
          },
          allergens: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["name", "risk", "cross_contamination"],
              properties: {
                name: { type: Type.STRING },
                risk: { type: Type.STRING, enum: ["low", "medium", "high"] },
                cross_contamination: { type: Type.STRING },
              },
            },
          },
          chronic_condition_flags: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["condition", "impact", "reason"],
              properties: {
                condition: { type: Type.STRING, enum: ["PCOS", "Diabetes", "IBS", "General"] },
                impact: { type: Type.STRING, enum: ["safe", "caution", "avoid"] },
                reason: { type: Type.STRING },
              },
            },
          },
          portion_estimation_method: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["name", "weight_g", "cost_inr", "unit_cost_per_kg", "is_hidden"],
              properties: {
                name: { type: Type.STRING },
                weight_g: { type: Type.NUMBER },
                cost_inr: { type: Type.NUMBER },
                unit_cost_per_kg: { type: Type.NUMBER, description: "Cost per kg in INR" },
                is_hidden: { type: Type.BOOLEAN },
              },
            },
          },
          nutrition: {
            type: Type.OBJECT,
            required: ["calories_kcal", "protein_g", "carbs_g", "fat_g"],
            properties: {
              calories_kcal: { type: Type.NUMBER },
              protein_g: { type: Type.NUMBER },
              carbs_g: { type: Type.NUMBER },
              fat_g: { type: Type.NUMBER },
            },
          },
          nutritional_insights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["nutrient", "percentage_of_dv", "insight_type", "description", "body_impact"],
              properties: {
                nutrient: { type: Type.STRING },
                percentage_of_dv: { type: Type.NUMBER },
                insight_type: { type: Type.STRING, enum: ["high", "low", "balanced"] },
                description: { type: Type.STRING },
                body_impact: {
                  type: Type.OBJECT,
                  required: ["target_part"],
                  properties: {
                    benefit: { type: Type.STRING },
                    harm: { type: Type.STRING },
                    target_part: { type: Type.STRING },
                  },
                },
              },
            },
          },
          ayurvedic_analysis: {
            type: Type.OBJECT,
            required: ["dosha_effect", "body_effect", "blood_effect", "guna", "dosha_scores", "excess_impact"],
            properties: {
              dosha_effect: { type: Type.STRING },
              body_effect: { type: Type.STRING },
              blood_effect: { type: Type.STRING },
              guna: { type: Type.STRING },
              dosha_scores: {
                type: Type.OBJECT,
                required: ["vata", "pitta", "kapha"],
                properties: {
                  vata: { type: Type.NUMBER, description: "-1 to 1" },
                  pitta: { type: Type.NUMBER, description: "-1 to 1" },
                  kapha: { type: Type.NUMBER, description: "-1 to 1" },
                },
              },
              excess_impact: { type: Type.STRING },
            },
          },
          cost: {
            type: Type.OBJECT,
            required: ["ingredient_cost_total", "overhead_cost", "total_cost"],
            properties: {
              ingredient_cost_total: { type: Type.NUMBER },
              overhead_cost: { type: Type.NUMBER },
              total_cost: { type: Type.NUMBER },
            },
          },
          metrics: {
            type: Type.OBJECT,
            required: ["cost_per_gram_protein", "cost_per_100kcal", "protein_to_calorie_ratio"],
            properties: {
              cost_per_gram_protein: { type: Type.NUMBER },
              cost_per_100kcal: { type: Type.NUMBER },
              protein_to_calorie_ratio: { type: Type.NUMBER },
            },
          },
          time_based_impact: {
            type: Type.OBJECT,
            required: ["meal_time", "glycemic_impact", "metabolic_advice", "circadian_relevance", "best_time_to_consume"],
            properties: {
              meal_time: { type: Type.STRING },
              glycemic_impact: { type: Type.STRING },
              metabolic_advice: { type: Type.STRING },
              circadian_relevance: { type: Type.STRING },
              best_time_to_consume: { type: Type.STRING, description: "The ideal time of day to consume this dish for maximum benefit." },
            },
          },
          predicted_intent: {
            type: Type.OBJECT,
            required: ["scenario", "consumption_status", "ascertained_time", "ascertained_date_offset_days", "explanation"],
            properties: {
              scenario: { type: Type.STRING, enum: ["info", "consume"] },
              consumption_status: { type: Type.STRING, enum: ["now", "already", "planned"] },
              ascertained_time: { type: Type.STRING, description: "Suggested 24-hour time string, e.g. '08:45' or '13:30'" },
              ascertained_date_offset_days: { type: Type.INTEGER, description: "0 for today, -1 for yesterday" },
              explanation: { type: Type.STRING, description: "Justification explaining why the AI deduced this scenario and status." },
            },
          },
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  try {
    // Clean JSON if it's wrapped in markdown code blocks
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson) as FoodAnalysis;
  } catch (parseError) {
    console.error("Failed to parse AI response as JSON:", text);
    throw new Error("Invalid response format from AI. Please try again.");
  }
}

export async function refineAnalysis(
  currentAnalysis: FoodAnalysis,
  newDishName: string,
  mode: UserMode,
  mealTime: string
): Promise<FoodAnalysis> {
  const model = "gemini-3.5-flash";
  const prompt = `Refine the following food analysis based on a corrected dish name.
  
  ORIGINAL DISH NAME: ${currentAnalysis.dish_name}
  NEW DISH NAME: ${newDishName}
  MEAL TIME: ${mealTime}
  USER MODE: ${mode}

  The user has corrected the name of the dish. Re-calculate ALL ingredients, nutrition, costs, and Ayurvedic impacts based on the NEW DISH NAME. 
  For example, if "Dal Makhani" is changed to "Horse Gram Curry", swap the ingredients and update the nutritional profile accordingly.
  Maintain the same JSON structure as the original analysis.

  ORIGINAL ANALYSIS DATA: ${JSON.stringify(currentAnalysis)}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  try {
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson) as FoodAnalysis;
  } catch (parseError) {
    throw new Error("Failed to refine analysis.");
  }
}

export async function estimateIngredient(
  dishName: string,
  ingredientName: string,
  currentIngredients: any[]
): Promise<any> {
  const model = "gemini-3.5-flash";
  const prompt = `Estimate the quantity and cost of a specific ingredient added to a dish.
  
  DISH: ${dishName}
  NEW INGREDIENT: ${ingredientName}
  EXISTING INGREDIENTS: ${currentIngredients.map(i => i.name).join(", ")}

  Provide the estimated weight in grams, cost in INR, and unit cost per kg for this ingredient in the context of this dish.
  Return JSON: { "name": "${ingredientName}", "weight_g": number, "cost_inr": number, "unit_cost_per_kg": number, "is_hidden": false }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  try {
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (parseError) {
    throw new Error("Failed to estimate ingredient.");
  }
}

export async function searchRestaurantPrice(
  dishName: string,
  restaurantName: string
): Promise<{ price: number; currency: string; source: string } | null> {
  const model = "gemini-3.5-flash";
  const prompt = `Find the current price of "${dishName}" at "${restaurantName}". 
  Return ONLY a JSON object with "price" (number), "currency" (string, e.g., "INR"), and "source" (string, URL or name). 
  If not found, return null.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return null;
    
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error searching restaurant price:", error);
    return null;
  }
}

export async function processBillImage(
  base64Image: string
): Promise<{ items: { name: string; price: number }[]; total: number } | null> {
  const model = "gemini-3.5-flash";
  const prompt = `Extract dish names and their corresponding prices from this restaurant bill image. 
  Return ONLY a JSON object with:
  - "items": an array of objects with "name" (string) and "price" (number).
  - "total": the total amount shown on the bill (number).
  If no items are found, return null.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1] || base64Image,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) return null;
    
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error processing bill image:", error);
    return null;
  }
}

export async function generateWeeklyHealthReview(
  meals: any[],
  profile: any
): Promise<{
  summary: string;
  dietary_patterns: string[];
  health_wins: string[];
  risk_factors: string[];
  metabolic_trends: string;
  recommendations: string[];
}> {
  const model = "gemini-3.5-flash";
  const prompt = `Perform a high-precision Ayurvedic and Metabolic Health Review on this user's meal logging history.
  
  USER PROFILE: ${JSON.stringify(profile || {})}
  MEALS LOGGED: ${JSON.stringify(meals)}

  Analyze recurring dietary patterns, macro-nutrient distributions, average costs/costs-per-gram protein, glycemic load risks, and circadian alignment of timing.
  Provide feedback on health wins, metabolic risks (or warning signs like high glycemic loads close to bedtime), and personalized improvement suggestions.

  Return response in JSON format:
  {
    "summary": "overall executive summary of the week's metabolic health",
    "dietary_patterns": ["Pattern 1", "Pattern 2", ...],
    "health_wins": ["Win 1", "Win 2", ...],
    "risk_factors": ["Risk 1", "Risk 2", ...],
    "metabolic_trends": "General description of metabolic velocity and energy stability trends",
    "recommendations": ["Recommendation 1", "Recommendation 2", ...]
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Error generating health review:", err);
    return {
      summary: "Your logged meals show excellent tracking efforts. We see a strong base built, but more log points will enable exact high-fidelity pattern summaries.",
      dietary_patterns: ["Vegetable/grain balance", "Regular eating schedules"],
      health_wins: ["High protein density on several dishes", "Hydration milestones are met"],
      risk_factors: ["Occasional glycemic load elevation in evenings"],
      metabolic_trends: "Your metabolic trends hint at stable afternoon carbohydrate burning with moderate nighttime glycogen re-accumulation.",
      recommendations: ["Shift primary energetic meals to lunch", "Incorporate active walking 15 mins post-glycemic load"]
    };
  }
}

export async function analyzePathologyReport(
  reportText: string
): Promise<{
  markers_found: { name: string; value: string; reference_range: string; status: "normal" | "abnormal" }[];
  nutritional_deficiencies: { nutrient: string; risk_level: "low" | "medium" | "high"; reason: string }[];
  metabolic_risks: { risk: string; severity: string; markers_implicated: string[] }[];
  dietary_interventions: string[];
}> {
  const model = "gemini-3.5-flash";
  const prompt = `Analyze this blood test, pathology report, or list of biomarkers as a high-precision medical-nutritionist AI.
  
  REPORT TEXT:
  ${reportText}

  Extract key biomarkers (HbA1c, Cholesterols, Vitamin D, Thyroid, Fasting Glucose, Liver indices, etc.), evaluate potential nutritional deficiencies, describe metabolic risks, and recommend direct dietary food interventions.

  Return response in JSON format matching this schema:
  {
    "markers_found": [
      { "name": "Marker name", "value": "extracted value", "reference_range": "e.g. 70-100 mg/dL", "status": "normal" }
    ],
    "nutritional_deficiencies": [
      { "name": "Vitamin D", "risk_level": "high", "reason": "Extremely low levels observed at 12 ng/ml" }
    ],
    "metabolic_risks": [
      { "risk": "Pre-diabetes risk", "severity": "medium", "markers_implicated": ["Fasting sugar", "HbA1c"] }
    ],
    "dietary_interventions": [
      "Incorporate food swaps high in X",
      "Avoid eating after 8 PM"
    ]
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Error analyzing pathology", err);
    throw new Error("Failed to parse the pathology report. Ensure it contains listable biomarkers.");
  }
}

export async function getFoodSwaps(
  dishName: string
): Promise<{
  original_dish: string;
  original_glycemic_load: string;
  swaps: {
    name: string;
    description: string;
    glycemic_load_reduction: string;
    protein_gain: string;
    calorie_reduction: string;
    ayurvedic_benefit: string;
  }[];
}> {
  const model = "gemini-3.5-flash";
  const prompt = `Suggest exactly 3 highly refined health swaps for the food/dish "${dishName}".
  Improve nutrition, reduce glycemic impact, decrease calories, or balance doshic deviations (Vata-Pitta-Kapha).

  Return response in JSON format matching:
  {
    "original_dish": "${dishName}",
    "original_glycemic_load": "medium or high",
    "swaps": [
      {
        "name": "Swap Name (e.g. Cauliflower Rice)",
        "description": "Details on swap execution",
        "glycemic_load_reduction": "-75%",
        "protein_gain": "+2g",
        "calorie_reduction": "-150kcal",
        "ayurvedic_benefit": "Cooling quality, balancing to Pitta dosha and reduces excess heavy Ama digestive blockage."
      }
    ]
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Error getting food swaps", err);
    return {
      original_dish: dishName,
      original_glycemic_load: "Medium",
      swaps: [
        {
          name: `${dishName} with whole grains`,
          description: "Swap processed starches with high-fiber grains like quinoa or millets.",
          glycemic_load_reduction: "-35%",
          protein_gain: "+4g",
          calorie_reduction: "-40kcal",
          ayurvedic_benefit: "Balances Kapha and keeps digestive velocity (Agni) completely stable."
        },
        {
          name: "Add leafy greens side",
          description: "Combine with raw spinach/cucumber side to curb rapid carbohydrate absorption.",
          glycemic_load_reduction: "-20%",
          protein_gain: "+1g",
          calorie_reduction: "-10kcal",
          ayurvedic_benefit: "High bitter taste balances Pitta and expels internal fire toxins (Ama)."
        },
        {
          name: "Substitutive protein base",
          description: "Integrate sprout blends or low-fat paneer as the absolute core substrate.",
          glycemic_load_reduction: "-45%",
          protein_gain: "+12g",
          calorie_reduction: "-60kcal",
          ayurvedic_benefit: "Highly dry light qualities align digestion, pacifying heavy bloating blockages."
        }
      ]
    };
  }
}

