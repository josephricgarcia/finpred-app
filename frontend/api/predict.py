# predict.py
from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# --- Load model and encoders ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "..", "model", "random_forest_model_quantity.pkl")
model_data = joblib.load(model_path)

model = model_data["model"]
label_encoders = model_data["label_encoders"]
month_mapping = model_data["month_mapping"]  # Not strictly needed but kept for consistency

# Expected categorical values (for validation)
VALID_SPECIES = {'Tilapia', 'Koi Carp', 'Common Carp', 'Hito'}
VALID_TRANSACTION_TYPES = {'Sale', 'Dispersal'}

@app.route("/", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)

        # --- Extract and validate ---
        month = int(data['Month'])
        year = int(data['Year'])
        municipality = str(data['Municipality']).strip()
        transaction_type = str(data['Transaction_Type']).strip()
        cost = float(data['Cost'])
        species = str(data['Species']).strip()

        if not (1 <= month <= 12):
            return jsonify({"error": "Month must be between 1 and 12"}), 400
        if cost < 0:
            return jsonify({"error": "Cost cannot be negative"}), 400
        if species not in VALID_SPECIES:
            return jsonify({"error": f"Invalid species. Choose from: {', '.join(VALID_SPECIES)}"}), 400
        if transaction_type not in VALID_TRANSACTION_TYPES:
            return jsonify({"error": "Transaction Type must be 'Sale' or 'Dispersal'"}), 400

        # --- Encode using trained LabelEncoders ---
        try:
            municipality_encoded = label_encoders['Municipality'].transform([municipality])[0]
            transaction_encoded = label_encoders['Transaction Type'].transform([transaction_type])[0]
            species_encoded = label_encoders['Species'].transform([species])[0]
        except ValueError as ve:
            return jsonify({"error": f"Unknown category: {ve}"}), 400

        # --- Prepare input array ---
        X_input = np.array([[ 
            month,
            year,
            municipality_encoded,
            transaction_encoded,
            cost,
            species_encoded
        ]])

        # --- Predict ---
        y_pred = model.predict(X_input)
        y_pred = np.clip(np.round(y_pred), 0, None).astype(int)

        return jsonify({"predicted_quantity": int(y_pred[0])})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)