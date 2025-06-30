from flask import render_template
from flask_login import login_required
from . import demo

@demo.route('/streaming-demo')
def streaming_demo():
    """Demo route for showing the StreamingTextDirect component in action"""
    return render_template('demo/streaming_demo.html')

@demo.route('/voice-agent')
@login_required
def voice_agent_demo():
    """Demo route for the working Deepgram Voice Agent implementation"""
    return render_template('demo/voice_agent_demo.html') 