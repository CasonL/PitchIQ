import { useEffect } from 'react';

const PostCallReviewPage = () => {
  useEffect(() => {
    // Set full viewport height and remove default margins
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
    };
  }, []);

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
