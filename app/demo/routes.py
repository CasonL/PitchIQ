from flask import render_template
from . import demo

@demo.route('/streaming-demo')
def streaming_demo():
    """Demo route for showing the StreamingTextDirect component in action"""
    return render_template('demo/streaming_demo.html') 