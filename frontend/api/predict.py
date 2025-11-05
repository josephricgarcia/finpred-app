# predict.py
from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# ----------------------------------------------------------------------
# 1️⃣ LOAD TRAINED MODEL AND ENCODERS
# ----------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "model", "random_forest_model_quantity.pkl")

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

loaded_data = joblib.load(MODEL_PATH)
rf_model = loaded_data["model"]
label_encoders = loaded_data["label_encoders"]
month_mapping = loaded_data["month_mapping"]

print("✅ Model and encoders loaded successfully!")

# ----------------------------------------------------------------------
# 2️⃣ API ENDPOINT — PREDICTION
# ----------------------------------------------------------------------
@app.route("/", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)
        print(f"📩 Incoming data: {data}")

        # --- Extract and validate input fields ---
        raw_month = data.get("Month")
        year = int(data["Year"])
        municipality = str(data["Municipality"]).strip()
        transaction_type = str(data["Transaction Type"]).strip()
        species = str(data["Species"]).strip()
        cost = float(data["Cost"])

        # --- Convert month name to numeric using mapping ---
        if isinstance(raw_month, str) and raw_month in month_mapping:
            month = month_mapping[raw_month]
        else:
            try:
                month = int(raw_month)
                if not (1 <= month <= 12):
                    raise ValueError
            except Exception:
                return jsonify({"error": "Month must be 1–12 or a valid month name"}), 400

        # --- Encode categorical columns (same LabelEncoders used in training) ---
        try:
            municipality_enc = label_encoders["Municipality"].transform([municipality])[0]
            transaction_enc = label_encoders["Transaction Type"].transform([transaction_type])[0]
            species_enc = label_encoders["Species"].transform([species])[0]
        except ValueError as ve:
            return jsonify({"error": f"Unknown category: {ve}"}), 400

        # --- Feature order must exactly match training ---
        X_input = np.array([[month, year, municipality_enc, transaction_enc, cost, species_enc]])

        # --- Predict using trained Random Forest model ---
        pred = rf_model.predict(X_input)
        pred = np.clip(np.round(pred), 0, None).astype(int)

        print(f"✅ Predicted Quantity: {int(pred[0])}")
        return jsonify({"predicted_quantity": int(pred[0])})

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------------
# 3️⃣ SERVER RUNNER
# ----------------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
