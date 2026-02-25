const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { connectDB } = require('./server/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security fallback for JWT
if (!process.env.JWT_SECRET) {
    console.warn('[RAVEN SERVER] WARNING: JWT_SECRET not found in environment. Using development fallback.');
    process.env.JWT_SECRET = 'RAVEN_PROJECT_SECRET_KEY_2026';
}

// Connect to Database
const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (dbUri) {
    connectDB();
} else {
    console.warn('[RAVEN SERVER] WARNING: Database URI not found. Persistence is disabled.');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './'))); // Serve frontend static files

// Routes
const authRoutes = require('./server/auth');
const gameRoutes = require('./server/game');

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Fallback to index.html for unknown routes (SPA support)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[RAVEN SERVER] Intelligence Hub active on port ${PORT}`);
});
