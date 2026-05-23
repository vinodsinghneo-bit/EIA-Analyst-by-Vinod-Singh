import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Lazy initialization of Gemini as instructed
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(key: string) {
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // API endpoint for generating insights
  app.post("/api/gemini/insights", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(403).json({
          error: "Missing GEMINI_API_KEY. Please configure your Gemini API Key in the Settings panel of Google AI Studio.",
          isKeyMissing: true
        });
      }

      const { seriesList, dataSubset, model } = req.body;
      
      if (!seriesList || !Array.isArray(seriesList) || seriesList.length === 0) {
        return res.status(400).json({ error: "Missing or empty 'seriesList' array." });
      }

      const ai = getGeminiClient(apiKey);
      
      // Construct prompt
      let prompt = "You are a senior energy market intelligence analyst specialized in EIA (U.S. Energy Information Administration) petroleum data.\n";
      prompt += "Provide professional, highly scannable, and extremely accurate market insights on the following selected petroleum data series:\n\n";

      seriesList.forEach((s: any, idx: number) => {
        prompt += `${idx + 1}. Series [${s.sk}]: ${s.desc}\n`;
        prompt += `   Category: ${s.cat}\n`;
        
        const stats = dataSubset?.[s.sk];
        if (stats) {
          prompt += `   Latest Value: ${stats.latestValue} ${stats.unit || ''} (as of ${stats.latestDate || 'recent'})\n`;
          prompt += `   Week-over-Week Change: ${stats.wowChangeAbs > 0 ? '+' : ''}${stats.wowChangeAbs} (${stats.wowChangePct > 0 ? '+' : ''}${stats.wowChangePct.toFixed(2)}%)\n`;
          if (stats.recentHistory && Array.isArray(stats.recentHistory)) {
            prompt += `   Recent Weeks Context: ${stats.recentHistory.map((h: any) => `${h[0]}: ${h[1]}`).join(', ')}\n`;
          }
        }
        prompt += "\n";
      });

      prompt += "\nFormat your response as a professional executive summary with markdown formatting. Outlining:\n";
      prompt += "1. **Market Analysis**: 2-3 direct sentences explaining what these selections and their recent directions reveal (inventory draw/build, seasonal trends, regional bottlenecks).\n";
      prompt += "2. **Key Catalyst**: 1-2 sentences on what is currently forcing these movements (e.g., refinery run rates, product demand, imports flow).\n";
      prompt += "3. **Sector Impact**: 1-2 sentences detailing the upstream/downstream price or operational impact.\n";
      prompt += "4. **Outlook**: A bold 1-week predictive outlook.\n\n";
      prompt += "Keep the tone purely clinical, analytical, and authoritative. Avoid marketing fluff, intro/outro remarks, and generalities. Strictly analyze the actual data supplied.";

      // Support dynamic AI agents via model parameter
      const requestedModel = model || "gemini-3.5-flash";
      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: prompt,
      });

      const text = response.text;
      res.json({ success: true, text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      
      const errorMsg = error?.message || "";
      const errorString = typeof error === 'string' ? error : (errorMsg + " " + JSON.stringify(error));
      
      const isQuotaExceeded = 
        error?.status === "RESOURCE_EXHAUSTED" || 
        error?.code === 429 || 
        error?.statusCode === 429 || 
        errorString.includes("RESOURCE_EXHAUSTED") || 
        errorString.includes("429") || 
        errorString.toLowerCase().includes("quota exceeded") ||
        errorString.toLowerCase().includes("rate limit") ||
        errorString.toLowerCase().includes("limit: 20") ||
        errorString.toLowerCase().includes("exceeded your current quota");

      if (isQuotaExceeded) {
        return res.status(429).json({
          success: false,
          error: "API Quota Limit Reached (Free Tier).",
          isQuotaExceeded: true,
          details: "You have temporarily hit the Gemini API free-tier rate limit (20 requests per day or 15 requests per minute). To bypass this and enjoy unlimited, instant analyses, you can configure your own Gemini API Key in the Settings, or simply wait a moment and try your request again."
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: error?.message || "Failed to generate AI insights due to an internal error." 
      });
    }
  });

  // API endpoint for proxying EIA requests
  app.post("/api/eia", async (req, res) => {
    try {
      const headerKey = req.headers["x-eia-api-key"] as string;
      const bodyKey = req.body.apiKey as string;
      const envKey = process.env.EIA_API_KEY;
      
      const apiKey = bodyKey || headerKey || envKey;
      if (!apiKey) {
        return res.status(403).json({
          error: "EIA API Key is required. Please set EIA_API_KEY on the server or provide it in the API Key input.",
          isKeyMissing: true
        });
      }

      const { series } = req.body;
      if (!series || !Array.isArray(series) || series.length === 0) {
        return res.status(400).json({ error: "Missing or empty 'series' array." });
      }

      const results: Record<string, [string, number][]> = {};
      const metadata: Record<string, { desc: string; units: string }> = {};

      const fetchSeries = async (sk: string) => {
        const keysToTry = [
          `PET.${sk}.W`,
          `PET.${sk}`,
          sk
        ];

        for (const k of keysToTry) {
          try {
            const url = `https://api.eia.gov/v2/seriesid/${k.toUpperCase()}?api_key=${apiKey}`;
            const response = await fetch(url);
            if (!response.ok) continue;

            const json: any = await response.json();
            if (json && json.response && json.response.data && Array.isArray(json.response.data)) {
              const rows: [string, number][] = json.response.data
                .map((item: any) => {
                  let dateStr = item.period || "";
                  if (dateStr.length === 8 && !dateStr.includes("-")) {
                    dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
                  }
                  const val = parseFloat(item.value);
                  return [dateStr, isNaN(val) ? 0 : val] as [string, number];
                })
                .filter((r: any) => r[0] !== "" && r[0] >= "2021-01-01");

              if (rows.length > 0) {
                rows.sort((a, b) => a[0].localeCompare(b[0]));
                const firstItem = json.response.data[0] || {};
                const desc = firstItem["series-description"] || firstItem["description"] || firstItem["name"] || "";
                const units = firstItem["units"] || "";
                return { sk, data: rows, desc, units };
              }
            }
          } catch (err) {
            // Ignore and try next pattern
          }
        }
        return { sk, data: null, desc: "", units: "" };
      };

      // Query in batches of 10 to be efficient and network safe
      const batchSize = 10;
      for (let i = 0; i < series.length; i += batchSize) {
        const batch = series.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fetchSeries));
        batchResults.forEach((res) => {
          if (res && res.data) {
            results[res.sk] = res.data;
            metadata[res.sk] = {
              desc: res.desc || `EIA Series ${res.sk}`,
              units: res.units || "Units"
            };
          }
        });
      }

      res.json({ success: true, results, metadata });
    } catch (error: any) {
      console.error("EIA Proxy API error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch EIA data due to an internal error." });
    }
  });

  // Robust production check: either NODE_ENV is set to production, or we are directly running the compiled server.cjs bundle
  const isProd = process.env.NODE_ENV === "production" || 
                 (process.argv[1] && process.argv[1].endsWith("server.cjs"));

  // Vite middleware for development
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
