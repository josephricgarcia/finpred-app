# /api/predict.py
from flask import Flask, request, jsonify
import joblib
import numpy as np
import os
import pandas as pd

app = Flask(__name__)

# ----------------------------------------------------------------------
# 1️⃣ LOAD TRAINED MODEL AND ENCODERS
# ----------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "model", "random_forest_model_quantity.pkl")

# Check model existence
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"❌ Model file not found at: {MODEL_PATH}")

# Load model and encoders
loaded_data = joblib.load(MODEL_PATH)
rf_model = loaded_data["model"]
label_encoders = loaded_data["label_encoders"]
month_mapping = loaded_data["month_mapping"]

print("✅ Model and encoders loaded successfully!")

# Cache encoder classes
municipality_list = list(label_encoders["Municipality"].classes_)
species_list = list(label_encoders["Species"].classes_)
transaction_list = list(label_encoders["Transaction Type"].classes_)

# ----------------------------------------------------------------------
# 2️⃣ PREDICT ENDPOINT
# ----------------------------------------------------------------------
@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)
        print(f"📩 Incoming data: {data}")

        # Extract and clean inputs
        raw_month = data.get("Month")
        year = int(data["Year"])
        municipality = str(data["Municipality"]).strip()
        transaction_type = str(data["Transaction Type"]).strip()
        species = str(data["Species"]).strip()
        cost = float(data["Cost"])

        # --- Convert month ---
        if isinstance(raw_month, str) and raw_month in month_mapping:
            month = month_mapping[raw_month]
        else:
            try:
                month = int(raw_month)
                if not (1 <= month <= 12):
                    raise ValueError
            except Exception:
                return jsonify({"error": "Month must be 1–12 or a valid month name"}), 400

        # --- Validate categories ---
        if municipality not in municipality_list:
            return jsonify({"error": f"Unknown municipality: {municipality}"}), 400
        if species not in species_list:
            return jsonify({"error": f"Unknown species: {species}"}), 400
        if transaction_type not in transaction_list:
            return jsonify({"error": f"Unknown transaction type: {transaction_type}"}), 400

        # --- Encode categorical values ---
        municipality_enc = label_encoders["Municipality"].transform([municipality])[0]
        species_enc = label_encoders["Species"].transform([species])[0]
        transaction_enc = label_encoders["Transaction Type"].transform([transaction_type])[0]

        # Ensure Sale=1, Dispersal=0
        if transaction_type == "Dispersal":
            transaction_enc = 0
        elif transaction_type == "Sale":
            transaction_enc = 1

        # --- Format input for model ---
        X_input = np.array([[month, year, municipality_enc, transaction_enc, cost, species_enc]])

        # --- Predict ---
        pred = rf_model.predict(X_input)
        pred = np.clip(np.round(pred), 0, None).astype(int)

        print(f"✅ Prediction OK: {int(pred[0])}")

        return jsonify({
            "predicted_quantity": int(pred[0]),
            "encoded_input": {
                "Month": month,
                "Year": year,
                "Municipality": municipality_enc,
                "Transaction Type": transaction_enc,
                "Cost": cost,
                "Species": species_enc
            }
        })

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------------
# 3️⃣ EXPORT HANDLER FOR VERCEL
# ----------------------------------------------------------------------
# Do NOT call app.run() — Vercel handles this automatically
def handler(request, *args, **kwargs):
    return app(request, *args, **kwargs)
