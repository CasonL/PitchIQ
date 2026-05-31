import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PostCallReviewPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set full viewport height and remove default margins
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';

    // Listen for messages from the iframe
    const handleMessage = (event: MessageEvent) => {
      const { action } = event.data || {};
      switch (action) {
        case 'exit':
          navigate('/demo');
          break;
        case 'try-again':
          navigate('/demo');
          break;
        case 'signup':
          navigate('/signup');
          break;
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  return (
    <iframe
      src="/post-call-review/index.html"
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        margin: 0,
        padding: 0,
        display: 'block',
      }}
      title="Post-Call Review"
    />
  );
};

export default PostCallReviewPage;
