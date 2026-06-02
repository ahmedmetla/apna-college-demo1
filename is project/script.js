// Password Manager Class
class PasswordManager {
    constructor() {
        this.passwords = this.loadPasswords();
        this.isListening = false;
        this.recognition = null;
        this.pythonConnected = false;
        this.backgroundInterval = null;
        this.currentColorIndex = 0;
        this.backgroundColors = [
            'color-1', 'color-2', 'color-3', 'color-4', 
            'color-5', 'color-6', 'color-7', 'color-8'
        ];
        
        // Initialize after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.initVoiceRecognition();
            this.initEventListeners();
            this.updateUI();
            this.checkPythonConnection();
        }, 100);
    }

    // Voice Recognition Functions - FIXED VERSION
    initVoiceRecognition() {
        console.log("Initializing voice recognition...");
        
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error("Speech recognition not supported in this browser");
            this.showNotification("Voice control not supported in your browser", "error");
            document.getElementById('startVoice').disabled = true;
            document.getElementById('stopVoice').disabled = true;
            document.getElementById('voiceStatusText').textContent = "Not supported";
            return;
        }

        try {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;

            this.recognition.onstart = () => {
                console.log("Voice recognition started");
                this.isListening = true;
                this.updateVoiceUI();
                this.showNotification("Voice control activated", "success");
                this.speak("Voice control activated. You can now give commands.");
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript.trim()) {
                    console.log("Voice command:", finalTranscript);
                    this.processVoiceCommand(finalTranscript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.updateVoiceUI();
                
                let errorMessage = "Voice recognition error";
                if (event.error === 'not-allowed') {
                    errorMessage = "Microphone access denied. Please allow microphone access.";
                } else if (event.error === 'no-speech') {
                    errorMessage = "No speech detected";
                }
                
                this.showNotification(errorMessage, "error");
                this.speak("Sorry, there was an error with voice recognition.");
            };

            this.recognition.onend = () => {
                console.log("Voice recognition ended");
                this.isListening = false;
                this.updateVoiceUI();
                
                // Auto-restart if it ended unexpectedly
                if (this.recognition && !this.isListening) {
                    setTimeout(() => {
                        if (this.recognition) {
                            this.recognition.start();
                        }
                    }, 100);
                }
            };

            console.log("Voice recognition initialized successfully");
            document.getElementById('voiceStatusText').textContent = "Ready";
            
        } catch (error) {
            console.error("Error initializing voice recognition:", error);
            this.showNotification("Error initializing voice control", "error");
            document.getElementById('startVoice').disabled = true;
            document.getElementById('stopVoice').disabled = true;
        }
    }

    processVoiceCommand(command) {
        command = command.toLowerCase().trim();
        console.log("Processing voice command:", command);
        
        this.showNotification(`Voice command: ${command}`, "info");
        this.speak(`I heard: ${command}`);

        // Command processing logic
        if (command.includes('check password') || command.includes('strength') || command.includes('password strength')) {
            this.openTab('strength');
            this.speak("Opening password strength checker");
        } else if (command.includes('save password') || command.includes('new password') || command.includes('add password')) {
            this.openTab('save');
            this.speak("Opening save password tab");
        } else if (command.includes('verify password') || command.includes('check password') || command.includes('password verify')) {
            this.openTab('verify');
            this.speak("Opening password verification");
        } else if (command.includes('show passwords') || command.includes('saved passwords') || command.includes('view passwords')) {
            this.openTab('saved');
            this.speak("Showing saved passwords");
        } else if (command.includes('dashboard') || command.includes('security') || command.includes('security dashboard')) {
            this.openTab('dashboard');
            this.speak("Opening security dashboard");
        } else if (command.includes('stop listening') || command.includes('stop voice') || command.includes('stop recognition')) {
            this.stopVoiceRecognition();
        } else if (command.includes('start listening') || command.includes('start voice') || command.includes('start recognition')) {
            this.startVoiceRecognition();
        } else if (command.includes('generate password') || command.includes('create password') || command.includes('strong password')) {
            this.generatePasswordWithPython();
        } else if (command.includes('clear passwords') || command.includes('delete all') || command.includes('remove passwords')) {
            this.clearAllPasswords();
        } else {
            this.speak("Command not recognized. Try saying 'check password', 'save password', or 'verify password'");
        }
    }

    startVoiceRecognition() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.showNotification("Starting voice recognition...", "info");
            } catch (error) {
                console.error("Error starting voice recognition:", error);
                this.showNotification("Error starting voice recognition", "error");
            }
        }
    }

    stopVoiceRecognition() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
                this.showNotification("Voice control stopped", "info");
                this.speak("Voice control deactivated");
            } catch (error) {
                console.error("Error stopping voice recognition:", error);
            }
        }
    }

    speak(text) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            utterance.onstart = () => {
                console.log("Speech synthesis started");
                document.getElementById('voiceAnimation').style.display = 'flex';
            };
            
            utterance.onend = () => {
                console.log("Speech synthesis ended");
                if (!this.isListening) {
                    document.getElementById('voiceAnimation').style.display = 'none';
                }
            };
            
            utterance.onerror = (event) => {
                console.error("Speech synthesis error:", event);
            };
            
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Speech synthesis not supported");
        }
    }

    // Background Color Animation Functions
    startBackgroundAnimation() {
        if (this.backgroundInterval) {
            this.stopBackgroundAnimation();
        }
        
        this.backgroundInterval = setInterval(() => {
            this.changeBackgroundColor();
        }, 2000); // Change every 2 seconds
        
        this.showNotification("Background animation started", "success");
        this.speak("Background color animation started");
    }

    stopBackgroundAnimation() {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
            this.showNotification("Background animation stopped", "info");
            this.speak("Background color animation stopped");
        }
    }

    changeBackgroundColor() {
        // Remove all color classes
        this.backgroundColors.forEach(color => {
            document.body.classList.remove(color);
        });
        
        // Add current color class
        document.body.classList.add(this.backgroundColors[this.currentColorIndex]);
        
        // Move to next color
        this.currentColorIndex = (this.currentColorIndex + 1) % this.backgroundColors.length;
    }

    // Password Management Functions
    loadPasswords() {
        try {
            const saved = localStorage.getItem('savedPasswords');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error("Error loading passwords:", error);
            return [];
        }
    }

    savePasswords() {
        try {
            localStorage.setItem('savedPasswords', JSON.stringify(this.passwords));
            this.updateUI();
        } catch (error) {
            console.error("Error saving passwords:", error);
            this.showNotification("Error saving passwords", "error");
        }
    }

    addPassword(site, username, password) {
        const strength = this.getPasswordStrength(password);
        const securityScore = this.calculateSecurityScore(password);
        
        const passwordData = {
            site,
            username,
            password,
            strength: strength.level,
            securityScore,
            date: new Date().toLocaleDateString(),
            created: new Date().toLocaleString(),
            id: Date.now().toString()
        };

        // Check if password already exists for this site/username
        const existingIndex = this.passwords.findIndex(p => 
            p.site.toLowerCase() === site.toLowerCase() && 
            p.username.toLowerCase() === username.toLowerCase()
        );

        if (existingIndex !== -1) {
            this.passwords[existingIndex] = passwordData;
            return { success: true, message: `Password for ${site} updated successfully!`, action: 'updated' };
        } else {
            this.passwords.push(passwordData);
            return { success: true, message: `New password saved for ${site}!`, action: 'added' };
        }
    }

    getPasswordStrength(password) {
        if (!password) return { level: '', width: 0, class: '', feedback: [] };

        let strength = 0;
        let feedback = [];
        
        // Length check
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        if (password.length >= 16) strength += 1;

        // Character variety checks
        if (/[a-z]/.test(password)) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 2;

        // Common password check
        const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
        if (commonPasswords.includes(password.toLowerCase())) {
            strength = Math.max(1, strength - 2);
            feedback.push('This is a commonly used password!');
        }

        // Sequential characters check
        if (/(.)\1{2,}/.test(password)) {
            strength = Math.max(1, strength - 1);
            feedback.push('Avoid repeating characters!');
        }

        // Determine strength level
        if (password.length === 0) {
            return { level: '', width: 0, class: '', feedback: [] };
        } else if (password.length < 4) {
            return { level: 'Very Weak', width: 20, class: 'very-weak', feedback: ['Password is too short!'] };
        } else if (strength <= 3) {
            return { level: 'Weak', width: 40, class: 'weak', feedback };
        } else if (strength <= 6) {
            return { level: 'Fair', width: 60, class: 'fair', feedback };
        } else if (strength <= 8) {
            return { level: 'Strong', width: 80, class: 'strong', feedback };
        } else {
            return { level: 'Excellent', width: 100, class: 'excellent', feedback };
        }
    }

    calculateSecurityScore(password) {
        if (!password) return 0;

        let score = 0;
        
        // Length points
        if (password.length >= 8) score += 20;
        if (password.length >= 12) score += 10;
        if (password.length >= 16) score += 10;

        // Character variety points
        if (/[a-z]/.test(password)) score += 10;
        if (/[A-Z]/.test(password)) score += 10;
        if (/[0-9]/.test(password)) score += 10;
        if (/[^A-Za-z0-9]/.test(password)) score += 15;

        // Deductions for poor patterns
        const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
        if (commonPasswords.includes(password.toLowerCase())) score -= 30;
        if (/(.)\1{2,}/.test(password)) score -= 10;

        return Math.max(0, Math.min(