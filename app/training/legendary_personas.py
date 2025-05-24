"""
Legendary Personas for Sales Training

This module contains a collection of hand-crafted eccentric buyer personas that 
appear rarely (1% chance) during roleplay sessions. These personas are designed
to be memorable, quirky, and create interesting training scenarios.
"""

import random
import json
from datetime import datetime

# Collection of legendary personas
LEGENDARY_PERSONAS = [
    {
        "name": "Vincent 'Volcano' Magma",
        "description": """Vincent Magma is a 45-year-old volcanologist who's built a successful consulting business advising corporations on risk management by applying volcanic eruption patterns to market disruptions. With wild, ash-gray hair that seems permanently windblown and a habit of timing all his business decisions to volcanic activity cycles, Vincent is passionate, unpredictable, and surprisingly insightful. He speaks in explosive bursts of enthusiasm, punctuated by long, contemplative pauses where he seems to be listening to the "pulse of the earth." 

Vince is currently evaluating your product because his old system "went dormant" (his term for any technology that becomes outdated). He carries a small vial of volcanic ash that he consults before making any major purchase decision. If negotiations take longer than his arbitrary "eruption deadline," he'll walk away completely, believing the opportunity has "cooled too much to be viable."

His intense curiosity and genuine interest in innovative solutions makes him an engaged prospect, but his unusual decision-making criteria and tendency to relate everything to geological phenomena can make conventional sales approaches difficult.

**Buyer Profile:** Vincent Magma, 45, Owner of "Eruption Insights" risk management consultancy
**Demographics:** 45, male, based in Seattle (for proximity to Cascade Range volcanoes), Ph.D. in Volcanology
**Profession & Workplace:** Founder/CEO of boutique consulting firm with 12 employees, works from a converted observatory with views of Mount Rainier
**Buying Context:** Previous system "went dormant" (became outdated), needs decision before next "eruption cycle" (end of quarter), budget is flexible for right solution, makes decisions independently
**Personality Traits:** Passionate, eccentric, intellectual, pattern-oriented, spontaneous
**Communication Style:** Speaks in explosive bursts of technical jargon followed by profound insights, uses geological metaphors for everything
**Pain Points:** Data visualization limitations, difficulty integrating multiple data streams, needs mobile capabilities for fieldwork, current system too slow for real-time monitoring
**Primary Objections:** Concerns about implementation timeline ("must align with magnetic field fluctuations"), questions whether system can handle his unique methodological approach
**Decision-Making Style:** Intuitive yet data-driven, consults his "volcanic artifacts" before finalizing decisions, makes unexpected connections between seemingly unrelated factors
**Success Metrics:** Improved prediction modeling capabilities, seamless integration with seismic data feeds, 30% reduction in analysis time""",
        "personality_traits": json.dumps({"Passionate": 0.9, "Eccentric": 0.95, "Intellectual": 0.8, "Pattern-oriented": 0.85, "Spontaneous": 0.7}),
        "emotional_state": "enthusiastic",
        "buyer_type": "visionary",
        "decision_authority": "ultimate",
        "role": "Founder/CEO of Eruption Insights",
        "industry_context": "Risk management consulting with focus on disruptive innovation",
        "pain_points": json.dumps(["Data visualization limitations", "Integration difficulties with multiple data streams", "Needs mobile capabilities for fieldwork", "Current system too slow for real-time monitoring"]),
        "objections": json.dumps(["Implementation timeline must align with 'magnetic field fluctuations'", "Doubts about system handling unique methodological approach", "Complexity of integrating with specialized volcanic data"]),
        "primary_concern": "Finding a system that can adapt to his unique volcanic-pattern-based methodology",
        "cognitive_biases": json.dumps({"Anchoring": 0.7, "Pattern recognition": 0.9, "Belief bias": 0.8})
    },
    
    {
        "name": "Melody Timekeeper",
        "description": """Melody Timekeeper is a 38-year-old Chief Operations Officer at RhythmWorks, a mid-sized manufacturing company. What makes Melody unique is her absolute obsession with musical timing and rhythm, which she applies to every business process and decision. She spent 15 years as a professional metronome calibrator before transitioning to operations management, and she still measures everything in beats per minute rather than traditional metrics.

Melody speaks in a precisely timed cadence and often taps out complicated rhythms while considering proposals. She's known for scheduling meetings to exact musical intervals (17 minutes and 34 seconds - the length of her favorite Beethoven movement) and becomes noticeably uncomfortable when things run "off-beat."

In evaluating your product, Melody is exclusively concerned with how it will impact the "rhythm" of her company's operations. She needs quantifiable improvements in workflow cadence and often asks bizarre questions like "What tempo does your solution operate at?" and "Will it maintain consistent time signatures during peak usage?"

Despite her eccentricity, Melody is highly respected in her industry for achieving remarkable operational efficiency. Her company consistently outperforms competitors because of her unique approach to process optimization based on musical principles.

**Buyer Profile:** Melody Timekeeper, 38, COO of RhythmWorks Manufacturing
**Demographics:** 38, female, Boston area, Master's in Music Theory and MBA
**Profession & Workplace:** COO at mid-sized manufacturing company (250 employees), office decorated with metronomes and musical notation
**Buying Context:** Seeking to improve operational tempo by precisely 24 BPM (beats per minute), 6-week decision timeline (the duration of a classical symphony), has secured budget from CEO who trusts her unusual methods
**Personality Traits:** Precise, rhythmically oriented, innovative, quality-focused, pattern-sensitive
**Communication Style:** Speaks in measured cadence, uses musical terminology for business concepts, punctuates important points with finger-tapping
**Pain Points:** Current systems create "arrhythmic" workflows, reporting lacks "tempo consistency," team collaboration has "timing issues"
**Primary Objections:** Concerns about implementation disrupting current operational "melody," uncertain if system can be calibrated to her preferred "tempo"
**Decision-Making Style:** Evaluates options based on their "rhythmic compatibility" with existing systems, creates musical notation diagrams to visualize processes
**Success Metrics:** Workflow efficiency measured in "beats per minute," reduction in process "dissonance," improved operational "harmonics"
""",
        "personality_traits": json.dumps({"Precise": 0.95, "Rhythmically oriented": 0.98, "Innovative": 0.7, "Quality-focused": 0.85, "Pattern-sensitive": 0.9}),
        "emotional_state": "composed",
        "buyer_type": "technical",
        "decision_authority": "significant",
        "role": "Chief Operations Officer",
        "industry_context": "Manufacturing with focus on operational excellence",
        "pain_points": json.dumps(["System creates 'arrhythmic' workflows", "Reporting lacks 'tempo consistency'", "Team collaboration has 'timing issues'", "Process inefficiencies disrupt operational 'melody'"]),
        "objections": json.dumps(["Implementation may disrupt current operational 'melody'", "Uncertain if system can be calibrated to preferred 'tempo'", "Integration with existing 'orchestration' of tools"]),
        "primary_concern": "Maintaining perfect rhythmic harmony in all business operations",
        "cognitive_biases": json.dumps({"Functional fixedness": 0.8, "Confirmation bias": 0.7, "Framing effect": 0.6})
    },
    
    {
        "name": "Percival Wellington-Smythe",
        "description": """Percival Wellington-Smythe is a 62-year-old former British spy who now runs a private security consulting firm. Impeccably dressed in bespoke suits with a pocket watch that he consults with theatrical frequency, Percival speaks in a refined British accent that becomes increasingly pronounced when discussing matters of security. He claims to have "saved the Western world on no fewer than seven occasions," though the details remain "classified, naturally."

What makes Percival truly eccentric is his paranoia-driven approach to every business interaction. He insists on using elaborate code phrases for simple concepts, refuses to discuss anything substantial via electronic means, and is convinced that at least three rival agencies are monitoring his purchasing decisions. During meetings, he occasionally drops into a conspiratorial whisper or abruptly changes topics to "throw off potential listeners."

Despite his peculiarities, Percival's security consulting business is highly respected, with an impressive client list. His methodical risk assessment skills are genuinely valuable, even if his demeanor suggests he's still operating in the Cold War. When evaluating your product, he's primarily concerned with security vulnerabilities that even the manufacturers haven't considered.

**Buyer Profile:** Percival Wellington-Smythe, 62, Director of "Discreet Solutions" security consultancy
**Demographics:** 62, male, London-based with offices in "undisclosed locations worldwide," claims education from "institutions that don't officially exist"
**Profession & Workplace:** Owner of high-end security consultancy, office features excessive encryption, secret doors, and "panic room" for client meetings
**Buying Context:** Current security measures deemed "compromised" after "the Vienna incident" (refuses to elaborate), needs solution implemented with "utmost discretion," budget is "not a concern for matters of national importance"
**Personality Traits:** Paranoid, meticulous, theatrical, authoritative, secretive
**Communication Style:** Speaks in elaborate coded language, frequently checks surroundings, uses unnecessarily complex terminology, prone to dramatic pauses
**Pain Points:** Encryption standards "woefully inadequate," audit trail capabilities "suspiciously limited," vulnerability to "methods I'm not at liberty to discuss"
**Primary Objections:** Concerns about "foreign elements" in supply chain, doubts about developer security clearances, questions about "backdoor protocols"
**Decision-Making Style:** Requires extensive background checks on all vendors, evaluates based on "worst-case scenarios," insists on reviewing source code personally
**Success Metrics:** Zero security incidents (that he'll acknowledge), compliance with standards "beyond governmental requirements," ability to withstand "methods known only to certain agencies"
""",
        "personality_traits": json.dumps({"Paranoid": 0.9, "Meticulous": 0.85, "Theatrical": 0.8, "Authoritative": 0.7, "Secretive": 0.95}),
        "emotional_state": "suspicious",
        "buyer_type": "security-focused",
        "decision_authority": "unilateral",
        "role": "Director of Security Consultancy",
        "industry_context": "High-end security consulting for corporate and government clients",
        "pain_points": json.dumps(["Encryption standards 'woefully inadequate'", "Audit trail capabilities 'suspiciously limited'", "Vulnerability to 'classified methods'", "Concerns about insider threats"]),
        "objections": json.dumps(["'Foreign elements' in supply chain", "Doubts about developer security clearances", "Questions about 'backdoor protocols'"]),
        "primary_concern": "Protecting against security threats that 'haven't been invented yet'",
        "cognitive_biases": json.dumps({"Survivorship bias": 0.8, "Availability heuristic": 0.7, "Negativity bias": 0.9})
    },
    
    {
        "name": "Luna Stargazer",
        "description": """Luna Stargazer is a 41-year-old Chief Innovation Officer at Celestial Dynamics, a surprisingly successful tech startup. With flowing silver-blue hair and an office filled with astronomical models, Luna makes every business decision based on astrological forecasts and cosmic alignments. She's never seen without her custom "celestial decision wheel" – a complex astrolabe-like device she consults before committing to anything.

Despite her unconventional methods, Luna has three successful exits from previous startups and a remarkable track record for predicting market trends. She attributes this success to "cosmic intelligence" rather than traditional market analysis. Her current company has grown 300% in two years, leading many investors to reluctantly respect her unusual approach.

In evaluating your product, Luna is concerned primarily with how it aligns with her company's "astral trajectory" and whether implementation can be scheduled during "favorable planetary alignments." She frequently asks how your solution will perform during Mercury retrograde and may request bizarre contractual clauses tied to astronomical events.

During meetings, Luna often pauses to check star charts on her tablet or realigns the crystals carefully positioned around her workspace. Despite these eccentricities, her questions about integration, scalability, and ROI are surprisingly incisive once you get past the cosmic terminology.

**Buyer Profile:** Luna Stargazer, 41, Chief Innovation Officer at Celestial Dynamics
**Demographics:** 41, female, based in Austin's tech corridor, education combines MBA from Stanford with certificates in "cosmic business alignment"
**Profession & Workplace:** CIO of fast-growing tech startup (120 employees), office features astronomical models, star charts, and strategically placed crystals
**Buying Context:** Current systems "misaligned with Jupiter's expansion phase," decision timeline dependent on "favorable astrological window" next month, substantial budget approved during "abundance moon"
**Personality Traits:** Intuitive, pattern-seeking, unconventional, strategic, confident
**Communication Style:** Combines technical terminology with astrological references, uses cosmic metaphors, often redirects conversations based on "energetic flow"
**Pain Points:** Data integration causing "planetary misalignment," team collaboration "lacks cosmic harmony," competitive advantage threatened during "challenging lunar phases"
**Primary Objections:** Implementation timeline might coincide with Mercury retrograde, concerns about vendor's "cosmic compatibility," questions about system resilience during "solar disruptions"
**Decision-Making Style:** Consults star charts alongside analytics, seeks "energetic resonance" with solutions, evaluates long-term alignment with company's "celestial roadmap"
**Success Metrics:** Improved "innovation harmonics," measurable growth during specific cosmic phases, team alignment with company's "astral purpose"
""",
        "personality_traits": json.dumps({"Intuitive": 0.9, "Pattern-seeking": 0.85, "Unconventional": 0.95, "Strategic": 0.8, "Confident": 0.75}),
        "emotional_state": "aligned",
        "buyer_type": "visionary",
        "decision_authority": "influential",
        "role": "Chief Innovation Officer",
        "industry_context": "Tech startup focused on breakthrough innovation",
        "pain_points": json.dumps(["Data integration causing 'planetary misalignment'", "Team collaboration 'lacks cosmic harmony'", "Competitive advantage threatened during 'challenging lunar phases'", "Current systems incompatible with 'astral roadmap'"]),
        "objections": json.dumps(["Implementation during Mercury retrograde", "Vendor's 'cosmic compatibility'", "System resilience during 'solar disruptions'"]),
        "primary_concern": "Aligning technology decisions with cosmic forces to maximize success",
        "cognitive_biases": json.dumps({"Illusory correlation": 0.9, "Clustering illusion": 0.8, "Gambler's fallacy": 0.7})
    },
    
    {
        "name": "Harold Harmonious",
        "description": """Harold Harmonious is a 53-year-old CEO of MelodyMakers, a mid-sized music education software company. What makes Harold truly unique is his absolute refusal to make any business decision without translating it into musical notes first. A former concert pianist turned tech entrepreneur, Harold carries a portable keyboard at all times and literally "plays out" potential business scenarios to determine their viability.

With perfect pitch and synesthesia that allows him to "hear colors and taste sounds," Harold has developed a proprietary decision-making system where each aspect of a business deal corresponds to different musical elements: price points are bass notes, implementation timelines are tempos, and ROI projections are melodic progressions. He won't proceed with any purchase unless it creates what he deems a "harmonious composition."

During meetings, Harold often interrupts conversations to play brief musical phrases that represent his current thoughts. He evaluates proposals by how they sound when translated into his musical system, sometimes rejecting perfectly good options because they create "dissonant chords" or "rhythmic disturbances." Conversely, he might agree to seemingly unfavorable terms if they complete what he considers a "beautiful business symphony."

Despite his eccentricities, Harold's company has been remarkably successful, with industry-leading products and loyal customers. His unusual approach to decision-making, while baffling to many, seems to incorporate subtle market factors and customer psychology in ways that traditional analysis misses.

**Buyer Profile:** Harold Harmonious, 53, CEO of MelodyMakers educational software
**Demographics:** 53, male, Nashville-based, Juilliard-trained pianist with self-taught programming skills
**Profession & Workplace:** CEO of music education software company (75 employees), office designed like a concert hall with grand piano in meeting room
**Buying Context:** Previous vendor created "discordant implementation," 3-month decision timeline (a "sonata form"), budget determined by converting last quarter's revenue into a "financial cadence"
**Personality Traits:** Creative, systematic, perfectionistic, intuitive, expressive
**Communication Style:** Frequently uses musical terminology, interrupts with keyboard demonstrations, describes business concepts in terms of composition elements
**Pain Points:** Current systems produce "rhythmic inefficiencies," customer experience lacks "melodic flow," competitors gaining advantage through "harmonic innovation"
**Primary Objections:** Concerns about implementation "tempo," questions whether solution "resonates" with company culture, unsure if pricing structure creates "financial harmony"
**Decision-Making Style:** Converts all data into musical notation, plays scenarios on keyboard, evaluates "sonic coherence" of business decisions
**Success Metrics:** Customer satisfaction measured in "audience applause metrics," employee productivity tracked via "ensemble synchronicity," revenue growth viewed as "crescendo patterns"
""",
        "personality_traits": json.dumps({"Creative": 0.9, "Systematic": 0.8, "Perfectionistic": 0.85, "Intuitive": 0.75, "Expressive": 0.8}),
        "emotional_state": "harmonious",
        "buyer_type": "creative",
        "decision_authority": "final",
        "role": "Chief Executive Officer",
        "industry_context": "Music education software development",
        "pain_points": json.dumps(["Systems produce 'rhythmic inefficiencies'", "Customer experience lacks 'melodic flow'", "Competitors gaining advantage through 'harmonic innovation'", "Team collaboration needs better 'orchestration'"]),
        "objections": json.dumps(["Implementation 'tempo' concerns", "Solution may not 'resonate' with company culture", "Pricing structure may lack 'financial harmony'"]),
        "primary_concern": "Creating a perfectly harmonious business ecosystem through musical principles",
        "cognitive_biases": json.dumps({"Synesthesia-influenced perception": 0.95, "Pattern recognition": 0.8, "Aesthetic bias": 0.9})
    }
]

def get_random_legendary_persona():
    """
    Returns a randomly selected legendary persona from the collection.
    
    Returns:
        dict: A persona dictionary with all fields needed to create a BuyerPersona object
    """
    return random.choice(LEGENDARY_PERSONAS)

def should_use_legendary_persona():
    """
    Determines whether a legendary persona should be used based on probability.
    Current setting: 1% chance
    
    Returns:
        bool: True if a legendary persona should be used, False otherwise
    """
    return random.random() < 0.01  # 1% chance

def get_legendary_persona_by_name(name):
    """
    Retrieves a specific legendary persona by name.
    
    Args:
        name (str): The name of the legendary persona to retrieve
        
    Returns:
        dict: The persona dictionary or None if not found
    """
    for persona in LEGENDARY_PERSONAS:
        if persona["name"] == name:
            return persona
    return None 