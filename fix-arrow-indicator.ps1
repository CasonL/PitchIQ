# Get the contents of the file
$filePath = "AISummaryCard.tsx"
$content = Get-Content -Path $filePath -Raw

# Find and replace all instances of the pattern with an IIFE implementation
$pattern = '(?s)({/\* Clickable Indicator Arrow.*?!isMastered && \().*?(className={\`transition-transform duration-200 \${)(.*?)(\? ''rotate-180'' : ''''\}`}).*?(</svg>.*?</div>.*?\)})'

$replacement = '{/* Clickable Indicator Arrow */}
{(() => {
  const canExpand = true; // Set this value to match your requirements
  return canExpand && (
    <div className="flex justify-center items-center pt-1 opacity-70">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={`transition-transform duration-200 ${$3? ''rotate-180'' : ''}`}
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  );
})()}'

# Apply the replacement
$newContent = [regex]::Replace($content, $pattern, $replacement)

# Save the file
$newContent | Set-Content -Path $filePath

Write-Host "Fixed all instances of 'canExpand && !isMastered' in $filePath" 