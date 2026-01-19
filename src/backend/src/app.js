const express = require("express");
const cors = require("cors");
const sensorsRoutes = require("./routes/sensors.routes");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);

app.get("/", (req, res) => {
  res.json({ message: "🚀 EcoGuard 360 API is running!" });
});

app.use("/api/sensors", sensorsRoutes);

module.exports = app;
