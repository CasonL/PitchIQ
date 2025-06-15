import json

def test_get_profile_unauthorized(client):
    """
    GIVEN a Flask application configured for testing
    WHEN the '/api/profile' endpoint is requested (GET) without authentication
    THEN check that a 401 Unauthorized response is returned
    """
    response = client.get('/api/profile')
    assert response.status_code == 401

def test_update_personalization_unauthorized(client):
    """
    GIVEN a Flask application configured for testing
    WHEN the '/api/personalize' endpoint is posted to (POST) without authentication
    THEN check that a 401 Unauthorized response is returned
    """
    response = client.post('/api/personalize',
                           data=json.dumps(dict(
                               core_q1_product='Test Product',
                               core_q2_audience='Test Audience'
                           )),
                           content_type='application/json')
    assert response.status_code == 401 