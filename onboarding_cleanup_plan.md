# Onboarding Cleanup Plan

## Summary
Based on the analysis, we have identified multiple onboarding implementations:
1. Current React-based chat onboarding in `app/frontend/src/components/dashboard/AISummaryCard.tsx`
2. Legacy HTML template-based onboarding in `app/templates/training/onboarding.html`
3. Multiple backend routes handling different onboarding APIs
4. Legacy scripts in the `utils/legacy_scripts` directory

## Files to Remove

### HTML/Template-based Onboarding
- [ ] `app/templates/training/onboarding.html` (Legacy form-based onboarding)

### Unused Backend Routes
- [ ] Remove or comment out the following routes in `app/training/routes.py`:
  - `@training_bp.route('/onboarding', methods=['GET'])`
  - `@training_bp.route('/api/training/onboarding/start', methods=['POST'])` (Keep if still used by frontend)
  - `@training_bp.route('/api/training/onboarding/update', methods=['POST'])` (Keep if still used by frontend)
  - `@training_bp.route('/api/training/onboarding/complete', methods=['POST'])` (Keep if still used by frontend)

### Legacy Scripts
- [ ] Move to `legacy_scripts` directory or delete:
  - `utils/legacy_scripts/fix_onboarding.py`
  - `utils/legacy_scripts/clean_onboarding.py`
  - `utils/legacy_scripts/fix_onboarding_final.py`

## Code to Refactor

### Keep Only the Current React-based Onboarding
- [x] `app/frontend/src/components/dashboard/AISummaryCard.tsx` - Keep this as the main onboarding implementation

### Clean Up Imports
- [ ] Remove unused imports related to onboarding in:
  - `app/auth/routes.py`
  - `app/chat/routes.py`

## Database Schema Cleanup
- [ ] Review the database schema for redundant onboarding-related columns
  - Consider keeping only necessary fields in UserProfile model:
    - `onboarding_complete` (boolean)
    - `onboarding_step` (string)

## Directories to Check for Removal
- [ ] `pitchiq-voice-orb-design-a43f76bafc0e5d8fa6138ab0896e1fc6c01a2e6d/` - Contains a duplicate ChatInterface.tsx

## Testing After Cleanup
1. Register a new user and verify the onboarding process works correctly
2. Test the paraphrase API integration in the remaining onboarding flow
3. Ensure the AI coach functionality continues to work properly after cleanup

## Implementation Steps
1. Create backup branches before making changes
2. Remove HTML template-based onboarding first
3. Clean up the backend routes
4. Remove unused scripts
5. Clean up imports and any other minor references
6. Test everything thoroughly 