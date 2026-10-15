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
  "starters & appetizers": { kn: "ಸ್ಟಾರ್ಟರ್ಸ್ & ಅಪೆಟೈಸರ್ಸ್", ml: "സ്റ്റാർട്ടറുകൾ", hi: "स्टार्टर्स और नाश्ता", ta: "ஸ்டார்ட்டர்ஸ்" },
  "main course": { kn: "ಮುಖ್ಯ ಊಟ", ml: "പ്രധാന വിഭവങ്ങൾ", hi: "मुख्य भोजन", ta: "முதன்மை உணவு" },
  "south indian": { kn: "ದಕ್ಷಿಣ ಭಾರತೀಯ", ml: "ദക്ഷിണേന്ത്യൻ വിഭവങ്ങൾ", hi: "साउथ इंडियन", ta: "தென்னிந்திய உணவு" },
  "north indian": { kn: "ಉತ್ತರ ಭಾರತೀಯ", ml: "വടക്കേ ഇന്ത്യൻ വിഭവങ്ങൾ", hi: "उत्तर भारतीय", ta: "வட இந்திய உணவு" },
  "biryani": { kn: "ಬಿರಿಯಾನಿ", ml: "ബിരിയാണി", hi: "बिरयानी", ta: "பிரியாணி" },
  "breads": { kn: "ರೋಟಿ / ನಾನ್", ml: "റൊട്ടി വിഭവങ്ങൾ", hi: "रोटी और नान", ta: "ரொட்டி வகைகள்" },
  "desserts": { kn: "ಸಿಹಿ ತಿಂಡಿಗಳು", ml: "മധുരപലഹാരങ്ങൾ", hi: "मिठाइयाँ", ta: "இனிப்புகள்" },
  "desserts & sweets": { kn: "ಸಿಹಿ ತಿಂಡಿಗಳು & ಸಿಹಿತಿನಿಸು", ml: "മധുരപലഹാരങ്ങൾ", hi: "मिठाई और मीठा", ta: "இனிப்புகள்" },
  "beverages": { kn: "ಪಾನೀಯಗಳು", ml: "പാനീയങ്ങൾ", hi: "पेय पदार्थ", ta: "பானங்கள்" },
  "beverages & drinks": { kn: "ಪಾನೀಯಗಳು & ಕೂಲ್ ಡ್ರಿಂಕ್ಸ್", ml: "പാനീയങ്ങൾ", hi: "पेय व ड्रिंक्स", ta: "பானங்கள்" },
  "today's specials": { kn: "ಇಂದಿನ ವಿಶೇಷಗಳು", ml: "ഇന്നത്തെ സ്പെഷ്യലുകൾ", hi: "आज का विशेष", ta: "இன்றைய சிறப்புகள்" },
  "todays specials": { kn: "ಇಂದಿನ ವಿಶೇಷಗಳು", ml: "ഇന്നത്തെ സ്പെഷ്യಲുകൾ", hi: "आज का विशेष", ta: "இன்றைய சிறப்புகள்" },
  "specials": { kn: "ವಿಶೇಷ ಖಾದ್ಯಗಳು", ml: "സ്പെഷ്യലുകൾ", hi: "स्पेशल्स", ta: "சிறப்புகள்" },
  "chinese": { kn: "ಚೈನೀಸ್", ml: "ചൈനീസ് വിഭവങ്ങൾ", hi: "चाइनीज", ta: "சைனீஸ்" },
  "breakfast": { kn: "ಉಪಾಹಾರ", ml: "പ്രാതൽ", hi: "नाश्ता", ta: "காலை உணவு" },
  "snacks": { kn: "ಸ್ನ್ಯಾಕ್ಸ್", ml: "ലഘುഭക്ഷണങ്ങൾ", hi: "स्नैक्स", ta: "சிற்றுண்டி" },
  "combos": { kn: "ಕಾಂಬೋ ಆಫರ್‌ಗಳು", ml: "കോമ്പോകൾ", hi: "कॉम्बो", ta: "காம்போ" },
};

// Word-level culinary dictionary for multi-word dish names & qualifiers
export const CULINARY_VOCABULARY: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  // Dishes & staples
  "idli": { kn: "ಇಡ್ಲಿ", ml: "ഇഡ്ഡലി", hi: "इडली", ta: "இட்லி" },
  "idali": { kn: "ಇಡ್ಲಿ", ml: "ഇഡ്ഡലി", hi: "इडली", ta: "இட்லி" },
  "idly": { kn: "ಇಡ್ಲಿ", ml: "ഇഡ്ഡലി", hi: "इडली", ta: "இட்லி" },
  "dosa": { kn: "ದೋಸೆ", ml: "ദോശ", hi: "डोसा", ta: "தோசை" },
  "dosai": { kn: "ದೋಸೆ", ml: "ദോശ", hi: "डोसा", ta: "தோசை" },
  "vada": { kn: "ವಡೆ", ml: "വട", hi: "वड़ा", ta: "வடை" },
  "vade": { kn: "ವಡೆ", ml: "വട", hi: "वड़ा", ta: "வடை" },
  "medu": { kn: "ಮೆದು", ml: "മേദു", hi: "मेदु", ta: "மெது" },
  "masala": { kn: "ಮಸಾಲ", ml: "മസാല", hi: "मसाला", ta: "மசாலா" },
  "roast": { kn: "ರೋಸ್ಟ್", ml: "റോസ്റ്റ്", hi: "रोस्ट", ta: "ரோஸ்ட்" },
  "ghee": { kn: "ತುಪ್ಪ", ml: "നെയ്യ്", hi: "घी", ta: "நெய்" },
  "butter": { kn: "ಬಟರ್", ml: "ബട്ടർ", hi: "मक्खन", ta: "வெண்ணெய்" },
  "paneer": { kn: "ಪನ್ನೀರ್", ml: "പനീർ", hi: "पनीर", ta: "பன்னீர்" },
  "chicken": { kn: "ಚಿಕನ್", ml: "ചിക്കൻ", hi: "चिकन", ta: "சிக்கன்" },
  "mutton": { kn: "ಮಟನ್", ml: "മട്ടൺ", hi: "मटन", ta: "மட்டன்" },
  "fish": { kn: "ಮೀನು", ml: "മീൻ", hi: "मछली", ta: "மீன்" },
  "egg": { kn: "ಮೊಟ್ಟೆ", ml: "മുട്ട", hi: "अंडा", ta: "முட்டை" },
  "biryani": { kn: "ಬಿರಿಯಾನಿ", ml: "ബിരിയാണി", hi: "बिरयानी", ta: "பிரியாணி" },
  "biriyani": { kn: "ಬಿರಿಯಾನಿ", ml: "ബിരിയാണി", hi: "बिरयानी", ta: "பிரியாணி" },
  "rice": { kn: "ಅನ್ನ", ml: "ചോറ്", hi: "चावल", ta: "சாதம்" },
  "curry": { kn: "ಕರಿ", ml: "കറി", hi: "करी", ta: "கறி" },
  "dal": { kn: "ದಾಲ್", ml: "പരിപ്പ്", hi: "दाल", ta: "பருப்பு" },
  "sambar": { kn: "ಸಾಂಬಾರ್", ml: "സാമ്പാർ", hi: "सांबर", ta: "சாம்பார்" },
  "sambhar": { kn: "ಸಾಂಬಾರ್", ml: "സാಂಬಾರ್", hi: "सांबर", ta: "சாம்பார்" },
  "chutney": { kn: "ಚಟ್ನಿ", ml: "ചട്ണി", hi: "चटनी", ta: "சட்னி" },
  "chudney": { kn: "ಚಟ್ನಿ", ml: "ചട്ണി", hi: "चटनी", ta: "சಟ್ನಿ" },
  "roti": { kn: "ರೋಟಿ", ml: "റൊട്ടി", hi: "रोटी", ta: "ரொட்டி" },
  "naan": { kn: "ನಾನ್", ml: "നാൻ", hi: "नान", ta: "நான்" },
  "parotta": { kn: "ಪರೋಟ", ml: "പൊറോട്ട", hi: "परोठा", ta: "பரோட்டா" },
  "porotta": { kn: "ಪರೋಟ", ml: "പൊറോട്ട", hi: "परोठा", ta: "பரோட்டா" },
  "poori": { kn: "ಪೂರಿ", ml: "പൂരി", hi: "पूरी", ta: "பூரி" },
  "puri": { kn: "ಪೂರಿ", ml: "പൂരി", hi: "पूरी", ta: "பூரி" },
  "chapati": { kn: "ಚಪಾತಿ", ml: "ചപ്പാത്തി", hi: "चपाती", ta: "சப்பாத்தி" },
  "tea": { kn: "ಟೀ", ml: "ചായ", hi: "चाय", ta: "தேநீர்" },
  "chai": { kn: "ಚಹಾ", ml: "ചായ", hi: "चाय", ta: "டீ" },
  "coffee": { kn: "ಕಾಫಿ", ml: "കോഫി", hi: "कॉफ़ी", ta: "காபி" },
  "kapi": { kn: "ಕಾಫಿ", ml: "കാപ്പി", hi: "कॉफ़ी", ta: "காபி" },
  "milk": { kn: "ಹಾಲು", ml: "പാൽ", hi: "दूध", ta: "பால்" },
  "juice": { kn: "ಜ್ಯೂಸ್", ml: "ജ്യൂസ്", hi: "जूस", ta: "ஜூஸ்" },
  "shake": { kn: "ಶೇಕ್", ml: "ഷേക്ക്", hi: "शेक", ta: "ஷேக்" },
  "water": { kn: "ನೀರು", ml: "വെള്ളം", hi: "पानी", ta: "தண்ணீர்" },
  "soup": { kn: "ಸೂಪ್", ml: "സൂപ്പ്", hi: "सूप", ta: "சூப்" },
  "salad": { kn: "ಸಲಾಡ್", ml: "സാലഡ്", hi: "सलाद", ta: "சாலட்" },
  "noodles": { kn: "ನೂಡಲ್ಸ್", ml: "നൂഡിൽസ്", hi: "नूडल्स", ta: "நூடுல்ஸ்" },
  "manchurian": { kn: "ಮಂಚೂರಿಯನ್", ml: "മഞ്ചൂരിയൻ", hi: "मंचूरियन", ta: "மஞ்சூரியன்" },
  "kabab": { kn: "ಕಬಾಬ್", ml: "കബാബ്", hi: "कबाब", ta: "கபாப்" },
  "kebab": { kn: "ಕಬಾಬ್", ml: "കബാബ്", hi: "कबाब", ta: "கபாப்" },
  "tikka": { kn: "ತಿಕ್ಕಾ", ml: "ടിക്ക", hi: "टिक्का", ta: "திக்கா" },
  "fry": { kn: "ಫ್ರೈ", ml: "ഫ്രൈ", hi: "फ्राई", ta: "வறுவல்" },
  "fried": { kn: "ಫ್ರೈಡ್", ml: "ഫ്രൈഡ്", hi: "तला हुआ", ta: "வறுத்த" },
  "crispy": { kn: "ಗರಿಗರಿಯಾದ", ml: "മൊരിഞ്ഞ", hi: "कुरकुरा", ta: "மொறுமொறுப்பான" },
  "hot": { kn: "ಬಿಸಿ", ml: "ചൂടുള്ള", hi: "गरम", ta: "சூடான" },
  "sweet": { kn: "ಸಿಹಿ", ml: "മധുരമുള്ള", hi: "मीठा", ta: "இனிப்பு" },
  "spicy": { kn: "ಖಾರ", ml: "എരിവുള്ള", hi: "तीखा", ta: "காரமான" },
  "special": { kn: "ವಿಶೇಷ", ml: "സ്പെഷ്യൽ", hi: "विशेष", ta: "ஸ்பெஷல்" },
  "good": { kn: "ಉತ್ತಮ", ml: "നല്ലത്", hi: "अच्छा", ta: "நல்லது" },
  "best": { kn: "ಅತ್ಯುತ್ತಮ", ml: "ഏറ്റവും നല്ലത്", hi: "सर्वोत्तम", ta: "சிறந்தது" },
  "fresh": { kn: "ತಾಜಾ", ml: "ഫ്രഷ്", hi: "ताज़ा", ta: "புதிய" },
  "use": { kn: "ಬಳಸಿ", ml: "ഉപയോഗിക്കുക", hi: "प्रयोग करें", ta: "பயன்படுத்தவும்" },
  "that": { kn: "ಅದು", ml: "അത്", hi: "वह", ta: "அது" },
  "is": { kn: "ಇದೆ", ml: "ആണ്", hi: "है", ta: "ஆகும்" },
  "meals": { kn: "ಊಟ", ml: "ഊണ്", hi: "थाली", ta: "சாப்பாடு" },
  "thali": { kn: "ಥಾಲಿ", ml: "താലി", hi: "थाली", ta: "தாலி" },
  "jamun": { kn: "ಜಾಮೂನ್", ml: "ജാമുൻ", hi: "जामुन", ta: "ஜாமுன்" },
  "ice": { kn: "ಐಸ್", ml: "ഐസ്", hi: "बर्फ", ta: "ஐஸ்" },
  "cream": { kn: "ಕ್ರೀಮ್", ml: "ക്രീം", hi: "क्रीम", ta: "கிரீம்" },
};

function transliterateWord(word: string, lang: string): string {
  const w = word.toLowerCase();
  const knMap: Record<string, string> = {
    ka: "ಕ", ki: "ಕಿ", ku: "ಕು", ke: "ಕೆ", ko: "ಕೊ", k: "ಕ್",
    ga: "ಗ", gi: "ಗಿ", gu: "ಗು", ge: "ಗೆ", go: "ಗೊ", g: "ಗ್",
    cha: "ಚ", chi: "ಚಿ", chu: "ಚು", che: "ಚೆ", cho: "ಚೊ", ch: "ಚ್",
    ja: "ಜ", ji: "ಜಿ", ju: "ಜು", je: "ಜೆ", jo: "ಜೊ", j: "ಜ್",
    ta: "ತ", ti: "ತಿ", tu: "ತು", te: "ತೆ", to: "ತೊ", t: "ತ್",
    da: "ದ", di: "ದಿ", du: "ದು", de: "ದೆ", do: "ದೊ", d: "ದ್",
    na: "ನ", ni: "ನಿ", nu: "ನು", ne: "ನೆ", no: "ನೊ", n: "ನ್",
    pa: "ಪ", pi: "ಪಿ", pu: "ಪು", pe: "ಪೆ", po: "ಪೊ", p: "ಪ್",
    ba: "ಬ", bi: "ಬಿ", bu: "ಬು", be: "ಬೆ", bo: "ಬೊ", b: "ಬ್",
    ma: "ಮ", mi: "ಮಿ", mu: "ಮು", me: "ಮೆ", mo: "ಮೊ", m: "ಮ್",
    ya: "ಯ", yi: "ಯಿ", yu: "ಯು", ye: "ಯೆ", yo: "ಯೊ", y: "ಯ್",
    ra: "ರ", ri: "ರಿ", ru: "ರು", re: "ರೆ", ro: "ರೊ", r: "ರ್",
    la: "ಲ", li: "ಲಿ", lu: "ಲು", le: "ಲೆ", lo: "ಲೊ", l: "ಲ್",
    va: "ವ", vi: "ವಿ", vu: "ವು", ve: "ವೆ", vo: "ವೊ", v: "ವ್",
    sha: "ಶ", shi: "ಶಿ", shu: "ಶು", she: "ಶೆ", sho: "ಶೊ", sh: "ಶ್",
    sa: "ಸ", si: "ಸಿ", su: "ಸು", se: "ಸೆ", so: "ಸೊ", s: "ಸ್",
    ha: "ಹ", hi: "ಹಿ", hu: "ಹು", he: "ಹೆ", ho: "ಹೊ", h: "ಹ್",
    a: "ಅ", i: "ಇ", u: "ಉ", e: "ಎ", o: "ಒ",
  };
  const mlMap: Record<string, string> = {
    ka: "ക", ki: "കി", ku: "കു", ke: "കെ", ko: "കൊ", k: "ക്",
    ga: "ഗ", gi: "ഗി", gu: "ഗു", ge: "ഗെ", go: "ഗൊ", g: "ഗ്",
    cha: "ച", chi: "ചി", chu: "ചു", che: "ചെ", cho: "ചൊ", ch: "ച്",
    ja: "ജ", ji: "ജി", ju: "ജു", je: "ജെ", jo: "ജൊ", j: "ജ്",
    ta: "ത", ti: "തി", tu: "തു", te: "തെ", to: "തൊ", t: "ത്",
    da: "ദ", di: "ദി", du: "ദു", de: "ദെ", do: "ദൊ", d: "ദ്",
    na: "ന", ni: "നി", nu: "നു", ne: "നെ", no: "നൊ", n: "ൻ",
    pa: "പ", pi: "പി", pu: "പു", pe: "പെ", po: "പൊ", p: "പ്",
    ba: "ബ", bi: "ബി", bu: "ബു", be: "ബെ", bo: "ബൊ", b: "ബ്",
    ma: "മ", mi: "മി", mu: "മു", me: "മെ", mo: "മൊ", m: "മ്",
    ya: "യ", yi: "യി", yu: "യു", ye: "യെ", yo: "യൊ", y: "യ്",
    ra: "ര", ri: "രി", ru: "രു", re: "രെ", ro: "രൊ", r: "ർ",
    la: "ല", li: "ലി", lu: "ലു", le: "ലെ", lo: "ലൊ", l: "ൽ",
    va: "വ", vi: "വി", vu: "വു", ve: "വെ", vo: "വൊ", v: "വ്",
    sa: "സ", si: "സി", su: "സു", se: "സെ", so: "സൊ", s: "സ്",
    ha: "ഹ", hi: "ഹി", hu: "ഹു", he: "ഹെ", ho: "ഹൊ", h: "ഹ്",
    a: "അ", i: "ഇ", u: "ഉ", e: "എ", o: "ഒ",
  };
  const hiMap: Record<string, string> = {
    ka: "क", ki: "कि", ku: "कु", ke: "के", ko: "को", k: "क्",
    ga: "ग", gi: "गि", gu: "गु", ge: "गे", go: "गो", g: "ग्",
    cha: "च", chi: "चि", chu: "चु", che: "चे", cho: "चो", ch: "च्",
    ja: "ज", ji: "जि", ju: "जु", je: "जे", jo: "जो", j: "ज्",
    ta: "त", ti: "ति", tu: "तु", te: "ते", to: "तो", t: "त्",
    da: "द", di: "दि", du: "दु", de: "दे", do: "दो", d: "द्",
    na: "न", ni: "नि", nu: "नु", ne: "ने", no: "नो", n: "न्",
    pa: "प", pi: "पि", pu: "पु", pe: "पे", po: "पो", p: "प्",
    ba: "ब", bi: "बि", bu: "बु", be: "बे", bo: "बो", b: "ब्",
    ma: "म", mi: "मि", mu: "मु", me: "मे", mo: "मो", m: "म्",
    ya: "य", yi: "यि", yu: "यु", ye: "ये", yo: "यो", y: "य्",
    ra: "र", ri: "रि", ru: "रु", re: "रे", ro: "रो", r: "र्",
    la: "ल", li: "लि", lu: "लु", le: "ले", lo: "लो", l: "ल्",
    va: "व", vi: "वि", vu: "वु", ve: "वे", vo: "वो", v: "व्",
    sa: "स", si: "सि", su: "सु", se: "से", so: "सो", s: "स्",
    ha: "ह", hi: "हि", hu: "हु", he: "हे", ho: "हो", h: "ह्",
    a: "अ", i: "इ", u: "उ", e: "ए", o: "ओ",
  };
  const taMap: Record<string, string> = {
    ka: "க", ki: "கி", ku: "கு", ke: "கெ", ko: "கொ", k: "க்",
    ga: "க", gi: "கி", gu: "கு", ge: "கெ", go: "கொ", g: "க்",
    cha: "ச", chi: "சி", chu: "சு", che: "செ", cho: "சொ", ch: "ச்",
    ja: "ஜ", ji: "ஜி", ju: "ஜு", je: "ஜெ", jo: "ஜொ", j: "ஜ்",
    ta: "த", ti: "தி", tu: "து", te: "தெ", to: "தொ", t: "த்",
    da: "ட", di: "டி", du: "டு", de: "டெ", do: "டொ", d: "ட்",
    na: "ந", ni: "நி", nu: "நு", ne: "நெ", no: "நொ", n: "ன்",
    pa: "ப", pi: "பி", pu: "பு", pe: "பெ", po: "பொ", p: "ப்",
    ba: "ப", bi: "பி", bu: "பு", be: "பெ", bo: "பொ", b: "ப்",
    ma: "ம", mi: "மி", mu: "மு", me: "மெ", mo: "மொ", m: "ம்",
    ya: "ய", yi: "யி", yu: "யு", ye: "யெ", yo: "யொ", y: "ய்",
    ra: "ர", ri: "ரி", ru: "ரு", re: "ரெ", ro: "ரொ", r: "ர்",
    la: "ல", li: "லி", lu: "லு", le: "லெ", lo: "லொ", l: "ல்",
    va: "வ", vi: "வி", vu: "வு", ve: "வெ", vo: "வொ", v: "வ்",
    sa: "ஸ", si: "ஸி", su: "ஸு", se: "ஸெ", so: "ஸொ", s: "ஸ்",
    ha: "ஹ", hi: "ஹி", hu: "ஹு", he: "ஹெ", ho: "ஹொ", h: "ஹ்",
    a: "அ", i: "இ", u: "உ", e: "எ", o: "ஒ",
  };

  const map: Record<string, string> | undefined = lang === "kn" ? knMap : lang === "ml" ? mlMap : lang === "hi" ? hiMap : lang === "ta" ? taMap : undefined;
  if (!map) return word;

  let result = "";
  let i = 0;
  while (i < w.length) {
    const c3 = w.slice(i, i + 3);
    if (map[c3]) { result += map[c3]; i += 3; continue; }
    const c2 = w.slice(i, i + 2);
    if (map[c2]) { result += map[c2]; i += 2; continue; }
    const c1 = w.slice(i, i + 1);
    result += map[c1] || c1;
    i += 1;
  }
  return result;
}


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

    // 1. Direct exact match in full dish dictionary
    const fullMatch = DISH_NAME_TRANSLATIONS[clean];
    if (fullMatch && fullMatch[language]) {
      return fullMatch[language];
    }

    // 2. Direct exact match in culinary vocabulary
    const vocabMatch = CULINARY_VOCABULARY[clean];
    if (vocabMatch && vocabMatch[language]) {
      return vocabMatch[language];
    }

    // 3. Multi-word intelligent token translation
    const tokens = dishName.trim().split(/(\s+)/);
    const translatedTokens = tokens.map((token) => {
      if (/^\s+$/.test(token)) return token;

      const cleanToken = token.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!cleanToken) return token;

      const v = CULINARY_VOCABULARY[cleanToken];
      if (v && v[language]) {
        return v[language];
      }

      const d = DISH_NAME_TRANSLATIONS[cleanToken];
      if (d && d[language]) {
        return d[language];
      }

      return transliterateWord(cleanToken, language);
    });

    const translatedSentence = translatedTokens.join("");
    return translatedSentence || dishName;
  };

  const tCategory = (catName: string): string => {
    if (!catName || language === "en") return catName;
    const clean = catName.trim().toLowerCase();
    const entry = CATEGORY_TRANSLATIONS[clean];
    if (entry && entry[language]) {
      return entry[language];
    }
    return tDish(catName);
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
