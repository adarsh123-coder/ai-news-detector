const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('../public')); // Serve frontend files from the 'public' directory

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

/**
 * A reusable function to make secure calls to the Google Gemini API.
 * @param {object} payload - The data to send to the Gemini API.
 * @returns {Promise<object>} - The JSON response from the API.
 */
async function callGemini(payload) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API Error:", errorData);
        // Create a new error with a more informative message for easier debugging
        const error = new Error(`Google AI API request failed with status ${response.status}`);
        error.details = errorData; // Attach the full error details from the API
        throw error;
    }
    return response.json();
}

// === API ENDPOINTS ===

// Endpoint for the main news analysis (text and image)
app.post('/analyze', async (req, res) => {
    try {
        const { newsText, base64ImageData } = req.body;
        
        // This detailed prompt instructs the AI on exactly how to behave and what JSON format to return
        const prompt = `
            You are an expert fact-checker. Analyze the provided news text and/or image. 
            Determine if the news is real or fake. Provide a summary, a detailed analysis if it's fake, and the correct news if available.
            Respond ONLY with a valid JSON object with the following keys:
            - "is_fake": boolean
            - "summary": string (a detailed, multi-paragraph summary)
            - "analysis": string (detailed explanation if fake, or null if real)
            - "correct_news": string (corrected version, or null)
        `;
        
        const userParts = [];
        if (newsText) userParts.push({ text: `News Text: ${newsText}` });
        if (base64ImageData) userParts.push({ inlineData: { mimeType: "image/jpeg", data: base64ImageData } });
        
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }, { role: "user", parts: userParts }] };
        const data = await callGemini(payload);
        res.json(data);
    } catch (error) {
        console.error("Error in /analyze endpoint:", error);
        res.status(500).json({ error: error.message, details: error.details });
    }
});

// Endpoint for the "Explain Like I'm 5" feature
app.post('/explain', async (req, res) => {
    try {
        const { summary } = req.body;
        const prompt = `Explain the following text to a 5-year-old in simple, friendly terms:\n\n"${summary}"`;
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const data = await callGemini(payload);
        res.json(data);
    } catch (error) {
        console.error("Error in /explain endpoint:", error);
        res.status(500).json({ error: error.message, details: error.details });
    }
});

// Endpoint for the "Show Counterarguments" feature
app.post('/counterarguments', async (req, res) => {
    try {
        const { newsText } = req.body;
        const prompt = `Provide potential counterarguments or alternative perspectives for the following news story. Be objective and present different viewpoints in a structured way:\n\n"${newsText}"`;
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const data = await callGemini(payload);
        res.json(data);
    } catch (error) {
        console.error("Error in /counterarguments endpoint:", error);
        res.status(500).json({ error: error.message, details: error.details });
    }
});

// Start the server and listen for incoming requests
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});