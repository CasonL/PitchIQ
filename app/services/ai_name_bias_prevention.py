"""
AI Name Bias Prevention Service

This service implements strategies to prevent AI models from gravitating toward 
overused names like "Sarah", "Michael", "Alex", etc. in persona generation.
"""

import random
from typing import Dict, List, Set, Optional
from app.services.demographic_names import DemographicNameService

class AINameBiasPrevention:
    """
    Implements anti-bias strategies for AI name generation to ensure diversity
    and prevent overuse of common names.
    """
    
    # Names that AI models gravitate toward (BANNED LIST)
    BANNED_OVERUSED_NAMES = {
        "sarah", "michael", "jennifer", "david", "lisa", "john", "alex", "morgan", 
        "emily", "james", "chris", "jessica", "matt", "amanda", "ryan", "michelle",
        "robert", "daniel", "laura", "kevin", "karen", "mark", "susan", "paul",
        "nancy", "jason", "helen", "steven", "donna", "edward", "carol", "ronald",
        "sharon", "matthew", "kimberly", "joshua", "deborah", "kenneth", "dorothy",
        "joseph", "lisa", "thomas", "nancy", "charles", "karen", "christopher"
    }
    
    # Track usage patterns to identify emerging bias
    _name_usage_tracker = {}
    _session_names = set()
    
    @classmethod
    def get_bias_free_name(cls, 
                          cultural_background: str = "american_professional",
                          gender: str = "female",
                          industry_context: str = None,
                          persona_role: str = None) -> tuple[str, str]:
        """
        Generate a name that avoids AI bias patterns.
        
        Args:
            cultural_background: Cultural background for name selection
            gender: Gender for name selection
            industry_context: Industry context for appropriate naming
            persona_role: Role context for professional appropriateness
            
        Returns:
            Tuple of (first_name, last_name) guaranteed to avoid bias
        """
        attempts = 0
        max_attempts = 10
        
        while attempts < max_attempts:
            first_name, last_name = DemographicNameService.get_name_by_demographics(
                cultural_background, gender, avoid_recent=True
            )
            
            # Check against banned names
            if (first_name.lower() not in cls.BANNED_OVERUSED_NAMES and 
                last_name.lower() not in cls.BANNED_OVERUSED_NAMES):
                
                # Track usage to identify new bias patterns
                cls._track_name_usage(first_name, last_name)
                
                # Add to session tracker
                cls._session_names.add(f"{first_name} {last_name}")
                
                return first_name, last_name
            
            attempts += 1
        
        # Fallback: Generate from backup pools if all attempts failed
        return cls._get_backup_name(cultural_background, gender)
    
    @classmethod
    def _track_name_usage(cls, first_name: str, last_name: str):
        """Track name usage to identify emerging bias patterns."""
        full_name = f"{first_name} {last_name}"
        
        if full_name not in cls._name_usage_tracker:
            cls._name_usage_tracker[full_name] = 0
        
        cls._name_usage_tracker[full_name] += 1
        
        # Alert if a name is being used too frequently (potential new bias)
        if cls._name_usage_tracker[full_name] > 5:
            print(f"WARNING: Name '{full_name}' used {cls._name_usage_tracker[full_name]} times - potential bias emerging")
    
    @classmethod
    def _get_backup_name(cls, cultural_background: str, gender: str) -> tuple[str, str]:
        """Backup name generation when all primary attempts fail."""
        backup_pools = {
            "american_professional": {
                "female": [
                    ("Alexis", "Brooks"), ("Diana", "Foster"), ("Maya", "Carter"),
                    ("Elena", "Harrison"), ("Sophia", "Reynolds"), ("Paige", "Stevens"),
                    ("Kimberly", "Edwards"), ("Whitney", "Bennett"), ("Vanessa", "Collins")
                ],
                "male": [
                    ("Adrian", "Duncan"), ("Blake", "Hayes"), ("Cameron", "Price"),
                    ("Felix", "Shaw"), ("Marcus", "Stone"), ("Preston", "Ward"),
                    ("Sebastian", "Cooper"), ("Trevor", "Fisher"), ("Xavier", "Gray")
                ]
            }
        }
        
        if cultural_background in backup_pools and gender in backup_pools[cultural_background]:
            return random.choice(backup_pools[cultural_background][gender])
        
        # Ultimate fallback
        return ("Unique", "Person")
    
    @classmethod
    def validate_name_diversity(cls, generated_names: List[str]) -> Dict[str, any]:
        """
        Analyze a list of generated names for diversity and bias patterns.
        
        Args:
            generated_names: List of full names to analyze
            
        Returns:
            Dictionary with diversity metrics and recommendations
        """
        analysis = {
            "total_names": len(generated_names),
            "unique_names": len(set(generated_names)),
            "diversity_score": len(set(generated_names)) / len(generated_names) if generated_names else 0,
            "banned_names_found": [],
            "repeated_names": {},
            "recommendations": []
        }
        
        # Check for banned names
        for name in generated_names:
            name_parts = name.lower().split()
            for part in name_parts:
                if part in cls.BANNED_OVERUSED_NAMES:
                    analysis["banned_names_found"].append(name)
        
        # Check for repetition
        name_counts = {}
        for name in generated_names:
            name_counts[name] = name_counts.get(name, 0) + 1
        
        analysis["repeated_names"] = {name: count for name, count in name_counts.items() if count > 1}
        
        # Generate recommendations
        if analysis["diversity_score"] < 0.8:
            analysis["recommendations"].append("Increase name diversity - too many repeated names")
        
        if analysis["banned_names_found"]:
            analysis["recommendations"].append(f"Remove banned overused names: {analysis['banned_names_found']}")
        
        if not analysis["recommendations"]:
            analysis["recommendations"].append("Name diversity looks good!")
        
        return analysis
    
    @classmethod
    def get_session_summary(cls) -> Dict[str, any]:
        """Get summary of names used in current session."""
        return {
            "session_names_count": len(cls._session_names),
            "session_names": list(cls._session_names),
            "overall_usage_tracker": dict(cls._name_usage_tracker),
            "potential_bias_names": [name for name, count in cls._name_usage_tracker.items() if count > 3]
        }
    
    @classmethod
    def reset_session_tracking(cls):
        """Reset session tracking for new session."""
        cls._session_names.clear()
    
    @classmethod
    def add_to_banned_list(cls, names: List[str]):
        """Add names to the banned list if they show bias patterns."""
        for name in names:
            cls.BANNED_OVERUSED_NAMES.add(name.lower()) 