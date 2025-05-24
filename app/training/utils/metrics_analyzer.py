import re
import json
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from app.training.models import SessionMetrics
from flask import current_app
from datetime import datetime

try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    
try:
    nltk.data.find('vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon')


class MetricsAnalyzer:
    """
    Analyzes conversation data to extract metrics about the sales interaction.
    """
    
    def __init__(self, messages, session_id):
        """
        Initialize the analyzer with conversation data.
        
        Args:
            messages: List of message dictionaries with 'role', 'content', 'timestamp'
            session_id: The ID of the training session
        """
        self.messages = messages
        self.session_id = session_id
        self.user_messages = [m for m in messages if m.get('role') == 'user']
        self.assistant_messages = [m for m in messages if m.get('role') == 'assistant']
        self.sia = SentimentIntensityAnalyzer()
        
        # Common filler words in English
        self.filler_words = [
            "um", "uh", "er", "ah", "like", "you know", "sort of", "kind of", 
            "basically", "literally", "actually", "so", "anyway", "well", "right"
        ]
        
        # Technical sales terms
        self.technical_terms = [
            "roi", "saas", "kpi", "conversion", "pipeline", "churn", "retention", 
            "upsell", "cross-sell", "acquisition", "implementation", "integration", 
            "migration", "deployment", "onboarding", "scalability", "enterprise", 
            "solution", "platform", "infrastructure", "dashboard", "analytics"
        ]
        
        # Objection phrases
        self.objection_phrases = [
            "too expensive", "costs too much", "price is high", "budget", 
            "not now", "later", "not ready", "time", "competitor", "alternative",
            "need to think", "talk to", "concern", "issue", "problem", "worry",
            "not sure", "hesitant", "doubt", "risk"
        ]
        
        # Closing phrases
        self.closing_phrases = [
            "next steps", "move forward", "get started", "sign up", "sign on",
            "agreement", "contract", "deal", "purchase", "buy", "invest", 
            "decision", "commit", "timeline", "schedule", "meeting"
        ]
        
        # Pain point indicators
        self.pain_point_phrases = [
            "struggle", "challenge", "difficult", "problem", "pain point", "issue",
            "frustration", "bottleneck", "inefficient", "waste", "loss", "concern",
            "worry", "trouble", "dissatisfied", "unhappy", "limitation", "obstacle"
        ]
    
    def analyze(self):
        """
        Perform analysis on the conversation and return metrics.
        
        Returns:
            SessionMetrics: A populated SessionMetrics object
        """
        try:
            # Communication Metrics
            talk_ratio = self._calculate_talk_ratio()
            avg_response_time = self._calculate_avg_response_time()
            question_count = self._count_questions()
            question_ratio = self._calculate_question_ratio()
            
            # Linguistic Analysis
            filler_word_count = self._count_filler_words()
            technical_term_count = self._count_technical_terms()
            positive_language_ratio = self._calculate_positive_language_ratio()
            mirroring_score = self._calculate_mirroring_score()
            
            # Time Allocation
            time_allocation = self._analyze_time_allocation()
            
            # Key Structure Metrics
            discovery_pitch_ratio = self._calculate_discovery_pitch_ratio(time_allocation)
            first_objection_time = self._identify_first_objection_time()
            objections_handled_count = self._count_objections_handled()
            closing_attempts = self._count_closing_attempts()
            
            # Engagement Metrics
            engagement_score = self._calculate_engagement_score()
            avg_prospect_response_length = self._calculate_avg_prospect_response_length()
            pain_points_identified = self._count_pain_points()
            value_proposition_alignment = self._calculate_value_alignment()
            
            # Pain Points Details
            pain_point_details = self._extract_pain_point_details()
            
            # Create metrics object
            metrics = SessionMetrics(
                training_session_id=self.session_id,
                talk_ratio=talk_ratio,
                avg_response_time=avg_response_time,
                question_count=question_count,
                question_ratio=question_ratio,
                filler_word_count=filler_word_count,
                technical_term_count=technical_term_count,
                positive_language_ratio=positive_language_ratio,
                mirroring_score=mirroring_score,
                time_small_talk=time_allocation['time_small_talk'],
                time_discovery=time_allocation['time_discovery'],
                time_pitch=time_allocation['time_pitch'],
                time_objection_handling=time_allocation['time_objection_handling'],
                time_closing=time_allocation['time_closing'],
                discovery_pitch_ratio=discovery_pitch_ratio,
                first_objection_time=first_objection_time,
                objections_handled_count=objections_handled_count,
                closing_attempts=closing_attempts,
                engagement_score=engagement_score,
                avg_prospect_response_length=avg_prospect_response_length,
                pain_points_identified=pain_points_identified,
                value_proposition_alignment=value_proposition_alignment
            )
            
            # Set JSON data
            metrics.pain_point_details_dict = pain_point_details
            
            return metrics
        except Exception as e:
            current_app.logger.error(f"Error analyzing metrics: {str(e)}")
            # Return basic metrics object with default values
            return SessionMetrics(training_session_id=self.session_id)
    
    def _calculate_talk_ratio(self):
        """Calculate the ratio of user talk time to total talk time."""
        user_words = sum(len(m.get('content', '').split()) for m in self.user_messages)
        assistant_words = sum(len(m.get('content', '').split()) for m in self.assistant_messages)
        
        total_words = user_words + assistant_words
        if total_words == 0:
            return 0.0
            
        return round((user_words / total_words), 2)  # Return as decimal (0.0-1.0)
    
    def _calculate_avg_response_time(self):
        """Calculate the average response time in seconds."""
        if len(self.messages) < 2:
            return 0.0
        
        response_times = []
        for i in range(1, len(self.messages)):
            if (self.messages[i].get('role') == 'user' and 
                self.messages[i-1].get('role') == 'assistant'):
                
                try:
                    curr_time = datetime.fromisoformat(self.messages[i].get('timestamp'))
                    prev_time = datetime.fromisoformat(self.messages[i-1].get('timestamp'))
                    time_diff = (curr_time - prev_time).total_seconds()
                    
                    # Only count realistic times (1-300 seconds)
                    if 1 <= time_diff <= 300:
                        response_times.append(time_diff)
                except (ValueError, TypeError):
                    continue
        
        if not response_times:
            return 0.0
        
        return round(sum(response_times) / len(response_times), 1)
    
    def _count_questions(self):
        """Count the number of questions asked by the user."""
        question_count = 0
        for message in self.user_messages:
            content = message.get('content', '')
            # Count sentences ending with ?
            question_count += content.count('?')
            
            # Also count sentences with question words at the beginning
            sentences = nltk.sent_tokenize(content)
            for sentence in sentences:
                words = sentence.lower().split()
                if words and words[0] in ["what", "how", "why", "when", "where", "who", "which", "can", "could", "would", "do", "does", "did"]:
                    if '?' not in sentence:  # Don't double count
                        question_count += 1
            
        return question_count
    
    def _calculate_question_ratio(self):
        """Calculate the ratio of questions to total sentences."""
        question_count = self._count_questions()
        
        # Count total sentences in user messages
        sentence_count = 0
        for message in self.user_messages:
            content = message.get('content', '')
            sentences = nltk.sent_tokenize(content)
            sentence_count += len(sentences)
        
        if sentence_count == 0:
            return 0.0
        
        return round(question_count / sentence_count, 2)
    
    def _count_filler_words(self):
        """Count the number of filler words used by the user."""
        filler_count = 0
        
        for message in self.user_messages:
            content = message.get('content', '').lower()
            for filler in self.filler_words:
                filler_count += len(re.findall(r'\b' + re.escape(filler) + r'\b', content))
                
        return filler_count
    
    def _count_technical_terms(self):
        """Count the number of technical sales terms used by the user."""
        term_count = 0
        
        for message in self.user_messages:
            content = message.get('content', '').lower()
            for term in self.technical_terms:
                term_count += len(re.findall(r'\b' + re.escape(term) + r'\b', content))
                
        return term_count
    
    def _calculate_positive_language_ratio(self):
        """Calculate the ratio of positive sentiment in messages."""
        if not self.user_messages:
            return 0.0
            
        positive_score_sum = 0
        message_count = len(self.user_messages)
        
        for message in self.user_messages:
            content = message.get('content', '')
            sentiment = self.sia.polarity_scores(content)
            positive_score_sum += max(sentiment['compound'], 0)  # Only count positive values
        
        return round(positive_score_sum / message_count, 2)
    
    def _calculate_mirroring_score(self):
        """Calculate how well the user mirrored the prospect's language."""
        if not self.user_messages or not self.assistant_messages:
            return 0.0
            
        assistant_words = set()
        for message in self.assistant_messages:
            content = message.get('content', '').lower()
            words = re.findall(r'\b[a-z]{4,}\b', content)  # Only meaningful words (4+ chars)
            assistant_words.update(words)
        
        mirrored_words = 0
        total_words = 0
        
        for message in self.user_messages:
            content = message.get('content', '').lower()
            words = re.findall(r'\b[a-z]{4,}\b', content)
            total_words += len(words)
            
            for word in words:
                if word in assistant_words:
                    mirrored_words += 1
        
        if total_words == 0:
            return 0.0
            
        return round(mirrored_words / total_words, 2)
    
    def _analyze_time_allocation(self):
        """Analyze time allocation across different sales stages."""
        # Count messages in each phase based on content analysis
        small_talk = 0
        discovery = 0
        pitch = 0
        objection_handling = 0
        closing = 0
        
        # Patterns for each stage
        small_talk_patterns = [
            "how are you", "weather", "weekend", "family", "sports", 
            "nice to meet", "good morning", "good afternoon"
        ]
        
        discovery_patterns = [
            "what are your", "tell me about", "how do you currently", 
            "what challenges", "pain points", "why do you", "how does your"
        ]
        
        pitch_patterns = [
            "our product", "our solution", "we offer", "key features", 
            "benefits", "our platform", "our service", "value proposition"
        ]
        
        objection_patterns = self.objection_phrases
        
        closing_patterns = self.closing_phrases
        
        # Analyze each message to determine its phase
        for message in self.messages:
            content = message.get('content', '').lower()
            
            # Check which phase this message belongs to
            is_small_talk = any(pattern in content for pattern in small_talk_patterns)
            is_discovery = any(pattern in content for pattern in discovery_patterns)
            is_pitch = any(pattern in content for pattern in pitch_patterns)
            is_objection = any(pattern in content for pattern in objection_patterns)
            is_closing = any(pattern in content for pattern in closing_patterns)
            
            # Count the message in the most likely phase
            if is_small_talk:
                small_talk += 1
            elif is_discovery:
                discovery += 1
            elif is_pitch:
                pitch += 1
            elif is_objection:
                objection_handling += 1
            elif is_closing:
                closing += 1
            else:
                # Default to discovery if unclear
                discovery += 1
        
        total_messages = len(self.messages)
        if total_messages == 0:
            return {
                'time_small_talk': 0.0,
                'time_discovery': 0.0,
                'time_pitch': 0.0,
                'time_objection_handling': 0.0,
                'time_closing': 0.0
            }
        
        return {
            'time_small_talk': round(small_talk / total_messages, 2),
            'time_discovery': round(discovery / total_messages, 2),
            'time_pitch': round(pitch / total_messages, 2),
            'time_objection_handling': round(objection_handling / total_messages, 2),
            'time_closing': round(closing / total_messages, 2)
        }
    
    def _calculate_discovery_pitch_ratio(self, time_allocation):
        """Calculate the ratio of discovery time to pitch time."""
        discovery = time_allocation['time_discovery']
        pitch = time_allocation['time_pitch']
        
        if pitch == 0:
            return 0.0
            
        return round(discovery / pitch, 2)
    
    def _identify_first_objection_time(self):
        """Identify when the first objection occurred (as percentage into conversation)."""
        if not self.messages:
            return 0.0
            
        for i, message in enumerate(self.messages):
            content = message.get('content', '').lower()
            if any(pattern in content for pattern in self.objection_phrases):
                return round(i / len(self.messages), 2)
                
        return 0.0  # No objection found
    
    def _count_objections_handled(self):
        """Count the number of objections handled during the conversation."""
        objection_count = 0
        
        for message in self.assistant_messages:
            content = message.get('content', '').lower()
            if any(pattern in content for pattern in self.objection_phrases):
                objection_count += 1
                
        return objection_count
    
    def _count_closing_attempts(self):
        """Count the number of closing attempts during the conversation."""
        closing_count = 0
        
        for message in self.user_messages:
            content = message.get('content', '').lower()
            if any(pattern in content for pattern in self.closing_phrases):
                closing_count += 1
                
        return closing_count
    
    def _calculate_engagement_score(self):
        """Calculate the overall engagement score of the prospect."""
        if not self.assistant_messages:
            return 0.0
            
        # Calculate average message length (words)
        avg_length = sum(len(m.get('content', '').split()) 
                     for m in self.assistant_messages) / len(self.assistant_messages)
        
        # Normalize to 0.0-1.0 scale (assuming 50+ words is high engagement)
        length_score = min(avg_length / 50, 1.0)
        
        # Calculate average sentiment
        sentiment_sum = sum(self.sia.polarity_scores(m.get('content', ''))['compound'] 
                         for m in self.assistant_messages)
        sentiment_score = (sentiment_sum / len(self.assistant_messages) + 1) / 2  # Normalize from [-1,1] to [0,1]
        
        # Combine factors (50% message length, 50% sentiment)
        return round(0.5 * length_score + 0.5 * sentiment_score, 2)
    
    def _calculate_avg_prospect_response_length(self):
        """Calculate the average length of prospect responses in words."""
        if not self.assistant_messages:
            return 0.0
            
        total_words = sum(len(m.get('content', '').split()) for m in self.assistant_messages)
        return round(total_words / len(self.assistant_messages), 1)
    
    def _count_pain_points(self):
        """Count the number of pain points identified in the conversation."""
        pain_points = self._extract_pain_point_details()
        return len(pain_points)
    
    def _calculate_value_alignment(self):
        """Calculate how well value propositions align with identified needs."""
        # This is a more complex calculation that would require deeper analysis
        # For now, return a simplified estimate based on discovery to pitch ratio
        # A reasonable discovery to pitch ratio indicates good alignment
        
        time_allocation = self._analyze_time_allocation()
        discovery = time_allocation['time_discovery']
        pitch = time_allocation['time_pitch']
        
        if pitch == 0:
            return 0.0
        
        ratio = discovery / pitch
        # Optimal ratio around 1.5-2.5
        if 1.5 <= ratio <= 2.5:
            alignment = 0.8  # High alignment
        elif 1.0 <= ratio < 1.5 or 2.5 < ratio <= 3.5:
            alignment = 0.6  # Medium alignment
        else:
            alignment = 0.4  # Low alignment
            
        return alignment
    
    def _extract_pain_point_details(self):
        """Extract pain point details from the conversation."""
        pain_points = []
        
        for message in self.messages:
            content = message.get('content', '')
            sentences = nltk.sent_tokenize(content)
            
            for sentence in sentences:
                sentence_lower = sentence.lower()
                for phrase in self.pain_point_phrases:
                    if phrase in sentence_lower:
                        # Analyze sentiment of this pain point
                        sentiment = self.sia.polarity_scores(sentence)
                        
                        pain_points.append({
                            "text": sentence.strip(),
                            "sentiment": sentiment['compound'],
                            "role": message.get('role', 'unknown')
                        })
                        break  # Only add the sentence once
        
        return pain_points


def generate_metrics_for_session(session_id, messages):
    """
    Generate metrics for a training session.
    
    Args:
        session_id: ID of the training session
        messages: List of message dictionaries
        
    Returns:
        SessionMetrics object with calculated metrics
    """
    try:
        current_app.logger.info(f"Generating metrics for session {session_id}")
        analyzer = MetricsAnalyzer(messages, session_id)
        metrics = analyzer.analyze()
        current_app.logger.info(f"Successfully generated metrics for session {session_id}")
        return metrics
    except Exception as e:
        current_app.logger.error(f"Error generating metrics: {str(e)}")
        # Return basic metrics object with default values
        return SessionMetrics(training_session_id=session_id) 