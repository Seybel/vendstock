import app from "./app";

const PORT = parseInt(process.env.PORT || "4000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VendStock API running on port ${PORT}`);
});
