require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  try {
    req.owner = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Owner login required" });
  }
}

app.get("/", (req, res) => res.json({ ok: true, service: "Rajkamal Medical Store API" }));

app.post("/api/login", (req, res) => {
  if (req.body?.password !== process.env.OWNER_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }
  const token = jwt.sign({ owner: true }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

app.get("/api/products", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/products", auth, async (req, res) => {
  const p = req.body;
  const row = {
    name: String(p.name || "").trim(),
    qty: Number(p.qty || 0),
    price: Number(p.price || 0),
    desc: String(p.desc || ""),
    reviews: String(p.reviews || ""),
    image: String(p.image || ""),
    category: String(p.category || "General Items"),
    out: Boolean(p.out)
  };
  if (!row.name) return res.status(400).json({ error: "Product name required" });

  const { data, error } = await supabase.from("products").insert(row).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put("/api/products/:id", auth, async (req, res) => {
  const p = req.body;
  const row = {
    name: String(p.name || "").trim(),
    qty: Number(p.qty || 0),
    price: Number(p.price || 0),
    desc: String(p.desc || ""),
    reviews: String(p.reviews || ""),
    image: String(p.image || ""),
    category: String(p.category || "General Items"),
    out: Boolean(p.out)
  };

  const { data, error } = await supabase
    .from("products")
    .update(row)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/products/:id", auth, async (req, res) => {
  const { error } = await supabase.from("products").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.post("/api/products/:id/stock", auth, async (req, res) => {
  const { data: old, error: getErr } = await supabase
    .from("products").select("out").eq("id", req.params.id).single();
  if (getErr) return res.status(404).json({ error: getErr.message });

  const { data, error } = await supabase
    .from("products")
    .update({ out: !old.out })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/upload", auth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Image required" });

  const ext = (req.file.originalname.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "");
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET || "product-images")
    .upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

  if (error) return res.status(500).json({ error: error.message });

  const { data } = supabase.storage
    .from(process.env.SUPABASE_BUCKET || "product-images")
    .getPublicUrl(path);

  res.json({ url: data.publicUrl });
});

app.get("/api/location", async (req, res) => {
  const { data, error } = await supabase
    .from("settings").select("value").eq("key", "location").maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ location: data?.value || "" });
});

app.put("/api/location", auth, async (req, res) => {
  const value = String(req.body?.location || "").trim();
  const { error } = await supabase.from("settings").upsert(
    { key: "location", value },
    { onConflict: "key" }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ location: value });
});

app.listen(PORT, () => console.log(`Rajkamal API running on port ${PORT}`));
