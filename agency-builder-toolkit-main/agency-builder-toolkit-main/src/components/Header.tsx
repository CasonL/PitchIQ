import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="w-full bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-foreground">Pitch</span>
            <span className="text-xl font-bold text-primary">IQ</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#mission" className="text-muted-foreground hover:text-foreground transition-colors">
              Our Mission
            </a>
            <a href="#impact" className="text-muted-foreground hover:text-foreground transition-colors">
              Impact
            </a>
            <a href="#movement" className="text-muted-foreground hover:text-foreground transition-colors">
              Get Started
            </a>
          </div>
          
          <Button className="gradient-bg text-white font-semibold">
            Start Free Trial
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;