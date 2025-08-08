import { ChatWrapper } from '@/components/ChatWrapper';

export default function ChatOnboarding() {
  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatWrapper />
      </div>
    </div>
  );
}