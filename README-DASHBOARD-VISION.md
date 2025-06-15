# README: PitchIQ Dashboard - Vision & Architecture

## 1. Core Philosophy: AI-First, Conversational Coaching

The PitchIQ dashboard is designed from the ground up to be an **AI-First, Conversational Coaching** platform. Our primary goal is not just to present data, but to actively guide users towards improvement through personalized, AI-driven interactions. The AI coach is the central figure, proactively offering insights, suggesting areas of focus, and facilitating practice.

## 2. Target Audience Considerations

Our primary users are **Freelancers, Entrepreneurs, and Startups**. This audience is characterized by:

*   **Time Scarcity:** They need to get value quickly and efficiently.
*   **Action-Orientation:** They prefer actionable advice over passive data consumption.
*   **Need for Focus:** They are often juggling multiple responsibilities and benefit from tools that guide their attention to what matters most.
*   **Desire for Simplicity:** Clean, intuitive interfaces are preferred over complex, feature-heavy dashboards.

These considerations heavily influence our design choices, favoring clarity, guided experiences, and progressive disclosure of information.

## 3. Two-Tab Structure: "AI Coach" & "My Dashboard"

To serve our core philosophy and target audience, the dashboard employs a two-tab structure:

### 3.1. "AI Coach" Tab (Primary & Default View)

*   **Purpose:** This is the heart of the application. It's where users engage in direct, conversational coaching with the AI. The focus is on interaction, receiving AI-driven guidance, and initiating practice sessions.
*   **Default Landing Experience:** Users will always land on this tab.
*   **Key Components:**
    *   **Prominent AI Conversational Interface:** A clear, inviting chat interface (`TopLevelAIChatBar` and the main message interaction area) will dominate this view.
    *   **Initial View:** Upon loading (after initial app onboarding/greeting), the user is presented with an AI-generated themed prompt designed to initiate a conversation or a specific coaching path based on their current status (e.g., "Ready for your first roleplay?", "Let's review your last session's insights.", "What would you like to work on today?").
*   **Future Enhancement: Dynamic Stats Row/Header:**
    *   A slim, non-intrusive row located above the main conversational interface.
    *   **Slot 1 (AI-Driven, Always Visible):** An "Area of Focus" card. This card will dynamically display the skill or area where the user has the most significant opportunity for improvement, based on AI analysis of their performance.
        *   Features: Clear label (e.g., "Focus: Objection Handling"), current score/status, a subtle trend indicator (e.g., small up/down arrow, color change for recent improvement/decline).
        *   **Click-to-Chat:** Clicking this card will pre-populate the AI chat bar with a prompt, e.g., "I'd like to work on my [Area of Focus]. Can we practice this?"
    *   **Slots 2 & 3 (User-Customizable, Optional):** Two smaller slots for other simple, non-action-oriented static stat cards (e.g., "Total Sessions," "Last Score").
        *   A "pen" icon will allow users to choose which stats to display here from a predefined list. These are for quick, at-a-glance context.

### 3.2. "My Dashboard" Tab (Secondary View)

*   **Purpose:** This tab serves as the repository for more detailed data review, trend analysis, and deeper dives into performance metrics. It's accessed when the user explicitly chooses to review their data or when the AI guides them there.
*   **Key Characteristics:**
    *   **Widget-Based Layout:** A flexible layout populated by "widgets" or "cards" that provide specific insights.
    *   **Unlockable Content:** Widgets are not all shown by default. They are progressively unlocked as the user engages with the platform, achieves milestones, or as the AI identifies their readiness for specific information.
*   **Example Widgets:**
    *   Detailed Key Metrics (breakdown of overall scores, time spent, etc.)
    *   Skill Radar (visual representation of proficiency across different sales skills)
    *   Call History Timeline (overview of past sessions)
    *   Specialized Analysis Cards (e.g., deep dive into a specific skill, sentiment analysis trends)

## 4. Widget Unlocking Mechanism (Future Enhancement for "My Dashboard")

The progressive reveal of widgets on the "My Dashboard" tab is a core part of making the platform feel personalized and manageable.

*   **Triggers for Unlocking:**
    *   **AI Suggestion:** The AI coach can announce when a new widget is available based on user progress or needs (e.g., "You've consistently worked on Discovery for 5 sessions. I've unlocked the 'Advanced Discovery Metrics' widget for you!").
    *   **User Performance/Milestones:** Completing a certain number of roleplays, achieving a specific score, or demonstrating improvement in an area can unlock relevant widgets.
*   **Benefits:**
    *   Reduces initial cognitive overload.
    *   Increases the perceived value of each new feature.
    *   Allows for focused learning as new information is introduced.
*   **AI-Guided Onboarding for Widgets:** When a new widget is unlocked, the AI should offer a brief explanation of its purpose and how to use it, potentially offering a mini-tour or linking to a help resource.

## 5. User Flow Highlights

1.  **Landing:** User lands on the "AI Coach" tab.
2.  **Initial Interaction:** Engages with the AI's initial prompt or the "Area of Focus" card to start a conversation or coaching session.
3.  **Coaching & Practice:** Interacts with the AI, participates in roleplays.
4.  **Data Exploration (Optional/Guided):**
    *   The AI might suggest, "Your talk-to-listen ratio has shifted. Would you like to see the trend on your dashboard?" A click takes them to the "My Dashboard" tab, possibly highlighting the relevant widget.
    *   The user can navigate to the "My Dashboard" tab independently to review their unlocked widgets.
5.  **Widget Unlocks:** Periodically, the AI announces new widget unlocks based on the user's journey.

## 6. Design Principles for this Vision

*   **Minimize Cognitive Load:** Present only relevant information at the right time.
*   **Prioritize Actionability:** Every piece of data or AI interaction should ideally lead to a clear next step or learning opportunity.
*   **Clarity and Focus:** The UI should be clean, with distinct purposes for each tab and element.
*   **Progressive Disclosure:** Introduce complexity and new features gradually as the user becomes more familiar with the platform.
*   **AI as the Guide:** The AI coach is central to the experience, proactively guiding, explaining, and personalizing the user's journey.

This document outlines the strategic direction for the PitchIQ dashboard. It will be updated as the vision evolves and new features are conceptualized and implemented. 