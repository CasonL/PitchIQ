/**
 * Industry-specific business pain points for more realistic sales training scenarios
 * Each industry has unique challenges that products/services might address
 */

export const getIndustryPainPoints = (industry: string): string[] => {
  // Define pain points by industry
  const painPointsByIndustry: Record<string, string[]> = {
    "Technology": [
      "Legacy system integration challenges",
      "Rapid technological obsolescence",
      "Cybersecurity vulnerabilities and threats",
      "High cost of technical talent acquisition",
      "Data storage and management complexity",
      "Keeping pace with AI and automation advancements"
    ],
    "Healthcare": [
      "Rising operational costs amid reimbursement challenges",
      "Patient data security and HIPAA compliance",
      "Staff shortages and burnout",
      "Inefficient patient information management",
      "Regulatory compliance complexity",
      "Balancing quality care with cost constraints"
    ],
    "Financial Services": [
      "Regulatory compliance burdens and costs",
      "Digital transformation pressure from fintech disruptors",
      "Cybersecurity and fraud prevention challenges",
      "Customer retention in a competitive market",
      "Legacy system modernization costs",
      "Data privacy and security risks"
    ],
    "Manufacturing": [
      "Supply chain disruptions and volatility",
      "Rising material and energy costs",
      "Labor shortages and workforce skill gaps",
      "Production inefficiencies and waste",
      "Quality control consistency challenges",
      "Difficulty implementing Industry 4.0 technologies"
    ],
    "Retail": [
      "E-commerce competition eroding margins",
      "Inventory management inefficiencies",
      "Changing consumer shopping behaviors",
      "Supply chain unpredictability",
      "High customer acquisition costs",
      "Labor costs and turnover challenges"
    ],
    "Energy": [
      "Regulatory compliance with environmental standards",
      "Pressure to transition to renewable sources",
      "Grid infrastructure modernization costs",
      "Resource exploration and production challenges",
      "Operational efficiency in aging facilities",
      "Market price volatility and forecasting difficulties"
    ],
    "Education": [
      "Budget constraints amid rising operational costs",
      "Technology integration and digital learning barriers",
      "Student retention and engagement challenges",
      "Administrative burden and inefficient processes",
      "Recruiting and retaining qualified staff",
      "Meeting diverse learning needs with limited resources"
    ],
    "Consulting": [
      "Client acquisition in competitive markets",
      "Scaling service delivery efficiently",
      "Knowledge management and transfer challenges",
      "Pressure to demonstrate ROI and value",
      "Talent retention in a competitive market",
      "Adapting services to rapidly changing business environments"
    ],
    "Marketing": [
      "Measuring campaign effectiveness and ROI",
      "Rising customer acquisition costs",
      "Data privacy regulations limiting targeting options",
      "Content saturation and diminishing engagement",
      "Keeping pace with platform algorithm changes",
      "Attribution modeling complexity across channels"
    ],
    "Construction": [
      "Material cost volatility and supply disruptions",
      "Skilled labor shortages and rising wages",
      "Project timeline delays and budget overruns",
      "Regulatory compliance complexity",
      "Safety management and liability concerns",
      "Inefficient coordination between stakeholders"
    ],
    "Real Estate": [
      "Market volatility and unpredictable valuation",
      "Increasing property management costs",
      "Changing tenant/buyer preferences",
      "Regulatory compliance across jurisdictions",
      "Technology adoption lags creating inefficiencies",
      "Competition from digital-first platforms"
    ],
    "Transportation": [
      "Fuel price volatility and environmental regulations",
      "Driver shortages and workforce challenges",
      "Fleet maintenance and replacement costs",
      "Last-mile delivery efficiency challenges",
      "Route optimization complexity",
      "Increasing customer service expectations"
    ],
    "Hospitality": [
      "Labor shortages and high turnover rates",
      "Inconsistent demand patterns affecting staffing",
      "Online review management and reputation challenges",
      "Rising operational and property costs",
      "Competitive pricing pressure from aggregators",
      "Technology integration with legacy systems"
    ],
    "Media": [
      "Declining traditional revenue streams",
      "Digital platform algorithm dependence",
      "Content monetization challenges",
      "Audience fragmentation across channels",
      "Rising production costs amid budget constraints",
      "Competition from user-generated content"
    ],
    "Legal": [
      "Client fee pressure and alternative billing demands",
      "Knowledge management inefficiencies",
      "Document review and processing bottlenecks",
      "Talent recruitment and retention challenges",
      "Technology adoption barriers in traditional practices",
      "Case management and workflow inefficiencies"
    ]
  };
  
  // Default pain points for industries not specifically listed
  const defaultPainPoints = [
    "Operational inefficiencies increasing costs",
    "Difficulty adapting to market changes",
    "Resource constraints limiting growth",
    "Customer retention challenges",
    "Data management and security concerns",
    "Competitive pressure on margins"
  ];
  
  // Get industry-specific pain points or use defaults
  const industrySpecific = painPointsByIndustry[industry] || defaultPainPoints;
  
  // Randomly select 3-4 pain points for variety
  const shuffled = [...industrySpecific].sort(() => 0.5 - Math.random());
  const numPainPoints = 3 + Math.floor(Math.random() * 2); // 3-4 pain points
  
  return shuffled.slice(0, numPainPoints);
};
