#!/usr/bin/env python3
"""
Advanced Password Manager Backend
Python backend for enhanced password management with encryption
"""

import json
import hashlib
import secrets
import string
from cryptography.fernet import Fernet
import base64
from typing import Dict, List, Optional

class PasswordManagerBackend:
    def __init__(self):
        self.key = self._generate_key()
        self.cipher_suite = Fernet(self.key)
        self.passwords_file = "encrypted_passwords.json"
    
    def _generate_key(self) -> bytes:
        """Generate encryption key"""
        try:
            with open("secret.key", "rb") as key_file:
                return key_file.read()
        except FileNotFoundError:
            key = Fernet.generate_key()
            with open("secret.key", "wb") as key_file:
                key_file.write(key)
            return key
    
    def encrypt_password(self, password: str) -> str:
        """Encrypt a password"""
        encrypted_password = self.cipher_suite.encrypt(password.encode())
        return base64.urlsafe_b64encode(encrypted_password).decode()
    
    def decrypt_password(self, encrypted_password: str) -> str:
        """Decrypt a password"""
        encrypted_password = base64.urlsafe_b64decode(encrypted_password.encode())
        return self.cipher_suite.decrypt(encrypted_password).decode()
    
    def generate_strong_password(self, length: int = 16, include_symbols: bool = True) -> str:
        """Generate a strong random password"""
        characters = string.ascii_letters + string.digits
        if include_symbols:
            characters += string.punctuation
        
        while True:
            password = ''.join(secrets.choice(characters) for _ in range(length))
            if (any(c.islower() for c in password) and
                any(c.isupper() for c in password) and
                any(c.isdigit() for c in password) and
                (not include_symbols or any(c in string.punctuation for c in password))):
                break
        
        return password
    
    def calculate_password_strength(self, password: str) -> Dict:
        """Calculate password strength with detailed analysis"""
        score = 0
        feedback = []
        
        # Length check
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1
        else:
            feedback.append("Consider using a longer password (at least 12 characters)")
        
        # Character variety
        has_lower = any(c.islower() for c in password)
        has_upper = any(c.isupper() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_symbol = any(c in string.punctuation for c in password)
        
        if has_lower:
            score += 1
        if has_upper:
            score += 1
        if has_digit:
            score += 1
        if has_symbol:
            score += 2
        else:
            feedback.append("Add special characters to increase security")
        
        # Common password check
        common_passwords = ["password", "123456", "qwerty", "admin", "welcome"]
        if password.lower() in common_passwords:
            score = max(1, score - 2)
            feedback.append("This is a commonly used password - choose something more unique")
        
        # Sequential characters check
        if any(password[i] == password[i+1] == password[i+2] for i in range(len(password)-2)):
            score = max(1, score - 1)
            feedback.append("Avoid repeating characters")
        
        # Determine strength level
        if len(password) < 4:
            strength = "Very Weak"
        elif score <= 3:
            strength = "Weak"
        elif score <= 6:
            strength = "Fair"
        elif score <= 8:
            strength = "Strong"
        else:
            strength = "Excellent"
        
        security_score = min(100, max(0, score * 10 + len(password)))
        
        return {
            "strength": strength,
            "score": security_score,
            "feedback": feedback,
            "analysis": {
                "length": len(password),
                "has_lowercase": has_lower,
                "has_uppercase": has_upper,
                "has_digits": has_digit,
                "has_symbols": has_symbol
            }
        }
    
    def save_passwords(self, passwords_data: List[Dict]) -> bool:
        """Save encrypted passwords to file"""
        try:
            encrypted_data = []
            for password_data in passwords_data:
                encrypted_entry = password_data.copy()
                encrypted_entry['password'] = self.encrypt_password(password_data['password'])
                encrypted_data.append(encrypted_entry)
            
            with open(self.passwords_file, 'w') as f:
                json.dump(encrypted_data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving passwords: {e}")
            return False
    
    def load_passwords(self) -> List[Dict]:
        """Load and decrypt passwords from file"""
        try:
            with open(self.passwords_file, 'r') as f:
                encrypted_data = json.load(f)
            
            decrypted_data = []
            for entry in encrypted_data:
                decrypted_entry = entry.copy()
                decrypted_entry['password'] = self.decrypt_password(entry['password'])
                decrypted_data.append(decrypted_entry)
            
            return decrypted_data
        except FileNotFoundError:
            return []
        except Exception as e:
            print(f"Error loading passwords: {e}")
            return []
    
    def verify_password_strength(self, password: str) -> Dict:
        """Comprehensive password verification"""
        strength_analysis = self.calculate_password_strength(password)
        
        # Additional security checks
        if len(password) < 8:
            strength_analysis['recommendation'] = "CRITICAL: Password is too short"
        elif strength_analysis['strength'] in ['Very Weak', 'Weak']:
            strength_analysis['recommendation'] = "Consider strengthening your password"
        else:
            strength_analysis['recommendation'] = "Good password strength"
        
        return strength_analysis

# Flask API for web integration
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

password_manager = PasswordManagerBackend()

@app.route('/api/status', methods=['GET'])
def status():
    """Check backend status"""
    return jsonify({
        "status": "online",
        "service": "Password Manager Backend",
        "version": "1.0"
    })

@app.route('/api/generate_password', methods=['POST'])
def generate_password():
    """Generate a strong password"""
    data = request.json or {}
    length = data.get('length', 16)
    include_symbols = data.get('include_symbols', True)
    
    password = password_manager.generate_strong_password(length, include_symbols)
    strength = password_manager.calculate_password_strength(password)
    
    return jsonify({
        "success": True,
        "password": password,
        "strength": strength
    })

@app.route('/api/analyze_password', methods=['POST'])
def analyze_password():
    """Analyze password strength"""
    data = request.json or {}
    password = data.get('password', '')
    
    if not password:
        return jsonify({
            "success": False,
            "error": "No password provided"
        })
    
    analysis = password_manager.verify_password_strength(password)
    
    return jsonify({
        "success": True,
        "analysis": analysis
    })

@app.route('/api/encrypt_data', methods=['POST'])
def encrypt_data():
    """Encrypt password data"""
    data = request.json or {}
    passwords = data.get('passwords', [])
    
    try:
        success = password_manager.save_passwords(passwords)
        return jsonify({
            "success": success,
            "message": "Data encrypted successfully" if success else "Encryption failed"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/decrypt_data', methods=['GET'])
def decrypt_data():
    """Decrypt and return password data"""
    try:
        passwords = password_manager.load_passwords()
        return jsonify({
            "success": True,
            "passwords": passwords
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

if __name__ == '__main__':
    print("Starting Password Manager Backend...")
    print("API endpoints available:")
    print("  GET  /api/status")
    print("  POST /api/generate_password")
    print("  POST /api/analyze_password")
    print("  POST /api/encrypt_data")
    print("  GET  /api/decrypt_data")
    print("\nServer running on http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)