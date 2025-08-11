#!/usr/bin/env python3
"""
Simple test Flask app for Railway deployment
"""

from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'status': 'success',
        'message': 'FisioFlow Test API is running!',
        'port': os.environ.get('PORT', 'not set'),
        'env': {
            'FLASK_ENV': os.environ.get('FLASK_ENV'),
            'DATABASE_URL': 'configured' if os.environ.get('DATABASE_URL') else 'not set'
        }
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'message': 'Test app is running',
        'port': os.environ.get('PORT', 'not set')
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
