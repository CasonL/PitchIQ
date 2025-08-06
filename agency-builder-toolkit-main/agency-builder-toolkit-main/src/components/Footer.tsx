import { Button } from "@/components/ui/button";
import { Mail, Twitter, Linkedin, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-xl font-bold text-foreground">Pitch</span>
              <span className="text-xl font-bold text-primary">IQ</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              Democratizing access to elite sales training and economic mobility. 
              Building a movement that transcends traditional barriers to success.
            </p>
            <div className="flex space-x-4">
              <Button size="sm" variant="outline" className="p-2">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="p-2">
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="p-2">
                <Github className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="p-2">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Mission</h3>
            <ul className="space-y-2">
              <li><a href="#mission" className="text-muted-foreground hover:text-primary transition-colors">Our Purpose</a></li>
              <li><a href="#impact" className="text-muted-foreground hover:text-primary transition-colors">Impact</a></li>
              <li><a href="#movement" className="text-muted-foreground hover:text-primary transition-colors">The Movement</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Success Stories</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-4">Connect</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Join Waitlist</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Community</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              © 2024 PitchIQ. All rights reserved. Building economic liberation through sales mastery.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-primary text-sm transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;