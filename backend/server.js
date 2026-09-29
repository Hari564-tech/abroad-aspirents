const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Groq } = require('groq-sdk');
const db = require('./db');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- HEALTH CHECK ---
// (No authentication required for health check)
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'Backend is running!', database: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'Database connection failed', error: err.message });
  }
});

// --- API KEY AUTHENTICATION MIDDLEWARE ---
app.use(async (req, res, next) => {
  const providedKey = req.headers['x-api-key'] || req.query.api_key;
  
  // Skip API key auth for public or user-auth routes
  if (req.path === '/api/health' || req.path.startsWith('/api/auth/')) {
    return next();
  }

  // If no key provided, block request
  if (!providedKey) {
    return res.status(401).json({ error: 'Unauthorized: Missing API Key' });
  }

  // Hash the provided key to search in DB
  const hash = crypto.createHash('sha256').update(providedKey).digest('hex');

  try {
    const result = await db.query('SELECT * FROM api_keys WHERE key_hash = $1', [hash]);
    const apiKeyData = result.rows[0];

    if (!apiKeyData) {
      return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    
    if (!apiKeyData.is_active || apiKeyData.revoked_at !== null) {
      return res.status(403).json({ error: 'Forbidden: API Key is inactive or revoked' });
    }

    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return res.status(403).json({ error: 'Forbidden: API Key has expired' });
    }

    // Attach API key data to request
    req.apiKey = apiKeyData;

    // Update last_used_at timestamp in background
    db.query('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [apiKeyData.id]).catch(console.error);

    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error verifying API key' });
  }
});

// ==========================================
//               AUTHENTICATION (JWT)
// ==========================================

// Register a new employee/admin
app.post('/api/auth/register', async (req, res) => {
  const { id, name, email, phone, role, title, department, password } = req.body;
  try {
    if (!password) return res.status(400).json({ error: 'Password is required' });
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO employees (id, name, email, phone, role, title, department, password_hash) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role`,
      [id || 'EMP-' + Date.now(), name, email, phone, role || 'employee', title, department, passwordHash]
    );
    
    res.status(201).json({ success: true, message: 'User registered successfully', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login and get JWT token
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM employees WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT Token
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      res.json({
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//                 EMPLOYEES
// ==========================================

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM employees ORDER BY joined_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new employee
app.post('/api/employees', async (req, res) => {
  const { id, name, email, phone, role, title, department } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO employees (id, name, email, phone, role, title, department) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, name, email, phone, role, title, department]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//                 STUDENTS
// ==========================================

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM students ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single student by ID
app.get('/api/students/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM students WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new student
app.post('/api/students', async (req, res) => {
  const { id, name, email, country, intake, status, payment_status } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO students (id, name, email, country, intake, status, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, name, email, country, intake, status, payment_status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
//               UNIVERSITIES
// ==========================================

// Get all universities
app.get('/api/universities', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM universities');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a university
app.post('/api/universities', async (req, res) => {
  const { id, name, country, course, branch, intake } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO universities (id, name, country, course, branch, intake) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, name, country, course, branch, intake]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
//               APPLICATIONS
// ==========================================

// Get applications (optionally filter by student_id)
app.get('/api/applications', async (req, res) => {
  const { studentId } = req.query;
  try {
    let query = 'SELECT * FROM applications';
    let params = [];
    if (studentId) {
      query += ' WHERE student_id = $1';
      params.push(studentId);
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
//                 PAYMENTS
// ==========================================

app.get('/api/payments', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM payments');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//               API KEYS
// ==========================================

// Get all API keys (excluding the raw hashes for security)
app.get('/api/api-keys', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, key_prefix, type, is_active, scopes, last_used_at, expires_at, created_at FROM api_keys ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate a new secure API Key
app.post('/api/api-keys', async (req, res) => {
  const { name, type = 'live', scopes = ['admin:access'] } = req.body;
  
  try {
    // 1. Generate random secret (32 bytes)
    const randomKey = crypto.randomBytes(32).toString('hex');
    const rawSecret = `sai_${type}_${randomKey}`;
    const keyPrefix = `sai_${type}_`;
    
    // 2. Hash the secret
    const hash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    
    // 3. Store the hash
    await db.query(
      `INSERT INTO api_keys (name, key_hash, key_prefix, type, scopes) VALUES ($1, $2, $3, $4, $5)`,
      [name, hash, keyPrefix, type, JSON.stringify(scopes)]
    );
    
    // 4. Return the raw secret only once!
    res.status(201).json({
      success: true,
      message: "API Key created successfully. Save this key now, you will not be able to view the full key again.",
      data: {
        name,
        type,
        scopes,
        apiKey: rawSecret // Raw key returned ONCE
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete (revoke) an API Key
app.delete('/api/api-keys/:id', async (req, res) => {
  try {
    // Soft delete / Revoke
    const result = await db.query('UPDATE api_keys SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'API key not found' });
    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
//               AI INTEGRATION
// ==========================================

// AI endpoint for university recommendations
app.post('/api/ai/recommend-universities', async (req, res) => {
  const { cgpa, ielts, preferredCountry, field } = req.body;

  if (!cgpa || !field) {
    return res.status(400).json({ success: false, error: "Missing required fields: cgpa, field" });
  }

  try {
    // Construct the prompt for the AI
    const prompt = `You are a professional study-abroad counselor. Based on a CGPA of ${cgpa}, IELTS score of ${ielts || 'N/A'}, preferred country ${preferredCountry || 'Any'}, and field of study ${field}, recommend 3 universities. 
    You MUST return ONLY a JSON array of objects. Do NOT include markdown blocks, just the raw JSON.
    Each object must have exactly these keys:
    "name" (string, the university name),
    "matchScore" (number between 0 and 100),
    "reason" (string, a short 1-sentence reason why it's a good fit based on the scores provided).`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You only output raw, valid JSON arrays.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.5,
    });

    const aiResponseContent = chatCompletion.choices[0]?.message?.content || "[]";
    let aiRecommendations = [];
    
    try {
      // Strip out markdown if Groq accidentally includes it
      const cleanJsonStr = aiResponseContent.replace(/```json/g, '').replace(/```/g, '').trim();
      aiRecommendations = JSON.parse(cleanJsonStr);
    } catch (parseError) {
      console.error("Failed to parse Groq response as JSON:", aiResponseContent);
      throw new Error("AI returned invalid data format");
    }

    res.json({
      success: true,
      message: "AI recommendations generated successfully by Groq",
      data: {
        query: { cgpa, ielts, preferredCountry, field },
        recommendations: aiRecommendations
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Meridian Backend is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`=========================================`);
});
