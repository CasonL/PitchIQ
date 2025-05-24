import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';

const Chat = () => {
  return (
    <div className="flex flex-col h-screen bg-white text-slate-900">
      {/* Optional back button */}
      <div className="absolute top-4 left-4 z-10">
        <Link 
          to="/" 
          className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
      
      <ChatInterface />
    </div>
  );
};

export default Chat;
