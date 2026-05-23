var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  let aiClient = null;
  function getGeminiClient(key) {
    if (!aiClient) {
      aiClient = new import_genai.GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    return aiClient;
  }
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
      let prompt = "You are a senior energy market intelligence analyst specialized in EIA (U.S. Energy Information Administration) petroleum data.\n";
      prompt += "Provide professional, highly scannable, and extremely accurate market insights on the following selected petroleum data series:\n\n";
      seriesList.forEach((s, idx) => {
        prompt += `${idx + 1}. Series [${s.sk}]: ${s.desc}
`;
        prompt += `   Category: ${s.cat}
`;
        const stats = dataSubset?.[s.sk];
        if (stats) {
          prompt += `   Latest Value: ${stats.latestValue} ${stats.unit || ""} (as of ${stats.latestDate || "recent"})
`;
          prompt += `   Week-over-Week Change: ${stats.wowChangeAbs > 0 ? "+" : ""}${stats.wowChangeAbs} (${stats.wowChangePct > 0 ? "+" : ""}${stats.wowChangePct.toFixed(2)}%)
`;
          if (stats.recentHistory && Array.isArray(stats.recentHistory)) {
            prompt += `   Recent Weeks Context: ${stats.recentHistory.map((h) => `${h[0]}: ${h[1]}`).join(", ")}
`;
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
      const requestedModel = model || "gemini-3.5-flash";
      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: prompt
      });
      const text = response.text;
      res.json({ success: true, text });
    } catch (error) {
      console.error("Gemini API error:", error);
      const errorMsg = error?.message || "";
      const errorString = typeof error === "string" ? error : errorMsg + " " + JSON.stringify(error);
      const isQuotaExceeded = error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429 || error?.statusCode === 429 || errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("429") || errorString.toLowerCase().includes("quota exceeded") || errorString.toLowerCase().includes("rate limit") || errorString.toLowerCase().includes("limit: 20") || errorString.toLowerCase().includes("exceeded your current quota");
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
  app.post("/api/eia", async (req, res) => {
    try {
      const headerKey = req.headers["x-eia-api-key"];
      const bodyKey = req.body.apiKey;
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
      const results = {};
      const metadata = {};
      const fetchSeries = async (sk) => {
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
            const json = await response.json();
            if (json && json.response && json.response.data && Array.isArray(json.response.data)) {
              const rows = json.response.data.map((item) => {
                let dateStr = item.period || "";
                if (dateStr.length === 8 && !dateStr.includes("-")) {
                  dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
                }
                const val = parseFloat(item.value);
                return [dateStr, isNaN(val) ? 0 : val];
              }).filter((r) => r[0] !== "" && r[0] >= "2021-01-01");
              if (rows.length > 0) {
                rows.sort((a, b) => a[0].localeCompare(b[0]));
                const firstItem = json.response.data[0] || {};
                const desc = firstItem["series-description"] || firstItem["description"] || firstItem["name"] || "";
                const units = firstItem["units"] || "";
                return { sk, data: rows, desc, units };
              }
            }
          } catch (err) {
          }
        }
        return { sk, data: null, desc: "", units: "" };
      };
      const batchSize = 10;
      for (let i = 0; i < series.length; i += batchSize) {
        const batch = series.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fetchSeries));
        batchResults.forEach((res2) => {
          if (res2 && res2.data) {
            results[res2.sk] = res2.data;
            metadata[res2.sk] = {
              desc: res2.desc || `EIA Series ${res2.sk}`,
              units: res2.units || "Units"
            };
          }
        });
      }
      res.json({ success: true, results, metadata });
    } catch (error) {
      console.error("EIA Proxy API error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch EIA data due to an internal error." });
    }
  });
  const isProd = process.env.NODE_ENV === "production" || process.argv[1] && process.argv[1].endsWith("server.cjs");
  if (!isProd) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
