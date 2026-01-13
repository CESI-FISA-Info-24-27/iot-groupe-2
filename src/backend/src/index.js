import express from "express";

const app = express();
const PORT = process.env.BACKEND_ORIGIN_PORT;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "🚀 API Express is running!" });
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});