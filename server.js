require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// ===============================
// CHECK ENV
// ===============================
const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
  "OWNER_PASSWORD"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===============================
// UPLOAD
// ===============================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// ===============================
// AUTH
// ===============================
function auth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      ok: false,
      error: "Owner login required"
    });
  }

  const token = header.substring(7);

  try {
    req.owner = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: "Invalid or expired login"
    });
  }
}

// ===============================
// HOME
// ===============================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "Rajkamal Medical Store API"
  });
});

// ===============================
// LOGIN
// ===============================
app.post("/api/login", (req, res) => {
  try {
    const password = String(req.body?.password || "");

    if (!password) {
      return res.status(400).json({
        ok: false,
        error: "Password required"
      });
    }

    if (password !== process.env.OWNER_PASSWORD) {
      return res.status(401).json({
        ok: false,
        error: "Wrong password"
      });
    }

    const token = jwt.sign(
      { owner: true },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      ok: true,
      token
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// GET PRODUCTS
// ===============================
app.get("/api/products", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("GET PRODUCTS ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json(data || []);

  } catch (error) {
    console.error("PRODUCTS ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// ADD PRODUCT
// ===============================
app.post("/api/products", auth, async (req, res) => {
  try {
    const p = req.body || {};

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

    if (!row.name) {
      return res.status(400).json({
        ok: false,
        error: "Product name required"
      });
    }

    const { data, error } = await supabase
      .from("products")
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error("ADD PRODUCT SUPABASE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: error.message,
        details: error.details || "",
        hint: error.hint || ""
      });
    }

    res.json({
      ok: true,
      product: data
    });

  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// UPDATE PRODUCT
// ===============================
app.put("/api/products/:id", auth, async (req, res) => {
  try {
    const p = req.body || {};

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

    if (!row.name) {
      return res.status(400).json({
        ok: false,
        error: "Product name required"
      });
    }

    const { data, error } = await supabase
      .from("products")
      .update(row)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      console.error("UPDATE PRODUCT ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      product: data
    });

  } catch (error) {
    console.error("UPDATE ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// DELETE PRODUCT
// ===============================
app.delete("/api/products/:id", auth, async (req, res) => {
  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      console.error("DELETE ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// STOCK
// ===============================
app.post("/api/products/:id/stock", auth, async (req, res) => {
  try {
    const { data: old, error: getError } = await supabase
      .from("products")
      .select("out")
      .eq("id", req.params.id)
      .single();

    if (getError) {
      return res.status(404).json({
        ok: false,
        error: getError.message
      });
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        out: !old.out
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      product: data
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// IMAGE UPLOAD
// ===============================
app.post("/api/upload", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "Image required"
      });
    }

    const bucket = process.env.SUPABASE_BUCKET || "product-images";

    const ext =
      (req.file.originalname.split(".").pop() || "jpg")
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

    const path =
      `products/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error("UPLOAD ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    res.json({
      ok: true,
      url: data.publicUrl
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// GET LOCATION
// ===============================
app.get("/api/location", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "location")
      .maybeSingle();

    if (error) {
      console.error("GET LOCATION ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: error.message
      });
    }

    res.json({
      ok: true,
      location: data?.value || ""
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// SAVE LOCATION
// ===============================
app.put("/api/location", auth, async (req, res) => {
  try {
    const value = String(req.body?.location || "").trim();

    if (!value) {
      return res.status(400).json({
        ok: false,
        error: "Location required"
      });
    }

    const { data, error } = await supabase
      .from("settings")
      .upsert(
        {
          key: "location",
          value: value
        },
        {
          onConflict: "key"
        }
      )
      .select()
      .single();

    if (error) {
      console.error("SAVE LOCATION ERROR:", error);

      return res.status(500).json({
        ok: false,
        error: error.message,
        details: error.details || "",
        hint: error.hint || ""
      });
    }

    res.json({
      ok: true,
      location: data.value
    });

  } catch (error) {
    console.error("LOCATION ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// 404
// ===============================
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`Rajkamal API running on port ${PORT}`);
});
