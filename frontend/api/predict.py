import os
import json
import joblib
import numpy as np

# --- Load model once (cached between invocations) ---
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model", "random_forest_model_quantity.pkl")
loaded = joblib.load(MODEL_PATH)
rf_model = loaded["model"]
label_encoders = loaded["label_encoders"]
month_mapping = loaded["month_mapping"]

municipality_list = list(label_encoders["Municipality"].classes_)
species_list = list(label_encoders["Species"].classes_)
transaction_list = list(label_encoders["Transaction Type"].classes_)


def handler(request):
    """Vercel serverless function entrypoint"""
    try:
        # Parse request body
        body = request.get("body")
        if not body:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Empty request body"})
            }

        data = json.loads(body)
        print(f"📩 Incoming data: {data}")

        # Extract fields
        raw_month = data.get("Month")
        year = int(data["Year"])
        municipality = str(data["Municipality"]).strip()
        transaction_type = str(data["Transaction Type"]).strip()
        species = str(data["Species"]).strip()
        cost = float(data["Cost"])

        # --- Month conversion ---
        if isinstance(raw_month, str) and raw_month in month_mapping:
            month = month_mapping[raw_month]
        else:
            month = int(raw_month)

        # --- Validate categories ---
        if municipality not in municipality_list:
            raise ValueError(f"Unknown municipality: {municipality}")
        if species not in species_list:
            raise ValueError(f"Unknown species: {species}")
        if transaction_type not in transaction_list:
            raise ValueError(f"Unknown transaction type: {transaction_type}")

        # --- Encode ---
        muni_enc = label_encoders["Municipality"].transform([municipality])[0]
        trans_enc = label_encoders["Transaction Type"].transform([transaction_type])[0]
        spec_enc = label_encoders["Species"].transform([species])[0]

        # Enforce correct mapping (Dispersal=0, Sale=1)
        if transaction_type == "Dispersal":
            trans_enc = 0
        elif transaction_type == "Sale":
            trans_enc = 1

        # --- Prepare input ---
        X = np.array([[month, year, muni_enc, trans_enc, cost, spec_enc]])
        pred = int(np.clip(round(rf_model.predict(X)[0]), 0, None))

        print(f"✅ Predicted Quantity: {pred}")

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
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
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
