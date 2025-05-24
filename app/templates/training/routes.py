@training_bp.route('/voice-chat', methods=['GET'])
def voice_chat_view():
    """Render the voice chat interface."""
    return render_template('training/voice_chat.html') 