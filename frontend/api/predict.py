# /frontend/api/predict.py
import os
import json
import numpy as np
import joblib
import traceback

# ---------------------------------------------------------------------
# 1️⃣ Load model on cold start (once per Vercel instance)
# ---------------------------------------------------------------------
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model", "random_forest_model_quantity.pkl")

try:
    loaded = joblib.load(MODEL_PATH)
    rf_model = loaded["model"]
    label_encoders = loaded["label_encoders"]
    month_mapping = loaded["month_mapping"]
    print("✅ Model and encoders loaded successfully!")
except Exception as e:
    rf_model = None
    label_encoders = None
    month_mapping = None
    print("❌ Failed to load model:", e)


# ---------------------------------------------------------------------
# 2️⃣ Main handler — entry point for Vercel
# ---------------------------------------------------------------------
def handler(request):
    """Main Vercel function"""
    try:
        # -------------------------
        # Parse request JSON
        # -------------------------
        body = request.get("body") if isinstance(request, dict) else None
        if not body:
            return _response(400, {"error": "Empty request body"})

        try:
            data = json.loads(body)
        except Exception:
            return _response(400, {"error": "Invalid JSON format"})

        if not rf_model:
            return _response(500, {"error": "Model not loaded on server"})

        # -------------------------
        # Extract input data
        # -------------------------
        raw_month = data.get("Month")
        year = int(data["Year"])
        municipality = str(data["Municipality"]).strip()
        transaction_type = str(data["Transaction Type"]).strip()
        species = str(data["Species"]).strip()
        cost = float(data["Cost"])

        # -------------------------
        # Month conversion
        # -------------------------
        if isinstance(raw_month, str) and raw_month in month_mapping:
            month = month_mapping[raw_month]
        else:
            month = int(raw_month)
            if not (1 <= month <= 12):
                return _response(400, {"error": "Invalid month number"})

        # -------------------------
        # Validate category values
        # -------------------------
        municipality_list = list(label_encoders["Municipality"].classes_)
        species_list = list(label_encoders["Species"].classes_)
        transaction_list = list(label_encoders["Transaction Type"].classes_)

        if municipality not in municipality_list:
            return _response(400, {"error": f"Unknown municipality: {municipality}"})
        if species not in species_list:
            return _response(400, {"error": f"Unknown species: {species}"})
        if transaction_type not in transaction_list:
            return _response(400, {"error": f"Unknown transaction type: {transaction_type}"})

        # -------------------------
        # Encode categorical columns
        # -------------------------
        muni_enc = label_encoders["Municipality"].transform([municipality])[0]
        trans_enc = label_encoders["Transaction Type"].transform([transaction_type])[0]
        spec_enc = label_encoders["Species"].transform([species])[0]

        # Ensure correct mapping (Dispersal=0, Sale=1)
        if transaction_type == "Dispersal":
            trans_enc = 0
        elif transaction_type == "Sale":
            trans_enc = 1

        # -------------------------
        # Predict using Random Forest
        # -------------------------
        X = np.array([[month, year, muni_enc, trans_enc, cost, spec_enc]])
        pred = int(np.clip(round(rf_model.predict(X)[0]), 0, None))

        print(f"✅ Prediction complete: {pred}")

        # -------------------------
        # Return successful JSON
        # -------------------------
        return _response(200, {
            "predicted_quantity": pred,
            "encoded_input": {
                "Month": month,
                "Year": year,
                "Municipality": muni_enc,
                "Transaction Type": trans_enc,
                "Cost": cost,
                "Species": spec_enc
            }
        })

    except Exception as e:
        print("❌ Exception:", traceback.format_exc())
        return _response(500, {"error": str(e)})


# ---------------------------------------------------------------------
# 3️⃣ Helper: build valid JSON response
# ---------------------------------------------------------------------
def _response(status, data):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(data)
    }
