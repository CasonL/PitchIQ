/**
 * InfoExtraction.ts
 * Extract name and company from user speech
 * Used by Marcus to gate conversations on required information
 */

/**
 * Extract user's name from their speech
 * Looks for common introduction patterns
 */
export function extractName(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  // Pattern 1: "I'm [Name]" or "I am [Name]" (stop before company indicators)
  const imPattern = /i'?m\s+([a-z]+(?:\s+[a-z]+)?)(?:\s+(?:from|with|at|calling)|\.|,|$)/i;
  const imMatch = text.match(imPattern);
  if (imMatch) {
    const name = imMatch[1].trim();
    if (isValidName(name)) return capitalizeWords(name);
  }
  
  // Pattern 2: "This is [Name]" or "It's [Name]" (stop before company indicators)
  const thisIsPattern = /(?:this is|it'?s)\s+([a-z]+(?:\s+[a-z]+)?)(?:\s+(?:from|with|at|calling)|\.|,|$)/i;
  const thisIsMatch = text.match(thisIsPattern);
  if (thisIsMatch) {
    const name = thisIsMatch[1].trim();
    if (isValidName(name)) return capitalizeWords(name);
  }
  
  // Pattern 3: "My name is [Name]"
  const myNamePattern = /my name'?s?\s+(?:is\s+)?([a-z]+(?:\s+[a-z]+)?)/i;
  const myNameMatch = text.match(myNamePattern);
  if (myNameMatch) {
    const name = myNameMatch[1].trim();
    if (isValidName(name)) return capitalizeWords(name);
  }
  
  // Pattern 4: "[Name] speaking" or "[Name] here"
  const speakingPattern = /^([a-z]+(?:\s+[a-z]+)?)\s+(?:speaking|here)/i;
  const speakingMatch = text.match(speakingPattern);
  if (speakingMatch) {
    const name = speakingMatch[1].trim();
    if (isValidName(name)) return capitalizeWords(name);
  }
  
  return undefined;
}

/**
 * Extract company name from user speech
 * Looks for common company mention patterns
 */
export function extractCompany(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  // Pattern 1: "I'm with [Company]" or "I'm from [Company]"
  const withPattern = /i'?m\s+(?:with|from)\s+([a-z0-9][a-z0-9\s&.,'-]+?)(?:\.|,|$|\s+(?:and|in|based|located))/i;
  const withMatch = text.match(withPattern);
  if (withMatch) {
    const company = withMatch[1].trim();
    if (isValidCompany(company)) return capitalizeWords(company);
  }
  
  // Pattern 2: "I work at/for [Company]"
  const workPattern = /i\s+work\s+(?:at|for|with)\s+([a-z0-9][a-z0-9\s&.,'-]+?)(?:\.|,|$|\s+(?:and|in|based|located))/i;
  const workMatch = text.match(workPattern);
  if (workMatch) {
    const company = workMatch[1].trim();
    if (isValidCompany(company)) return capitalizeWords(company);
  }
  
  // Pattern 3: "At [Company]" (beginning of sentence)
  const atPattern = /^at\s+([a-z0-9][a-z0-9\s&.,'-]+?)(?:\.|,|$|\s+(?:we|i|and|in))/i;
  const atMatch = text.match(atPattern);
  if (atMatch) {
    const company = atMatch[1].trim();
    if (isValidCompany(company)) return capitalizeWords(company);
  }
  
  // Pattern 4: "Calling from [Company]"
  const callingPattern = /calling\s+from\s+([a-z0-9][a-z0-9\s&.,'-]+?)(?:\.|,|$|\s+(?:and|in|based|located))/i;
  const callingMatch = text.match(callingPattern);
  if (callingMatch) {
    const company = callingMatch[1].trim();
    if (isValidCompany(company)) return capitalizeWords(company);
  }
  
  // Pattern 5: "I represent [Company]"
  const representPattern = /i\s+represent\s+([a-z0-9][a-z0-9\s&.,'-]+?)(?:\.|,|$|\s+(?:and|in|based|located))/i;
  const representMatch = text.match(representPattern);
  if (representMatch) {
    const company = representMatch[1].trim();
    if (isValidCompany(company)) return capitalizeWords(company);
  }
  
  return undefined;
}

/**
 * Validate extracted name is not a common filler word
 */
function isValidName(name: string): boolean {
  const lowerName = name.toLowerCase();
  
  // Filter out common false positives
  const invalidNames = [
    'just', 'sorry', 'great', 'really', 'pretty', 'very',
    'good', 'fine', 'okay', 'yeah', 'yep', 'nope', 'sure',
    'calling', 'speaking', 'talking', 'here', 'there',
    'actually', 'basically', 'literally', 'honestly',
    'doing', 'doing pretty', 'doing well', 'doing good',
    'going', 'been', 'getting', 'having', 'making'
  ];
  
  if (invalidNames.includes(lowerName)) return false;
  
  // Filter out phrases (2+ words starting with common verbs)
  if (/^(doing|going|been|getting|having|making)\s/i.test(name)) return false;
  
  // Must be 2+ characters
  if (name.length < 2) return false;
  
  // Must start with letter
  if (!/^[a-z]/i.test(name)) return false;
  
  return true;
}

/**
 * Validate extracted company is not a common false positive
 */
function isValidCompany(company: string): boolean {
  const lowerCompany = company.toLowerCase();
  
  // Filter out common false positives
  const invalidCompanies = [
    'the', 'a', 'an', 'my', 'our', 'their', 'this', 'that',
    'here', 'there', 'town', 'city', 'area', 'place',
    'home', 'office', 'work', 'job', 'business',
    'portland', 'seattle', 'new york', 'san francisco' // Cities shouldn't be companies
  ];
  
  if (invalidCompanies.includes(lowerCompany)) return false;
  
  // Must be 2+ characters
  if (company.length < 2) return false;
  
  // Can't be just numbers
  if (/^\d+$/.test(company)) return false;
  
  return true;
}

/**
 * Capitalize first letter of each word
 */
function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
