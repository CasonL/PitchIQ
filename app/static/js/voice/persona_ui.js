// Persona UI Component - Manages UI for selecting and displaying personas
class PersonaUI {
  constructor(personaManager) {
    this.personaManager = personaManager;
    this.container = null;
    this.traitsDisplay = null;
    this.personaSelect = null;
    this.generateButton = null;
    this.clearButton = null;
    this.isInitialized = false;
  }
  
  // Initialize the UI
  async init(parentElement) {
    if (this.isInitialized) return;
    
    // Create container for persona UI
    this.container = document.createElement('div');
    this.container.className = 'persona-ui-container';
    this.container.style.cssText = `
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
      background: #f9f9f9;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    `;
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = 'Buyer Persona';
    header.style.cssText = `
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 16px;
      color: #333;
    `;
    this.container.appendChild(header);
    
    // Create persona type selector
    this.createPersonaSelector();
    
    // Create buttons
    this.createButtons();
    
    // Create traits display
    this.createTraitsDisplay();
    
    // Append to parent
    if (parentElement) {
      parentElement.appendChild(this.container);
    } else {
      // Default to appending to the voice control area if it exists
      const voiceControlArea = document.querySelector('.voice-control-area') || 
                             document.querySelector('#voice-control') ||
                             document.body;
      voiceControlArea.appendChild(this.container);
    }
    
    this.isInitialized = true;
    return this;
  }
  
  // Create the persona selector dropdown
  createPersonaSelector() {
    const selectContainer = document.createElement('div');
    selectContainer.style.cssText = `
      margin-bottom: 10px;
    `;
    
    const label = document.createElement('label');
    label.textContent = 'Persona Type: ';
    label.style.cssText = `
      font-size: 14px;
      margin-right: 5px;
    `;
    
    this.personaSelect = document.createElement('select');
    this.personaSelect.style.cssText = `
      padding: 5px;
      border-radius: 4px;
      border: 1px solid #ccc;
    `;
    
    // Add persona options
    const personaTypes = this.personaManager.getPersonaTypes();
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a persona...';
    this.personaSelect.appendChild(defaultOption);
    
    // Add persona type options
    personaTypes.forEach(persona => {
      const option = document.createElement('option');
      option.value = persona.type;
      option.textContent = persona.name;
      this.personaSelect.appendChild(option);
    });
    
    // Handle persona selection
    this.personaSelect.addEventListener('change', () => {
      const selectedType = this.personaSelect.value;
      if (selectedType) {
        const persona = this.personaManager.setPersona(selectedType);
        this.updateTraitsDisplay(persona);
      }
    });
    
    selectContainer.appendChild(label);
    selectContainer.appendChild(this.personaSelect);
    this.container.appendChild(selectContainer);
  }
  
  // Create action buttons
  createButtons() {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    `;
    
    // Generate Unique Persona button
    this.generateButton = document.createElement('button');
    this.generateButton.textContent = 'Generate Random Buyer';
    this.generateButton.style.cssText = `
      padding: 6px 12px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    this.generateButton.addEventListener('click', () => {
      const persona = this.personaManager.generateUniquePersona();
      this.updateTraitsDisplay(persona);
      
      // Update select dropdown to reflect the new persona type
      this.personaSelect.value = persona.type;
    });
    
    // Clear Persona button
    this.clearButton = document.createElement('button');
    this.clearButton.textContent = 'Clear Persona';
    this.clearButton.style.cssText = `
      padding: 6px 12px;
      background-color: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    this.clearButton.addEventListener('click', () => {
      this.personaManager.clearPersona();
      this.updateTraitsDisplay(null);
      this.personaSelect.value = '';
    });
    
    buttonsContainer.appendChild(this.generateButton);
    buttonsContainer.appendChild(this.clearButton);
    this.container.appendChild(buttonsContainer);
  }
  
  // Create the traits display area
  createTraitsDisplay() {
    this.traitsDisplay = document.createElement('div');
    this.traitsDisplay.className = 'persona-traits-display';
    this.traitsDisplay.style.cssText = `
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      min-height: 100px;
    `;
    
    // Default message when no persona is selected
    const defaultMessage = document.createElement('p');
    defaultMessage.textContent = 'No active persona. Select or generate a buyer persona to see traits.';
    defaultMessage.style.cssText = `
      color: #777;
      font-style: italic;
      text-align: center;
      margin: 10px 0;
    `;
    this.traitsDisplay.appendChild(defaultMessage);
    
    this.container.appendChild(this.traitsDisplay);
  }
  
  // Update the traits display with the current persona
  updateTraitsDisplay(persona) {
    if (!this.traitsDisplay) return;
    
    // Clear current display
    this.traitsDisplay.innerHTML = '';
    
    if (!persona) {
      // No active persona message
      const message = document.createElement('p');
      message.textContent = 'No active persona. Select or generate a buyer persona to see traits.';
      message.style.cssText = `
        color: #777;
        font-style: italic;
        text-align: center;
        margin: 10px 0;
      `;
      this.traitsDisplay.appendChild(message);
      return;
    }
    
    // Persona name
    const nameElement = document.createElement('h4');
    nameElement.textContent = persona.name;
    nameElement.style.cssText = `
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 16px;
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
    `;
    this.traitsDisplay.appendChild(nameElement);
    
    // Persona traits
    const traitsList = document.createElement('ul');
    traitsList.style.cssText = `
      list-style: none;
      padding: 0;
      margin: 0;
    `;
    
    // Pretty names for traits
    const traitNames = {
      hesitancy: 'Hesitancy',
      interruption: 'Tendency to Interrupt',
      disfluency: 'Speech Disfluency',
      skepticism: 'Skepticism',
      formality: 'Formality'
    };
    
    // Create bar chart for each trait
    Object.keys(persona.traits).forEach(trait => {
      const traitItem = document.createElement('li');
      traitItem.style.cssText = `
        margin-bottom: 8px;
      `;
      
      const traitLabel = document.createElement('div');
      traitLabel.textContent = traitNames[trait] || trait;
      traitLabel.style.cssText = `
        font-size: 14px;
        margin-bottom: 2px;
      `;
      
      const traitBar = document.createElement('div');
      traitBar.style.cssText = `
        height: 10px;
        width: 100%;
        background-color: #eee;
        border-radius: 5px;
        overflow: hidden;
      `;
      
      const traitValue = document.createElement('div');
      traitValue.style.cssText = `
        height: 100%;
        width: ${persona.traits[trait] * 100}%;
        background-color: #4CAF50;
      `;
      
      traitBar.appendChild(traitValue);
      traitItem.appendChild(traitLabel);
      traitItem.appendChild(traitBar);
      traitsList.appendChild(traitItem);
    });
    
    this.traitsDisplay.appendChild(traitsList);
    
    // Add note about voice characteristics
    if (persona.voice) {
      const voiceNote = document.createElement('p');
      voiceNote.textContent = `Voice: Rate ${Math.round(persona.voice.rate * 100)}%, Pitch ${Math.round(persona.voice.pitch * 100)}%`;
      voiceNote.style.cssText = `
        font-size: 12px;
        color: #666;
        margin-top: 10px;
        font-style: italic;
      `;
      this.traitsDisplay.appendChild(voiceNote);
    }
  }
  
  // Get the current UI state
  getState() {
    return {
      isInitialized: this.isInitialized,
      activePersona: this.personaManager.getActivePersona()
    };
  }
  
  // Remove the UI from the DOM
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.isInitialized = false;
  }
}

export default PersonaUI; 