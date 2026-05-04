import { Linkedin, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] border-t border-white/5 py-10">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/fox-mascot.png"
            alt="PitchIQ"
            className="w-6 h-6 object-contain opacity-80"
          />
          <span className="font-display text-lg font-bold text-white/80">
            PitchIQ
          </span>
          <span className="text-[#8A8A8A] text-sm ml-2">
            © 2026 PitchIQ
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a href="#" className="text-[#8A8A8A] hover:text-white text-sm transition-colors">
            Product
          </a>
          <a href="#" className="text-[#8A8A8A] hover:text-white text-sm transition-colors">
            Pricing
          </a>
          <a href="#" className="text-[#8A8A8A] hover:text-white text-sm transition-colors">
            Blog
          </a>
          <a href="#" className="text-[#8A8A8A] hover:text-white text-sm transition-colors">
            Contact
          </a>
        </div>

        {/* Social */}
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="text-[#8A8A8A] hover:text-brand-orange transition-colors"
          >
            <Linkedin size={18} />
          </a>
          <a
            href="#"
            className="text-[#8A8A8A] hover:text-brand-orange transition-colors"
          >
            <Twitter size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
