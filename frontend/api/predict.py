from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# --- Load model globally (once per serverless instance) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "..", "model", "random_forest_model.pkl")
model_data = joblib.load(model_path)

model = model_data["model"]
label_encoders = model_data["label_encoders"]
month_mapping = model_data["month_mapping"]

@app.route("/", methods=["POST"])
def predict():
    try:
        data = request.json
        X_input = np.array([[ 
            int(data['Month']),
            int(data['Year']),
            int(data['Municipality']),
            int(data['Transaction_Type']),
            float(data['Cost']),
            int(data['Species'])
        ]])

        y_pred = model.predict(X_input)
        y_pred = np.clip(np.round(y_pred), 0, None).astype(int).tolist()

        return jsonify({"predicted_quantity": y_pred[0]})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
