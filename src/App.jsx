import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Home,
  ShoppingCart,
  Sparkles,
  CheckSquare,
  Calendar as CalendarIcon,
  Mic,
  Camera,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  User,
  Lock,
  LogOut,
  Bell,
  Car,
  Shield,
  Wrench,
  Cake,
  DollarSign,
  Loader2,
  AlertCircle,
  BookOpen,
  Package,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";

/* ================================ design tokens ================================ */

const COLORS = {
  paper: "#FFFFFF",
  cream: "#FAF9F5",
  ink: "#1B2A32",
  inkSoft: "rgba(27,42,50,0.6)",
  inkFaint: "rgba(27,42,50,0.35)",
  brass: "#B08D57",
  brassSoft: "rgba(176,141,87,0.12)",
  stamp: "#A63D40",
  stampSoft: "rgba(166,61,64,0.1)",
  success: "#4C7A5B",
  border: "rgba(27,42,50,0.1)",
};

const CARD_SHADOW = "0 1px 2px rgba(27,42,50,0.06), 0 6px 16px rgba(27,42,50,0.06)";
const FONT_DISPLAY = "'Fraunces', serif";
const FONT_MONO = "'Space Mono', monospace";

const FONT_STYLE_BLOCK = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Space+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; }
  body { -webkit-font-smoothing: antialiased; }
  input, select { outline: none; font-family: inherit; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: rgba(27,42,50,0.15); border-radius: 8px; }
`;

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "pantry", label: "Pantry", icon: Package },
  { id: "shopping", label: "Shopping", icon: ShoppingCart },
  { id: "cleaning", label: "Cleaning", icon: Sparkles },
  { id: "todo", label: "To-do", icon: CheckSquare },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "vault", label: "Vault", icon: KeyRound },
];

const FREQUENCY_DAYS = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
const STORAGE_KEY = "household-data";
const CLAUDE_MODEL = "claude-sonnet-4-6";

/* ================================ generic helpers ================================ */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n) => `£${(Number(n) || 0).toFixed(2)}`;

const STOPWORDS = new Set(["the", "a", "an", "of", "and", "to", "for", "my", "our", "some", "please", "in", "on", "some"]);

function significantWords(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Fuzzy-matches a spoken/typed name against a list: exact match, then substring,
// then shared-significant-word overlap. Returns the matched item or null.
function findByName(list, query, getName) {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  if (!q) return null;

  let match = list.find((item) => getName(item).toLowerCase().trim() === q);
  if (match) return match;

  match = list.find((item) => {
    const n = getName(item).toLowerCase();
    return n.includes(q) || q.includes(n);
  });
  if (match) return match;

  const qWords = new Set(significantWords(q));
  if (qWords.size === 0) return null;
  let best = null;
  let bestScore = 0;
  for (const item of list) {
    const words = significantWords(getName(item));
    const overlap = words.filter((w) => qWords.has(w)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = item;
    }
  }
  return bestScore > 0 ? best : null;
}

function cleaningStatus(task, now = Date.now()) {
  const windowDays = FREQUENCY_DAYS[task.frequency] ?? 7;
  const windowMs = windowDays * 86400000;
  if (!task.lastDone) return "overdue";
  const elapsed = now - task.lastDone;
  if (elapsed > windowMs) return "overdue";
  if (elapsed >= windowMs * 0.7) return "soon";
  return "done";
}

// When a cleaning task is next due, based on when it was last done + its frequency.
// Returns a Date, or null if it's never been done (so it's due now).
function cleaningDueDate(task) {
  if (!task.lastDone) return null;
  const windowDays = FREQUENCY_DAYS[task.frequency] ?? 7;
  return new Date(task.lastDone + windowDays * 86400000);
}

function fmtDate(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ---- shopping categorisation & staples ---- */

// Display order for grouped shopping categories.
const SHOPPING_CATEGORIES = [
  "Produce",
  "Dairy & Eggs",
  "Meat & Fish",
  "Bakery",
  "Frozen",
  "Drinks",
  "Snacks",
  "Pantry",
  "Household",
  "Toiletries",
  "Other",
];

// Keyword → category. Longer/more specific phrases should win, so we sort
// matches by keyword length when categorising.
const CATEGORY_KEYWORDS = {
  "Produce": ["apple", "banana", "tomato", "potato", "onion", "carrot", "lettuce", "salad", "spinach", "pepper", "cucumber", "garlic", "lemon", "lime", "orange", "grape", "berry", "strawberr", "fruit", "veg", "broccoli", "mushroom", "avocado", "herb", "kale", "courgette", "cabbage"],
  "Dairy & Eggs": ["milk", "cheese", "yog", "butter", "cream", "egg", "margarine"],
  "Meat & Fish": ["chicken", "beef", "pork", "lamb", "mince", "sausage", "bacon", "ham", "turkey", "fish", "salmon", "tuna", "prawn", "steak", "meat"],
  "Bakery": ["bread", "bagel", "croissant", "cake", "baguette", "pastry", "muffin", "tortilla", "wrap", "pitta", "bun"],
  "Frozen": ["frozen", "ice cream", "ice-cream", "pizza"],
  "Drinks": ["water", "juice", "cola", "coke", "soda", "squash", "tea", "coffee", "wine", "beer", "lager", "lemonade", "smoothie", "drink"],
  "Snacks": ["crisp", "chocolate", "biscuit", "cookie", "sweet", "candy", "snack", "nuts", "popcorn", "cracker"],
  "Pantry": ["rice", "pasta", "flour", "sugar", "salt", "oil", "sauce", "beans", "tin", "cereal", "oats", "spice", "stock", "vinegar", "honey", "jam", "noodle", "lentil"],
  "Household": ["toilet roll", "kitchen roll", "bin bag", "cleaner", "bleach", "washing up", "washing-up", "detergent", "sponge", "foil", "cling film", "battery", "bulb", "dishwasher"],
  "Toiletries": ["shampoo", "soap", "toothpaste", "toothbrush", "deodorant", "razor", "shower gel", "conditioner", "tissue", "cotton", "sanitary", "tampon", "nappy", "diaper", "wipe", "lotion", "toilet paper"],
};

// Flattened, length-sorted keyword list so specific phrases match first.
const CATEGORY_LOOKUP = Object.entries(CATEGORY_KEYWORDS)
  .flatMap(([category, words]) => words.map((word) => ({ word, category })))
  .sort((a, b) => b.word.length - a.word.length);

function categorize(name) {
  const n = (name || "").toLowerCase();
  for (const { word, category } of CATEGORY_LOOKUP) {
    if (n.includes(word)) return category;
  }
  return "Other";
}

// Common household staples for one-tap adding.
const STAPLES = ["Milk", "Bread", "Eggs", "Butter", "Cheese", "Bananas", "Chicken", "Rice", "Pasta", "Toilet roll", "Washing up liquid", "Coffee", "Tea", "Cereal"];

function makeShoppingItem(name, extra = {}) {
  return {
    id: uid(),
    name,
    qty: 1,
    category: categorize(name),
    estPrice: null,
    checked: false,
    checkedBy: null,
    checkedAt: null,
    matchedPrice: null,
    ...extra,
  };
}

/* ---- pantry / home inventory ---- */

// Ordered so cycling goes in → low → out → in.
const PANTRY_STATUSES = ["in", "low", "out"];

const PANTRY_STATUS_META = {
  in: { label: "In stock", short: "In", color: COLORS.success },
  low: { label: "Running low", short: "Low", color: COLORS.brass },
  out: { label: "Out", short: "Out", color: COLORS.stamp },
};

// Items that are low or out need buying.
function pantryNeedsBuying(item) {
  return item.status === "low" || item.status === "out";
}

function makePantryItem(name, extra = {}) {
  return {
    id: uid(),
    name,
    category: categorize(name),
    status: "in",
    updatedAt: Date.now(),
    ...extra,
  };
}

function rollForward(dateStr, repeat) {
  const d = new Date(dateStr + "T00:00:00");
  if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  else if (repeat === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function eventIconFor(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("bin")) return Trash2;
  if (t.includes("bill") || t.includes("rent")) return DollarSign;
  if (t.includes("car") || t.includes("mot")) return Car;
  if (t.includes("insurance") || t.includes("warranty")) return Shield;
  if (t.includes("boiler") || t.includes("service")) return Wrench;
  if (t.includes("birthday") || t.includes("anniversary")) return Cake;
  return Bell;
}

/* ================================ data model ================================ */

function emptyData() {
  return { members: [], pantry: [], shoppingList: [], cleaningTasks: [], todos: [], events: [], receipts: [], activity: [], vault: { salt: null, check: null, entries: [] } };
}

function seedCleaningTasks() {
  return [
    "Kitchen clean",
    "Bathroom clean",
    "Toilet clean",
    "Hoovering / floors",
    "Mopping",
    "Dusting",
    "Change bedsheets",
    "Laundry",
    "Take out bins",
    "Dishes / dishwasher",
    "Windows",
    "Clean fridge",
  ].map((name) => ({
    id: uid(),
    name,
    frequency: "weekly",
    lastDone: null,
    lastDoneBy: null,
  }));
}

function seedEvents() {
  const today = todayStr();
  return [
    { id: uid(), title: "Bin day", date: today, done: false, repeat: "weekly" },
    { id: uid(), title: "Bills", date: today, done: false, repeat: "monthly" },
    { id: uid(), title: "MOT", date: today, done: false, repeat: "yearly" },
    { id: uid(), title: "Insurance renewal", date: today, done: false, repeat: "yearly" },
    { id: uid(), title: "Boiler service", date: today, done: false, repeat: "yearly" },
  ];
}

// Upgrades legacy/partial data shapes in place, and seeds defaults on a genuinely fresh install.
function migrate(raw) {
  const isFirstRun = raw == null;
  const data = { ...emptyData(), ...(raw || {}) };

  data.members = Array.isArray(data.members)
    ? data.members.map((m) => (typeof m === "string" ? { id: uid(), name: m, pin: null } : m))
    : [];
  data.shoppingList = Array.isArray(data.shoppingList)
    ? data.shoppingList.map((i) => ({
        qty: i.qty ?? 1,
        category: i.category ?? categorize(i.name),
        estPrice: i.estPrice ?? null,
        ...i,
      }))
    : [];
  data.pantry = Array.isArray(data.pantry)
    ? data.pantry.map((p) => ({
        status: p.status ?? "in",
        category: p.category ?? categorize(p.name),
        updatedAt: p.updatedAt ?? Date.now(),
        ...p,
      }))
    : [];
  data.todos = Array.isArray(data.todos) ? data.todos : [];
  data.receipts = Array.isArray(data.receipts) ? data.receipts : [];
  data.activity = Array.isArray(data.activity) ? data.activity : [];

  data.cleaningTasks = Array.isArray(data.cleaningTasks) ? data.cleaningTasks : [];
  if (isFirstRun && data.cleaningTasks.length === 0) data.cleaningTasks = seedCleaningTasks();

  data.events = Array.isArray(data.events) ? data.events : [];
  if (isFirstRun && data.events.length === 0) data.events = seedEvents();

  const v = data.vault && typeof data.vault === "object" ? data.vault : {};
  data.vault = {
    salt: v.salt ?? null,
    check: v.check ?? null,
    entries: Array.isArray(v.entries) ? v.entries : [],
  };

  return data;
}

async function loadMembers() {
  try {
    const res = await fetch("/api/members");
    if (res.ok) return await res.json();
  } catch (_) {}
  return [];
}

function saveMember(member) {
  fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(member),
  }).catch(() => {});
}

function deleteMember(id) {
  fetch(`/api/members/${id}`, { method: "DELETE" }).catch(() => {});
}

async function loadData() {
  try {
    const [dataRes, members] = await Promise.all([
      fetch("/api/data"),
      loadMembers(),
    ]);
    if (dataRes.ok) {
      const raw = await dataRes.json();
      const data = migrate(raw);
      // Members always come from the dedicated table
      data.members = members;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
      return data;
    }
  } catch (_) {}
  // Fall back to localStorage if the API is unreachable
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return migrate(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return migrate(null);
  }
}

function persistData(data) {
  // Write to localStorage immediately for snappy UI
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
  // Persist household data to DB (members handled separately via their own API)
  fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, members: [] }), // members live in their own table
  }).catch(() => {});
}

function withActivity(data, text) {
  const entry = { id: uid(), text, timestamp: Date.now() };
  return { ...data, activity: [entry, ...data.activity].slice(0, 40) };
}

/* ================================ Anthropic API helpers ================================ */

async function askClaude({ system, messages, maxTokens = 1024 }) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const json = await res.json();
  return (json.content || []).map((b) => b.text || "").join("");
}

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, "```").trim();
  const fenced = cleaned.match(/```([\s\S]*?)```/);
  const body = fenced ? fenced[1] : cleaned;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return JSON.parse(body.slice(start, end + 1));
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const RECEIPT_SYSTEM_PROMPT = `You are a receipt-scanning assistant for a household budgeting app. Look at the receipt photo and extract its data. Respond with ONLY strict JSON, no markdown, no commentary, in exactly this shape:
{"store": string, "date": "YYYY-MM-DD", "total": number, "items": [{"name": string, "price": number}]}
If a field cannot be read, make your best reasonable guess. Do not include currency symbols in numbers.`;

async function scanReceiptImage(base64, mediaType) {
  const text = await askClaude({
    system: RECEIPT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Extract the receipt data as instructed." },
        ],
      },
    ],
    maxTokens: 1024,
  });
  return extractJson(text);
}

function buildVoiceSystemPrompt() {
  return `You are the voice-command interpreter for a household ledger app. Given a spoken transcript and a snapshot of current app state, output ONE strict JSON action object and nothing else.

Allowed actions:
- {"action":"check_shopping_item","item":string}
- {"action":"uncheck_shopping_item","item":string}
- {"action":"add_shopping_item","item":string}
- {"action":"complete_cleaning_task","task":string}
- {"action":"complete_todo","text":string}
- {"action":"add_todo","text":string}
- {"action":"add_event","title":string,"date":"YYYY-MM-DD","repeat":"none"|"weekly"|"monthly"|"yearly"}
- {"action":"unknown","reason":string}

Rules:
- Resolve relative dates (e.g. "next Friday", "tomorrow") against today's date given in the snapshot, into an absolute YYYY-MM-DD date.
- Only reference items/tasks/todos that plausibly match something in the snapshot lists for check/complete actions; if nothing plausibly matches, or the command is ambiguous, return "unknown".
- Never invent a delete or remove action - it does not exist in this vocabulary. If asked to delete/remove something, return "unknown".
- Respond with ONLY the JSON object, no markdown fences, no extra text.`;
}

async function interpretVoiceCommand(transcript, snapshot) {
  const text = await askClaude({
    system: buildVoiceSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `App state snapshot:\n${JSON.stringify(snapshot, null, 2)}\n\nTranscript: "${transcript}"`,
      },
    ],
    maxTokens: 300,
  });
  return extractJson(text);
}

function buildSnapshot(data) {
  return {
    today: todayStr(),
    shoppingOpen: data.shoppingList.filter((i) => !i.checked).map((i) => i.name),
    shoppingChecked: data.shoppingList.filter((i) => i.checked).map((i) => i.name),
    cleaningTasks: data.cleaningTasks.map((t) => t.name),
    todosOpen: data.todos.filter((t) => !t.done).map((t) => t.text),
  };
}

/* ================================ vault crypto ================================ */

// All password encryption happens in the browser. The server/DB only ever sees
// ciphertext. Uses PBKDF2 (SHA-256) to derive an AES-GCM key from the passphrase.

const VAULT_CHECK_TOKEN = "homeledger-vault-ok";
const PBKDF2_ITERATIONS = 150000;

function bytesToB64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(str) {
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function deriveVaultKey(passphrase, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: bytesToB64(iv), ct: bytesToB64(new Uint8Array(ct)) };
}

async function decryptJSON(key, payload) {
  const dec = new TextDecoder();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(payload.iv) }, key, b64ToBytes(payload.ct));
  return JSON.parse(dec.decode(pt));
}

/* ================================ shared UI bits ================================ */

function GlobalStyle() {
  return <style>{FONT_STYLE_BLOCK}</style>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.cream }}>
      <Loader2 className="animate-spin" size={28} style={{ color: COLORS.brass }} />
    </div>
  );
}

function Stamp({ label = "DONE", sub }) {
  return (
    <div
      className="inline-flex flex-col items-center justify-center px-3 py-1 rounded"
      style={{
        border: `2px solid ${COLORS.stamp}`,
        boxShadow: `0 0 0 2px ${COLORS.paper}, 0 0 0 3px ${COLORS.stamp}`,
        color: COLORS.stamp,
        transform: "rotate(-6deg)",
        fontFamily: FONT_MONO,
        letterSpacing: "0.08em",
      }}
    >
      <span className="text-xs font-bold uppercase">{label}</span>
      {sub && (
        <span className="uppercase opacity-80" style={{ fontSize: "10px" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase" style={{ fontFamily: FONT_MONO, color: COLORS.inkSoft, letterSpacing: "0.05em" }}>
          {label}
        </span>
        <Icon size={16} style={{ color: accent || COLORS.brass }} />
      </div>
      <span className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-sm text-center py-8" style={{ color: COLORS.inkFaint }}>
      {text}
    </div>
  );
}

const inputStyle = { border: `1px solid ${COLORS.border}`, background: COLORS.paper };

// Search field + a single filter-toggle pill, shared by list-heavy tabs.
function ListControls({ query, onQuery, placeholder, toggleLabel, toggleActive, onToggle }) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 flex items-center gap-2 rounded-lg px-3" style={{ ...inputStyle, height: 38 }}>
        <Search size={15} style={{ color: COLORS.inkFaint, flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm"
          style={{ background: "transparent", color: COLORS.ink }}
        />
        {query && (
          <button onClick={() => onQuery("")} aria-label="Clear search">
            <X size={14} style={{ color: COLORS.inkFaint }} />
          </button>
        )}
      </div>
      <button
        onClick={onToggle}
        className="rounded-lg px-3 text-xs whitespace-nowrap"
        style={{
          fontFamily: FONT_MONO,
          background: toggleActive ? COLORS.brass : COLORS.brassSoft,
          color: toggleActive ? COLORS.paper : COLORS.brass,
          border: `1px solid ${COLORS.border}`,
          fontWeight: toggleActive ? 700 : 400,
        }}
      >
        {toggleLabel}
      </button>
    </div>
  );
}

/* ================================ login gate ================================ */

function LoginGate({ members, onLogin, onAddMember, onRemoveMember }) {
  const [pinTarget, setPinTarget] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");

  const selectMember = (m) => {
    if (!m.pin) {
      onLogin(m);
      return;
    }
    setPinTarget(m);
    setPinInput("");
    setPinError(false);
  };

  const submitPin = () => {
    if (pinInput === pinTarget.pin) onLogin(pinTarget);
    else {
      setPinError(true);
      setPinInput("");
    }
  };

  const submitAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const member = { id: uid(), name, pin: newPin.trim() ? newPin.trim().slice(0, 4) : null };
    onAddMember(member);
    onLogin(member);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: COLORS.cream }}>
      <div
        className="w-full rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, maxWidth: 420 }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
            Our Household Ledger
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
            Who's this?
          </p>
        </div>

        {pinTarget ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-center">
              Enter PIN for <strong>{pinTarget.name}</strong>
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submitPin()}
              className="rounded-lg px-3 py-2 text-center text-lg tracking-widest"
              style={{ border: `1px solid ${pinError ? COLORS.stamp : COLORS.border}`, fontFamily: FONT_MONO }}
              autoFocus
            />
            {pinError && (
              <p className="text-xs text-center" style={{ color: COLORS.stamp }}>
                Wrong PIN, try again.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setPinTarget(null)}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
              >
                Back
              </button>
              <button
                onClick={submitPin}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{ background: COLORS.ink, color: COLORS.paper }}
              >
                Enter
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <button
                    onClick={() => selectMember(m)}
                    className="flex-1 flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{ border: `1px solid ${COLORS.border}` }}
                  >
                    <span
                      className="rounded-full flex items-center justify-center"
                      style={{ width: 32, height: 32, background: COLORS.brassSoft }}
                    >
                      <User size={16} style={{ color: COLORS.brass }} />
                    </span>
                    <span style={{ fontFamily: FONT_DISPLAY }}>{m.name}</span>
                    {m.pin && <Lock size={13} style={{ color: COLORS.inkFaint, marginLeft: "auto" }} />}
                  </button>
                  <button onClick={() => onRemoveMember(m.id)} style={{ color: COLORS.inkFaint }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-center" style={{ color: COLORS.inkFaint }}>
                  No one's set up yet.
                </p>
              )}
            </div>

            {showAdd ? (
              <div className="flex flex-col gap-2 rounded-lg p-3" style={{ border: `1px solid ${COLORS.border}` }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="rounded-lg px-3 py-2 text-sm"
                  style={inputStyle}
                  autoFocus
                />
                <input
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4-digit PIN (optional)"
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ ...inputStyle, fontFamily: FONT_MONO }}
                />
                <button
                  onClick={submitAdd}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: COLORS.brass, color: COLORS.paper }}
                >
                  Join household
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2"
                style={{ border: `1px dashed ${COLORS.border}`, color: COLORS.inkSoft }}
              >
                <Plus size={16} /> Add someone new
              </button>
            )}
            <p className="text-xs text-center" style={{ color: COLORS.inkFaint }}>
              PINs are just a household courtesy, not real security — anyone with this link can open the app and add
              themselves.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================ Home tab ================================ */

function HomeTab({ data }) {
  const monthSpend = React.useMemo(() => {
    const now = new Date();
    return data.receipts
      .filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  }, [data.receipts]);

  const shoppingLeft = data.shoppingList.filter((i) => !i.checked).length;
  const cleaningOverdue = data.cleaningTasks.filter((t) => cleaningStatus(t) === "overdue").length;
  const todosOpen = data.todos.filter((t) => !t.done).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={DollarSign} label="Spent this month" value={fmtMoney(monthSpend)} />
        <StatCard icon={ShoppingCart} label="Shopping left" value={shoppingLeft} />
        <StatCard
          icon={Sparkles}
          label="Cleaning overdue"
          value={cleaningOverdue}
          accent={cleaningOverdue > 0 ? COLORS.stamp : COLORS.brass}
        />
        <StatCard icon={CheckSquare} label="Open to-dos" value={todosOpen} />
      </div>
      <div
        className="rounded-xl p-4"
        style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
      >
        <h2
          className="text-xs uppercase mb-3"
          style={{ fontFamily: FONT_MONO, color: COLORS.inkSoft, letterSpacing: "0.05em" }}
        >
          Activity
        </h2>
        {data.activity.length === 0 && <p className="text-sm" style={{ color: COLORS.inkFaint }}>Nothing yet — start ticking things off.</p>}
        <ul className="flex flex-col gap-2">
          {data.activity.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
              <span>{entry.text}</span>
              <span
                className="text-xs"
                style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint, whiteSpace: "nowrap" }}
              >
                {new Date(entry.timestamp).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ================================ Pantry tab ================================ */

function PantryStatusControl({ status, onSet }) {
  return (
    <div className="flex items-center gap-1">
      {PANTRY_STATUSES.map((s) => {
        const meta = PANTRY_STATUS_META[s];
        const active = status === s;
        return (
          <button
            key={s}
            onClick={() => onSet(s)}
            className="rounded-full px-2 py-1 text-xs"
            style={{
              fontFamily: FONT_MONO,
              background: active ? meta.color : "transparent",
              color: active ? COLORS.paper : COLORS.inkFaint,
              border: `1px solid ${active ? meta.color : COLORS.border}`,
              fontWeight: active ? 700 : 400,
            }}
          >
            {meta.short}
          </button>
        );
      })}
    </div>
  );
}

function PantryTab({ data, mutate, currentUser }) {
  const [newItem, setNewItem] = useState("");
  const [search, setSearch] = useState("");
  const [needsOnly, setNeedsOnly] = useState(false);

  const addItem = (rawName) => {
    const name = (rawName ?? newItem).trim();
    if (!name) return;
    mutate((d) => {
      const exists = d.pantry.some((p) => p.name.toLowerCase() === name.toLowerCase());
      if (exists) return d;
      return withActivity(
        { ...d, pantry: [...d.pantry, makePantryItem(name)] },
        `${currentUser.name} added "${name}" to the pantry`
      );
    });
    if (rawName == null) setNewItem("");
  };

  const setStatus = (item, status) => {
    if (item.status === status) return;
    mutate((d) => {
      const pantry = d.pantry.map((p) => (p.id === item.id ? { ...p, status, updatedAt: Date.now() } : p));
      const meta = PANTRY_STATUS_META[status];
      return withActivity({ ...d, pantry }, `${currentUser.name} marked "${item.name}" ${meta.label.toLowerCase()}`);
    });
  };

  const removeItem = (item) => {
    mutate((d) => withActivity({ ...d, pantry: d.pantry.filter((p) => p.id !== item.id) }, `${currentUser.name} removed "${item.name}" from the pantry`));
  };

  const needCount = data.pantry.filter(pantryNeedsBuying).length;

  const q = search.trim().toLowerCase();
  const visible = data.pantry.filter((p) => {
    if (needsOnly && !pantryNeedsBuying(p)) return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const grouped = SHOPPING_CATEGORIES.map((cat) => ({
    cat,
    items: visible.filter((p) => (p.category || "Other") === cat),
  })).filter((g) => g.items.length > 0);
  const showCategoryHeaders = grouped.length > 1;
  const showControls = data.pantry.length > 5;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add something you keep at home..."
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        />
        <button onClick={() => addItem()} className="rounded-lg px-3" style={{ background: COLORS.ink, color: COLORS.paper }}>
          <Plus size={18} />
        </button>
      </div>

      {/* Quick-add staples */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint, letterSpacing: "0.05em" }}>
          Quick add
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STAPLES.map((name) => (
            <button
              key={name}
              onClick={() => addItem(name)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              style={{ background: COLORS.brassSoft, color: COLORS.brass, border: `1px solid ${COLORS.border}`, fontFamily: FONT_MONO }}
            >
              <Plus size={11} /> {name}
            </button>
          ))}
        </div>
      </div>

      {data.pantry.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex flex-col">
            <span className="text-xs uppercase" style={{ fontFamily: FONT_MONO, color: COLORS.inkSoft, letterSpacing: "0.05em" }}>
              At home
            </span>
            <span className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
              {data.pantry.length} item{data.pantry.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase" style={{ fontFamily: FONT_MONO, color: COLORS.inkSoft, letterSpacing: "0.05em" }}>
              Need to buy
            </span>
            <span className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: needCount > 0 ? COLORS.stamp : COLORS.success }}>
              {needCount}
            </span>
          </div>
        </div>
      )}

      {showControls && (
        <ListControls
          query={search}
          onQuery={setSearch}
          placeholder="Search pantry..."
          toggleLabel="Need to buy"
          toggleActive={needsOnly}
          onToggle={() => setNeedsOnly((v) => !v)}
        />
      )}

      <div className="flex flex-col gap-2">
        {grouped.map((group) => (
          <div key={group.cat} className="flex flex-col gap-2">
            {showCategoryHeaders && (
              <div className="text-xs uppercase mt-1" style={{ fontFamily: FONT_MONO, color: COLORS.brass, letterSpacing: "0.05em" }}>
                {group.cat}
              </div>
            )}
            {group.items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg p-3 flex items-center justify-between gap-2"
                style={{
                  background: COLORS.paper,
                  boxShadow: CARD_SHADOW,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${PANTRY_STATUS_META[item.status].color}`,
                }}
              >
                <span style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>{item.name}</span>
                <div className="flex items-center gap-2">
                  <PantryStatusControl status={item.status} onSet={(s) => setStatus(item, s)} />
                  <button onClick={() => removeItem(item)} style={{ color: COLORS.inkFaint }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
        {data.pantry.length === 0 && <EmptyState text="Your pantry is empty — add what you keep at home." />}
        {data.pantry.length > 0 && visible.length === 0 && <EmptyState text="No items match." />}
      </div>
    </div>
  );
}

/* ================================ Shopping tab ================================ */

function QtyStepper({ qty, onSetQty }) {
  const btn = {
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.inkSoft,
    background: COLORS.paper,
  };
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onSetQty(Math.max(1, qty - 1))} style={btn} aria-label="Decrease quantity">
        <Minus size={14} />
      </button>
      <span className="text-sm" style={{ fontFamily: FONT_MONO, minWidth: 18, textAlign: "center" }}>
        {qty}
      </span>
      <button onClick={() => onSetQty(qty + 1)} style={btn} aria-label="Increase quantity">
        <Plus size={14} />
      </button>
    </div>
  );
}

function ShoppingRow({ item, onToggle, onRemove, onSetQty, onSetPrice }) {
  const commitPrice = (e) => {
    const raw = e.target.value.trim();
    if (raw === "") return onSetPrice(null);
    const n = parseFloat(raw);
    onSetPrice(Number.isFinite(n) ? n : null);
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-lg p-3"
      style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left">
          <span
            className="rounded flex items-center justify-center"
            style={{
              width: 20,
              height: 20,
              border: `2px solid ${item.checked ? COLORS.stamp : COLORS.inkFaint}`,
              background: item.checked ? COLORS.stamp : "transparent",
              flexShrink: 0,
            }}
          >
            {item.checked && <Check size={14} color={COLORS.paper} />}
          </span>
          <span style={{ textDecoration: item.checked ? "line-through" : "none", color: item.checked ? COLORS.inkFaint : COLORS.ink }}>
            {item.name}
            {item.qty > 1 && (
              <span className="text-xs" style={{ fontFamily: FONT_MONO, color: COLORS.brass, marginLeft: 6 }}>
                ×{item.qty}
              </span>
            )}
          </span>
        </button>
        <div className="flex items-center gap-2">
          {item.checked && item.matchedPrice != null && (
            <span className="text-xs" style={{ fontFamily: FONT_MONO, color: COLORS.brass }}>
              {fmtMoney(item.matchedPrice * (item.qty || 1))}
            </span>
          )}
          {item.checked && <Stamp label="Got it" sub={item.checkedBy} />}
          <button onClick={onRemove} style={{ color: COLORS.inkFaint }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {!item.checked && (
        <div className="flex items-center justify-between gap-2 pl-8">
          <QtyStepper qty={item.qty || 1} onSetQty={onSetQty} />
          <div
            className="flex items-center gap-1 rounded-lg px-2"
            style={{ border: `1px solid ${COLORS.border}`, height: 30 }}
          >
            <span className="text-sm" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint }}>
              £
            </span>
            <input
              key={item.id}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={item.estPrice ?? ""}
              onBlur={commitPrice}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              placeholder="0.00"
              className="text-sm"
              style={{ width: 56, background: "transparent", fontFamily: FONT_MONO, color: COLORS.ink }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ShoppingTab({ data, mutate, currentUser }) {
  const [newItem, setNewItem] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [search, setSearch] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const fileInputRef = useRef(null);

  const addItem = () => {
    const name = newItem.trim();
    if (!name) return;
    mutate((d) =>
      withActivity(
        { ...d, shoppingList: [...d.shoppingList, makeShoppingItem(name)] },
        `${currentUser.name} added "${name}" to the shopping list`
      )
    );
    setNewItem("");
  };

  const addStaple = (name) => {
    mutate((d) => {
      const exists = d.shoppingList.some((i) => !i.checked && i.name.toLowerCase() === name.toLowerCase());
      if (exists) return d;
      return withActivity(
        { ...d, shoppingList: [...d.shoppingList, makeShoppingItem(name)] },
        `${currentUser.name} added "${name}" to the shopping list`
      );
    });
  };

  const updateItem = (id, patch) => {
    mutate((d) => ({ ...d, shoppingList: d.shoppingList.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  };

  // Marking a pantry-need as bought puts it back in stock.
  const markPantryBought = (item) => {
    mutate((d) => {
      const pantry = d.pantry.map((p) => (p.id === item.id ? { ...p, status: "in", updatedAt: Date.now() } : p));
      return withActivity({ ...d, pantry }, `${currentUser.name} restocked "${item.name}"`);
    });
  };

  const toggleItem = (item) => {
    mutate((d) => {
      const checked = !item.checked;
      const shoppingList = d.shoppingList.map((i) =>
        i.id === item.id
          ? { ...i, checked, checkedBy: checked ? currentUser.name : null, checkedAt: checked ? Date.now() : null, matchedPrice: checked ? i.matchedPrice : null }
          : i
      );
      return withActivity({ ...d, shoppingList }, `${currentUser.name} ${checked ? "ticked off" : "un-ticked"} "${item.name}"`);
    });
  };

  const removeItem = (item) => {
    mutate((d) => withActivity({ ...d, shoppingList: d.shoppingList.filter((i) => i.id !== item.id) }, `${currentUser.name} removed "${item.name}" from the shopping list`));
  };

  const clearTicked = () => {
    mutate((d) => withActivity({ ...d, shoppingList: d.shoppingList.filter((i) => !i.checked) }, `${currentUser.name} cleared ticked-off items`));
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true);
    setScanError(null);
    try {
      const base64 = await fileToBase64(file);
      const receipt = await scanReceiptImage(base64, file.type || "image/jpeg");
      let matchedCount = 0;
      let addedCount = 0;
      let restockedCount = 0;
      mutate((d) => {
        let shoppingList = d.shoppingList;
        let pantry = d.pantry;
        for (const receiptItem of receipt.items || []) {
          if (!receiptItem.name) continue;

          // If the purchase matches a pantry item that's low/out, restock it
          const pantryTarget = findByName(pantry.filter(pantryNeedsBuying), receiptItem.name, (p) => p.name);
          if (pantryTarget) {
            restockedCount++;
            pantry = pantry.map((p) => (p.id === pantryTarget.id ? { ...p, status: "in", updatedAt: Date.now() } : p));
          }

          const target = findByName(
            shoppingList.filter((i) => !i.checked),
            receiptItem.name,
            (i) => i.name
          );
          if (target) {
            // Match found — tick it off with price
            matchedCount++;
            shoppingList = shoppingList.map((i) =>
              i.id === target.id
                ? { ...i, checked: true, checkedBy: currentUser.name, checkedAt: Date.now(), matchedPrice: receiptItem.price ?? null }
                : i
            );
          } else {
            // No match — add it as a new checked item so the purchase is recorded
            addedCount++;
            shoppingList = [
              ...shoppingList,
              makeShoppingItem(receiptItem.name, {
                checked: true,
                checkedBy: currentUser.name,
                checkedAt: Date.now(),
                matchedPrice: receiptItem.price ?? null,
              }),
            ];
          }
        }
        const receiptEntry = {
          id: uid(),
          store: receipt.store || "Unknown store",
          date: receipt.date || todayStr(),
          total: Number(receipt.total) || 0,
          itemCount: (receipt.items || []).length,
          scannedAt: Date.now(),
        };
        const parts = [];
        if (matchedCount > 0) parts.push(`${matchedCount} matched`);
        if (addedCount > 0) parts.push(`${addedCount} added`);
        if (restockedCount > 0) parts.push(`${restockedCount} restocked`);
        const summary = parts.length ? parts.join(", ") : "no items";
        return withActivity(
          { ...d, shoppingList, pantry, receipts: [...d.receipts, receiptEntry].slice(-100) },
          `${currentUser.name} scanned a receipt from ${receiptEntry.store} (${summary})`
        );
      });
      setLastReceipt(receipt);
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("500") || msg.includes("API key") || msg.includes("API error")) {
        setScanError("Server error — check the API key is set in Railway variables.");
      } else {
        setScanError("Couldn't read that receipt — try a clearer photo.");
      }
    } finally {
      setScanning(false);
    }
  };

  const unchecked = data.shoppingList.filter((i) => !i.checked);
  const checked = data.shoppingList.filter((i) => i.checked);

  // Pantry items that are low/out flow into the shopping list automatically
  const pantryNeeds = data.pantry.filter(pantryNeedsBuying);

  // Budget summary reflects the full remaining list (not the filtered view)
  const remainingCount = unchecked.reduce((s, i) => s + (i.qty || 1), 0);
  const estTotal = unchecked.reduce((s, i) => s + (i.estPrice != null ? i.estPrice * (i.qty || 1) : 0), 0);
  const unpricedCount = unchecked.filter((i) => i.estPrice == null).length;

  // Search / filter
  const q = search.trim().toLowerCase();
  const matchesQuery = (name) => !q || name.toLowerCase().includes(q);
  const pantryNeedsView = pantryNeeds.filter((p) => matchesQuery(p.name));
  const uncheckedView = unchecked.filter((i) => matchesQuery(i.name));
  const checkedView = hideDone ? [] : checked.filter((i) => matchesQuery(i.name));
  const showControls = pantryNeeds.length + data.shoppingList.length > 5;

  // Group the remaining list by category, keeping the defined display order
  const grouped = SHOPPING_CATEGORIES.map((cat) => ({
    cat,
    items: uncheckedView.filter((i) => (i.category || "Other") === cat),
  })).filter((g) => g.items.length > 0);
  const showCategoryHeaders = grouped.length > 1;

  const renderRow = (item) => (
    <ShoppingRow
      key={item.id}
      item={item}
      onToggle={() => toggleItem(item)}
      onRemove={() => removeItem(item)}
      onSetQty={(qty) => updateItem(item.id, { qty })}
      onSetPrice={(estPrice) => updateItem(item.id, { estPrice })}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add an item..."
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        />
        <button onClick={addItem} className="rounded-lg px-3" style={{ background: COLORS.ink, color: COLORS.paper }}>
          <Plus size={18} />
        </button>
      </div>

      {/* Quick-add staples */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint, letterSpacing: "0.05em" }}>
          Quick add
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STAPLES.map((name) => (
            <button
              key={name}
              onClick={() => addStaple(name)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              style={{ background: COLORS.brassSoft, color: COLORS.brass, border: `1px solid ${COLORS.border}`, fontFamily: FONT_MONO }}
            >
              <Plus size={11} /> {name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={scanning}
          className="flex-1 rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2"
          style={{ background: COLORS.brassSoft, color: COLORS.brass, border: `1px solid ${COLORS.border}` }}
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {scanning ? "Reading receipt..." : "Scan receipt"}
        </button>
        {checked.length > 0 && (
          <button
            onClick={clearTicked}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
          >
            Clear ticked
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      {scanError && (
        <div className="flex items-center gap-2 text-sm rounded-lg p-3" style={{ background: COLORS.stampSoft, color: COLORS.stamp }}>
          <AlertCircle size={16} /> {scanError}
        </div>
      )}
      {lastReceipt && !scanError && (
        <div className="rounded-lg p-3 text-sm flex items-center justify-between" style={{ background: COLORS.brassSoft, color: COLORS.ink }}>
          <span>
            {lastReceipt.store} · {fmtMoney(lastReceipt.total)}
          </span>
          <button onClick={() => setLastReceipt(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Budget summary */}
      {unchecked.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex flex-col">
            <span className="text-xs uppercase" style={{ fontFamily: FONT_MONO, color: COLORS.inkSoft, letterSpacing: "0.05em" }}>
              To buy
            </span>
            <span className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
              {remainingCount} item{remainingCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs uppercase" style={{ fontFamily: FONT_MONO, color: COLORS.inkSoft, letterSpacing: "0.05em" }}>
              Est. total
            </span>
            <span className="text-2xl font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.brass }}>
              {fmtMoney(estTotal)}
            </span>
            {unpricedCount > 0 && (
              <span className="text-xs" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint }}>
                {unpricedCount} unpriced
              </span>
            )}
          </div>
        </div>
      )}

      {showControls && (
        <ListControls
          query={search}
          onQuery={setSearch}
          placeholder="Search list..."
          toggleLabel="Hide done"
          toggleActive={hideDone}
          onToggle={() => setHideDone((v) => !v)}
        />
      )}

      {/* Auto list from the pantry (low / out items) */}
      {pantryNeedsView.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs uppercase mt-1 flex items-center gap-1.5" style={{ fontFamily: FONT_MONO, color: COLORS.stamp, letterSpacing: "0.05em" }}>
            <Package size={13} /> Need at home
          </div>
          {pantryNeedsView.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg p-3"
              style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${PANTRY_STATUS_META[item.status].color}` }}
            >
              <button onClick={() => markPantryBought(item)} className="flex items-center gap-3 flex-1 text-left">
                <span
                  className="rounded flex items-center justify-center"
                  style={{ width: 20, height: 20, border: `2px solid ${COLORS.inkFaint}`, flexShrink: 0 }}
                />
                <span style={{ color: COLORS.ink }}>{item.name}</span>
              </button>
              <span
                className="text-xs rounded-full px-2 py-0.5"
                style={{ fontFamily: FONT_MONO, color: PANTRY_STATUS_META[item.status].color, border: `1px solid ${PANTRY_STATUS_META[item.status].color}` }}
              >
                {PANTRY_STATUS_META[item.status].label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Remaining items, grouped by category */}
      <div className="flex flex-col gap-2">
        {grouped.length > 0 && pantryNeedsView.length > 0 && (
          <div className="text-xs uppercase mt-1" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint, letterSpacing: "0.05em" }}>
            Extras
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.cat} className="flex flex-col gap-2">
            {showCategoryHeaders && (
              <div className="text-xs uppercase mt-1" style={{ fontFamily: FONT_MONO, color: COLORS.brass, letterSpacing: "0.05em" }}>
                {group.cat}
              </div>
            )}
            {group.items.map(renderRow)}
          </div>
        ))}

        {checkedView.length > 0 && (
          <div className="text-xs uppercase mt-2" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint }}>
            Done
          </div>
        )}
        {checkedView.map(renderRow)}

        {data.shoppingList.length === 0 && pantryNeeds.length === 0 && (
          <EmptyState text="Nothing to buy — mark pantry items Low or Out and they'll show up here." />
        )}
        {(data.shoppingList.length > 0 || pantryNeeds.length > 0) &&
          pantryNeedsView.length === 0 &&
          grouped.length === 0 &&
          checkedView.length === 0 && <EmptyState text="No items match." />}
      </div>
    </div>
  );
}

/* ================================ Cleaning tab ================================ */

const STATUS_COLOR = { overdue: COLORS.stamp, soon: COLORS.brass, done: COLORS.success };
const STATUS_LABEL = { overdue: "Overdue", soon: "Due soon", done: "Done" };

function CleaningTab({ data, mutate, currentUser }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("weekly");

  const markDone = (task) => {
    mutate((d) => {
      const cleaningTasks = d.cleaningTasks.map((t) => (t.id === task.id ? { ...t, lastDone: Date.now(), lastDoneBy: currentUser.name } : t));
      return withActivity({ ...d, cleaningTasks }, `${currentUser.name} finished "${task.name}"`);
    });
  };

  const removeTask = (task) => {
    mutate((d) => withActivity({ ...d, cleaningTasks: d.cleaningTasks.filter((t) => t.id !== task.id) }, `${currentUser.name} removed cleaning task "${task.name}"`));
  };

  const addTask = () => {
    if (!name.trim()) return;
    mutate((d) =>
      withActivity(
        { ...d, cleaningTasks: [...d.cleaningTasks, { id: uid(), name: name.trim(), frequency, lastDone: null, lastDoneBy: null }] },
        `${currentUser.name} added cleaning task "${name.trim()}"`
      )
    );
    setName("");
    setFrequency("weekly");
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setShowAdd((s) => !s)}
        className="rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2"
        style={{ background: COLORS.ink, color: COLORS.paper }}
      >
        <Plus size={16} /> Add task
      </button>
      {showAdd && (
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Task name" className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button onClick={addTask} className="rounded-lg px-3 py-2 text-sm" style={{ background: COLORS.brass, color: COLORS.paper }}>
            Save
          </button>
        </div>
      )}
      {data.cleaningTasks.map((task) => {
        const status = cleaningStatus(task);
        const due = cleaningDueDate(task);
        const dueLabel = due ? `due ${fmtDate(due)}` : "due now";
        return (
          <div
            key={task.id}
            className="rounded-lg p-3 flex items-center justify-between gap-2"
            style={{
              background: COLORS.paper,
              boxShadow: CARD_SHADOW,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${STATUS_COLOR[status]}`,
            }}
          >
            <div className="flex flex-col">
              <span className="font-medium" style={{ fontFamily: FONT_DISPLAY }}>
                {task.name}
              </span>
              <span className="text-xs" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint }}>
                {task.frequency} · {STATUS_LABEL[status]} · {dueLabel}
                {task.lastDoneBy ? ` · last by ${task.lastDoneBy}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {status === "done" ? (
                <Stamp label="Done" sub={task.lastDoneBy} />
              ) : (
                <button onClick={() => markDone(task)} className="rounded-lg px-3 py-1.5 text-xs" style={{ background: COLORS.brassSoft, color: COLORS.brass }}>
                  Mark done
                </button>
              )}
              <button onClick={() => removeTask(task)} style={{ color: COLORS.inkFaint }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
      {data.cleaningTasks.length === 0 && <EmptyState text="No cleaning tasks yet." />}
    </div>
  );
}

/* ================================ To-do tab ================================ */

function TodoRow({ todo, onToggle, onRemove }) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-lg p-3"
      style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
    >
      <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left">
        <span
          className="rounded flex items-center justify-center"
          style={{
            width: 20,
            height: 20,
            border: `2px solid ${todo.done ? COLORS.stamp : COLORS.inkFaint}`,
            background: todo.done ? COLORS.stamp : "transparent",
            flexShrink: 0,
          }}
        >
          {todo.done && <Check size={14} color={COLORS.paper} />}
        </span>
        <div className="flex flex-col">
          <span style={{ textDecoration: todo.done ? "line-through" : "none", color: todo.done ? COLORS.inkFaint : COLORS.ink }}>{todo.text}</span>
          <span className="text-xs" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint }}>
            added by {todo.addedBy}
          </span>
        </div>
      </button>
      {todo.done && <Stamp label="Done" sub={todo.doneBy} />}
      <button onClick={onRemove} style={{ color: COLORS.inkFaint }}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function TodoTab({ data, mutate, currentUser }) {
  const [text, setText] = useState("");

  const add = () => {
    if (!text.trim()) return;
    mutate((d) =>
      withActivity(
        { ...d, todos: [...d.todos, { id: uid(), text: text.trim(), done: false, addedBy: currentUser.name, createdAt: Date.now(), doneBy: null }] },
        `${currentUser.name} added a to-do: "${text.trim()}"`
      )
    );
    setText("");
  };

  const toggle = (todo) => {
    mutate((d) => {
      const done = !todo.done;
      const todos = d.todos.map((t) => (t.id === todo.id ? { ...t, done, doneBy: done ? currentUser.name : null } : t));
      return withActivity({ ...d, todos }, `${currentUser.name} ${done ? "finished" : "reopened"} "${todo.text}"`);
    });
  };

  const remove = (todo) => {
    mutate((d) => withActivity({ ...d, todos: d.todos.filter((t) => t.id !== todo.id) }, `${currentUser.name} removed to-do "${todo.text}"`));
  };

  const clearFinished = () => {
    mutate((d) => withActivity({ ...d, todos: d.todos.filter((t) => !t.done) }, `${currentUser.name} cleared finished to-dos`));
  };

  const open = data.todos.filter((t) => !t.done);
  const done = data.todos.filter((t) => t.done);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a to-do..."
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={inputStyle}
        />
        <button onClick={add} className="rounded-lg px-3" style={{ background: COLORS.ink, color: COLORS.paper }}>
          <Plus size={18} />
        </button>
      </div>
      {done.length > 0 && (
        <button onClick={clearFinished} className="self-end text-xs" style={{ color: COLORS.inkSoft, fontFamily: FONT_MONO }}>
          Clear finished
        </button>
      )}
      <div className="flex flex-col gap-2">
        {open.map((t) => (
          <TodoRow key={t.id} todo={t} onToggle={() => toggle(t)} onRemove={() => remove(t)} />
        ))}
        {done.map((t) => (
          <TodoRow key={t.id} todo={t} onToggle={() => toggle(t)} onRemove={() => remove(t)} />
        ))}
        {data.todos.length === 0 && <EmptyState text="Nothing on the to-do list." />}
      </div>
    </div>
  );
}

/* ================================ DatePicker ================================ */

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function DatePicker({ value, onChange }) {
  const parsed = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedStr = value || "";

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Build grid: days of viewMonth, padded to start on Monday
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const todayD = new Date();
  const isToday = (day) => day === todayD.getDate() && viewMonth === todayD.getMonth() && viewYear === todayD.getFullYear();
  const isSelected = (day) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return selectedStr === `${viewYear}-${mm}-${dd}`;
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Pick a date";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between"
        style={{ ...inputStyle, color: value ? COLORS.ink : COLORS.inkFaint, fontFamily: FONT_DISPLAY }}
      >
        <span>{displayValue}</span>
        <CalendarIcon size={15} style={{ color: COLORS.brass, flexShrink: 0 }} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 rounded-xl p-3 w-72"
          style={{ background: COLORS.paper, boxShadow: "0 8px 32px rgba(27,42,50,0.16)", border: `1px solid ${COLORS.border}` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded-lg" style={{ color: COLORS.inkSoft }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span className="text-sm font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-lg" style={{ color: COLORS.inkSoft }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>

          {/* Day name headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <span key={d} className="text-center text-xs py-1" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint }}>
                {d}
              </span>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <span key={`e-${i}`} />;
              const selected = isSelected(day);
              const today = isToday(day);
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  className="rounded-full flex items-center justify-center mx-auto text-sm"
                  style={{
                    width: 32,
                    height: 32,
                    fontFamily: FONT_MONO,
                    background: selected ? COLORS.brass : today ? COLORS.brassSoft : "transparent",
                    color: selected ? COLORS.paper : today ? COLORS.brass : COLORS.ink,
                    fontWeight: selected || today ? 700 : 400,
                    border: today && !selected ? `1px solid ${COLORS.brass}` : "1px solid transparent",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-3 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs px-2 py-1 rounded"
              style={{ fontFamily: FONT_MONO, color: COLORS.inkSoft }}
            >
              Clear
            </button>
            <button
              onClick={() => { onChange(todayStr()); setOpen(false); }}
              className="text-xs px-2 py-1 rounded"
              style={{ fontFamily: FONT_MONO, color: COLORS.brass, fontWeight: 700 }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================ Calendar tab ================================ */

function CalendarTab({ data, mutate, currentUser }) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const [repeat, setRepeat] = useState("none");

  const addEvent = () => {
    if (!title.trim() || !date) return;
    mutate((d) =>
      withActivity({ ...d, events: [...d.events, { id: uid(), title: title.trim(), date, done: false, repeat }] }, `${currentUser.name} added calendar event "${title.trim()}"`)
    );
    setTitle("");
    setDate(todayStr());
    setRepeat("none");
    setShowAdd(false);
  };

  const removeEvent = (ev) => {
    mutate((d) => withActivity({ ...d, events: d.events.filter((e) => e.id !== ev.id) }, `${currentUser.name} removed calendar event "${ev.title}"`));
  };

  const toggleEvent = (ev) => {
    mutate((d) => {
      if (ev.repeat === "none") {
        const events = d.events.map((e) => (e.id === ev.id ? { ...e, done: !e.done } : e));
        return withActivity({ ...d, events }, `${currentUser.name} ${!ev.done ? "completed" : "reopened"} "${ev.title}"`);
      }
      const nextDate = rollForward(ev.date, ev.repeat);
      const events = d.events.map((e) => (e.id === ev.id ? { ...e, date: nextDate } : e));
      return withActivity({ ...d, events }, `${currentUser.name} completed "${ev.title}" — next due ${nextDate}`);
    });
  };

  const sorted = [...data.events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setShowAdd((s) => !s)}
        className="rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2"
        style={{ background: COLORS.ink, color: COLORS.paper }}
      >
        <Plus size={16} /> Add reminder
      </button>
      {showAdd && (
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder title" className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          <DatePicker value={date} onChange={setDate} />
          <select value={repeat} onChange={(e) => setRepeat(e.target.value)} className="rounded-lg px-3 py-2 text-sm" style={inputStyle}>
            <option value="none">Doesn't repeat</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button onClick={addEvent} className="rounded-lg px-3 py-2 text-sm" style={{ background: COLORS.brass, color: COLORS.paper }}>
            Save
          </button>
        </div>
      )}
      {sorted.map((ev) => {
        const Icon = eventIconFor(ev.title);
        return (
          <div
            key={ev.id}
            className="rounded-lg p-3 flex items-center justify-between gap-2"
            style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
          >
            <button onClick={() => toggleEvent(ev)} className="flex items-center gap-3 flex-1 text-left">
              <span className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: COLORS.brassSoft, flexShrink: 0 }}>
                <Icon size={16} style={{ color: COLORS.brass }} />
              </span>
              <div className="flex flex-col">
                <span style={{ textDecoration: ev.done ? "line-through" : "none" }}>{ev.title}</span>
                <span className="text-xs" style={{ fontFamily: FONT_MONO, color: COLORS.inkFaint }}>
                  {ev.date}
                  {ev.repeat !== "none" ? ` · repeats ${ev.repeat}` : ""}
                </span>
              </div>
            </button>
            {ev.done && <Stamp label="Done" />}
            <button onClick={() => removeEvent(ev)} style={{ color: COLORS.inkFaint }}>
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
      {data.events.length === 0 && <EmptyState text="No reminders yet." />}
    </div>
  );
}

/* ================================ Vault tab ================================ */

function VaultEntryRow({ entry, revealed, onToggleReveal, onCopy, copied, onRemove }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1"
      style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
          {entry.label}
        </span>
        <button onClick={onRemove} style={{ color: COLORS.inkFaint }} aria-label="Delete entry">
          <Trash2 size={16} />
        </button>
      </div>
      {entry.username && (
        <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.inkSoft }}>
          <User size={13} style={{ color: COLORS.inkFaint }} />
          <span style={{ fontFamily: FONT_MONO }}>{entry.username}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-sm">
        <Lock size={13} style={{ color: COLORS.inkFaint }} />
        <span className="flex-1" style={{ fontFamily: FONT_MONO, color: COLORS.ink }}>
          {revealed ? entry.password : "••••••••••"}
        </span>
        <button onClick={onToggleReveal} style={{ color: COLORS.inkFaint }} aria-label="Reveal password">
          {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button onClick={onCopy} style={{ color: copied ? COLORS.success : COLORS.brass }} aria-label="Copy password">
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      {entry.notes && (
        <p className="text-xs mt-1" style={{ color: COLORS.inkFaint }}>
          {entry.notes}
        </p>
      )}
    </div>
  );
}

function VaultTab({ data, mutate, currentUser }) {
  const isSetUp = !!(data.vault.salt && data.vault.check);

  const [cryptoKey, setCryptoKey] = useState(null);
  const [entries, setEntries] = useState(null); // decrypted, in-memory only
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // passphrase inputs
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");

  // add-entry form
  const [showAdd, setShowAdd] = useState(false);
  const [fLabel, setFLabel] = useState("");
  const [fUser, setFUser] = useState("");
  const [fPass, setFPass] = useState("");
  const [fNotes, setFNotes] = useState("");

  const [revealed, setRevealed] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const unlocked = cryptoKey !== null;

  const setupVault = async () => {
    setError("");
    if (pass.length < 6) return setError("Use at least 6 characters.");
    if (pass !== confirm) return setError("Passphrases don't match.");
    setBusy(true);
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveVaultKey(pass, salt);
      const check = await encryptJSON(key, VAULT_CHECK_TOKEN);
      mutate((d) =>
        withActivity(
          { ...d, vault: { salt: bytesToB64(salt), check, entries: [] } },
          `${currentUser.name} set up the password vault`
        )
      );
      setCryptoKey(key);
      setEntries([]);
      setPass("");
      setConfirm("");
    } catch (e) {
      setError("Couldn't set up the vault.");
    } finally {
      setBusy(false);
    }
  };

  const unlockVault = async () => {
    setError("");
    setBusy(true);
    try {
      const salt = b64ToBytes(data.vault.salt);
      const key = await deriveVaultKey(pass, salt);
      let token;
      try {
        token = await decryptJSON(key, data.vault.check);
      } catch (_) {
        token = null;
      }
      if (token !== VAULT_CHECK_TOKEN) {
        setError("Wrong passphrase.");
        setBusy(false);
        return;
      }
      const decrypted = [];
      for (const e of data.vault.entries) {
        try {
          const obj = await decryptJSON(key, e);
          decrypted.push({ id: e.id, updatedAt: e.updatedAt, ...obj });
        } catch (_) {
          /* skip anything that won't decrypt */
        }
      }
      setCryptoKey(key);
      setEntries(decrypted);
      setPass("");
    } catch (e) {
      setError("Couldn't unlock the vault.");
    } finally {
      setBusy(false);
    }
  };

  const lockVault = () => {
    setCryptoKey(null);
    setEntries(null);
    setRevealed({});
    setShowAdd(false);
  };

  const addEntry = async () => {
    const label = fLabel.trim();
    if (!label || !fPass) return;
    setBusy(true);
    try {
      const payload = { label, username: fUser.trim(), password: fPass, notes: fNotes.trim() };
      const enc = await encryptJSON(cryptoKey, payload);
      const id = uid();
      const updatedAt = Date.now();
      mutate((d) =>
        withActivity(
          { ...d, vault: { ...d.vault, entries: [...d.vault.entries, { id, updatedAt, ...enc }] } },
          `${currentUser.name} saved a password for "${label}"`
        )
      );
      setEntries((prev) => [...(prev || []), { id, updatedAt, ...payload }]);
      setFLabel("");
      setFUser("");
      setFPass("");
      setFNotes("");
      setShowAdd(false);
    } catch (e) {
      setError("Couldn't save that entry.");
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = (id, label) => {
    mutate((d) =>
      withActivity(
        { ...d, vault: { ...d.vault, entries: d.vault.entries.filter((e) => e.id !== id) } },
        `${currentUser.name} removed the password for "${label}"`
      )
    );
    setEntries((prev) => (prev || []).filter((e) => e.id !== id));
  };

  const copyPassword = async (entry) => {
    try {
      await navigator.clipboard.writeText(entry.password);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId((c) => (c === entry.id ? null : c)), 1500);
    } catch (_) {
      /* clipboard blocked — ignore */
    }
  };

  const submitPass = () => (isSetUp ? unlockVault() : setupVault());

  // ---- Setup / unlock screen ----
  if (!unlocked) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: COLORS.paper, boxShadow: CARD_SHADOW, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="rounded-full flex items-center justify-center" style={{ width: 48, height: 48, background: COLORS.brassSoft }}>
              <KeyRound size={22} style={{ color: COLORS.brass }} />
            </span>
            <h2 className="text-lg font-semibold" style={{ fontFamily: FONT_DISPLAY, color: COLORS.ink }}>
              {isSetUp ? "Unlock the vault" : "Set up your vault"}
            </h2>
            <p className="text-sm" style={{ color: COLORS.inkSoft }}>
              {isSetUp
                ? "Enter the household master passphrase."
                : "Choose a master passphrase. Passwords are encrypted with it before saving — the database never sees them."}
            </p>
          </div>

          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isSetUp && submitPass()}
            placeholder="Master passphrase"
            className="rounded-lg px-3 py-2 text-sm"
            style={{ ...inputStyle, fontFamily: FONT_MONO }}
            autoFocus
          />
          {!isSetUp && (
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPass()}
              placeholder="Confirm passphrase"
              className="rounded-lg px-3 py-2 text-sm"
              style={{ ...inputStyle, fontFamily: FONT_MONO }}
            />
          )}

          {error && (
            <p className="text-xs text-center" style={{ color: COLORS.stamp }}>
              {error}
            </p>
          )}

          <button
            onClick={submitPass}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2"
            style={{ background: COLORS.ink, color: COLORS.paper }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
            {isSetUp ? "Unlock" : "Create vault"}
          </button>

          {!isSetUp && (
            <p className="text-xs text-center" style={{ color: COLORS.inkFaint }}>
              If everyone forgets this passphrase, the saved passwords can't be recovered. Don't store banking or primary-email passwords here.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---- Unlocked vault ----
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="flex-1 rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2"
          style={{ background: COLORS.ink, color: COLORS.paper }}
        >
          <Plus size={16} /> Add password
        </button>
        <button
          onClick={lockVault}
          className="rounded-lg px-3 py-2 text-sm flex items-center gap-2"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
        >
          <Lock size={15} /> Lock
        </button>
      </div>

      {showAdd && (
        <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}>
          <input value={fLabel} onChange={(e) => setFLabel(e.target.value)} placeholder="Label (e.g. WiFi, Netflix)" className="rounded-lg px-3 py-2 text-sm" style={inputStyle} autoFocus />
          <input value={fUser} onChange={(e) => setFUser(e.target.value)} placeholder="Username / email (optional)" className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          <input value={fPass} onChange={(e) => setFPass(e.target.value)} placeholder="Password" className="rounded-lg px-3 py-2 text-sm" style={{ ...inputStyle, fontFamily: FONT_MONO }} />
          <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="rounded-lg px-3 py-2 text-sm" style={inputStyle} />
          <button onClick={addEntry} disabled={busy} className="rounded-lg px-3 py-2 text-sm" style={{ background: COLORS.brass, color: COLORS.paper }}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <VaultEntryRow
            key={entry.id}
            entry={entry}
            revealed={!!revealed[entry.id]}
            onToggleReveal={() => setRevealed((r) => ({ ...r, [entry.id]: !r[entry.id] }))}
            onCopy={() => copyPassword(entry)}
            copied={copiedId === entry.id}
            onRemove={() => removeEntry(entry.id, entry.label)}
          />
        ))}
        {entries.length === 0 && <EmptyState text="No passwords saved yet." />}
      </div>
    </div>
  );
}

/* ================================ Voice control ================================ */

function VoiceModal({ data, mutate, currentUser, setActiveTab, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | listening | thinking | done | error
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [message, setMessage] = useState("");
  const supportsSpeech = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const succeed = (msg) => {
    setMessage(msg);
    setStatus("done");
  };
  const fail = (msg) => {
    setMessage(msg);
    setStatus("error");
  };

  const applyAction = useCallback(
    (action) => {
      switch (action.action) {
        case "check_shopping_item": {
          const target = findByName(data.shoppingList.filter((i) => !i.checked), action.item, (i) => i.name);
          if (!target) return fail(`Couldn't find "${action.item}" on the shopping list.`);
          mutate((d) => {
            const shoppingList = d.shoppingList.map((i) => (i.id === target.id ? { ...i, checked: true, checkedBy: currentUser.name, checkedAt: Date.now() } : i));
            return withActivity({ ...d, shoppingList }, `${currentUser.name} ticked off "${target.name}" by voice`);
          });
          setActiveTab("shopping");
          succeed(`Ticked off "${target.name}".`);
          return;
        }
        case "uncheck_shopping_item": {
          const target = findByName(data.shoppingList.filter((i) => i.checked), action.item, (i) => i.name);
          if (!target) return fail(`Couldn't find "${action.item}" among ticked items.`);
          mutate((d) => {
            const shoppingList = d.shoppingList.map((i) => (i.id === target.id ? { ...i, checked: false, checkedBy: null, checkedAt: null } : i));
            return withActivity({ ...d, shoppingList }, `${currentUser.name} un-ticked "${target.name}" by voice`);
          });
          setActiveTab("shopping");
          succeed(`Un-ticked "${target.name}".`);
          return;
        }
        case "add_shopping_item": {
          if (!action.item) return fail("Didn't catch what to add.");
          mutate((d) =>
            withActivity(
              { ...d, shoppingList: [...d.shoppingList, { id: uid(), name: action.item, checked: false, checkedBy: null, checkedAt: null, matchedPrice: null }] },
              `${currentUser.name} added "${action.item}" to shopping by voice`
            )
          );
          setActiveTab("shopping");
          succeed(`Added "${action.item}" to the shopping list.`);
          return;
        }
        case "complete_cleaning_task": {
          const target = findByName(data.cleaningTasks, action.task, (t) => t.name);
          if (!target) return fail(`Couldn't find a cleaning task like "${action.task}".`);
          mutate((d) => {
            const cleaningTasks = d.cleaningTasks.map((t) => (t.id === target.id ? { ...t, lastDone: Date.now(), lastDoneBy: currentUser.name } : t));
            return withActivity({ ...d, cleaningTasks }, `${currentUser.name} finished "${target.name}" by voice`);
          });
          setActiveTab("cleaning");
          succeed(`Marked "${target.name}" done.`);
          return;
        }
        case "complete_todo": {
          const target = findByName(data.todos.filter((t) => !t.done), action.text, (t) => t.text);
          if (!target) return fail(`Couldn't find a to-do like "${action.text}".`);
          mutate((d) => {
            const todos = d.todos.map((t) => (t.id === target.id ? { ...t, done: true, doneBy: currentUser.name } : t));
            return withActivity({ ...d, todos }, `${currentUser.name} finished "${target.text}" by voice`);
          });
          setActiveTab("todo");
          succeed(`Finished "${target.text}".`);
          return;
        }
        case "add_todo": {
          if (!action.text) return fail("Didn't catch the to-do.");
          mutate((d) =>
            withActivity(
              { ...d, todos: [...d.todos, { id: uid(), text: action.text, done: false, addedBy: currentUser.name, createdAt: Date.now(), doneBy: null }] },
              `${currentUser.name} added a to-do by voice: "${action.text}"`
            )
          );
          setActiveTab("todo");
          succeed(`Added "${action.text}" to the to-do list.`);
          return;
        }
        case "add_event": {
          if (!action.title || !action.date) return fail("Didn't catch the reminder details.");
          mutate((d) =>
            withActivity(
              { ...d, events: [...d.events, { id: uid(), title: action.title, date: action.date, done: false, repeat: action.repeat || "none" }] },
              `${currentUser.name} added calendar event "${action.title}" by voice`
            )
          );
          setActiveTab("calendar");
          succeed(`Added "${action.title}" on ${action.date}.`);
          return;
        }
        default:
          fail(action.reason || "Didn't catch a command I can act on.");
      }
    },
    [data, mutate, currentUser, setActiveTab]
  );

  const handleCommand = useCallback(
    async (text) => {
      setStatus("thinking");
      try {
        const action = await interpretVoiceCommand(text, buildSnapshot(data));
        applyAction(action);
      } catch (err) {
        fail("Couldn't reach the assistant — try again.");
      }
    },
    [data, applyAction]
  );

  useEffect(() => {
    if (!supportsSpeech) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      handleCommand(text);
    };
    rec.onerror = () => fail("Didn't catch that — try again or type it.");
    rec.onend = () => setStatus((s) => (s === "listening" ? "idle" : s));
    try {
      rec.start();
      setStatus("listening");
    } catch (e) {
      fail("Couldn't start the microphone.");
    }
    return () => {
      try {
        rec.stop();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitText = () => {
    const t = textInput.trim();
    if (!t) return;
    setTranscript(t);
    handleCommand(t);
  };

  const showTextFallback = !supportsSpeech || status === "error" || status === "done";

  return (
    <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(27,42,50,0.4)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-2xl p-5 flex flex-col gap-3" style={{ background: COLORS.paper, maxWidth: 640 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ fontFamily: FONT_DISPLAY }}>
            Voice command
          </h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {status === "listening" && (
          <div className="flex flex-col items-center gap-2 py-4">
            <Mic size={32} style={{ color: COLORS.stamp }} />
            <span className="text-sm" style={{ color: COLORS.inkSoft }}>
              Listening...
            </span>
          </div>
        )}
        {status === "thinking" && (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 size={28} className="animate-spin" style={{ color: COLORS.brass }} />
            <span className="text-sm" style={{ color: COLORS.inkSoft }}>
              "{transcript}"
            </span>
          </div>
        )}
        {status === "done" && (
          <div className="flex flex-col items-center gap-2 py-4">
            <Stamp label="Done" />
            <span className="text-sm text-center" style={{ color: COLORS.ink }}>
              {message}
            </span>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center gap-2 py-4">
            <AlertCircle size={28} style={{ color: COLORS.stamp }} />
            <span className="text-sm text-center" style={{ color: COLORS.ink }}>
              {message}
            </span>
          </div>
        )}

        {showTextFallback && (
          <div className="flex gap-2">
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
              placeholder={supportsSpeech ? "Or type a command..." : "Type a command..."}
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={inputStyle}
              autoFocus={!supportsSpeech}
            />
            <button onClick={submitText} className="rounded-lg px-3" style={{ background: COLORS.ink, color: COLORS.paper }}>
              Go
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceFab({ data, mutate, currentUser, setActiveTab }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed rounded-full flex items-center justify-center"
        style={{ bottom: 24, right: 20, width: 56, height: 56, background: COLORS.stamp, color: COLORS.paper, boxShadow: CARD_SHADOW, zIndex: 40 }}
      >
        <Mic size={22} />
      </button>
      {open && (
        <VoiceModal
          data={data}
          mutate={mutate}
          currentUser={currentUser}
          setActiveTab={setActiveTab}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ================================ main app shell ================================ */

function MainApp({ data, mutate, currentUser, activeTab, setActiveTab, onLogout }) {
  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.cream, color: COLORS.ink }}>
      <header
        className="sticky top-0 flex items-center justify-between px-4 py-3"
        style={{ background: COLORS.paper, borderBottom: `1px solid ${COLORS.border}`, zIndex: 20 }}
      >
        <div className="flex items-center gap-2">
          <div className="rounded-lg flex items-center justify-center" style={{ width: 36, height: 36, background: COLORS.brassSoft }}>
            <BookOpen size={18} style={{ color: COLORS.brass }} />
          </div>
          <h1 className="text-lg font-semibold leading-none" style={{ fontFamily: FONT_DISPLAY }}>
            Our Household Ledger
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ fontFamily: FONT_MONO, color: COLORS.inkSoft }}>
            {currentUser.name}
          </span>
          <button onClick={onLogout} className="p-2 rounded-lg" style={{ color: COLORS.inkSoft }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav
        className="flex gap-2 px-3 py-2 overflow-x-auto"
        style={{ background: COLORS.paper, borderBottom: `1px solid ${COLORS.border}` }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                fontFamily: FONT_MONO,
                background: active ? COLORS.brass : COLORS.brassSoft,
                color: active ? COLORS.paper : COLORS.inkSoft,
                border: `1px solid ${active ? COLORS.brass : "transparent"}`,
                fontWeight: active ? 700 : 400,
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <main className="p-4 mx-auto" style={{ maxWidth: 640, paddingBottom: 96 }}>
        {activeTab === "home" && <HomeTab data={data} />}
        {activeTab === "pantry" && <PantryTab data={data} mutate={mutate} currentUser={currentUser} />}
        {activeTab === "shopping" && <ShoppingTab data={data} mutate={mutate} currentUser={currentUser} />}
        {activeTab === "cleaning" && <CleaningTab data={data} mutate={mutate} currentUser={currentUser} />}
        {activeTab === "todo" && <TodoTab data={data} mutate={mutate} currentUser={currentUser} />}
        {activeTab === "calendar" && <CalendarTab data={data} mutate={mutate} currentUser={currentUser} />}
        {activeTab === "vault" && <VaultTab data={data} mutate={mutate} currentUser={currentUser} />}
      </main>

      <VoiceFab data={data} mutate={mutate} currentUser={currentUser} setActiveTab={setActiveTab} />
    </div>
  );
}

/* ================================ root ================================ */

export default function HouseholdLedger() {
  const [data, setData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    let cancelled = false;
    loadData().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const mutate = useCallback((fn) => {
    setData((prev) => {
      const base = prev ?? emptyData();
      const next = fn(base);
      persistData(next);
      return next;
    });
  }, []);

  if (!data) {
    return (
      <>
        <GlobalStyle />
        <LoadingScreen />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <GlobalStyle />
        <LoginGate
          members={data.members}
          onLogin={setCurrentUser}
          onAddMember={(m) => {
            saveMember(m);
            mutate((d) => withActivity({ ...d, members: [...d.members, m] }, `${m.name} joined the household`));
          }}
          onRemoveMember={(id) => {
            deleteMember(id);
            mutate((d) => withActivity({ ...d, members: d.members.filter((m) => m.id !== id) }, `A member left the household`));
          }}
        />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <MainApp
        data={data}
        mutate={mutate}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => setCurrentUser(null)}
      />
    </>
  );
}
