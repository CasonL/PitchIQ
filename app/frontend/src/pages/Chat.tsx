import ChatInterface from '@/components/voice/ChatInterface';
import AppHeader from '@/components/AppHeader';

const Chat = () => {
  return (
    <div className="flex flex-col h-screen bg-white text-slate-900">
      <AppHeader />
      <div className="pt-16">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Chat; 