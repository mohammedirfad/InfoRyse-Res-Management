/**
 * Curated high-resolution culinary photography for dishes and categories.
 * Guarantees every dish on the menu has a delicious, mouth-watering presentation
 * even before the restaurant owner uploads custom photos.
 */

export const DEFAULT_DISH_IMAGES: Record<string, string> = {
  "masala dosa": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=700&auto=format&fit=crop&q=80",
  "idli sambar": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=700&auto=format&fit=crop&q=80",
  "poha": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=700&auto=format&fit=crop&q=80",
  "pancake stack": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=700&auto=format&fit=crop&q=80",
  "paneer tikka": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=700&auto=format&fit=crop&q=80",
  "chicken wings": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=700&auto=format&fit=crop&q=80",
  "crispy corn": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=700&auto=format&fit=crop&q=80",
  "hara bhara kebab": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&auto=format&fit=crop&q=80",
  "truffle mushroom pasta": "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=700&auto=format&fit=crop&q=80",
  "paneer butter masala": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=700&auto=format&fit=crop&q=80",
  "chicken biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=700&auto=format&fit=crop&q=80",
  "margherita pizza": "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=700&auto=format&fit=crop&q=80",
  "butter chicken": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=700&auto=format&fit=crop&q=80",
  "dal makhani": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700&auto=format&fit=crop&q=80",
  "fresh lime mint": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=700&auto=format&fit=crop&q=80",
  "mango lassi": "https://images.unsplash.com/photo-1546173159-315724a31696?w=700&auto=format&fit=crop&q=80",
  "cold coffee": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=700&auto=format&fit=crop&q=80",
  "masala chai": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=700&auto=format&fit=crop&q=80",
  "chocolate lava cake": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=700&auto=format&fit=crop&q=80",
  "gulab jamun": "https://images.unsplash.com/photo-1605197154344-93883a48e788?w=700&auto=format&fit=crop&q=80",
  "mango kulfi": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=700&auto=format&fit=crop&q=80",
  "masala fries": "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=700&auto=format&fit=crop&q=80",
  "veg cheese sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=700&auto=format&fit=crop&q=80",
  "classic burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=80",
  "garlic naan": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&auto=format&fit=crop&q=80",
};

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=700&auto=format&fit=crop&q=80",
  starters: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=700&auto=format&fit=crop&q=80",
  "main course": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700&auto=format&fit=crop&q=80",
  beverages: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=700&auto=format&fit=crop&q=80",
  desserts: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=700&auto=format&fit=crop&q=80",
  snacks: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=700&auto=format&fit=crop&q=80",
  lunch: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=700&auto=format&fit=crop&q=80",
  dinner: "https://images.unsplash.com/photo-1544025162-d76694265947?w=700&auto=format&fit=crop&q=80",
};

export function getDishImageUrl(name: string, categoryName?: string, existingUrl?: string | null): string {
  if (existingUrl && existingUrl.trim().length > 0) return existingUrl;

  const n = (name || "").toLowerCase().trim();
  // Exact match
  if (DEFAULT_DISH_IMAGES[n]) return DEFAULT_DISH_IMAGES[n];

  // Keyword match
  for (const [key, url] of Object.entries(DEFAULT_DISH_IMAGES)) {
    if (n.includes(key) || key.includes(n)) return url;
  }

  // Category match
  if (categoryName) {
    const c = categoryName.toLowerCase().trim();
    for (const [catKey, url] of Object.entries(CATEGORY_FALLBACK_IMAGES)) {
      if (c.includes(catKey) || catKey.includes(c)) return url;
    }
  }

  // General culinary fallback
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&auto=format&fit=crop&q=80";
}
