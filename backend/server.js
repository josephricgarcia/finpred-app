import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: "Payload too large" });
  }
  res.set('Content-Type', 'application/json');
  res.status(500).json({ error: "Internal server error" });
});

app.listen(5000, () => console.log("✅ Server running on http://localhost:5000"));
