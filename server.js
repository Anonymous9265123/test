require("dotenv").config(); // Load environment variables

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;

const MONGO_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in .env file");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Define the User schema and model
const userSchema = new mongoose.Schema({
  userID: { type: Number, required: true, unique: true },
  clicks: { type: Number, default: 0 },
  currentClicks: { type: Number, default: 0 }, // Field for current clicks
  lastSavedClicks: { type: Number, default: 0 }, // Track clicks at last save
});

const User = mongoose.model("User", userSchema);

// API endpoint to get user clicks
app.get("/api/clicks", async (req, res) => {
  const { userID } = req.query;

  try {
    const user = await User.findOne({ userID });
    if (user) {
      res.json({ clicks: user.clicks });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// API endpoint to update user clicks
app.post("/api/clicks", async (req, res) => {
  const { userID, clicks } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { userID },
      { $inc: { currentClicks: clicks } }, // Increment currentClicks
      { new: true, upsert: true } // Create a new document if it doesn't exist
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Function to save currentClicks to clicks every few seconds
const saveClicksPeriodically = async () => {
  try {
    // Update users, adding currentClicks to clicks and resetting currentClicks
    await User.updateMany(
      {},
      {
        $inc: { clicks: { $subtract: ["$currentClicks", "$lastSavedClicks"] } }, // Add difference to clicks
        $set: { currentClicks: 0, lastSavedClicks: "$currentClicks" }, // Reset currentClicks and update lastSavedClicks
      }
    );
    console.log("Clicks updated in the database");
  } catch (error) {
    console.error("Error updating clicks:", error);
  }
};

// Save clicks every 10 seconds (10000 milliseconds)
setInterval(saveClicksPeriodically, 10000);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
