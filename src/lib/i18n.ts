"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type SupportedLanguage = "en" | "kn" | "ml" | "hi" | "ta";

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
];

// UI Translation Dictionary (0ms instant lookup)
export const UI_TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Navigation & Headers
    menu: "Menu",
    cart: "Cart",
    table: "Table",
    dineIn: "Dine In",
    kitchenActive: "Kitchen Active",
    closed: "Closed",
    exploreMenu: "Explore Full Menu",
    viewMenuAndOrder: "View Full Menu & Order",
    viewTableCart: "View Table Cart",
    needAssistance: "Need water, extra cutlery or waiter? Tap here",
    searchPlaceholder: "Search dishes, drinks, desserts…",
    all: "All",
    veg: "Veg",
    nonVeg: "Non-Veg",
    chefsSpecial: "Chef's Special",
    bestseller: "Bestseller",
    spicy: "Spicy",
    fastKitchen: "Fast Kitchen",
    dishes: "Dishes",
    sections: "Sections",

    // Food actions
    add: "ADD",
    added: "Added",
    item: "Item",
    items: "Items",
    inCart: "in cart",
    viewCart: "View Cart",
    orderMore: "Order More",
    emptyCart: "Your cart is empty",
    addDishesToCart: "Explore delicious dishes and add them to order",
    browseMenu: "Browse Menu",

    // Cart & Bill
    orderAndTableTab: "Order & Table Tab",
    newOrder: "Current Cart",
    confirmedOrders: "Table Bill & Tab",
    runningTotalBill: "Running Total Bill",
    rounds: "By Order Rounds",
    consolidatedBill: "Consolidated Items Bill",
    round: "Round",
    orderedBy: "Ordered by",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total",
    totalForOrder: "Total for this order",
    proceedToCheckout: "Proceed to checkout",
    placeOrder: "Place Order",
    placingOrder: "Placing Order…",
    orderSuccess: "Order Placed Successfully!",
    orderSummary: "Order Summary",
    paymentMethod: "Payment Method",
    payAtRestaurant: "Pay at Restaurant",
    specialInstructions: "Special Instructions",
    specialInstructionsPlaceholder: "e.g. Less spicy, no onions, extra cutlery…",
    contactDetails: "Contact Details",
    yourName: "Your Name *",
    mobileNumber: "Mobile Number *",
    emailAddress: "Email Address",
    tableGuest: "Table Guest",
    tableSharedTabDesc: "All dishes ordered at this table merge into this single bill. Settle at the counter when you finish dining.",
    noActiveOrdersYet: "No active orders yet",
    startOrderingDesc: "When you or anyone at your table places an order, it will appear here in real time!",

    // Assistance
    callWaiter: "Call Waiter",
    waterBottle: "Water Bottle",
    extraCutlery: "Extra Cutlery",
    payBill: "Pay Bill / Settle",
    tissues: "Tissues",
    cleaning: "Clean Table",
    sentSuccess: "Request Sent to Staff!",
    staffOnTheWay: "Our team has been notified and is coming to your table.",

    // Discounts
    specialOffer: "Special Offer",
    flatDiscount: "Flat",
    offApplied: "OFF applied!",
  },

  kn: {
    // Navigation & Headers
    menu: "ಮೆನು",
    cart: "ಕಾರ್ಟ್",
    table: "ಟೇಬಲ್",
    dineIn: "ಊಟ ಇಲ್ಲೇ",
    kitchenActive: "ಅಡುಗೆ ಮನೆ ಸಕ್ರಿಯ",
    closed: "ಮುಚ್ಚಲಾಗಿದೆ",
    exploreMenu: "ಸಂಪೂರ್ಣ ಮೆನು ನೋಡಿ",
    viewMenuAndOrder: "ಮೆನು ನೋಡಿ ಆರ್ಡರ್ ಮಾಡಿ",
    viewTableCart: "ಟೇಬಲ್ ಕಾರ್ಟ್ ನೋಡಿ",
    needAssistance: "ನೀರು, ಚಮಚ ಅಥವಾ ಸರ್ವರ್ ಸಹಾಯ ಬೇಕೇ? ಇಲ್ಲಿ ಒತ್ತಿರಿ",
    searchPlaceholder: "ತಿಂಡಿಗಳು, ಪಾನೀಯಗಳು ಹುಡುಕಿ…",
    all: "ಎಲ್ಲವೂ",
    veg: "ವೆಜ್",
    nonVeg: "ನಾನ್-ವೆಜ್",
    chefsSpecial: "ಶೆಫ್ ವಿಶೇಷ",
    bestseller: "ಅತ್ಯಂತ ಜನಪ್ರಿಯ",
    spicy: "ಖಾರ",
    fastKitchen: "ತ್ವರಿತ ಸೇವೆ",
    dishes: "ಖಾದ್ಯಗಳು",
    sections: "ವಿಭಾಗಗಳು",

    // Food actions
    add: "ಸೇರಿಸಿ",
    added: "ಸೇರಿಸಲಾಗಿದೆ",
    item: "ಐಟಂ",
    items: "ಐಟಂಗಳು",
    inCart: "ಕಾರ್ಟ್‌ನಲ್ಲಿದೆ",
    viewCart: "ಕಾರ್ಟ್ ನೋಡಿ",
    orderMore: "ಇನ್ನಷ್ಟು ಆರ್ಡರ್ ಮಾಡಿ",
    emptyCart: "ನಿಮ್ಮ ಕಾರ್ಟ್ ಖಾಲಿಯಾಗಿದೆ",
    addDishesToCart: "ಸ್ವಾದಿಷ್ಟ ತಿನಿಸುಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ",
    browseMenu: "ಮೆನು ಪರಿಶೀಲಿಸಿ",

    // Cart & Bill
    orderAndTableTab: "ಆರ್ಡರ್ ಮತ್ತು ಟೇಬಲ್ ಬಿಲ್",
    newOrder: "ಈಗಿನ ಕಾರ್ಟ್",
    confirmedOrders: "ಟೇಬಲ್ ಬಿಲ್ & ರಸೀದಿ",
    runningTotalBill: "ಚಾಲ್ತಿ ಬಿಲ್ ಮೊತ್ತ",
    rounds: "ಆರ್ಡರ್ ಸುತ್ತುಗಳು",
    consolidatedBill: "ಒಟ್ಟು ಐಟಂಗಳ ಬಿಲ್",
    round: "ಸುತ್ತು",
    orderedBy: "ಆರ್ಡರ್ ಮಾಡಿದವರು",
    subtotal: "ಉಪಮೊತ್ತ",
    discount: "ರಿಯಾಯಿತಿ",
    total: "ಒಟ್ಟು ಮೊತ್ತ",
    totalForOrder: "ಈ ಆರ್ಡರ್‌ಗೆ ಒಟ್ಟು ಮೊತ್ತ",
    proceedToCheckout: "ಚೆಕ್‌ಔಟ್‌ಗೆ ಮುಂದುವರಿಯಿರಿ",
    placeOrder: "ಆರ್ಡರ್ ಮಾಡಿ",
    placingOrder: "ಆರ್ಡರ್ ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ…",
    orderSuccess: "ಆರ್ಡರ್ ಯಶಸ್ವಿಯಾಗಿದೆ!",
    orderSummary: "ಆರ್ಡರ್ ಸಾರಾಂಶ",
    paymentMethod: "ಪಾವತಿ ವಿಧಾನ",
    payAtRestaurant: "ರೆಸ್ಟೋರೆಂಟ್‌ನಲ್ಲಿ ಪಾವತಿಸಿ",
    specialInstructions: "ವಿಶೇಷ ಸೂಚನೆಗಳು",
    specialInstructionsPlaceholder: "ಉದಾ: ಕಡಿಮೆ ಖಾರ, ಈರುಳ್ಳಿ ಬೇಡ, ಹೆಚ್ಚುವರಿ ಚಮಚ…",
    contactDetails: "ಸಂಪರ್ಕ ವಿವರಗಳು",
    yourName: "ನಿಮ್ಮ ಹೆಸರು *",
    mobileNumber: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ *",
    emailAddress: "ಇಮೇಲ್ ವಿಳಾಸ",
    tableGuest: "ಟೇಬಲ್ ಅತಿಥಿ",
    tableSharedTabDesc: "ಈ ಟೇಬಲ್‌ನಲ್ಲಿ ಆರ್ಡರ್ ಮಾಡಲಾದ ಎಲ್ಲಾ ಐಟಂಗಳು ಒಂದೇ ಬಿಲ್‌ನಲ್ಲಿ ಒಟ್ಟುಗೂಡುತ್ತವೆ. ಊಟ ಮುಗಿದ ನಂತರ ಕೌಂಟರ್‌ನಲ್ಲಿ ಪಾವತಿಸಿ.",
    noActiveOrdersYet: "ಯಾವುದೇ ಸಕ್ರಿಯ ಆರ್ಡರ್ ಇಲ್ಲ",
    startOrderingDesc: "ನೀವು ಅಥವಾ ನಿಮ್ಮ ಟೇಬಲ್‌ನವರು ಆರ್ಡರ್ ಮಾಡಿದಾಗ, ಅದು ಇಲ್ಲಿ ನೇರವಾಗಿ ಕಾಣಿಸುತ್ತದೆ!",

    // Assistance
    callWaiter: "ವೇಟರ್ ಕರೆಸಿ",
    waterBottle: "ಕುಡಿಯುವ ನೀರು",
    extraCutlery: "ಹೆಚ್ಚುವರಿ ಚಮಚ/ತಟ್ಟೆ",
    payBill: "ಬಿಲ್ ಪಾವತಿ",
    tissues: "ಟಿಶ್ಯೂ ಪೇಪರ್",
    cleaning: "ಟೇಬಲ್ ಸ್ವಚ್ಛಗೊಳಿಸಿ",
    sentSuccess: "ವಿನಂತಿಯನ್ನು ಕಳುಹಿಸಲಾಗಿದೆ!",
    staffOnTheWay: "ಸಿಬ್ಬಂದಿ ನಿಮ್ಮ ಟೇಬಲ್‌ಗೆ ಶೀಘ್ರದಲ್ಲೇ ಬರುತ್ತಾರೆ.",

    // Discounts
    specialOffer: "ವಿಶೇಷ ಕೊಡುಗೆ",
    flatDiscount: "ನೇರ",
    offApplied: "ರಿಯಾಯಿತಿ ಅನ್ವಯಿಸಲಾಗಿದೆ!",
  },

  ml: {
    // Navigation & Headers
    menu: "മെനു",
    cart: "കാർട്ട്",
    table: "ടേബിൾ",
    dineIn: "ഇവിടെ ഇരുന്ന് കഴിക്കുക",
    kitchenActive: "അടുക്കള സജീവം",
    closed: "അടച്ചിരിക്കുന്നു",
    exploreMenu: "മുഴുവൻ മെനു കാണുക",
    viewMenuAndOrder: "മെനു കണ്ട് ഓർഡർ ചെയ്യുക",
    viewTableCart: "ടേബിൾ കാർട്ട് കാണുക",
    needAssistance: "വെള്ളം, കട്ട്ലറി അല്ലെങ്കിൽ വെയ്റ്റർ വേണോ? ഇവിടെ ടാപ്പ് ചെയ്യുക",
    searchPlaceholder: "വിഭവങ്ങൾ, പാനീയങ്ങൾ തിരയുക…",
    all: "എല്ലാം",
    veg: "വെജ്",
    nonVeg: "നോൺ-വെജ്",
    chefsSpecial: "ഷെഫ് സ്പെഷ്യൽ",
    bestseller: "ജനപ്രിയ വിഭവം",
    spicy: "എരിവുള്ളത്",
    fastKitchen: "വേഗത്തിലുള്ള സേവനം",
    dishes: "വിഭവങ്ങൾ",
    sections: "വിഭാഗങ്ങൾ",

    // Food actions
    add: "ചേർക്കുക",
    added: "ചേർത്തു",
    item: "വിഭവം",
    items: "വിഭവങ്ങൾ",
    inCart: "കാർട്ടിലുണ്ട്",
    viewCart: "കാർട്ട് കാണുക",
    orderMore: "കൂടുതൽ ഓർഡർ ചെയ്യുക",
    emptyCart: "നിങ്ങളുടെ കാർട്ട് ശൂന്യമാണ്",
    addDishesToCart: "രുചികരമായ വിഭവങ്ങൾ തെരഞ്ഞെടുത്ത് ഓർഡർ ചെയ്യുക",
    browseMenu: "മെനു പരിശോധിക്കുക",

    // Cart & Bill
    orderAndTableTab: "ഓർഡറും ടേബിൾ ബില്ലും",
    newOrder: "നിലവിലെ കാർട്ട്",
    confirmedOrders: "ടേബിൾ ബിൽ & ഹിസ്റ്ററി",
    runningTotalBill: "നിലവിലെ ആകെ ബിൽ തുക",
    rounds: "ഓർഡർ റൗണ്ടുകൾ",
    consolidatedBill: "ആകെ വിഭവങ്ങളുടെ ബിൽ",
    round: "റൗണ്ട്",
    orderedBy: "ഓർഡർ ചെയ്തത്",
    subtotal: "തുക",
    discount: "കിഴിവ്",
    total: "ആകെ തുക",
    totalForOrder: "ഈ ഓർഡറിന് ആകെ തുക",
    proceedToCheckout: "ചെക്ക്ഔട്ടിലേക്ക് പോകുക",
    placeOrder: "ഓർഡർ നൽകുക",
    placingOrder: "ഓർഡർ ചെയ്യുന്നു…",
    orderSuccess: "ഓർഡർ വിജയകരമായി നൽകി!",
    orderSummary: "ഓർഡർ വിവരങ്ങൾ",
    paymentMethod: "പേയ്‌മെന്റ് രീതി",
    payAtRestaurant: "റെസ്റ്റോറന്റിൽ അടയ്ക്കുക",
    specialInstructions: "പ്രത്യേക നിർദ്ദേശങ്ങൾ",
    specialInstructionsPlaceholder: "ഉദാ: എരിവ് കുറക്കുക, ഉള്ളി വേണ്ട, അധികം സ്പൂൺ…",
    contactDetails: "ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ",
    yourName: "നിങ്ങളുടെ പേര് *",
    mobileNumber: "മൊബൈൽ നമ്പർ *",
    emailAddress: "ഇമെയിൽ വിലാസം",
    tableGuest: "അതിഥി",
    tableSharedTabDesc: "ഈ ടേബിളിൽ ഓർഡർ ചെയ്യുന്ന എല്ലാ വിഭവങ്ങളും ഒരൊറ്റ ബില്ലായി ലഭിക്കും. ഭക്ഷണം കഴിഞ്ഞ ശേഷം കൗണ്ടറിൽ പണമടയ്ക്കുക.",
    noActiveOrdersYet: "ഓർഡറുകൾ ലഭ്യമല്ല",
    startOrderingDesc: "നിങ്ങളോ ടേബിളിലെ മറ്റുള്ളവരോ ഓർഡർ ചെയ്യുമ്പോൾ അത് ഇവിടെ നേരിട്ട് കാണാം!",

    // Assistance
    callWaiter: "വെയ്റ്ററെ വിളിക്കുക",
    waterBottle: "കുടിവെള്ളം",
    extraCutlery: "സ്പൂൺ / പാത്രങ്ങൾ",
    payBill: "ബിൽ അടയ്ക്കുക",
    tissues: "ടിഷ്യൂ പേപ്പർ",
    cleaning: "മേശ വൃത്തിയാക്കുക",
    sentSuccess: "അപേക്ഷ കൈമാറി!",
    staffOnTheWay: "ഞങ്ങളുടെ ജീവനക്കാർ ഉടൻ നിങ്ങളുടെ ടേബിളിൽ എത്തും.",

    // Discounts
    specialOffer: "പ്രത്യേക ഓഫർ",
    flatDiscount: "നേരിട്ട്",
    offApplied: "കിഴിവ് ലഭിച്ചു!",
  },

  hi: {
    // Navigation & Headers
    menu: "मेनू",
    cart: "कार्ट",
    table: "टेबल",
    dineIn: "यहीं खाएं",
    kitchenActive: "रसोई सक्रिय",
    closed: "बंद है",
    exploreMenu: "पूरा मेनू देखें",
    viewMenuAndOrder: "मेनू देखें और ऑर्डर करें",
    viewTableCart: "टेबल कार्ट देखें",
    needAssistance: "पानी, कटलरी या वेटर चाहिए? यहाँ टैप करें",
    searchPlaceholder: "व्यंजन, ड्रिंक्स, मिठाई खोजें…",
    all: "सभी",
    veg: "वेज",
    nonVeg: "नॉन-वेज",
    chefsSpecial: "शेफ का विशेष",
    bestseller: "सबसे लोकप्रिय",
    spicy: "तीखा",
    fastKitchen: "तेज़ सेवा",
    dishes: "व्यंजन",
    sections: "श्रेणियां",

    // Food actions
    add: "जोड़ें",
    added: "जोड़ा गया",
    item: "आइटम",
    items: "आइटम",
    inCart: "कार्ट में है",
    viewCart: "कार्ट देखें",
    orderMore: "और ऑर्डर करें",
    emptyCart: "आपकी कार्ट खाली है",
    addDishesToCart: "स्वादिष्ट व्यंजन चुनें और ऑर्डर करें",
    browseMenu: "मेनू देखें",

    // Cart & Bill
    orderAndTableTab: "ऑर्डर और टेबल बिल",
    newOrder: "वर्तमान कार्ट",
    confirmedOrders: "टेबल बिल व रसीद",
    runningTotalBill: "रनिंग कुल बिल",
    rounds: "ऑर्डर राउंड्स",
    consolidatedBill: "समेकित आइटम बिल",
    round: "राउंड",
    orderedBy: "ऑर्डर किया",
    subtotal: "उप-योग",
    discount: "छूट",
    total: "कुल राशि",
    totalForOrder: "इस ऑर्डर का कुल",
    proceedToCheckout: "चेकआउट करें",
    placeOrder: "ऑर्डर दें",
    placingOrder: "ऑर्डर भेजा जा रहा है…",
    orderSuccess: "ऑर्डर सफलतापूर्वक भेजा गया!",
    orderSummary: "ऑर्डर सारांश",
    paymentMethod: "भुगतान का तरीका",
    payAtRestaurant: "रेस्तरां में भुगतान करें",
    specialInstructions: "विशेष निर्देश",
    specialInstructionsPlaceholder: "जैसे कम तीखा, बिना प्याज, अतिरिक्त चम्मच…",
    contactDetails: "संपर्क विवरण",
    yourName: "आपका नाम *",
    mobileNumber: "मोबाइल नंबर *",
    emailAddress: "ईमेल पता",
    tableGuest: "टेबल अतिथि",
    tableSharedTabDesc: "इस टेबल पर दिए गए सभी ऑर्डर एक ही बिल में जुड़ते हैं। भोजन के बाद काउंटर पर भुगतान करें।",
    noActiveOrdersYet: "अभी कोई सक्रिय ऑर्डर नहीं है",
    startOrderingDesc: "जब आप या टेबल पर कोई भी ऑर्डर देगा, वह तुरंत यहाँ दिखेगा!",

    // Assistance
    callWaiter: "वेटर बुलाएं",
    waterBottle: "पानी की बोतल",
    extraCutlery: "अतिरिक्त चम्मच/प्लेट",
    payBill: "बिल भुगतान",
    tissues: "टिशू पेपर",
    cleaning: "टेबल साफ करें",
    sentSuccess: "अनुरोध भेज दिया गया!",
    staffOnTheWay: "हमारे कर्मचारी तुरंत आपकी टेबल पर आ रहे हैं।",

    // Discounts
    specialOffer: "विशेष ऑफर",
    flatDiscount: "सीधे",
    offApplied: "छूट लागू!",
  },

  ta: {
    // Navigation & Headers
    menu: "மெனு",
    cart: "கார்ட்",
    table: "மேஜை",
    dineIn: "இங்கேயே சாப்பிட",
    kitchenActive: "சமையலறை தயார்",
    closed: "மூடப்பட்டுள்ளது",
    exploreMenu: "முழு மெனு பார்க்க",
    viewMenuAndOrder: "மெனு பார்த்து ஆர்டர் செய்ய",
    viewTableCart: "டேபிள் கார்ட் பார்க்க",
    needAssistance: "தண்ணீர், ஸ்பூன் அல்லது சர்வர் உதவிக்கு இங்கே தட்டவும்",
    searchPlaceholder: "உணவுகள், பானங்கள் தேட…",
    all: "அனைத்தும்",
    veg: "சைவம்",
    nonVeg: "அசைவம்",
    chefsSpecial: "செஃப் ஸ்பெஷல்",
    bestseller: "பிரபலமானது",
    spicy: "காரமானது",
    fastKitchen: "விரைவான சேவை",
    dishes: "உணவுகள்",
    sections: "பிரிவுகள்",

    // Food actions
    add: "சேர்",
    added: "சேர்க்கப்பட்டது",
    item: "உணவு",
    items: "உணவுகள்",
    inCart: "கார்ட்டில் உள்ளது",
    viewCart: "கார்ட் பார்க்க",
    orderMore: "மேலும் ஆர்டர் செய்ய",
    emptyCart: "உங்கள் கார்ட் காலியாக உள்ளது",
    addDishesToCart: "சுவையான உணவுகளை தேர்ந்தெடுத்து சேர்க்கவும்",
    browseMenu: "மெனு பார்க்க",

    // Cart & Bill
    orderAndTableTab: "ஆர்டர் & டேபிள் பில்",
    newOrder: "தற்போதைய கார்ட்",
    confirmedOrders: "டேபிள் பில் விவரம்",
    runningTotalBill: "மொத்த பில் தொகை",
    rounds: "ஆர்டர் சுற்றுகள்",
    consolidatedBill: "ஒட்டுமொத்த பில்",
    round: "சுற்று",
    orderedBy: "ஆர்டர் செய்தவர்",
    subtotal: "கூட்டுத்தொகை",
    discount: "தள்ளுபடி",
    total: "மொத்தம்",
    totalForOrder: "இந்த ஆர்டரின் மொத்தம்",
    proceedToCheckout: "செக்அவுட் செல்ல",
    placeOrder: "ஆர்டர் செய்",
    placingOrder: "ஆர்டர் செய்யப்படுகிறது…",
    orderSuccess: "ஆர்டர் வெற்றிகரமாக அனுப்பப்பட்டது!",
    orderSummary: "ஆர்டர் சுருக்கம்",
    paymentMethod: "பணம் செலுத்தும் முறை",
    payAtRestaurant: "ரெஸ்டாரண்டில் செலுத்த",
    specialInstructions: "சிறப்பு குறிப்புகள்",
    specialInstructionsPlaceholder: "எ.கா: காரம் குறைவு, வெங்காயம் வேண்டாம்…",
    contactDetails: "தொடர்பு விவரங்கள்",
    yourName: "உங்கள் பெயர் *",
    mobileNumber: "மொபைல் எண் *",
    emailAddress: "மின்னஞ்சல்",
    tableGuest: "விருந்தினர்",
    tableSharedTabDesc: "இந்த மேஜையில் ஆர்டர் செய்யப்படும் அனைத்து உணவுகளும் ஒரே பில்லில் சேரும்.",
    noActiveOrdersYet: "ஆர்டர்கள் எதுவும் இல்லை",
    startOrderingDesc: "நீங்கள் ஆர்டர் செய்தவுடன் அது உடனடியாக இங்கே தோன்றும்!",

    // Assistance
    callWaiter: "சர்வரை அழைக்க",
    waterBottle: "குடிநீர் பாட்டில்",
    extraCutlery: "கூடுதல் கரண்டி / தட்டு",
    payBill: "பில் செலுத்த",
    tissues: "திசுத்தாள்",
    cleaning: "மேஜை சுத்தம் செய்ய",
    sentSuccess: "கோரிக்கை அனுப்பப்பட்டது!",
    staffOnTheWay: "ஊழியர்கள் உடனடியாக உங்கள் மேஜைக்கு வருவார்கள்.",

    // Discounts
    specialOffer: "சிறப்பு சலுகை",
    flatDiscount: "நேரடி",
    offApplied: "தள்ளுபடி பெறப்பட்டது!",
  },
};

// Popular Indian Dish Dictionary for Instant Regional Localization
export const DISH_NAME_TRANSLATIONS: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  "masala dosa": {
    kn: "ಮಸಾಲೆ ದೋಸೆ",
    ml: "മസാല ദോശ",
    hi: "मसाला डोसा",
    ta: "மசாலா தோசை",
  },
  "plain dosa": {
    kn: "ಪ್ಲೇನ್ ದೋಸೆ",
    ml: "പ്ലെയിൻ ദോശ",
    hi: "सादा डोसा",
    ta: "சாதா தோசை",
  },
  "ghee roast dosa": {
    kn: "ತುಪ್ಪದ ರೋಸ್ಟ್ ದೋಸೆ",
    ml: "നെയ്യ് റോസ്റ്റ് ദോശ",
    hi: "घी रोस्ट डोसा",
    ta: "நெய் ரோஸ்ட் தோசை",
  },
  "idli": {
    kn: "ಇಡ್ಲಿ",
    ml: "ഇഡ്ഡലി",
    hi: "इडली",
    ta: "இட்லி",
  },
  "idli vada": {
    kn: "ಇಡ್ಲಿ ವಡೆ",
    ml: "ഇഡ്ഡലി വട",
    hi: "इडली वड़ा",
    ta: "இட்லி வடை",
  },
  "medu vada": {
    kn: "ಮೆದು ವಡೆ",
    ml: "മേദു വട",
    hi: "मेदु वड़ा",
    ta: "மெது வடை",
  },
  "chicken biryani": {
    kn: "ಚಿಕನ್ ಬಿರಿಯಾನಿ",
    ml: "ചിക്കൻ ബിരിയാണി",
    hi: "चिकन बिरयानी",
    ta: "சிக்கன் பிரியாணி",
  },
  "mutton biryani": {
    kn: "ಮಟನ್ ಬಿರಿಯಾನಿ",
    ml: "മട്ടൺ ബിരിയാണി",
    hi: "मटन बिरयानी",
    ta: "மட்டன் பிரியாணி",
  },
  "veg biryani": {
    kn: "ವೆಜ್ ಬಿರಿಯಾನಿ",
    ml: "വെജ് ബിരിയാണി",
    hi: "वेज बिरयानी",
    ta: "வெஜ் பிரியாணி",
  },
  "paneer butter masala": {
    kn: "ಪನ್ನೀರ್ ಬಟರ್ ಮಸಾಲ",
    ml: "പനീർ ബട്ടർ മസാല",
    hi: "पनीर बटर मसाला",
    ta: "பன்னீர் பட்டர் மசாலா",
  },
  "butter chicken": {
    kn: "ಬಟರ್ ಚಿಕನ್",
    ml: "ബട്ടർ ചിക്കൻ",
    hi: "बटर चिकन",
    ta: "பட்டர் சிக்கன்",
  },
  "roti": {
    kn: "ರೋಟಿ",
    ml: "റൊട്ടി",
    hi: "रोटी",
    ta: "ரொட்டி",
  },
  "butter naan": {
    kn: "ಬಟರ್ ನಾನ್",
    ml: "ബട്ടർ നാൻ",
    hi: "बटर नान",
    ta: "பட்டர் நான்",
  },
  "garlic naan": {
    kn: "ಗಾರ್ಲಿಕ್ ನಾನ್",
    ml: "ഗാർലിക് നാൻ",
    hi: "गार्लिक नान",
    ta: "பூண்டு நான்",
  },
  "dal tadka": {
    kn: "ದಾಲ್ ತಡ್ಕಾ",
    ml: "ദാൽ തഡ്ക",
    hi: "दाल तड़का",
    ta: "தால் தட்கா",
  },
  "filter coffee": {
    kn: "ಫಿಲ್ಟರ್ ಕಾಫಿ",
    ml: "ഫിൽട്ടർ കോഫി",
    hi: "फ़िल्टर कॉफ़ी",
    ta: "ஃபில்டர் காபி",
  },
  "tea": {
    kn: "ಟೀ / ಚಹಾ",
    ml: "ചായ",
    hi: "चाय",
    ta: "தேநீர்",
  },
  "masala chai": {
    kn: "ಮಸಾಲ ಚಹಾ",
    ml: "മസാല ചായ",
    hi: "मसाला चाय",
    ta: "மசாலா டீ",
  },
  "cold coffee": {
    kn: "ಕೋಲ್ಡ್ ಕಾಫಿ",
    ml: "കോൾഡ് കോഫി",
    hi: "कोल्ड कॉफ़ी",
    ta: "கோல்ட் காபி",
  },
  "gulab jamun": {
    kn: "ಗುಲಾಬ್ ಜಾಮೂನ್",
    ml: "ഗുലാബ് ജാമുൻ",
    hi: "गुलाब जामुन",
    ta: "குலாப் ஜாமுன்",
  },
};

// Popular category translations
export const CATEGORY_TRANSLATIONS: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  "starters": { kn: "ಸ್ಟಾರ್ಟರ್ಸ್", ml: "സ്റ്റാർട്ടറുകൾ", hi: "स्टार्टर्स", ta: "ஸ்டார்ட்டர்ஸ்" },
  "main course": { kn: "ಮುಖ್ಯ ಊಟ", ml: "പ്രധാന വിഭവങ്ങൾ", hi: "मुख्य भोजन", ta: "முதன்மை உணவு" },
  "south indian": { kn: "ದಕ್ಷಿಣ ಭಾರತೀಯ", ml: "ദക്ഷിണേന്ത്യൻ വിഭവങ്ങൾ", hi: "साउथ इंडियन", ta: "தென்னிந்திய உணவு" },
  "biryani": { kn: "ಬಿರಿಯಾನಿ", ml: "ബിരിയാണി", hi: "बिरयानी", ta: "பிரியாணி" },
  "breads": { kn: "ರೋಟಿ / ನಾನ್", ml: "റൊട്ടി വിഭവങ്ങൾ", hi: "रोटी और नान", ta: "ரொட்டி வகைகள்" },
  "desserts": { kn: "ಸಿಹಿ ತಿಂಡಿಗಳು", ml: "മധുരപലഹാരങ്ങൾ", hi: "मिठाइयाँ", ta: "இனிப்புகள்" },
  "beverages": { kn: "ಪಾನೀಯಗಳು", ml: "പാനീയങ്ങൾ", hi: "पेय पदार्थ", ta: "பானங்கள்" },
  "chinese": { kn: "ಚೈನೀಸ್", ml: "ചൈനീസ് വിഭവങ്ങൾ", hi: "चाइनीज", ta: "சைனீஸ்" },
  "breakfast": { kn: "ಉಪಾಹಾರ", ml: "പ്രാതൽ", hi: "नाश्ता", ta: "காலை உணவு" },
  "snacks": { kn: "ಸ್ನ್ಯಾಕ್ಸ್", ml: "ലഘുഭക്ഷണങ്ങൾ", hi: "स्नैक्स", ta: "சிற்றுண்டி" },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultVal?: string) => string;
  tDish: (dishName: string) => string;
  tCategory: (catName: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key, defaultVal) => defaultVal ?? key,
  tDish: (name) => name,
  tCategory: (cat) => cat,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("inforyse_lang") as SupportedLanguage;
      if (saved && (saved === "en" || saved === "kn" || saved === "ml" || saved === "hi" || saved === "ta")) {
        setLanguageState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("inforyse_lang", lang);
    } catch {
      // ignore
    }
  };

  const t = (key: string, defaultVal?: string): string => {
    const dict = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;
    return dict[key] ?? UI_TRANSLATIONS.en[key] ?? defaultVal ?? key;
  };

  const tDish = (dishName: string): string => {
    if (!dishName || language === "en") return dishName;
    const clean = dishName.trim().toLowerCase();
    const entry = DISH_NAME_TRANSLATIONS[clean];
    if (entry && entry[language]) {
      return entry[language]!;
    }
    // Partial matches (e.g. "Special Masala Dosa" -> "ಮಸಾಲೆ ದೋಸೆ")
    for (const [key, mapping] of Object.entries(DISH_NAME_TRANSLATIONS)) {
      if (clean.includes(key) && mapping[language]) {
        return mapping[language]!;
      }
    }
    return dishName;
  };

  const tCategory = (catName: string): string => {
    if (!catName || language === "en") return catName;
    const clean = catName.trim().toLowerCase();
    const entry = CATEGORY_TRANSLATIONS[clean];
    if (entry && entry[language]) {
      return entry[language]!;
    }
    return catName;
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t, tDish, tCategory } },
    children
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
