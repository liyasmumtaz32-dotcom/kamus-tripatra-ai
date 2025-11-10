const { GoogleGenAI } = require('@google/genai');

/**
 * Inisialisasi GoogleGenAI.
 * Kunci API (process.env.GEMINI_API_KEY) harus diatur di Netlify Environment Variables.
 */
// Asumsi Netlify akan menyuntikkan kunci API ke environment variable GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = 'gemini-2.5-flash-preview-09-2025';

exports.handler = async (event) => {
    // Hanya menerima permintaan POST dari client
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        const data = JSON.parse(event.body);
        const { direction, directionText, keyword, wordCount, systemPrompt } = data;

        if (!keyword || !wordCount) {
             return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Parameter input (keyword atau wordCount) hilang.' }),
            };
        }

        // Buat user query yang akan dikirim ke model
        const userQuery = `Huruf Awal Input: "${keyword}"\nPilihan Arah: "${direction}" (${directionText})\nJumlah Kata: ${wordCount}`;
        
        // Buat payload untuk panggilan AI
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            config: {
                 systemInstruction: systemPrompt
            }
        };

        // Panggil Gemini API
        const response = await ai.models.generateContent({
            model: modelName,
            ...payload
        });

        const generatedText = response.text;

        if (!generatedText) {
             return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Respons dari AI kosong atau tidak valid.' }),
            };
        }

        // Kembalikan teks yang dihasilkan (Markdown) ke client-side
        return {
            statusCode: 200,
            headers: { "Content-Type": "text/plain" },
            body: generatedText,
        };

    } catch (error) {
        console.error("Kesalahan dalam Netlify Function:", error);
        
        // Mengembalikan error yang lebih informatif/aman
        let errorMessage = 'Gagal memproses permintaan AI.';
        if (error.message.includes('API key not valid')) {
            errorMessage = 'Kesalahan Autentikasi: Pastikan GEMINI_API_KEY sudah diatur dengan benar di Netlify Environment Variables.';
        } else if (error.message.includes('429')) {
             errorMessage = 'Batas kuota API terlampaui. Coba lagi nanti.';
        } else if (error.message.includes('400')) {
             errorMessage = 'Permintaan buruk (Bad Request) ke API Gemini.';
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage }),
        };
    }
};