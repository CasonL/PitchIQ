# Demographic-Aware Name Service
# Prevents AI bias toward common names like "Sarah" by providing extensive, 
# culturally-appropriate name pools for persona generation

import random
from typing import Dict, List, Tuple

class DemographicNameService:
    """
    Service for generating culturally-appropriate, diverse names for personas.
    Prevents AI bias toward overused names like "Sarah" by using extensive pools.
    """
    
    # Extensive name pools organized by cultural background and gender
    NAME_POOLS = {
        "american_professional": {
            "female": {
                "first": [
                    "Alexis", "Brianna", "Chloe", "Diana", "Elena", "Fiona", "Grace", "Haley", 
                    "Isabella", "Jasmine", "Kimberly", "Lauren", "Maya", "Nicole", "Olivia", 
                    "Paige", "Quinn", "Rachel", "Sophia", "Taylor", "Uma", "Victoria", "Whitney",
                    "Ximena", "Yasmin", "Zoe", "Aria", "Brooke", "Caitlin", "Danielle", "Emma",
                    "Faith", "Gabrielle", "Hannah", "Iris", "Jenna", "Kayla", "Leah", "Megan",
                    "Natalie", "Peyton", "Reagan", "Samantha", "Tiffany", "Vanessa", "Wendy"
                ],
                "last": [
                    "Anderson", "Brooks", "Carter", "Davis", "Edwards", "Foster", "Garcia", 
                    "Harrison", "Jackson", "Kennedy", "Lewis", "Martinez", "Nelson", "Parker",
                    "Reynolds", "Stevens", "Thompson", "Walker", "Williams", "Young", "Bennett",
                    "Collins", "Fletcher", "Hughes", "Mitchell", "Phillips", "Roberts", "Turner"
                ]
            },
            "male": {
                "first": [
                    "Adrian", "Blake", "Cameron", "Derek", "Ethan", "Felix", "Gabriel", "Hunter",
                    "Ian", "Jordan", "Kyle", "Logan", "Marcus", "Nathan", "Owen", "Preston",
                    "Quinton", "Ryan", "Sebastian", "Trevor", "Victor", "Wesley", "Xavier",
                    "Zachary", "Aaron", "Brandon", "Colin", "Dominic", "Evan", "Garrett",
                    "Harrison", "Isaiah", "Jared", "Keith", "Lance", "Mason", "Noah", "Parker"
                ],
                "last": [
                    "Adams", "Baker", "Clark", "Duncan", "Ellis", "Ford", "Grant", "Hayes",
                    "Irving", "Johnson", "King", "Lee", "Morgan", "Oliver", "Price", "Quinn",
                    "Reed", "Shaw", "Taylor", "Vaughn", "Ward", "Young", "Bennett", "Cooper",
                    "Fisher", "Gray", "Hall", "Jenkins", "Murphy", "Patterson", "Ross", "Stone"
                ]
            }
        },
        
        "hispanic_latino": {
            "female": {
                "first": [
                    "Adriana", "Beatriz", "Carmen", "Daniela", "Esperanza", "Fernanda", "Gabriela",
                    "Isabella", "Jimena", "Karla", "Lucia", "Marisol", "Natalia", "Paloma",
                    "Raquel", "Sofia", "Teresa", "Valentina", "Ximena", "Yolanda", "Zara",
                    "Alejandra", "Bianca", "Catalina", "Dolores", "Estrella", "Fatima", "Gloria"
                ],
                "last": [
                    "Alvarez", "Castillo", "Delgado", "Espinoza", "Fernandez", "Gonzalez", "Hernandez",
                    "Jimenez", "Lopez", "Martinez", "Nunez", "Ortega", "Perez", "Ramirez", "Sanchez",
                    "Torres", "Valdez", "Vargas", "Zuniga", "Aguilar", "Campos", "Dominguez", "Flores"
                ]
            },
            "male": {
                "first": [
                    "Alejandro", "Benjamin", "Carlos", "Diego", "Eduardo", "Fernando", "Gustavo",
                    "Hector", "Ignacio", "Javier", "Leonardo", "Miguel", "Nicolas", "Oscar",
                    "Pablo", "Ricardo", "Santiago", "Teodoro", "Vicente", "Xavier", "Yadiel",
                    "Andres", "Bruno", "Cesar", "Domingo", "Emilio", "Francisco", "Gonzalo"
                ],
                "last": [
                    "Acosta", "Bautista", "Cruz", "Diaz", "Estrada", "Fuentes", "Garcia", "Herrera",
                    "Ibarra", "Juarez", "Lara", "Mendez", "Navarro", "Ochoa", "Pena", "Rios",
                    "Silva", "Trujillo", "Vega", "Zamora", "Cabrera", "Duran", "Guerrero", "Morales"
                ]
            }
        },
        
        "asian_american": {
            "female": {
                "first": [
                    "Aiko", "Bella", "Chloe", "Diana", "Emma", "Grace", "Hana", "Iris", "Joy",
                    "Kira", "Luna", "Mia", "Nina", "Priya", "Rina", "Stella", "Tina", "Vera",
                    "Yuki", "Zara", "Anaya", "Celia", "Devi", "Emi", "Faye", "Gina", "Hope"
                ],
                "last": [
                    "Chen", "Kim", "Lee", "Wang", "Zhang", "Liu", "Yang", "Wu", "Huang", "Zhou",
                    "Li", "Zhao", "Singh", "Patel", "Kumar", "Shah", "Gupta", "Sharma", "Tanaka",
                    "Sato", "Suzuki", "Takahashi", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi"
                ]
            },
            "male": {
                "first": [
                    "Alex", "Ben", "Chen", "David", "Eric", "Felix", "Gary", "Henry", "Ivan",
                    "Jin", "Kevin", "Leo", "Marcus", "Nathan", "Oscar", "Peter", "Ray", "Sam",
                    "Tony", "Victor", "Wei", "Xavier", "Yuki", "Zen", "Adrian", "Bruce", "Calvin"
                ],
                "last": [
                    "Chang", "Kang", "Lim", "Wong", "Yoon", "Choi", "Park", "Jang", "Han", "Bae",
                    "Lam", "Ng", "Ho", "Leung", "Chan", "Cheng", "Tong", "Yip", "Reddy", "Joshi",
                    "Mehta", "Agarwal", "Bansal", "Chopra", "Malhotra", "Kapoor", "Arora", "Bhatia"
                ]
            }
        },
        
        "african_american": {
            "female": {
                "first": [
                    "Aaliyah", "Brianna", "Candice", "Destiny", "Ebony", "Faith", "Gabrielle",
                    "Halle", "India", "Jasmine", "Keisha", "Latoya", "Maya", "Nia", "Octavia",
                    "Precious", "Queen", "Rhonda", "Simone", "Tasha", "Unique", "Valencia",
                    "Whitney", "Yvonne", "Zara", "Amara", "Camille", "Diamond", "Essence"
                ],
                "last": [
                    "Washington", "Jefferson", "Jackson", "Johnson", "Williams", "Brown", "Davis",
                    "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Harris", "Martin",
                    "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee"
                ]
            },
            "male": {
                "first": [
                    "Andre", "Brandon", "Calvin", "Darius", "Elijah", "Franklin", "Gregory",
                    "Hassan", "Isaiah", "Jamal", "Kevin", "Lamar", "Marcus", "Nathan", "Omar",
                    "Quincy", "Rashad", "Sterling", "Terrell", "Vernon", "Xavier", "Zion",
                    "Antoine", "Cedric", "Dexter", "Emmanuel", "Frederick", "Garrett", "Howard"
                ],
                "last": [
                    "Allen", "Bell", "Cooper", "Dixon", "Evans", "Foster", "Green", "Hall",
                    "Hill", "Jones", "King", "Long", "Mitchell", "Nelson", "Perry", "Reed",
                    "Scott", "Turner", "Walker", "White", "Young", "Butler", "Coleman", "Freeman"
                ]
            }
        },
        
        "european_american": {
            "female": {
                "first": [
                    "Anastasia", "Bridget", "Catherine", "Delphine", "Elena", "Francesca", "Greta",
                    "Helena", "Ingrid", "Juliana", "Katarina", "Lucia", "Margot", "Natasha",
                    "Ophelia", "Petra", "Quinn", "Rosalie", "Stella", "Tatiana", "Ursula",
                    "Vivienne", "Willa", "Yvette", "Zara", "Astrid", "Bianca", "Celeste", "Daria"
                ],
                "last": [
                    "Andersson", "Becker", "Carlson", "Dubois", "Eriksson", "Fischer", "Gustafsson",
                    "Hansen", "Ivanov", "Johansson", "Kozlov", "Larsson", "Mueller", "Nielsen",
                    "Olsen", "Petrov", "Romano", "Schmidt", "Tran", "Volkov", "Weber", "Zimmerman"
                ]
            },
            "male": {
                "first": [
                    "Alessandro", "Benedict", "Constantin", "Dmitri", "Emil", "Frederik", "Giovanni",
                    "Henrik", "Ivan", "Jakob", "Klaus", "Lorenzo", "Matthias", "Nikolai", "Otto",
                    "Pietro", "Rafael", "Stefan", "Teodor", "Viktor", "Wilhelm", "Xavier", "Yann", "Zander"
                ],
                "last": [
                    "Albrecht", "Bergmann", "Christensen", "Dvorak", "Engstrom", "Fontana", "Grimm",
                    "Hoffman", "Ivanovic", "Jorgensen", "Kellner", "Lindqvist", "Mancini", "Novak",
                    "Olsson", "Popovic", "Rossi", "Schneider", "Thomsen", "Varga", "Wagner", "Ziegler"
                ]
            }
        }
    }
    
    # Recently used names to avoid repetition
    _recently_used = set()
    _max_recent_size = 100
    
    @classmethod
    def get_name_by_demographics(cls, 
                                cultural_background: str = "american_professional",
                                gender: str = "female",
                                avoid_recent: bool = True) -> Tuple[str, str]:
        """
        Generate a culturally-appropriate name based on demographics.
        
        Args:
            cultural_background: Cultural/ethnic background
            gender: Gender for name selection
            avoid_recent: Whether to avoid recently used names
            
        Returns:
            Tuple of (first_name, last_name)
        """
        # Default to american_professional if background not found
        if cultural_background not in cls.NAME_POOLS:
            cultural_background = "american_professional"
        
        # Default to female if gender not found
        if gender not in cls.NAME_POOLS[cultural_background]:
            gender = "female"
        
        pool = cls.NAME_POOLS[cultural_background][gender]
        
        # Get available names (not recently used)
        first_names = pool["first"]
        last_names = pool["last"]
        
        if avoid_recent:
            # Filter out recently used names
            available_first = [name for name in first_names if name not in cls._recently_used]
            available_last = [name for name in last_names if name not in cls._recently_used]
            
            # If we've used too many names, reset the recent list
            if not available_first or not available_last:
                cls._recently_used.clear()
                available_first = first_names
                available_last = last_names
        else:
            available_first = first_names
            available_last = last_names
        
        # Select random names
        first_name = random.choice(available_first)
        last_name = random.choice(available_last)
        
        # Track usage
        if avoid_recent:
            cls._recently_used.add(first_name)
            cls._recently_used.add(last_name)
            
            # Limit recent list size
            if len(cls._recently_used) > cls._max_recent_size:
                # Remove oldest entries (simplified approach)
                excess = len(cls._recently_used) - cls._max_recent_size
                cls._recently_used = set(list(cls._recently_used)[excess:])
        
        return first_name, last_name
    
    @classmethod
    def get_name_for_persona_context(cls, 
                                   industry: str = None,
                                   role: str = None,
                                   region: str = None) -> Tuple[str, str]:
        """
        Generate name based on business context and demographics.
        
        Args:
            industry: Industry context
            role: Professional role
            region: Geographic region
            
        Returns:
            Tuple of (first_name, last_name)
        """
        # Determine cultural background based on context
        cultural_background = "american_professional"  # default
        gender = random.choice(["male", "female"])
        
        # Adjust based on region/industry context
        if region:
            region_lower = region.lower()
            if any(term in region_lower for term in ["california", "silicon valley", "tech hub"]):
                # More diverse in tech hubs
                cultural_background = random.choice([
                    "american_professional", "asian_american", "hispanic_latino", "european_american"
                ])
            elif any(term in region_lower for term in ["miami", "texas", "southwest"]):
                # Higher Hispanic representation
                cultural_background = random.choice([
                    "american_professional", "hispanic_latino", "hispanic_latino"  # weighted
                ])
        
        return cls.get_name_by_demographics(cultural_background, gender)
    
    @classmethod
    def generate_diverse_name_suggestions(cls, count: int = 5) -> List[Dict[str, str]]:
        """
        Generate a diverse set of name suggestions from different backgrounds.
        
        Args:
            count: Number of names to generate
            
        Returns:
            List of name dictionaries with background info
        """
        suggestions = []
        backgrounds = list(cls.NAME_POOLS.keys())
        
        for i in range(count):
            background = backgrounds[i % len(backgrounds)]
            gender = random.choice(["male", "female"])
            first, last = cls.get_name_by_demographics(background, gender)
            
            suggestions.append({
                "first_name": first,
                "last_name": last,
                "full_name": f"{first} {last}",
                "cultural_background": background,
                "gender": gender
            })
        
        return suggestions 