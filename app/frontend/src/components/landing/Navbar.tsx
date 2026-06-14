import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navLinks = [
    { label: "Product", href: "#demo" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Pricing", href: "#cta" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || mobileOpen
            ? "bg-cream/90 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.05)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/fox-mascot.webp"
              alt="PitchIQ"
              width="32"
              height="32"
              loading="eager"
              decoding="async"
              className="w-8 h-8 object-contain group-hover:scale-110 transition-transform"
            />
            <span className="font-display text-xl font-bold text-[#1A1A1A]">
              PitchIQ
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-[#5A5A5A] hover:text-brand-orange transition-colors"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => navigate("/demo")}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white text-sm font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all"
            >
              Try Demo
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-3 -mr-3 text-[#1A1A1A] rounded-lg hover:bg-black/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Menu panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-16 left-0 right-0 z-40 bg-cream/95 backdrop-blur-xl border-t border-cream-deep shadow-lg md:hidden"
            >
              <div className="px-6 py-5 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[#1A1A1A] font-medium hover:bg-brand-orange/5 active:bg-brand-orange/10 transition-colors min-h-[48px]"
                  >
                    {link.label}
                  </motion.a>
                ))}
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.25 }}
                  className="pt-2"
                >
                  <button
                    onClick={() => { setMobileOpen(false); navigate("/demo"); }}
                    className="w-full text-center px-5 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow min-h-[48px]"
                  >
                    Try Demo
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
