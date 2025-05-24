import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

const Hero = () => {
  return (
    <section className="pt-16 pb-8 md:pt-24 md:pb-16 bg-white">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
            <span className="block text-slate-800">Democratizing </span>
            <span className="block text-red-600">Sales Training</span>
            <span className="block text-slate-800">For Everyone</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-xl">
            Practice your pitch with realistic AI personas. Get actionable feedback to improve your skills in real-time.
          </p>
          
          <div className="w-full max-w-md">
            <Button size="lg" className="w-full py-6 bg-red-600 hover:bg-red-700 text-white text-lg rounded-lg shadow-lg">
              <Link to="/chat" className="flex items-center justify-center w-full">
                <Play size={20} className="mr-2" />
                Start Practicing Now
              </Link>
            </Button>
          </div>
          
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center">✓ No signup required</span>
            <span className="flex items-center">✓ Free forever</span>
            <span className="flex items-center">✓ Instant feedback</span>
          </div>
          
          {/* Simple visual cue */}
          <div className="mt-16 relative w-full max-w-xs aspect-square mx-auto">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-navy-500/30 to-red-500/30 opacity-70 blur-xl animate-pulse-slow"></div>
            <div className="relative h-full flex items-center justify-center">
              <div className="w-3/4 h-3/4 rounded-full bg-white shadow-lg flex items-center justify-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-navy-700 to-red-600 bg-clip-text text-transparent">PitchIQ</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
