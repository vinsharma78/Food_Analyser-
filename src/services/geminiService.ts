import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis, UserMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeFoodImage(
  base64Image: string,
  mode: UserMode,
  mealTime: string = new Date().toLocaleTimeString()
): Promise<FoodAnalysis> {
  const model = "gemini-3-flash-preview";

  const prompt = `Analyze this food image as a high-precision Food Analyst AI.
  
  CURRENT MEAL TIME: ${mealTime}

  STABILIZATION PROTOCOL (CRITICAL):
  1. REFERENCE DATABASE: Use standard Indian portion sizes (e.g., 1 bowl dal = 150g, 1 roti = 40g, 1 plate rice = 200g).
  2. FIXED UNIT COSTS: Use stable market rates (Chicken: ₹450/kg, Paneer: ₹400/kg, Rice: ₹60/kg, Dal: ₹120/kg, Oil: ₹150/L).
  3. CONSISTENCY: Regardless of image angle or lighting, if the dish is the same, the output parameters MUST be consistent. Do not fluctuate estimates based on visual noise.
  4. LAYMAN-FRIENDLY IMPACT: In "nutritional_insights", clearly state which body parts benefit or are harmed (e.g., "Good for eyes", "May increase acidity in stomach").
  5. TIME-BASED ANALYSIS: Analyze the physiological impact of consuming this specific food at the CURRENT MEAL TIME (${mealTime}). Consider glycemic response (insulin spikes), digestion speed, and circadian rhythm. (e.g., fruit juice on an empty stomach in the morning vs. after a heavy lunch).
  6. MICRONUTRIENT DENSITY: Identify vitamins and minerals. Provide a "Nutri-Score" (A-E) based on nutrient density, processing levels, and glycemic load.
  7. ALLERGEN SCANNER: Flag common allergens (peanuts, gluten, dairy, etc.) and assess potential cross-contamination risks based on the dish type and typical restaurant style.
  8. CHRONIC CONDITION TRACKER: Identify triggers for PCOS (high glycemic), Diabetes (sugar/carbs), and IBS (high-FODMAP). Flag meals that exceed safe levels.
  9. PORTION ESTIMATION: Use "Virtual Bite" logic (simulating RGB-D fusion networks) to estimate volume and mass with high accuracy.

  PROCESS PIPELINE:
  1. DETECT: Identify the dish and visible components.
  2. INFER: List all ingredients, including "hidden" ones (cooking oil, butter, salt, spices).
  3. ESTIMATE: Provide volume/weight in grams based on standard serving sizes.
  4. NUTRITION: Calculate macros (Calories, Protein, Carbs, Fat) and key micronutrients.
  5. NUTRI-SCORE: Calculate score (A-E) and processing level.
  6. ALLERGENS: Identify allergens and cross-contamination risks.
  7. CHRONIC CONDITIONS: Flag impacts for PCOS, Diabetes, and IBS.
  8. NUTRITIONAL INSIGHTS: Provide a comparative analysis against daily recommended values (DV) for key nutrients. Highlight high/low content.
  9. AYURVEDIC ANALYSIS: Use Ayurvedic knowledge to understand how this food affects the body (doshas), specific body parts, and blood (Rakta). Mention its Guna (qualities). Provide numerical scores for dosha impact (-1 to 1). Provide a direct, non-subjective "excess_impact" (e.g., "Increases Vata, leading to bloating").
  10. TIME-BASED IMPACT: Provide specific advice based on the meal time provided.
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
        required: ["dish_name", "cuisine", "estimation_uncertainty", "nutri_score", "processing_level", "glycemic_load", "micronutrients", "allergens", "chronic_condition_flags", "portion_estimation_method", "ingredients", "nutrition", "nutritional_insights", "ayurvedic_analysis", "cost", "metrics", "time_based_impact"],
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
  const model = "gemini-3-flash-preview";
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
  const model = "gemini-3-flash-preview";
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
  const model = "gemini-3-flash-preview";
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
  const model = "gemini-3-flash-preview";
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
