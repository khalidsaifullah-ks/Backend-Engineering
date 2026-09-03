// Auth API - Supabase-backed authentication (FlyRank W2/A4, Express lane).
// Sign up, log in, log out, and a reusable middleware guard protecting
// private routes. Supabase handles password hashing and JWT signing;
// this server only forwards credentials and verifies tokens.
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const { supabase } = require("./supabaseClient");
const { requireAuth } = require("./authMiddleware");
const openapiDocument = require("./openapi.json");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// Validation - the server never trusts the client.
// ---------------------------------------------------------------------------

function validateCredentials(body) {
  if (!body.email || !body.password) {
    return "Fields 'email' and 'password' are required";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Docs.
// ---------------------------------------------------------------------------

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

// ---------------------------------------------------------------------------
// Auth routes.
// ---------------------------------------------------------------------------

app.post("/auth/signup", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const validationError = validateCredentials(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
    });

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ user: data.user });
  } catch (err) {
    next(err);
  }
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const validationError = validateCredentials(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      return res.status(401).json({ error: "Invalid login credentials" });
    }

    res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    next(err);
  }
});

app.post("/auth/logout", requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(400).json({ error: error.message });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Public and protected routes.
// ---------------------------------------------------------------------------

app.get("/public/info", (req, res) => {
  res.status(200).json({ message: "Welcome stranger! This info is public." });
});

app.get("/protected/profile", requireAuth, (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at,
  });
});

app.get("/protected/dashboard", requireAuth, (req, res) => {
  res.status(200).json({
    message: `Welcome to your dashboard, ${req.user.email}.`,
  });
});

// ---------------------------------------------------------------------------
// Fallbacks - an API should answer JSON even when things go wrong.
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ error: `No endpoint for ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} and connected to Supabase`);
});
