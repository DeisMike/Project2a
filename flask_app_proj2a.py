from flask import Flask, request, render_template, jsonify, redirect
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import numpy as np

app = Flask(__name__)

# Load dataset for Wisconsin breast cancer dataset of 
df = pd.read_csv('data/wdbc.csv')

@app.route('/')
def home():
    return render_template('index_proj2a.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    global df
    file = request.files['file']
    df = pd.read_csv(file)
    return redirect('/')

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
    eigenvalues, eigenvectors, scores, pca = compute_pca(scaled_data)
    return jsonify({
        'eigenvalues': eigenvalues,
        'eigenvectors': eigenvectors,
        'scores': scores
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
    _, _, _, pca = compute_pca(scaled_data)
    intrinsic_dimensionality = request.args.get('d', type=int, default=2)
    top_attrs = top_attributes(pca, scaled_data.columns, intrinsic_dimensionality)
    return jsonify({'top_attributes': top_attrs})

if __name__ == '__main__':
    app.run(debug=True)


