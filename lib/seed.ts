import "server-only";
import { randomBytes } from "node:crypto";
import { hashPassword } from "./password";
import { OWNER_EMAIL } from "./owner";
import { ALL_PERMISSIONS, type DB, type MenuItem } from "./types";

// First admin, created only when the database is empty. The password comes from the
// environment so it never lands in Git. Change it after first login (avatar → Password).

function adminPassword() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 6) {
    throw new Error("Set ADMIN_PASSWORD (6+ characters) to create the first admin. See .env.example.");
  }
  return pw;
}

const cats = [
  ["c-mutton", "Mutton Sides"],
  ["c-chicken", "Chicken Sides"],
  ["c-biryani", "Biriyani"],
  ["c-bucket", "Bucket Biriyani"],
  ["c-egg", "Egg"],
  ["c-breads", "Breads"],
  ["c-dessert", "Dessert"],
  ["c-drinks", "Beverage"],
] as const;

// [categoryId, name, tamil, price, veg] — from the printed Periya Veedu menu
const items: [string, string, string, number, boolean][] = [
  ["c-mutton", "Mutton Uppu Kari (Spl)", "மட்டன் உப்பு கறி", 220, false],
  ["c-mutton", "Mutton Chukka", "மட்டன் சுக்கா", 200, false],
  ["c-mutton", "Kothukari", "கொத்துக்கறி", 190, false],
  ["c-mutton", "Suthu Koluppu Varuval", "சுத்து கொழுப்பு வறுவல்", 190, false],
  ["c-mutton", "Nalli Varuval", "நல்லி வறுவல்", 200, false],
  ["c-mutton", "Suvarotti Varuval", "சுவரொட்டி வறுவல்", 200, false],
  ["c-mutton", "Eeral Varuval", "ஈரல் வறுவல்", 190, false],
  ["c-mutton", "Kudal Varuval", "குடல் வறுவல்", 160, false],
  ["c-mutton", "Kudal Muttai Varuval", "குடல் முட்டை வறுவல்", 180, false],
  ["c-mutton", "Moolai Varuval", "மூளை வறுவல்", 160, false],
  ["c-mutton", "Moolai Muttai Varuval", "மூளை முட்டை வறுவல்", 180, false],
  ["c-mutton", "Kola Urundai (Set)", "கோலா உருண்டை", 60, false],
  ["c-mutton", "Gaadi Chops (1)", "காடி சாப்ஸ்", 200, false],
  ["c-chicken", "Nattukozhi Uppu Kari (Spl)", "நாட்டுக்கோழி உப்பு கறி", 220, false],
  ["c-chicken", "Pichu Potta Kozhi Varuval", "பிச்சு போட்ட கோழி வறுவல்", 220, false],
  ["c-chicken", "Pallipalayam Varuval", "பள்ளிபாளையம் வறுவல்", 130, false],
  ["c-chicken", "Chicken Chukka", "சிக்கன் சுக்கா", 140, false],
  ["c-chicken", "Chicken Milagu Varuval", "சிக்கன் மிளகு வறுவல்", 140, false],
  ["c-chicken", "Chinthamani", "சிந்தாமணி", 140, false],
  ["c-chicken", "Chicken 65", "சிக்கன் 65", 140, false],
  ["c-chicken", "Lollipop", "லாலிபாப்", 140, false],
  ["c-biryani", "Mutton Biriyani", "மட்டன் பிரியாணி", 220, false],
  ["c-biryani", "Chicken Biriyani", "சிக்கன் பிரியாணி", 180, false],
  ["c-biryani", "Egg Biriyani", "முட்டை பிரியாணி", 120, false],
  ["c-biryani", "65 Biriyani", "65 பிரியாணி", 180, false],
  ["c-biryani", "Empty Biriyani", "குஸ்கா", 100, false],
  ["c-bucket", "Regular Chicken Bucket (4-5)", "சிக்கன் பக்கெட் சிறியது", 899, false],
  ["c-bucket", "Large Chicken Bucket (8-9)", "சிக்கன் பக்கெட் பெரியது", 1799, false],
  ["c-bucket", "Regular Mutton Bucket (4-5)", "மட்டன் பக்கெட் சிறியது", 1099, false],
  ["c-bucket", "Large Mutton Bucket (8-9)", "மட்டன் பக்கெட் பெரியது", 2299, false],
  ["c-egg", "Egg Items", "முட்டை வகைகள்", 25, false],
  ["c-breads", "Porotta", "பரோட்டா", 30, true],
  ["c-breads", "Chappathi", "சப்பாத்தி", 30, true],
  ["c-dessert", "Elaneer Pudding", "இளநீர் புட்டிங்", 60, true],
  ["c-dessert", "Nongu Pudding (Seasonal)", "நுங்கு புட்டிங்", 70, true],
  ["c-drinks", "Goli Soda / Pet Bottle (MRP)", "கோலி சோடா", 20, true],
  ["c-drinks", "Elaneer Payasam", "இளநீர் பாயசம்", 60, true],
  ["c-drinks", "Nongu Payasam (Seasonal)", "நுங்கு பாயசம்", 70, true],
];

export function seed(): DB {
  const menu: MenuItem[] = items.map(([categoryId, name, nameTa, price, veg], i) => ({
    id: "m" + (i + 1),
    categoryId,
    name,
    nameTa,
    price,
    veg,
    available: true,
  }));
  return {
    schema: 2,
    version: 1,
    secret: randomBytes(32).toString("hex"),
    ticketNo: 0,
    tables: Array.from({ length: 12 }, (_, i) => ({
      id: "t" + (i + 1),
      name: "T" + (i + 1),
      seats: i < 8 ? 4 : 6,
      area: i < 8 ? "Hall" : "Garden",
      order: i,
    })),
    categories: cats.map(([id, name], order) => ({ id, name, order })),
    menu,
    roles: [
      { id: "admin", name: "Admin", color: "#8b1a1a", permissions: [...ALL_PERMISSIONS], system: true },
      {
        id: "waiter",
        name: "Waiter",
        color: "#0284c7",
        permissions: ["floor.view", "order.take", "order.serve", "order.cancel", "bill.mark"],
      },
      { id: "kitchen", name: "Kitchen", color: "#d97706", permissions: ["floor.view", "kitchen.view"] },
      { id: "cashier", name: "Cashier", color: "#059669", permissions: ["floor.view", "bill.mark", "bill.settle"] },
    ],
    users: [
      {
        id: "u-admin",
        name: "Abielan",
        email: OWNER_EMAIL,
        passwordHash: hashPassword(adminPassword()),
        roleId: "admin",
        active: true,
        createdAt: Date.now(),
      },
    ],
    guests: [],
    orders: [],
  };
}
