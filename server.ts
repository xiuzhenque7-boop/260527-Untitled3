/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON body limit to handle base64 image uploads smoothly
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Initialize GoogleGenAI SDK safely
// We fetch the API key from environment variables.
const getGenAI = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API Route: Enrich manual input words
app.post("/api/generate-word-info", async (req, res) => {
  try {
    const { words } = req.body;
    if (!words || !Array.isArray(words) || words.length === 0) {
       res.status(400).json({ error: "Invalid input. 'words' must be a non-empty array of strings." });
       return;
    }

    const cleanWords = words.map(w => w.trim()).filter(Boolean);
    if (cleanWords.length === 0) {
       res.status(400).json({ error: "No valid words provided." });
       return;
    }

    const ai = getGenAI();
    const prompt = `You are an expert English-Chinese lexicographer and tutor.
For each of the following English words/phrases, generate its:
1. Standard IPA transcription (phonetic symbol, e.g., /əˈbɪl.ə.ti/).
2. Fluent and clear Chinese translation.
3. A helpful, natural English example sentence.
4. The Chinese translation of that example sentence.

Words list to annotate: ${JSON.stringify(cleanWords)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional dictionary assistant that outputs high-fidelity JSON data.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The original English word or short phrase." },
              phonetic: { type: Type.STRING, description: "The IPA phonetic symbol, e.g. /ɪɡˈzɑːm.pl̩/." },
              translation: { type: Type.STRING, description: "Clear Chinese translation with speech parts." },
              sentence: { type: Type.STRING, description: "A simple, typical English sentence showcasing the word." },
              sentenceTranslation: { type: Type.STRING, description: "Natural Chinese translation of the example sentence." }
            },
            required: ["word", "phonetic", "translation", "sentence", "sentenceTranslation"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from the AI model.");
    }

    const data = JSON.parse(text);
    res.json({ success: true, results: data });
  } catch (error: any) {
    console.error("Error generating word info:", error);
    res.status(500).json({ error: error.message || "Failed to generate word information." });
  }
});

// API Route: Scan photos/images for English vocabulary words
app.post("/api/recognize-photo", async (req, res) => {
  try {
    // We receive raw base64 data and mimeType inside body
    const { image, mimeType } = req.body;
    if (!image) {
       res.status(400).json({ error: "Missing 'image' parameter. Body must contain 'image' as a base64 string." });
       return;
    }

    const ai = getGenAI();

    // Prepare content parts for Gemini Multimodal API
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: image,
      },
    };

    const textPart = {
      text: `Identify and scan all English vocabulary words, word lists, or handwritten/printed words in this photo.
Extract up to 15 key words. For each extracted word, generate:
1. Standard IPA transcription (phonetic symbol, e.g., /diˈtaɪl/).
2. Accurate and natural Chinese translation.
3. A typical English example sentence showing how to use the word.
4. The Chinese translation of that example sentence.

If there are no English words on the page, detect any visible text and translate it, or extract significant English vocabulary suggested by any visual objects in the photo.`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: "You are an expert OCR scanner and dictionary builder that reads English words from images and outputs high-fidelity Chinese-analyzed JSON entries.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "Spelling of the English word or phrase extracted." },
              phonetic: { type: Type.STRING, description: "IPA phonetic transcription." },
              translation: { type: Type.STRING, description: "Standard Chinese translation." },
              sentence: { type: Type.STRING, description: "An illustrative example sentence." },
              sentenceTranslation: { type: Type.STRING, description: "The translation of the example sentence." }
            },
            required: ["word", "phonetic", "translation", "sentence", "sentenceTranslation"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Could not parse words from the uploaded image.");
    }

    const data = JSON.parse(text);
    res.json({ success: true, results: data });
  } catch (error: any) {
    console.error("Error recognizing photo:", error);
    res.status(500).json({ error: error.message || "Failed to parse English words from photo." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite middleware in development to handle asset compilation
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on port ${PORT}`);
  });
}

startServer();
