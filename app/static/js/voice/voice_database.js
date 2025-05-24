/**
 * voice_database.js
 * Manages voice metadata and selection based on demographic attributes
 */

class VoiceDatabase {
  constructor() {
    // Store voice data by ID
    this.voices = {};
    
    // Track usage history to prevent repeating voices too soon
    this.usageHistory = [];
    
    // How many other voices must be used before reusing a voice
    this.repeatThreshold = 5;
    
    // Priority weights for attribute matching
    this.weights = {
      gender: 1.0,    // 100% - gender must match
      age: 0.75,      // 75% importance
      ethnicity: 0.33 // 33% importance
    };
  }

  /**
   * Add a voice to the database
   * @param {string} id - Voice ID
   * @param {Object} metadata - Voice metadata 
   */
  addVoice(id, metadata) {
    this.voices[id] = {
      id,
      gender: metadata.gender || 'unknown',
      ethnicity: metadata.ethnicity || 'unknown',
      age: metadata.age || 'unknown',
      accent: metadata.accent || null,
      stability: metadata.stability || 0.5,
      clarity: metadata.clarity || 0.75,
      style: metadata.style || 0.0,
      isLegendary: metadata.isLegendary || false,
      special: metadata.special || null,
      ...metadata
    };
  }

  /**
   * Add multiple voices at once
   * @param {Array} voiceData - Array of voice objects
   */
  addVoices(voiceData) {
    voiceData.forEach(voice => {
      this.addVoice(voice.id, voice);
    });
  }

  /**
   * Select the best matching voice based on provided attributes
   * @param {Object} criteria - Desired voice attributes
   * @returns {Object} - Selected voice
   */
  selectVoice(criteria) {
    // First filter: only include voices not recently used
    const availableVoices = this.getAvailableVoices();
    if (availableVoices.length === 0) {
      console.warn('No available voices found, resetting usage history');
      this.usageHistory = [];
      return this.selectVoice(criteria);
    }

    // We MUST match gender, so filter by gender first
    const genderMatches = availableVoices.filter(
      voice => voice.gender.toLowerCase() === criteria.gender.toLowerCase()
    );
    
    if (genderMatches.length === 0) {
      console.warn(`No voices with ${criteria.gender} gender available`);
      // In production, you might want to fall back to any voice rather than return null
      return null;
    }

    // Score remaining matches on other criteria
    const scoredMatches = genderMatches.map(voice => ({
      voice,
      score: this.calculateMatchScore(voice, criteria)
    }));

    // Sort by score (highest first)
    scoredMatches.sort((a, b) => b.score - a.score);
    
    // Select the best match
    const selected = scoredMatches[0].voice;
    
    // Record usage
    this.recordVoiceUsage(selected.id);
    
    return selected;
  }

  /**
   * Calculate how well a voice matches the criteria
   * @private
   * @param {Object} voice - Voice to evaluate
   * @param {Object} criteria - Desired criteria
   * @returns {number} - Match score (0-1)
   */
  calculateMatchScore(voice, criteria) {
    let totalScore = 0;
    let totalWeight = 0;
    
    // Age match
    if (criteria.age && this.weights.age > 0) {
      const ageMatch = voice.age.toLowerCase() === criteria.age.toLowerCase() ? 1 : 0;
      totalScore += ageMatch * this.weights.age;
      totalWeight += this.weights.age;
    }
    
    // Ethnicity match
    if (criteria.ethnicity && this.weights.ethnicity > 0) {
      const ethnicityMatch = voice.ethnicity.toLowerCase() === criteria.ethnicity.toLowerCase() ? 1 : 0;
      totalScore += ethnicityMatch * this.weights.ethnicity;
      totalWeight += this.weights.ethnicity;
    }
    
    // Add additional attribute matching as needed

    // Normalize score to 0-1 range
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Record that a voice has been used
   * @param {string} voiceId - ID of the used voice
   */
  recordVoiceUsage(voiceId) {
    // Add to front of history array
    this.usageHistory.unshift(voiceId);
    
    // Keep history at a reasonable size
    if (this.usageHistory.length > 20) {
      this.usageHistory = this.usageHistory.slice(0, 20);
    }
  }

  /**
   * Get voices that haven't been used recently
   * @returns {Array} - Available voices
   */
  getAvailableVoices() {
    // If we don't have enough voices used yet, all are available
    // except the most recently used ones
    const recentVoices = this.usageHistory.slice(0, Math.min(this.repeatThreshold, this.usageHistory.length));
    
    return Object.values(this.voices).filter(voice => 
      !recentVoices.includes(voice.id)
    );
  }

  /**
   * Get a specific voice by ID
   * @param {string} id - Voice ID
   * @returns {Object} - Voice data or null
   */
  getVoice(id) {
    return this.voices[id] || null;
  }

  /**
   * Get all voices in the database
   * @returns {Array} - All voice objects
   */
  getAllVoices() {
    return Object.values(this.voices);
  }

  /**
   * Get voices matching specific criteria
   * @param {Object} criteria - Criteria to match
   * @returns {Array} - Matching voices
   */
  findVoices(criteria) {
    return Object.values(this.voices).filter(voice => {
      for (const [key, value] of Object.entries(criteria)) {
        if (voice[key] !== value) return false;
      }
      return true;
    });
  }

  /**
   * Configure the repeat threshold
   * @param {number} threshold - Number of other voices before reuse
   */
  setRepeatThreshold(threshold) {
    this.repeatThreshold = Math.max(1, threshold);
  }

  /**
   * Set priority weights for different attributes
   * @param {Object} weights - Weight values for each attribute
   */
  setPriorityWeights(weights) {
    this.weights = { ...this.weights, ...weights };
  }
}

// Load the default voice database with the provided voices
const initializeVoiceDatabase = () => {
  const db = new VoiceDatabase();
  
  // Add all the voices from our dataset
  const voiceData = [
    { id: "Kd8dIzBuJvT1diS5oAPR", gender: "Female", ethnicity: "Nigerian", age: "Young" },
    { id: "ZuvB6LuOVtnnHRsCEquq", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "loQD3CIxowi7eCEHd4m9", gender: "Male", ethnicity: "Australian", age: "Middle-aged" },
    { id: "54YYBuRuAG6KJooiOhFI", gender: "Female", ethnicity: "Romanian", age: "Young" },
    { id: "aPHqQcm7Vm2Wgy37WaBW", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "QLDNM6o3lDbtfJLUO890", gender: "Male", ethnicity: "American", age: "Middle-Aged" },
    { id: "Ax1GP2W4XTyAyNHuch7v", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "iLVmqjzCGGvqtMCk6vVQ", gender: "Male", ethnicity: "Italian", age: "Young" },
    { id: "dGZOPnBPB65AKnGqsIW8", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "wqS2JTzjt7fARO3ZxCVZ", gender: "Male", ethnicity: "American", age: "Middle-Aged" },
    { id: "lUTamkMw7gOzZbFIwmq4", gender: "Male", ethnicity: "Brittish", age: "Middle-aged" },
    { id: "ESNrF6xSj96uiykXXT1f", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "s0XGIcqmceN2l7kjsqoZ", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "UOsudtiwQVrIvIRyyCHn", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "gmv0PPPs8m6FEf03PImj", gender: "Female", ethnicity: "British", age: "Young" },
    { id: "UgBBYS2sOqTuMpoF3BR0", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "f218e5pATi8cBqEEIGBU", gender: "Male", ethnicity: "American", age: "Middle-Aged" },
    { id: "q1Hhtkt94vkD6q7p50hW", gender: "Female", ethnicity: "American", age: "Old" },
    { id: "c8MZcZcr0JnMAwkwnTIu", gender: "Male", ethnicity: "British", age: "Middle-aged" },
    { id: "biq55DmdsFYqfsQzmGQv", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "c8GqgOMlDjKmhWVDfhvI", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "zZLmKvCp1i04X8E0FJ8B", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "aEO01A4wXwd1O8GPgGlF", gender: "Female", ethnicity: "Australian", age: "Young" },
    { id: "qxjGnozOAtD4eqNuXms4", gender: "Male", ethnicity: "British", age: "Young" },
    { id: "qkskiKFtn5qTrNTRzb6M", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "9FuMHon7Kyk1AGgnR8C2", gender: "Female", ethnicity: "American", age: "Middle-aged" },
    { id: "4O1sYUnmtThcBoSBrri7", gender: "Female", ethnicity: "Indian", age: "Middle-aged" },
    { id: "21m00Tcm4TlvDq8ikWAM", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "29vD33N1CtxCmqQRPOHJ", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "2EiwWnXFnvU5JabPnv8n", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "5Q0t7uMcjvnagumLfvZi", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "9BWtsMINqrJLrRacOk9x", gender: "Female", ethnicity: "American", age: "Middle-aged" },
    { id: "AZnzlk1XvdvUeBnXmlld", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "CYw3kZ02Hs0563khs1Fj", gender: "Male", ethnicity: "British", age: "Young" },
    { id: "CwhRBWXzGAHq8TQ4Fs17", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "D38z5RcWu1voky8WS1ja", gender: "Male", ethnicity: "Irish", age: "Old", isLegendary: true, special: "Sailor, fantasy" },
    { id: "EXAVITQu4vr4xnSDxMaL", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "ErXwobaYiN019PkySvjV", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "FGY2WhTYpPnrIDTdsKH5", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "GBv7mTt0atIp3Br8iCZE", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "IKne3meq5aSn9XLyUdCD", gender: "Male", ethnicity: "Australian", age: "Middle-aged" },
    { id: "JBFqnCBsd6RMkjVDRZzb", gender: "Male", ethnicity: "British", age: "Middle-aged" },
    { id: "LcfcDJNUP1GQjkzn1xUU", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "MF3mGyEYCl7XYWbV9V6O", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "N2lVS1w4EtoT3dr4eOWO", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "ODq5zmih8GrVes37Dizd", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "SAz9YHcvj6GT2YYXdXww", gender: "Female", ethnicity: "American", age: "Middle-aged" },
    { id: "SOYHLrjzK2X1ezoPC6cr", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "TX3LPaxmHKxFdv7VOQHJ", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "ThT5KcBeYPX3keUQqHPh", gender: "Female", ethnicity: "British", age: "American" },
    { id: "TxGEqnHWrfWFTfGW9XjX", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "VR6AewLTigWG4xSOukaG", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "XB0fDUnXU5powFXDhCwa", gender: "Female", ethnicity: "Swedish", age: "Young" },
    { id: "Xb7hH8MSUJpSbSDYk0k2", gender: "Female", ethnicity: "British", age: "Middle-aged" },
    { id: "XrExE9yKIg1WjnnlVkGX", gender: "Female", ethnicity: "American", age: "Middle-aged" },
    { id: "Yko7PKHZNXotIFUBG7I9", gender: "Male", ethnicity: "British", age: "Middle-aged" },
    { id: "ZQe5CZNOzWyzPSCn5a3c", gender: "Male", ethnicity: "Australian", age: "Old" },
    { id: "Zlb1dXrM653N07WRdFW3", gender: "Male", ethnicity: "British", age: "Middle-aged" },
    { id: "bIHbv24MWmeRgasZH58o", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "bVMeCyTHy58xNoL34h3p", gender: "Male", ethnicity: "Irish", age: "Young" },
    { id: "cgSgspJ2msm6clMCkdW9", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "cjVigY5qzO86Huf0OWal", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "jBpfuIE2acCO8z3wKNLl", gender: "Female", ethnicity: "American", age: "Young", isLegendary: true, special: "Childish, animated" },
    { id: "jsCqWAovK2LkecY7zXl4", gender: "Female", ethnicity: "American", age: "Young" },
    { id: "knrPHWnBmmDHMoiMeP3l", gender: "Male", ethnicity: "American", age: "Old", isLegendary: true, special: "Santa Claus" },
    { id: "nPczCjzI2devNBz1zQrb", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "oWAxZDx7w5VEj9dCyTzz", gender: "Female", ethnicity: "US - Southern", age: "Young" },
    { id: "onwK4e9ZLuTAKqWW03F9", gender: "Male", ethnicity: "British", age: "Middle-aged" },
    { id: "pFZP5JQG7iQjIQuC4Bku", gender: "Female", ethnicity: "British", age: "Middle-aged" },
    { id: "pNInz6obpgDQGcFmaJgB", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "t0jbNlBVZ17f02VDIeMI", gender: "Male", ethnicity: "American", age: "Old" },
    { id: "wViXBPUzp2ZZixB1xQuM", gender: "Male", ethnicity: "American", age: "Middle-aged" },
    { id: "yoZ06aMxZJJ28mfd3POQ", gender: "Male", ethnicity: "American", age: "Young" },
    { id: "z9fAnlkpzviPz146aGWa", gender: "Female", ethnicity: "American", age: "Middle-aged" },
    { id: "zcAOhNBS3c14rBihAFp1", gender: "Male", ethnicity: "Italian", age: "Young" },
    { id: "zrHiDhphv9ZnVXBqCLjz", gender: "Female", ethnicity: "Swedish", age: "Young" }
  ];
  
  db.addVoices(voiceData);
  
  return db;
};

export { VoiceDatabase, initializeVoiceDatabase };
export default initializeVoiceDatabase(); 