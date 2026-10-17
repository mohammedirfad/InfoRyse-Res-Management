import { randomBytes } from "crypto";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { generateQrToken } from "../src/lib/qr";
import { getPublicAppUrl } from "../src/lib/appUrl";
import { sendEmail, buildOnboardingEmailHtml } from "../src/lib/email";

interface DishDef {
  name: string;
  kannada: string;
  price: number; // in rupees
  description?: string;
  isVeg?: boolean;
}

interface CategoryDef {
  name: string;
  dishes: DishDef[];
}

const MENU_DATA: CategoryDef[] = [
  {
    name: "Soups",
    dishes: [
      { name: "Tomato Soup", kannada: "ಟೊಮಾಟೋ ಸೂಪ್", price: 80, description: "Freshly simmered ripe tomatoes with subtle herbs and crunchy croutons" },
      { name: "Manchow Soup", kannada: "ಮಂಚೇವ್ ಸೂಪ್", price: 90, description: "Spicy and tangy Indo-Chinese soup topped with crispy fried noodles" },
      { name: "Lemon Coriander Soup", kannada: "ಲೇಮನ್ ಕೊರಿಯಾಂಡರ್ ಸೂಪ್", price: 90, description: "Clear aromatic vegetable broth infused with fresh lemon and coriander" },
      { name: "Sweet Corn Soup", kannada: "ಸ್ವೀಟ್ ಕಾರ್ನ್ ಸೂಪ್", price: 90, description: "Creamy comforting sweet corn and tender vegetables" },
      { name: "Palak Soup", kannada: "ಪಾಲಕ್ ಸೂಪ್", price: 90, description: "Nutritious puréed fresh spinach soup with gentle spices" },
      { name: "Hot & Sour Soup", kannada: "ಹಾಟ್ & ಸೂರ್ ಸೂಪ್", price: 90, description: "Classic spicy, sour broth loaded with finely chopped garden vegetables" },
      { name: "Mushroom Soup", kannada: "ಮಶ್ರೂಮ್ ಸೂಪ್", price: 90, description: "Rich and creamy button mushroom soup with garlic and pepper" },
      { name: "Babycorn Soup", kannada: "ಬೇಬಿಕಾರ್ನ್ ಸೂಪ್", price: 100, description: "Delicate soup prepared with crunchy tender babycorn and fresh herbs" },
    ],
  },
  {
    name: "Chaat Specials",
    dishes: [
      { name: "Masala Puri", kannada: "ಮಸಾಲಾ ಪುರಿ", price: 60, description: "Crushed puris drenched in hot spicy pea gravy, topped with onions and sev" },
      { name: "Sev Puri", kannada: "ಸೇವ್ ಪುರಿ", price: 65, description: "Crisp puris loaded with potatoes, chutneys, and crisp golden sev" },
      { name: "Dahi Puri", kannada: "ದಹಿ ಪುರಿ", price: 70, description: "Crisp puris filled with spiced potatoes and cooled sweetened whipped curd" },
      { name: "Pani Puri", kannada: "ಪಾನಿ ಪುರಿ", price: 50, description: "Crisp puris served with tangy mint-coriander water and spiced potato filling" },
      { name: "Bhel Puri", kannada: "ಬೇಲ್ ಪುರಿ", price: 60, description: "Puffed rice tossed with onions, tomatoes, tangy tamarind, and spicy mint chutney" },
    ],
  },
  {
    name: "Snacks & Starters",
    dishes: [
      { name: "Masala Papad", kannada: "ಮಸಾಲಾ ಪಾಪಡ್", price: 40, description: "Crispy roasted papad topped with spicy onion, tomato, coriander mix" },
      { name: "Roasted Papad", kannada: "ರೋಸ್ಟೆಡ್ ಪಾಪಡ್", price: 30, description: "Lightly flame-roasted crispy papad" },
      { name: "Fried Papad", kannada: "ಫ್ರೈಡ್ ಪಾಪಡ್", price: 30, description: "Golden deep-fried crunchy papad" },
      { name: "Finger Chips", kannada: "ಫಿಂಗರ್ ಚಿಪ್ಸ್", price: 95, description: "Crispy golden French fries sprinkled with house seasoning" },
      { name: "Gobi Manchurian", kannada: "ಗೋಬಿ ಮಂಚೂರಿ", price: 105, description: "Crispy cauliflower florets tossed in classic spicy tangy Indo-Chinese sauce" },
      { name: "Gobi Chilly", kannada: "ಗೋಬಿ ಚಿಲ್ಲಿ", price: 120, description: "Crispy gobi tossed with capsicum, green chillies, and soy sauce" },
      { name: "Gobi 65", kannada: "ಗೋಬಿ-65", price: 120, description: "South Indian spiced crispy deep fried cauliflower tossed with curry leaves" },
      { name: "Gobi Pepper Dry", kannada: "ಗೋಬಿ ಪೆಪ್ಪರ್ ಡ್ರೈ", price: 130, description: "Cauliflower florets wok-tossed with freshly crushed black peppercorns" },
      { name: "Gobi Crispy", kannada: "ಗೋಬಿ ಕ್ರಿಸ್ಪಿ", price: 140, description: "Ultra-crispy fried cauliflower tossed in sweet and spicy sauce" },
      { name: "Veg Manchurian", kannada: "ವೆಜ್ ಮಂಚೂರಿಯನ್", price: 140, description: "Minced mixed vegetable balls fried and tossed in savoury Manchurian sauce" },
      { name: "Paneer Manchurian", kannada: "ಪನ್ನೀರ್ ಮಂಚೂರಿಯನ್", price: 165, description: "Fresh cottage cheese cubes tossed in spicy garlic soy sauce" },
      { name: "Paneer Chilly", kannada: "ಪನ್ನೀರ್ ಚಿಲ್ಲಿ", price: 165, description: "Golden paneer cubes wok-tossed with crisp bell peppers, onions, and chillies" },
      { name: "Paneer 65", kannada: "ಪನ್ನೀರ್ 65", price: 165, description: "Spicy marinated paneer fried crisp and tempered with curry leaves and mustard" },
      { name: "Paneer Lababdar Starter", kannada: "ಪನ್ನೀರ್ ಲವಾಬ್ದಾರ್", price: 190, description: "Rich pan-seared paneer cubes tossed in rich tomato-cream spices" },
      { name: "Paneer Pepper Dry", kannada: "ಪನ್ನೀರ್ ಪೆಪ್ಪರ್ ಡ್ರೈ", price: 190, description: "Succulent paneer cubes sautéed with crushed black pepper and onions" },
      { name: "Paneer Crispy", kannada: "ಪನ್ನೀರ್ ಕ್ರಿಸ್ಪಿ", price: 190, description: "Crispy coated paneer strips tossed in mild oriental spices" },
      { name: "Paneer Satay", kannada: "ಪನ್ನೀರ್ ಸಾಟಿ", price: 200, description: "Marinated paneer skewers grilled and served with delicious dipping sauce" },
      { name: "Paneer Tikka", kannada: "ಪನ್ನೀರ್ ತಿಕ್ಕಾ", price: 220, description: "Char-grilled cottage cheese marinated in hung curd, Kashmiri chilli, and tandoori spices" },
      { name: "Mushroom Manchurian", kannada: "ಮಶ್ರೂಮ್ ಮಂಚೂರಿಯನ್", price: 165, description: "Fresh button mushrooms coated crisp and tossed in scallion-soy glaze" },
      { name: "Mushroom Chilly", kannada: "ಮಶ್ರೂಮ್ ಚಿಲ್ಲಿ", price: 165, description: "Crispy button mushrooms tossed with green chillies, capsicum, and garlic" },
      { name: "Mushroom 65", kannada: "ಮಶ್ರೂಮ್ 65", price: 165, description: "Spiced crispy battered mushrooms with curry leaf seasoning" },
      { name: "Mushroom Pepper Dry", kannada: "ಮಶ್ರೂಮ್ ಪೆಪ್ಪರ್ ಡ್ರೈ", price: 170, description: "Tender button mushrooms tossed with spicy crushed black pepper" },
      { name: "Mushroom Crispy", kannada: "ಮಶ್ರೂಮ್ ಕ್ರಿಸ್ಪಿ", price: 175, description: "Golden crisp fried mushrooms tossed in savoury aromatic seasonings" },
      { name: "Babycorn Manchurian", kannada: "ಬೇಬಿಕಾರ್ನ್ ಮಂಚೂರಿಯನ್", price: 165, description: "Tender crisp babycorn tossed in garlic, ginger, and soy sauce" },
      { name: "Babycorn 65", kannada: "ಬೇಬಿಕಾರ್ನ್ 65", price: 165, description: "Crispy golden babycorn tossed in southern 65 spice mix" },
      { name: "Babycorn Crispy", kannada: "ಬೇಬಿಕಾರ್ನ್ ಕ್ರಿಸ್ಪಿ", price: 175, description: "Extra crunchy fried babycorn coated in mild sweet-chilli sauce" },
      { name: "Babycorn Chilly", kannada: "ಬೇಬಿಕಾರ್ನ್ ಚಿಲ್ಲಿ", price: 170, description: "Babycorn wok-fried with onions, capsicum, and dark soy" },
      { name: "Babycorn Pepper Dry", kannada: "ಬೇಬಿಕಾರ್ನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ", price: 170, description: "Crunchy babycorn tossed with coarse black pepper and curry herbs" },
      { name: "Paneer Spring Roll", kannada: "ಪನ್ನೀರ್ ಸ್ಪ್ರಿಂಗ್ ರೋಲ್", price: 199, description: "Crisp golden rolls stuffed with seasoned cottage cheese and shredded vegetables" },
      { name: "Mushroom Spring Roll", kannada: "ಮಶ್ರೂಮ್ ಸ್ಪ್ರಿಂಗ್ ರೋಲ್", price: 190, description: "Crispy rolls stuffed with spiced button mushrooms and garden greens" },
      { name: "Veg Spring Roll", kannada: "ವೆಜ್ ಸ್ಪ್ರಿಂಗ್ ರೋಲ್", price: 185, description: "Classic crispy pastry rolls packed with wok-tossed seasoned vegetables" },
    ],
  },
  {
    name: "North Indian Curries",
    dishes: [
      { name: "Dal Fry", kannada: "ದಾಲ್ ಫ್ರೈ", price: 120, description: "Yellow lentils cooked smooth and tempered with ghee, cumin, and garlic" },
      { name: "Dal Palak", kannada: "ದಾಲ್ ಪಾಲಕ್", price: 140, description: "Nutritious toor dal simmered with fresh spinach and mild spices" },
      { name: "Dal Kolhapuri", kannada: "ದಾಲ್ ಕೊಲ್ಲಾಪುರಿ", price: 140, description: "Spicy Maharashtrian style tempered yellow lentils with special Kolhapuri masala" },
      { name: "Dal Tadka", kannada: "ದಾಲ್ ತಡ್ಕಾ", price: 140, description: "Homestyle yellow dal finished with smoking hot ghee, dry red chillies, and garlic" },
      { name: "Dal Mushroom", kannada: "ದಾಲ್ ಮಶ್ರೂಮ್", price: 150, description: "Yellow lentils stewed with tender button mushrooms and spices" },
      { name: "Aloo Palak", kannada: "ಆಲು ಪಾಲಕ್", price: 160, description: "Tender potatoes simmered in rich, smooth spiced spinach gravy" },
      { name: "Aloo Mutter", kannada: "ಆಲು ಮಟರ್", price: 160, description: "Comforting homestyle potato and green peas curry in onion-tomato gravy" },
      { name: "Dum Aloo", kannada: "ದಮ್ ಆಲು", price: 170, description: "Baby potatoes slow-cooked on dum in a rich, velvety aromatic Kashmiri gravy" },
      { name: "Veg Kadai", kannada: "ವೆಜ್ ಕಡೈ", price: 160, description: "Assorted vegetables cooked in kadai with freshly ground coriander and red chillies" },
      { name: "Veg Handi", kannada: "ವೆಜ್ ಹಂಡಿ", price: 160, description: "Mixed garden vegetables slow-cooked in traditional clay pot with rich gravy" },
      { name: "Mix Veg Curry", kannada: "ಮಿಕ್ಸ್ ವೆಜ್ ಕರಿ", price: 160, description: "Fresh seasonal vegetables cooked in flavourful onion-tomato sauce" },
      { name: "Veg Makhanwala", kannada: "ವೆಜ್ ಮಖನ್ವಾಲಾ", price: 160, description: "Mixed vegetables simmered in creamy buttery makhani gravy" },
      { name: "Veg Hyderabadi", kannada: "ವೆಜ್ ಹೈದ್ರಾಬಾದಿ", price: 160, description: "Spicy green vegetable curry prepared with spinach, mint, and coconut" },
      { name: "Veg Kolhapuri", kannada: "ವೆಜ್ ಕೊಲ್ಲಾಪುರಿ", price: 170, description: "Fiery mixed vegetable curry prepared with authentic Kolhapuri roasted masala" },
      { name: "Veg Kofta", kannada: "ವೆಜ್ ಕೊಫ್ತಾ", price: 165, description: "Crisp vegetable dumplings served in rich, smooth cashew-tomato gravy" },
      { name: "Veg Kurma", kannada: "ವೆಜ್ ಕುರ್ಮಾ", price: 170, description: "Aromatic South Indian style coconut and poppy seed vegetable kurma" },
      { name: "Veg Shahi Kurma", kannada: "ವೆಜ್ ಶಾಹಿ ಕುರ್ಮಾ", price: 170, description: "Royal mild curry prepared with vegetables, dry fruits, and cashew paste" },
      { name: "Stuffed Capsicum", kannada: "ಸ್ಟಫ್ದ್ ಕ್ಯಾಪ್ಸಿಕಮ್", price: 170, description: "Roasted bell peppers stuffed with spiced potato mixture in thick gravy" },
      { name: "Aloo Gobi Masala", kannada: "ಆಲು ಗೋಬಿ ಮಸಾಲಾ", price: 170, description: "Classic dry-style preparation of tender potatoes and cauliflower with ginger and cumin" },
      { name: "Baingan Masala", kannada: "ಬೈಗನ್ ಮಸಾಲಾ", price: 160, description: "Baby brinjals cooked in aromatic roasted peanut and sesame gravy" },
      { name: "Veg Maharaja", kannada: "ವೆಜ್ ಮಹಾರಾಜಾ", price: 160, description: "Festive rich vegetable curry with cashews, cream, and exotic spices" },
      { name: "Tomato Curry", kannada: "ಟೊಮಾಟೋ ಕರಿ", price: 160, description: "Tangy homestyle tomato gravy tempered with mustard and curry leaves" },
      { name: "Tomato Masala", kannada: "ಟೊಮಾಟೋ ಮಸಾಲಾ", price: 160, description: "Spicy semi-dry tomato preparation with roasted spices" },
      { name: "Veg Chilly Milly", kannada: "ವೆಜ್ ಚಿಲ್ಲಿ ಮಿಲ್ಲಿ", price: 190, description: "Chef's signature spicy medley of shredded vegetables and paneer in fiery gravy" },
    ],
  },
  {
    name: "Paneer, Mushroom & Kaju Specialties",
    dishes: [
      { name: "Paneer Kadai", kannada: "ಪನ್ನೀರ್ ಕಡೈ", price: 170, description: "Soft cottage cheese and bell peppers cooked in freshly pounded kadai spices" },
      { name: "Paneer Handi", kannada: "ಪನ್ನೀರ್ ಹಂಡಿ", price: 180, description: "Paneer cubes simmered in traditional earthenware handi with rich aromatic gravy" },
      { name: "Palak Paneer", kannada: "ಪಾಲಕ್ ಪನ್ನೀರ್", price: 170, description: "Fresh cottage cheese simmered in smooth, mild spinach puree with cream" },
      { name: "Paneer Masala", kannada: "ಪನ್ನೀರ್ ಮಸಾಲಾ", price: 170, description: "Classic paneer curry in spicy, thick tomato-onion gravy" },
      { name: "Paneer Mutter", kannada: "ಪನ್ನೀರ್ ಮಟರ್", price: 170, description: "Cottage cheese and tender green peas cooked in sweet and savoury gravy" },
      { name: "Paneer Makhanwala", kannada: "ಪನ್ನೀರ್ ಮಖನ್ವಾಲಾ", price: 170, description: "Rich velvety tomato sauce with tender paneer, finished with butter and cream" },
      { name: "Paneer Butter Masala", kannada: "ಪನ್ನೀರ್ ಬಟರ್ ಮಸಾಲಾ", price: 180, description: "All-time favourite paneer cubes in mildly sweet, rich buttery tomato gravy" },
      { name: "Paneer Tikka Masala", kannada: "ಪನ್ನೀರ್ ತಿಕ್ಕಾ ಮಸಾಲಾ", price: 195, description: "Tandoori grilled paneer tikka tossed in spicy, smoky masala gravy" },
      { name: "Paneer Kofta", kannada: "ಪನ್ನೀರ್ ಕೊಫ್ತಾ", price: 185, description: "Stuffed paneer dumplings bathed in royal cashew and tomato cream sauce" },
      { name: "Paneer Bhurji", kannada: "ಪನ್ನೀರ್ ಬುರ್ಜಿ", price: 190, description: "Crumbled fresh paneer scrambled with onions, tomatoes, and green chillies" },
      { name: "Plain Palak", kannada: "ಪ್ಲೇನ್ ಪಾಲಕ್", price: 150, description: "Smooth velvety garlic-tempered spinach curry" },
      { name: "Bhendi Masala", kannada: "ಬೆಂಡಿ ಮಸಾಲಾ", price: 160, description: "Tender okra cooked with onions, tomatoes, and dry roasted spices" },
      { name: "Bhendi Fry Masala", kannada: "ಬೆಂಡಿ ಫ್ರೈ ಮಸಾಲಾ", price: 170, description: "Crispy fried ladyfingers tossed in aromatic dry masala" },
      { name: "Mushroom Kadai", kannada: "ಮಶ್ರೂಮ್ ಕಡೈ", price: 170, description: "Fresh button mushrooms cooked with bell peppers and crushed kadai spices" },
      { name: "Mushroom Kolhapuri", kannada: "ಮಶ್ರೂಮ್ ಕೊಲ್ಲಾಪುರಿ", price: 170, description: "Spicy mushroom curry infused with fiery Kolhapuri red chilli paste" },
      { name: "Mushroom Masala", kannada: "ಮಶ್ರೂಮ್ ಮಸಾಲಾ", price: 170, description: "Button mushrooms simmered in thick onion-tomato gravy with warm spices" },
      { name: "Mushroom Handi", kannada: "ಮಶ್ರೂಮ್ ಹಂಡಿ", price: 180, description: "Slow-simmered mushrooms in a creamy, velvety handi gravy" },
      { name: "Babycorn Masala", kannada: "ಬೇಬಿಕಾರ್ನ್ ಮಸಾಲಾ", price: 170, description: "Crisp babycorn pieces in thick aromatic North Indian masala" },
      { name: "Malai Kofta", kannada: "ಮಲೈ ಕೊಫ್ತಾ", price: 175, description: "Melt-in-mouth cottage cheese and potato dumplings in sweet creamy cashew gravy" },
      { name: "Kaju Masala", kannada: "ಕಾಜು ಮಸಾಲಾ", price: 180, description: "Whole roasted cashew nuts simmered in rich, decadent onion-tomato gravy" },
      { name: "Kaju Paneer", kannada: "ಕಾಜು ಪನ್ನೀರ್", price: 185, description: "Delightful combination of premium cashews and fresh paneer in velvety sauce" },
      { name: "Kaju Mushroom Masala", kannada: "ಕಾಜು ಮಶ್ರೂಮ್ ಮಸಾಲಾ", price: 190, description: "Rich curry featuring golden cashews and tender button mushrooms" },
      { name: "Kaju Tikka Masala", kannada: "ಕಾಜು ತಿಕ್ಕಾ ಮಸಾಲಾ", price: 195, description: "Roasted cashews cooked in tandoori tikka spiced gravy" },
      { name: "Green Peas Masala", kannada: "ಗ್ರೀನ್ ಪೀಸ್ ಮಸಾಲಾ", price: 160, description: "Fresh sweet green peas cooked in aromatic spiced gravy" },
      { name: "Brahmi Special", kannada: "ಬ್ರಾಹ್ಮಿ ಸ್ಪೆಷಲ್", price: 200, description: "The restaurant's signature chef specialty curry loaded with paneer, cashews, and secret herbs" },
    ],
  },
  {
    name: "Roti & Tandoor",
    dishes: [
      { name: "Plain Roti", kannada: "ಪ್ಲೇನ್ ರೋಟಿ", price: 22, description: "Traditional whole wheat bread baked in tandoor" },
      { name: "Butter Roti", kannada: "ಬಟರ್ ರೋಟಿ", price: 25, description: "Whole wheat tandoori roti brushed with fresh butter" },
      { name: "Plain Naan", kannada: "ಪ್ಲೇನ್ ನಾನ್", price: 30, description: "Soft, pillowy leavened flatbread baked in clay oven" },
      { name: "Butter Naan", kannada: "ಬಟರ್ ನಾನ್", price: 35, description: "Leavened tandoor naan glazed generously with butter" },
      { name: "Garlic Naan", kannada: "ಗಾರ್ಲಿಕ್ ನಾನ್", price: 80, description: "Tandoori naan topped with roasted minced garlic and coriander" },
      { name: "Plain Kulcha", kannada: "ಪ್ಲೇನ್ ಕುಲ್ಚಾ", price: 25, description: "Soft leavened round bread baked in tandoor" },
      { name: "Butter Kulcha", kannada: "ಬಟರ್ ಕುಲ್ಚಾ", price: 30, description: "Warm tandoori kulcha finished with fresh creamy butter" },
      { name: "Garlic Kulcha", kannada: "ಗಾರ್ಲಿಕ್ ಕುಲ್ಚಾ", price: 50, description: "Soft kulcha stuffed and seasoned with aromatic garlic" },
      { name: "Lachha Paratha", kannada: "ಲಚ್ಚಾ ಪರೋಟಾ", price: 35, description: "Multi-layered flaky whole wheat paratha baked crisp in tandoor" },
      { name: "Butter Lachha Paratha", kannada: "ಬಟರ್ ಲಚ್ಚಾ ಪರೋಟಾ", price: 40, description: "Crisp flaky layered paratha smothered with melted butter" },
      { name: "Aloo Paratha", kannada: "ಆಲು ಪರೋಟಾ", price: 60, description: "Wholesome flatbread stuffed with spiced mashed potatoes and herbs" },
      { name: "Masala Paratha", kannada: "ಮಸಾಲಾ ಪರೋಟಾ", price: 60, description: "Layered tandoori flatbread flavoured with roasted spice powders" },
    ],
  },
  {
    name: "Chinese Fried Rice",
    dishes: [
      { name: "Veg Fried Rice", kannada: "ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್", price: 135, description: "Fragrant rice stir-fried in wok with finely chopped vegetables and soy" },
      { name: "Palak Fried Rice", kannada: "ಪಾಲಕ್ ಫ್ರೈಡ್ ರೈಸ್", price: 140, description: "Healthy wok-tossed rice with spinach puree and gentle seasoning" },
      { name: "Gobi Fried Rice", kannada: "ಗೋಬಿ ಫ್ರೈಡ್ ರೈಸ್", price: 145, description: "Fried rice tossed with crispy golden cauliflower florets" },
      { name: "Onion Chilly Fried Rice", kannada: "ಆನಿಯೋನ್ ಚಿಲ್ಲಿ ಫ್ರೈಡ್ ರೈಸ್", price: 145, description: "Spicy fried rice tossed with caramelized onions and hot green chillies" },
      { name: "Mushroom Fried Rice", kannada: "ಮಶ್ರೂಮ್ ಫ್ರೈಡ್ ರೈಸ್", price: 150, description: "Flavourful fried rice loaded with sautéed button mushrooms and scallions" },
      { name: "Paneer Fried Rice", kannada: "ಪನ್ನೀರ್ ಫ್ರೈಡ್ ರೈಸ್", price: 150, description: "Wok-fried rice tossed with soft diced paneer and crisp vegetables" },
      { name: "Triple Schezwan Fried Rice", kannada: "ಟ್ರಿಪಲ್ ಶೆಜ್ವಾನ್ ಫ್ರೈಡ್ ರೈಸ್", price: 220, description: "Ultimate combination of spicy Schezwan rice, noodles, and rich gravy" },
      { name: "Brahmi Special Gobi Dry", kannada: "ಬ್ರಾಹ್ಮಿ ಸ್ಪೆಷಲ್ ಗೋಬಿ ಡ್ರೈ", price: 115, description: "Chef's signature spicy crispy dry cauliflower snack" },
    ],
  },
  {
    name: "Biryani & Rice Specialties",
    dishes: [
      { name: "Plain Rice", kannada: "ಪ್ಲೇನ್ ರೈಸ್", price: 70, description: "Steamed fluffy white rice" },
      { name: "Jeera Rice (Basmati)", kannada: "ಜೀರಾ ರೈಸ್ (ಬಾಸ್ಮತಿ)", price: 130, description: "Long grain Basmati rice tossed with fragrant cumin and pure ghee" },
      { name: "Jeera Rice (Kolam)", kannada: "ಜೀರಾ ರೈಸ್ (ಕೋಲಮ್)", price: 120, description: "Fine Kolam rice tempered with cumin and ghee" },
      { name: "Ghee Rice", kannada: "ಘೀ ರೈಸ್", price: 140, description: "Fragrant rice cooked in pure desi ghee with whole spices and fried onions" },
      { name: "Masala Rice", kannada: "ಮಸಾಲಾ ರೈಸ್", price: 140, description: "Spicy South-Indian style rice tossed with aromatic masala" },
      { name: "Curd Rice", kannada: "ಕರ್ಡ್ ರೈಸ್", price: 95, description: "Cooling soothing curd rice tempered with mustard, ginger, curry leaves, and pomegranate" },
      { name: "Palak Rice", kannada: "ಪಾಲಕ್ ರೈಸ್", price: 150, description: "Rice cooked with fresh spinach puree, mild herbs, and spices" },
      { name: "Palak Khichdi", kannada: "ಪಾಲಕ್ ಖಿಚಡಿ", price: 160, description: "Comforting moong dal and rice khichdi enriched with fresh spinach and garlic tadka" },
      { name: "Dal Khichdi", kannada: "ದಾಲ್ ಖಿಚಡಿ", price: 150, description: "Wholesome blend of yellow lentils and rice tempered with cumin and hing" },
      { name: "Veg Pulao", kannada: "ವೆಜ್ ಪಲಾವ್", price: 130, description: "Fragrant Basmati rice cooked with fresh seasonal vegetables and aromatic whole spices" },
      { name: "Mushroom Tawa Pulao", kannada: "ಮಶ್ರೂಮ್ ತವಾ ಪುಲಾವ್", price: 150, description: "Mumbai street style tawa pulao tossed with mushrooms and pav bhaji masala" },
      { name: "Paneer Tawa Pulao", kannada: "ಪನ್ನೀರ್ ತವಾ ಪುಲಾವ್", price: 160, description: "Wok-tossed spicy tawa rice packed with juicy paneer cubes" },
      { name: "Veg Biryani", kannada: "ವೆಜ್ ಬಿರಿಯಾನಿ", price: 150, description: "Aromatic layered basmati rice with mixed vegetables and saffron spices" },
      { name: "Veg Handi Biryani", kannada: "ವೆಜ್ ಹಂಡಿ ಬಿರಿಯಾನಿ", price: 160, description: "Pot-cooked biryani infused with smoky charcoal aroma and whole spices" },
      { name: "Mushroom Biryani", kannada: "ಮಶ್ರೂಮ್ ಬಿರಿಯಾನಿ", price: 160, description: "Fragrant basmati biryani with tender mushrooms marinated in yogurt and mint" },
      { name: "Kashmiri Biryani", kannada: "ಕಾಶ್ಮೀರಿ ಬಿರಿಯಾನಿ", price: 160, description: "Mild, fragrant biryani cooked with saffron, fresh fruits, and nuts" },
      { name: "Kaju Biryani", kannada: "ಕಾಜು ಬಿರಿಯಾನಿ", price: 170, description: "Decadent biryani richly garnished with ghee-roasted whole cashews" },
      { name: "Mughlai Biryani", kannada: "ಮುಘಲೈ ಬಿರಿಯಾನಿ", price: 170, description: "Rich royal dum biryani prepared with kewra, saffron, and cream" },
      { name: "Veg Hyderabadi Dum Biryani", kannada: "ವೆಜ್ ಹೈದ್ರಾಬಾದಿ ದಮ್ ಬಿರಿಯಾನಿ", price: 180, description: "Authentic spicy slow-dum biryani cooked with mint, fried onions, and Hyderabadi spices" },
      { name: "Paneer Biryani", kannada: "ಪನ್ನೀರ್ ಬಿರಿಯಾನಿ", price: 170, description: "Layered basmati rice dum-cooked with spicy marinated cottage cheese" },
    ],
  },
  {
    name: "Thali Combos",
    dishes: [
      { name: "North Indian Thali", kannada: "ಉತ್ತರ ಭಾರತದ ಥಾಲಿ", price: 190, description: "Grand meal with 2 rotis, paneer gravy, veg curry, dal, jeera rice, papad, curd, sweet, and salad" },
      { name: "Mini Thali", kannada: "ಮಿನಿ ಥಾಲಿ", price: 120, description: "Satisfying combo with 2 rotis, veg curry, dal fry, rice, and papad" },
      { name: "Roti Curry", kannada: "ರೋಟಿ ಕರಿ", price: 90, description: "2 hot tandoori rotis served with a bowl of flavourful mixed vegetable curry" },
    ],
  },
  {
    name: "Noodles & Chopsuey",
    dishes: [
      { name: "Veg Noodles", kannada: "ವೆಜ್ ನೂಡಲ್ಸ್", price: 130, description: "Stir-fried noodles with julienned vegetables in classic mild Chinese sauce" },
      { name: "Schezwan Noodles", kannada: "ಶೆಜ್ವಾನ್ ನೂಡಲ್ಸ್", price: 140, description: "Spicy noodles tossed in fiery homemade Schezwan chilli garlic sauce" },
      { name: "Triple Noodles", kannada: "ಟ್ರಿಪಲ್ ನೂಡಲ್ಸ್", price: 190, description: "Combination of stir-fried noodles, crispy fried noodles, and savoury vegetable gravy" },
      { name: "Singapore Noodles", kannada: "ಸಿಂಗಪೂರ್ ನೂಡಲ್ಸ್", price: 170, description: "Aromatic noodles tossed with mild curry powder and crisp vegetables" },
      { name: "Hong Kong Noodles", kannada: "ಹಾಂಗ್ ಕಾಂಗ್ ನೂಡಲ್ಸ್", price: 170, description: "Hong Kong style sweet, savoury, and spicy wok-tossed noodles" },
      { name: "Paneer Noodles", kannada: "ಪನ್ನೀರ್ ನೂಡಲ್ಸ್", price: 160, description: "Wok noodles loaded with fresh paneer cubes and crunchy veggies" },
      { name: "Mushroom Noodles", kannada: "ಮಶ್ರೂಮ್ ನೂಡಲ್ಸ್", price: 160, description: "Noodles stir-fried with juicy button mushrooms and scallions" },
      { name: "Veg Hakka Noodles", kannada: "ವೆಜ್ ಹಕ್ಕಾ ನೂಡಲ್ಸ್", price: 140, description: "Traditional Chinese Hakka style noodles tossed with cabbage, carrots, and capsicum" },
      { name: "Veg American Chopsuey", kannada: "ವೆಜ್ ಅಮೆರಿಕನ್ ಚಾಪ್ಸುಯಿ", price: 170, description: "Crispy fried noodles crowned with sweet, tangy vegetable gravy" },
    ],
  },
  {
    name: "Milkshakes",
    dishes: [
      { name: "Banana Milkshake", kannada: "ಬನಾನಾ ಮಿಲ್ಕ್ ಶೇಕ್", price: 60, description: "Smooth thick shake blended with ripe bananas and chilled milk" },
      { name: "Badam Shake", kannada: "ಬಾದಾಮ್ ಮಿಲ್ಕ್ ಶೇಕ್", price: 80, description: "Traditional rich almond shake flavoured with saffron and cardamom" },
      { name: "Apple Shake", kannada: "ಆ್ಯಪಲ್ ಮಿಲ್ಕ್ ಶೇಕ್", price: 95, description: "Fresh crisp apple shake blended with creamy milk" },
      { name: "Chikku Shake", kannada: "ಚಿಕ್ಕು ಮಿಲ್ಕ್ ಶೇಕ್", price: 80, description: "Naturally sweet sapota fruit blended into a thick milkshake" },
      { name: "Muskmelon Shake", kannada: "ಮಸ್ಕ್ ಮೆಲನ್ ಮಿಲ್ಕ್ ಶೇಕ್", price: 80, description: "Refreshing and fragrant muskmelon shake" },
      { name: "Papaya Shake", kannada: "ಪಪಾಯಾ ಮಿಲ್ಕ್ ಶೇಕ್", price: 80, description: "Fresh papaya pulp blended into a wholesome thick shake" },
      { name: "Oreo Shake", kannada: "ಓರಿಯೋ ಮಿಲ್ಕ್ ಶೇಕ್", price: 70, description: "Creamy vanilla shake blended with crunchy Oreo chocolate cookies" },
      { name: "Chocolate Shake", kannada: "ಚಾಕೊಲೇಟ್ ಮಿಲ್ಕ್ ಶೇಕ್", price: 90, description: "Decadent chocolate syrup and cocoa blended smooth and creamy" },
      { name: "Strawberry Shake", kannada: "ಸ್ಟ್ರಾಬೆರಿ ಮಿಲ್ಕ್ ಶೇಕ್", price: 90, description: "Sweet strawberry thick shake with creamy milk" },
      { name: "Pista Shake", kannada: "ಪಿಸ್ತಾ ಮಿಲ್ಕ್ ಶೇಕ್", price: 90, description: "Flavoured with roasted pistachios and creamy milk" },
      { name: "Butterscotch Shake", kannada: "ಬಟರ್ ಸ್ಕಾಚ್ ಮಿಲ್ಕ್ ಶೇಕ್", price: 90, description: "Rich butterscotch shake topped with crunchy praline bits" },
      { name: "Mango Shake", kannada: "ಮ್ಯಾಂಗೋ ಮಿಲ್ಕ್ ಶೇಕ್", price: 90, description: "Tropical Alphonso mango pulp blended into a thick, sweet delight" },
      { name: "Cold Coffee", kannada: "ಕೋಲ್ಡ್ ಕಾಫಿ", price: 95, description: "Chilled brewed espresso coffee blended frothy with creamy milk and sugar" },
      { name: "Dry Fruits Milkshake", kannada: "ಡ್ರೈ ಫ್ರುಟ್ಸ್ ಮಿಲ್ಕ್ ಶೇಕ್", price: 200, description: "Ultra-luxurious shake loaded with cashews, almonds, raisins, and figs" },
    ],
  },
  {
    name: "Fresh Juices & Coolers",
    dishes: [
      { name: "Watermelon Juice", kannada: "ವಾಟರ್ ಮೆಲನ್ ಜ್ಯೂಸ್", price: 70, description: "Fresh cold-pressed sweet watermelon juice, highly hydrating" },
      { name: "Muskmelon Juice", kannada: "ಮಸ್ಕ್ ಮೆಲನ್ ಜ್ಯೂಸ್", price: 70, description: "Naturally sweet freshly squeezed muskmelon juice" },
      { name: "Mosambi Juice", kannada: "ಮೊಸಂಬಿ ಜ್ಯೂಸ್", price: 80, description: "Freshly squeezed sweet lime juice packed with Vitamin C" },
      { name: "Orange Juice", kannada: "ಆರೆಂಜ್ ಜ್ಯೂಸ್", price: 90, description: "Zesty fresh orange juice" },
      { name: "Pineapple Juice", kannada: "ಪೈನಾಪಲ್ ಜ್ಯೂಸ್", price: 80, description: "Tangy sweet fresh pineapple juice" },
      { name: "Papaya Juice", kannada: "ಪಪಾಯಾ ಜ್ಯೂಸ್", price: 60, description: "Fresh revitalizing papaya juice" },
      { name: "Pomegranate Juice", kannada: "ದಾಳಿಂಬೆ ಜ್ಯೂಸ್", price: 95, description: "Antioxidant-rich fresh pomegranate juice" },
      { name: "Apple Juice", kannada: "ಆ್ಯಪಲ್ ಜ್ಯೂಸ್", price: 90, description: "Pure fresh crisp apple juice" },
      { name: "Lemon Juice", kannada: "ಲೆಮನ್ ಜ್ಯೂಸ್", price: 40, description: "Refreshing freshly squeezed lemon water with sugar or salt" },
      { name: "Lemon Soda", kannada: "ಲೆಮನ್ ಸೋಡಾ", price: 45, description: "Fizzy club soda with fresh lime, mint, and black salt" },
      { name: "Sweet Lassi", kannada: "ಸ್ವೀಟ್ ಲಸ್ಸಿ", price: 70, description: "Thick, creamy Punjabi sweet yogurt drink infused with cardamom" },
      { name: "Butter Milk", kannada: "ಬಟರ್ ಮಿಲ್ಕ್", price: 40, description: "Refreshing spiced churned buttermilk tempered with ginger and curry leaves" },
    ],
  },
  {
    name: "Mocktails",
    dishes: [
      { name: "Virgin Mojito", kannada: "ವರ್ಜಿನ್ ಮೋಜಿಟೋ", price: 120, description: "Muddled fresh mint leaves, lime wedges, and sparkling soda over ice" },
      { name: "Cucumber Cooler", kannada: "ಸೌತೆಕಾಯಿ ಕೂಲರ್", price: 90, description: "Crisp cucumber juice, fresh mint, and lime cooler" },
      { name: "Blue Lemon", kannada: "ಬ್ಲೂ ಲೆಮನ್", price: 90, description: "Vibrant blue curacao flavoured citrus sparkling cooler" },
      { name: "Fruit Cocktail", kannada: "ಫ್ರೂಟ್ ಕಾಕ್ಟೇಲ್", price: 110, description: "Medley of fresh seasonal fruit juices served over crushed ice" },
      { name: "Pina Colada", kannada: "ಪಿನಾ ಕೊಲಾಡಾ", price: 100, description: "Creamy blend of fresh pineapple juice and rich coconut milk" },
    ],
  },
  {
    name: "Ice Creams & Desserts",
    dishes: [
      { name: "Chocolate Ice Cream", kannada: "ಚಾಕೊಲೇಟ್ ಐಸ್ ಕ್ರೀಮ್", price: 70, description: "Rich and creamy premium dark chocolate scoop" },
      { name: "Vanilla Ice Cream", kannada: "ವೆನಿಲ್ಲಾ ಐಸ್ ಕ್ರೀಮ್", price: 65, description: "Classic Madagascar vanilla bean ice cream scoop" },
      { name: "Strawberry Ice Cream", kannada: "ಸ್ಟ್ರಾಬೆರಿ ಐಸ್ ಕ್ರೀಮ್", price: 65, description: "Sweet strawberry ice cream scoop with berry notes" },
      { name: "Butterscotch Ice Cream", kannada: "ಬಟರ್ ಸ್ಕಾಚ್ ಐಸ್ ಕ್ರೀಮ್", price: 70, description: "Creamy butterscotch scoop with crunchy caramel praline" },
      { name: "Mango Ice Cream", kannada: "ಮ್ಯಾಂಗೋ ಐಸ್ ಕ್ರೀಮ್", price: 70, description: "Rich tropical Alphonso mango ice cream scoop" },
      { name: "Pista Ice Cream", kannada: "ಪಿಸ್ತಾ ಐಸ್ ಕ್ರೀಮ್", price: 65, description: "Fragrant pistachio ice cream scoop" },
      { name: "Gadbad Ice Cream", kannada: "ಗಡ್ಬಡ್ ಐಸ್ ಕ್ರೀಮ್", price: 140, description: "Mangalore's iconic sundae: layers of 3 ice cream flavours, fresh fruits, nuts, jelly, and syrup" },
      { name: "Fruit Salad with Ice Cream", kannada: "ಫ್ರೂಟ್ ಸಲಾಡ್", price: 70, description: "Diced fresh seasonal fruits topped with a scoop of vanilla ice cream" },
    ],
  },
];

async function main() {
  const email = "potradeirfadk@gmail.com";
  const restaurantName = "Shri Brahmi Pure Veg Restaurant";
  const slug = "shri-brahmi-pure-veg";
  const unissuedPassword = randomBytes(32).toString("base64url");

  console.log(`Starting restaurant & menu setup for ${email}...`);

  // 1. Check if user or restaurant already exists
  let user = await db.user.findUnique({ where: { email } });
  let restaurant = await db.restaurant.findUnique({ where: { slug } });

  const passwordHash = await hashPassword(unissuedPassword);

  if (!restaurant) {
    restaurant = await db.restaurant.create({
      data: {
        name: restaurantName,
        slug,
        ownerName: "Irfad K",
        contactEmail: email,
        contactPhone: "7356955896",
        location: "Bengaluru, Karnataka",
        plan: "Pro",
        isActive: true,
        openNow: true,
        taxName: "GST",
        taxPercent: 5.0,
      },
    });
    console.log(`Created Restaurant: "${restaurant.name}" (ID: ${restaurant.id})`);
  } else {
    console.log(`Found existing Restaurant: "${restaurant.name}" (ID: ${restaurant.id})`);
  }

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: "Irfad K",
        phone: "7356955896",
        passwordHash,
        role: "OWNER",
        restaurantId: restaurant.id,
        mustChangePassword: true,
      },
    });
    console.log(`Created Owner User: ${user.email}`);
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        restaurantId: restaurant.id,
        passwordHash,
        role: "OWNER",
        mustChangePassword: true,
      },
    });
    console.log(`Updated Owner User: ${user.email} with new password`);
  }

  // 2. Ensure default dining tables exist (Table 1 to 6)
  const existingTables = await db.table.findMany({ where: { restaurantId: restaurant.id, deletedAt: null } });
  if (existingTables.length === 0) {
    const tableLabels = ["1", "2", "3", "4", "5", "6"];
    for (const label of tableLabels) {
      await db.table.create({
        data: {
          restaurantId: restaurant.id,
          label,
          section: "Main Dining",
          capacity: 4,
          status: "AVAILABLE",
          qrToken: generateQrToken(),
        },
      });
    }
    console.log(`Created 6 operational dining tables (1 - 6) with QR tokens.`);
  }

  // 3. Clear old placeholder categories/items if any to ensure clean seed
  const existingCats = await db.category.findMany({ where: { restaurantId: restaurant.id } });
  console.log(`Found ${existingCats.length} existing categories.`);

  // 4. Create each category and its menu items
  let totalDishesCreated = 0;
  for (let catIdx = 0; catIdx < MENU_DATA.length; catIdx++) {
    const catData = MENU_DATA[catIdx];
    
    // Find or create category
    let category = await db.category.findFirst({
      where: { restaurantId: restaurant.id, name: catData.name, deletedAt: null },
    });

    if (!category) {
      category = await db.category.create({
        data: {
          restaurantId: restaurant.id,
          name: catData.name,
          position: catIdx + 1,
          isActive: true,
        },
      });
      console.log(`Created Category: [${category.name}]`);
    } else {
      await db.category.update({
        where: { id: category.id },
        data: { position: catIdx + 1, isActive: true },
      });
    }

    for (const dish of catData.dishes) {
      const priceCents = dish.price * 100;
      const description = dish.description || `${dish.kannada} • Traditional delicacy`;

      // Check if dish already exists in this category
      const existingDish = await db.menuItem.findFirst({
        where: { restaurantId: restaurant.id, categoryId: category.id, name: dish.name, deletedAt: null },
      });

      if (!existingDish) {
        await db.menuItem.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            name: dish.name,
            description,
            priceCents,
            isVeg: true,
            isAvailable: true,
          },
        });
        totalDishesCreated++;
      } else {
        await db.menuItem.update({
          where: { id: existingDish.id },
          data: {
            priceCents,
            description,
            isVeg: true,
            isAvailable: true,
          },
        });
      }
    }
  }

  console.log(`Successfully seeded ${totalDishesCreated} new dishes across ${MENU_DATA.length} categories!`);

  // 5. Send onboarding email to the owner
  const loginUrl = `${getPublicAppUrl()}/admin/login`;
  const emailHtml = buildOnboardingEmailHtml({
    restaurantName: restaurant.name,
    ownerName: "Irfad K",
    ownerEmail: email,
    loginUrl,
    slug: restaurant.slug,
  });

  try {
    await sendEmail({
      to: email,
      subject: `Welcome to InfoRyse: Login Details for ${restaurant.name}`,
      html: emailHtml,
      text: `Welcome Irfad K!\n\nYour restaurant "${restaurant.name}" has been created with the full menu.\nRestaurant Admin URL: ${loginUrl}\nLogin email: ${email}\nSelect Forgot password on the login page to verify your email and set a password.`,
    });
    console.log(`Sent login onboarding email to ${email}`);
  } catch (err) {
    console.error("Email send failed (non-blocking):", err);
  }

  console.log("\n=======================================================");
  console.log("RESTAURANT & MENU SEEDING COMPLETED SUCCESSFULLY!");
  console.log(`Restaurant Name : ${restaurant.name}`);
  console.log(`Restaurant Slug : ${restaurant.slug}`);
  console.log(`Admin Login URL : http://localhost:3000/admin/login`);
  console.log(`Owner Email     : ${email}`);
  console.log(`Owner Password  : Use the Forgot password link at ${loginUrl}`);
  console.log("=======================================================\n");
}

main().catch(console.error).finally(() => db.$disconnect());
