$content = Get-Content -Path AISummaryCard.tsx -Raw

# First, let's create a simple approach that handles all 6 instances.
# We'll search for the pattern and replace it with a fixed template, keeping the original rotation variable.

# The regex will match the entire block that needs to be replaced
# We'll capture the indentation and which rotation variable (isOpen or isChatSectionOpen) is used

$pattern = '(\s*){/\* Clickable Indicator Arrow - Only if expandable and not mastered \*/}\r?\n(\s*){canExpand && !isMastered && \(\r?\n(\s*)<div[^>]*>\r?\n(\s*)<svg[^>]*\r?\n[^}]*className={`transition-transform duration-200 \${(isOpen|isChatSectionOpen) \? .{1,30}}\`}[^>]*>\r?\n[^}]*\r?\n(\s*)</svg>\r?\n(\s*)</div>\r?\n(\s*)\)}'

# Create the replacement function
$content = [regex]::Replace($content, $pattern, {
    param($m)
    
    $indent1 = $m.Groups[1].Value
    $indent2 = $m.Groups[2].Value
    $indent3 = $m.Groups[3].Value
    $indent4 = $m.Groups[4].Value
    $rotationVar = $m.Groups[5].Value
    $indent5 = $m.Groups[6].Value
    $indent6 = $m.Groups[7].Value
    $indent7 = $m.Groups[8].Value
    
    # Build the replacement with the original indentation preserved
    @"
$indent1{/* Clickable Indicator Arrow */}
$indent2{(() => {
$indent2  const canExpand = true; // Set default value based on your requirements
$indent2  return canExpand && (
$indent3<div className="flex justify-center items-center pt-1 opacity-70">
$indent4<svg 
$indent4  xmlns="http://www.w3.org/2000/svg" 
$indent4  width="16" 
$indent4  height="16" 
$indent4  viewBox="0 0 24 24" 
$indent4  fill="none" 
$indent4  stroke="currentColor" 
$indent4  strokeWidth="2" 
$indent4  strokeLinecap="round" 
$indent4  strokeLinejoin="round"
$indent4  className={`transition-transform duration-200 \${$rotationVar ? 'rotate-180' : ''}`}
$indent4>
$indent4  <polyline points="6 9 12 15 18 9"></polyline>
$indent5</svg>
$indent6</div>
$indent2  );
$indent2})()}
"@
})

# Save the modified content back to the file
$content | Set-Content -Path AISummaryCard.tsx

Write-Host "Fix completed. Please check AISummaryCard.tsx for updates." 