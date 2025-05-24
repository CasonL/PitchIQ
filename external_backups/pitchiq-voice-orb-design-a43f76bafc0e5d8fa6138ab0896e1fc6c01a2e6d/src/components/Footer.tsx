import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-50 text-slate-600 border-t border-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-navy-700 to-red-600 bg-clip-text text-transparent">
              PitchIQ
            </Link>
            <p className="text-sm mt-1">Democratizing sales training.</p>
          </div>
          
          <div className="flex space-x-6 text-sm">
            <Link to="/about" className="hover:text-red-600">About</Link>
            <Link to="/privacy" className="hover:text-red-600">Privacy</Link>
            <Link to="/contact" className="hover:text-red-600">Contact</Link>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} PitchIQ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
