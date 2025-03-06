from flask import Flask, request, render_template, jsonify, redirect
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from kneed import KneeLocator
import numpy as np

app = Flask(__name__)

# Load dataset for Wisconsin breast cancer dataset of 
df = pd.read_csv('data/wdbc.csv')

@app.route('/')
def home():
    return render_template('index_proj2a.html')

def compute_pca(data):
    pca = PCA()
    pca.fit(data)
    eigenvalues = pca.explained_variance_
    eigenvectors = pca.components_
    scores = pca.transform(data)
    return eigenvalues.tolist(), eigenvectors.tolist(), scores.tolist(), pca

@app.route('/pca', methods=['GET'])
def pca():
    # Separate numerical and categorical data
    numerical_data = df.select_dtypes(include=['float64', 'int64'])
    categorical_data = df.select_dtypes(include=['object'])
    # Standardize numerical data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numerical_data)
    # Convert scaled data back to a DataFrame
    scaled_data = pd.DataFrame(scaled_data, columns=numerical_data.columns)
    eigenvalues, eigenvectors, scores, pca = compute_pca(scaled_data)
    return jsonify({
        'eigenvalues': eigenvalues,
        'eigenvectors': eigenvectors,
        'scores': scores,
        'column_names': list(scaled_data.columns)
    })

def compute_kmeans(data):
    mse_scores = []
    cluster_assignments = {}

    for k in range(1, 11):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(data)
        mse = kmeans.inertia_
        mse_scores.append(mse)
        cluster_assignments[k] = labels.tolist()

    return mse_scores, cluster_assignments

@app.route('/kmeans', methods=['GET'])
def kmeans():
    # Separate numerical and categorical data
    numerical_data = df.select_dtypes(include=['float64', 'int64'])
    categorical_data = df.select_dtypes(include=['object'])
    # Standardize numerical data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numerical_data)
    mse_scores, clusters= compute_kmeans(scaled_data)
    return jsonify({
        'mse_scores': mse_scores,
        'clusters': clusters
    })

def top_attributes(pca, columns, d_i):
    squared_loadings = np.square(pca.components_[:d_i])
    attribute_scores = squared_loadings.sum(axis=0)
    top_indices = attribute_scores.argsort()[-4:][::-1]
    return [columns[i] for i in top_indices]

@app.route('/top-attributes', methods=['GET'])
def get_top_attributes():
    # Separate numerical and categorical data
    numerical_data = df.select_dtypes(include=['float64', 'int64'])
    categorical_data = df.select_dtypes(include=['object'])
    # Standardize numerical data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numerical_data)

    # Convert scaled data back to a DataFrame
    scaled_data = pd.DataFrame(scaled_data, columns=numerical_data.columns)
    _, _, _, pca = compute_pca(scaled_data)
    intrinsic_dimensionality = request.args.get('d', type=int, default=2)

    # Compute top attributes based on PCA loadings
    top_attr_indices = np.argsort(np.sum(np.square(pca.components_[:intrinsic_dimensionality]), axis=0))[-4:][::-1]
    top_attr_scores = np.sum(np.square(pca.components_[:intrinsic_dimensionality]), axis=0)[top_attr_indices]

    # Convert indices to actual column names
    top_attr_names = [numerical_data.columns[i] for i in top_attr_indices]

    return jsonify({'top_attributes': list(zip(top_attr_names, top_attr_scores))})

@app.route('/dataset', methods=['GET'])
def get_dataset():
    # Select numerical columns only
    numerical_data = df.select_dtypes(include=['float64', 'int64'])
    
    # Standardize numerical data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numerical_data)
    
    # Convert back to DataFrame with correct column names
    scaled_data = pd.DataFrame(scaled_data, columns=numerical_data.columns)
    
    return jsonify({'dataset': scaled_data.to_dict(orient="records")})

@app.route('/find-elbow', methods=['GET'])
def find_elbow_index():
    scree = request.args.get('scree', default=0, type=int)
    kmeans = request.args.get('kmeans', default=0, type=int)

    # Ensure values correctly passed from frontend
    values = request.args.getlist('values', type=float)
    
    if not values or len(values) < 3:
        print("Not enough data points to compute elbow")
        return jsonify(0) # Default to the first index if not enough points
    
    print(f" Received values for elbow detection: {values}")

    try:
        kneedle = KneeLocator(range(1, len(values) + 1), values, curve="convex", direction="decreasing", online=True)
        if kneedle.knee is None:
            print(" No elbow detected, returning heuristic choice")
            return jsonify(int(np.argmax(np.diff(values)) + 1)) # Heuristic: Use highest drop-off
        
        print(f" Detected elbow index: {kneedle.knee}")
        return jsonify(int(kneedle.knee))
    except Exception as e:
        print(f" Error computing elbow: {e}")
        return jsonify(0)

    

if __name__ == '__main__':
    app.run(debug=True)


