# Research Brief Integration Guide

## Overview
The Research Brief system simulates pre-call research that consultants would do before calling a prospect. It shows users what publicly available information they "discovered" and provides talking points.

## How It Works

### 1. Backend Generation
When a persona is generated in `gpt4o_service.py`, it now includes a `research_brief` field with:
- **Online Presence**: Website info, social media status, review summary
- **Business Intelligence**: Years in business, location context, competitive position, growth indicators
- **Opportunity Signals**: Things the consultant noticed they could improve
- **Red Flags**: Potential objections or concerns to watch for
- **Talking Points**: Research-based opening hooks

### 2. Frontend Display
The `ResearchBriefModal` component shows this information to the user BEFORE they start the call, simulating the research phase.

### 3. AI Awareness
The persona AI is instructed to:
- Expect that the consultant did research
- Acknowledge when they reference publicly available information
- React naturally (not overly impressed, but recognizing good preparation)

## Integration Steps

### Option A: Integrate into SamOrchestratorPage

Add the research brief modal between persona generation and call start:

```typescript
import { ResearchBriefModal } from './ResearchBriefModal';

// In your component state
const [showResearchBrief, setShowResearchBrief] = useState(false);

// After persona is generated
const handlePersonaGenerated = (persona: PersonaData) => {
  setGeneratedPersona(persona);
  
  // Show research brief if it exists
  if (persona.research_brief) {
    setShowResearchBrief(true);
  } else {
    // No research brief, start call directly
    handleStartProspectCall();
  }
};

// In your render
{showResearchBrief && generatedPersona && (
  <ResearchBriefModal
    persona={generatedPersona}
    onStartCall={() => {
      setShowResearchBrief(false);
      handleStartProspectCall();
    }}
    onCancel={() => {
      setShowResearchBrief(false);
      // Optionally go back to persona selection
    }}
  />
)}
```

### Option B: Integrate into DualVoiceAgentFlow

Add as a stage in the flow:

```typescript
type FlowStage = 'sam-intro' | 'persona-generation' | 'research-brief' | 'prospect-call' | 'call-complete';

// After persona generation completes
const handlePersonaGenerated = (persona: PersonaData) => {
  setGeneratedPersona(persona);
  if (persona.research_brief) {
    setCurrentStage('research-brief');
  } else {
    setCurrentStage('prospect-call');
  }
};

// In your stage rendering
{currentStage === 'research-brief' && generatedPersona && (
  <ResearchBriefModal
    persona={generatedPersona}
    onStartCall={() => setCurrentStage('prospect-call')}
    onCancel={() => setCurrentStage('persona-generation')}
  />
)}
```

### Option C: Add Toggle for Advanced Users

Allow users to skip the research brief:

```typescript
const [showResearchOption, setShowResearchOption] = useState(true);

// In settings or UI
<label>
  <input 
    type="checkbox" 
    checked={showResearchOption}
    onChange={(e) => setShowResearchOption(e.target.checked)}
  />
  Show Research Brief Before Calls
</label>

// In flow
if (persona.research_brief && showResearchOption) {
  setCurrentStage('research-brief');
} else {
  setCurrentStage('prospect-call');
}
```

## Expected Behavior

### With Research Brief:
1. User generates persona
2. Research brief modal appears
3. User reads: online presence, opportunities, red flags, talking points
4. User clicks "Start Call"
5. Call begins with persona expecting research references

### Without Research Brief (fallback):
1. User generates persona
2. Call starts immediately (no modal)
3. Persona behaves as before

## Testing

Generate a persona and check that:
- ✅ Research brief appears before call
- ✅ Talking points are relevant to the business
- ✅ When you reference research, persona acknowledges it
- ✅ Example: "I saw your reviews are great" → Persona: "Thanks! We really focus on customer service"

## Customization

### Styling
The ResearchBriefModal uses Tailwind CSS. Customize colors in:
- Header gradient: `from-blue-600 to-blue-700`
- Opportunity color: `text-green-700`
- Warning color: `text-orange-700`
- Start button: `bg-green-600`

### Content
Modify the backend prompt in `gpt4o_service.py` to generate different types of research insights.

## Future Enhancements

### Phase 2: Interactive Research
- User does the research themselves
- Click through fake websites/social media
- Write their own notes
- AI grades research quality

### Phase 3: Research Scoring
- Better research → Higher starting rapport
- Poor research → Persona is skeptical
- Missing obvious details → Penalty to trust score
