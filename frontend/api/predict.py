# /api/predict.py
import joblib
import numpy as np
import os
import json
import pandas as pd

# ----------------------------------------------------------------------
# 1️⃣ LOAD MODEL AND ENCODERS ONCE (cold start)
# ----------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "model", "random_forest_model_quantity.pkl")

loaded_data = joblib.load(MODEL_PATH)
rf_model = loaded_data["model"]
label_encoders = loaded_data["label_encoders"]
month_mapping = loaded_data["month_mapping"]

print("✅ Model and encoders loaded successfully!")

# Cache classes
municipality_list = list(label_encoders["Municipality"].classes_)
species_list = list(label_encoders["Species"].classes_)
transaction_list = list(label_encoders["Transaction Type"].classes_)

# ----------------------------------------------------------------------
# 2️⃣ HANDLER FUNCTION (for Vercel)
# ----------------------------------------------------------------------
def handler(request):
    try:
        # Parse JSON body safely
        try:
            data = request.get_json()
        except Exception:
            raw_body = request.body.decode("utf-8") if hasattr(request, "body") else None
            data = json.loads(raw_body) if raw_body else {}
        
        if not data:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Empty or invalid JSON payload"})
            }

        print(f"📩 Incoming data: {data}")

        # --- Extract inputs ---
        raw_month = data.get("Month")
        year = int(data["Year"])
        municipality = str(data["Municipality"]).strip()
        transaction_type = str(data["Transaction Type"]).strip()
        species = str(data["Species"]).strip()
        cost = float(data["Cost"])

        # --- Month mapping ---
        if isinstance(raw_month, str) and raw_month in month_mapping:
            month = month_mapping[raw_month]
        else:
            month = int(raw_month) if raw_month else None
            if not (1 <= month <= 12):
                raise ValueError("Month must be 1–12 or a valid month name")

        # --- Validation ---
        if municipality not in municipality_list:
            raise ValueError(f"Unknown municipality: {municipality}")
        if species not in species_list:
            raise ValueError(f"Unknown species: {species}")
        if transaction_type not in transaction_list:
            raise ValueError(f"Unknown transaction type: {transaction_type}")

        # --- Encoding ---
        municipality_enc = label_encoders["Municipality"].transform([municipality])[0]
        species_enc = label_encoders["Species"].transform([species])[0]
        transaction_enc = label_encoders["Transaction Type"].transform([transaction_type])[0]

        # Enforce Dispersal=0, Sale=1
        if transaction_type == "Dispersal":
            transaction_enc = 0
        elif transaction_type == "Sale":
            transaction_enc = 1

        # --- Model input ---
        X_input = np.array([[month, year, municipality_enc, transaction_enc, cost, species_enc]])
        pred = rf_model.predict(X_input)
        pred = np.clip(np.round(pred), 0, None).astype(int)

        print(f"✅ Predicted Quantity: {int(pred[0])}")

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
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
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
