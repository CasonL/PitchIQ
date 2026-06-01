import { useEffect } from 'react';

const PostCallReviewPage = () => {
  useEffect(() => {
    // Redirect to the standalone post-call-review page
    // This avoids React Router conflicts with the iframe approach
    window.location.href = '/post-call-review/index.html';
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000'
    }}>
      <p style={{ color: '#fff' }}>Redirecting to feedback...</p>
    </div>
  );
};

export default PostCallReviewPage;
