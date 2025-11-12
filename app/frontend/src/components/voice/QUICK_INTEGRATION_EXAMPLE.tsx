/**
 * QUICK INTEGRATION EXAMPLE
 * 
 * How to add Research Brief Modal to SamOrchestratorPage
 * 
 * STEP 1: Add import at the top of SamOrchestratorPage.tsx
 */

import { ResearchBriefModal } from '@/components/voice/ResearchBriefModal';

/**
 * STEP 2: Add state for showing the modal (add this with other useState declarations)
 */

const [showResearchBrief, setShowResearchBrief] = useState(false);

/**
 * STEP 3: Replace the "Start Practice Call" button click handler
 * 
 * FIND THIS (around line 418):
 */

// OLD CODE:
<button
  type="button"
  onClick={() => setCallStarted(true)}  // <-- Replace this line
  className="w-full max-w-sm px-8 py-4 bg-red-600 hover:bg-red-700..."
>
  Start Practice Call
</button>

// NEW CODE:
<button
  type="button"
  onClick={() => {
    // Check if persona has research brief
    if (personaDebug?.mapped?.research_brief) {
      setShowResearchBrief(true); // Show modal first
    } else {
      setCallStarted(true); // No brief, start directly
    }
  }}
  className="w-full max-w-sm px-8 py-4 bg-red-600 hover:bg-red-700..."
>
  Start Practice Call
</button>

/**
 * STEP 4: Add the modal component right before the closing </div> of the return statement
 * (add this at the end of the component, before the final </div>)
 */

{/* Research Brief Modal */}
{showResearchBrief && personaDebug?.mapped && (
  <ResearchBriefModal
    persona={personaDebug.mapped}
    onStartCall={() => {
      setShowResearchBrief(false);
      setCallStarted(true);
    }}
    onCancel={() => {
      setShowResearchBrief(false);
    }}
  />
)}

/**
 * COMPLETE EXAMPLE - Full component structure would look like:
 */

const SamOrchestratorPage: React.FC = () => {
  // ... existing state ...
  const [showResearchBrief, setShowResearchBrief] = useState(false);
  
  return (
    <div className="min-h-screen...">
      {/* All your existing stages */}
      
      {/* Stage 3: Review Persona & Start Call */}
      {personaDebug?.mapped && !callStarted && (
        <div className="bg-white rounded-2xl...">
          <PersonaLinkedProfile persona={personaDebug.mapped} />
          
          <button
            onClick={() => {
              if (personaDebug?.mapped?.research_brief) {
                setShowResearchBrief(true);
              } else {
                setCallStarted(true);
              }
            }}
            className="...">
            Start Practice Call
          </button>
        </div>
      )}
      
      {/* Stage 4: Active Call */}
      {callStarted && personaDebug?.mapped && (
        <ProspectAgent persona={personaDebug.mapped} />
      )}
      
      {/* Research Brief Modal - Shows between Stage 3 and 4 */}
      {showResearchBrief && personaDebug?.mapped && (
        <ResearchBriefModal
          persona={personaDebug.mapped}
          onStartCall={() => {
            setShowResearchBrief(false);
            setCallStarted(true);
          }}
          onCancel={() => {
            setShowResearchBrief(false);
          }}
        />
      )}
    </div>
  );
};

/**
 * THAT'S IT! Now the flow will be:
 * 
 * 1. User completes Sam intro
 * 2. Persona generates (with research_brief)
 * 3. User reviews persona card
 * 4. User clicks "Start Practice Call"
 * 5. → Research Brief Modal appears ← NEW!
 * 6. User reads research, clicks "Start Call"
 * 7. Call begins
 * 
 * The persona AI will now acknowledge when they reference research:
 * - User: "I saw you offer bridal services"
 * - Persona: "Yeah, that's become one of our specialties!"
 */
