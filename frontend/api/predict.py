# predict.py
from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# --- Load model and artefacts -------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "model", "random_forest_model_quantity.pkl")

loaded = joblib.load(MODEL_PATH)
model = loaded["model"]
label_encoders = loaded["label_encoders"]
month_mapping = loaded["month_mapping"]          # {'January':1, ...}

# Dynamically build valid sets from the encoders (exact classes used in training)
VALID_SPECIES = set(label_encoders['Species'].classes_)
VALID_TRANSACTION_TYPES = set(label_encoders['Transaction Type'].classes_)


@app.route("/", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)

        # --------------------------------------------------------------------
        # 1. Extract & basic validation
        # --------------------------------------------------------------------
        raw_month = data.get('Month')                     # can be int (1-12) or month name
        year = int(data['Year'])
        municipality = str(data['Municipality']).strip()
        transaction_type = str(data['Transaction_Type']).strip()
        cost = float(data['Cost'])
        species = str(data['Species']).strip()

        # ---- Month handling ------------------------------------------------
        if isinstance(raw_month, str) and raw_month in month_mapping:
            month = month_mapping[raw_month]
        else:
            try:
                month = int(raw_month)
                if not (1 <= month <= 12):
                    raise ValueError
            except Exception:
                return jsonify({"error": "Month must be 1-12 or a valid month name"}), 400

        # ---- Cost rules ----------------------------------------------------
        if transaction_type not in VALID_TRANSACTION_TYPES:
            return jsonify({
                "error": f"Invalid Transaction_Type. Must be one of: {', '.join(VALID_TRANSACTION_TYPES)}"
            }), 400

        if transaction_type == 'Dispersal':
            if cost != 0:
                return jsonify({"error": "Cost must be 0 for Dispersal"}), 400
        else:  # Sale
            if cost <= 0:
                return jsonify({"error": "Cost must be > 0 for Sale"}), 400

        # ---- Species -------------------------------------------------------
        if species not in VALID_SPECIES:
            return jsonify({
                "error": f"Invalid Species. Choose from: {', '.join(VALID_SPECIES)}"
            }), 400

        # --------------------------------------------------------------------
        # 2. Encode using the **exact** LabelEncoders from training
        # --------------------------------------------------------------------
        try:
            municipality_enc = label_encoders['Municipality'].transform([municipality])[0]
            transaction_enc   = label_encoders['Transaction Type'].transform([transaction_type])[0]
            species_enc       = label_encoders['Species'].transform([species])[0]
        except ValueError as ve:
            return jsonify({"error": f"Unknown category: {ve}"}), 400

        # --------------------------------------------------------------------
        # 3. Build feature vector (order must match training)
        # --------------------------------------------------------------------
        X_input = np.array([[
            month,
            year,
            municipality_enc,
            transaction_enc,
            cost,
            species_enc
        ]])

        # --------------------------------------------------------------------
        # 4. Predict & post-process (same as training notebook)
        # --------------------------------------------------------------------
        pred = model.predict(X_input)
        pred = np.clip(np.round(pred), 0, None).astype(int)

        return jsonify({"predicted_quantity": int(pred[0])})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)