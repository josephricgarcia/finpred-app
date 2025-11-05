from flask import Flask, request, jsonify
import joblib
import numpy as np
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# --- Load model and encoders ---
model_data = joblib.load("model/random_forest_model_quantity.pkl")

# Extract actual components
model = model_data["model"]
label_encoders = model_data["label_encoders"]
month_mapping = model_data["month_mapping"]

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json

        # Parse input
        X_input = np.array([[
            int(data['Month']),
            int(data['Year']),
            int(data['Municipality']),
            int(data['Transaction_Type']),
            float(data['Cost']),
            int(data['Species'])
        ]])

        # Predict
        y_pred = model.predict(X_input)
        y_pred = np.clip(np.round(y_pred), 0, None).astype(int).tolist()

        return jsonify({'predicted_quantity': y_pred[0]})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
