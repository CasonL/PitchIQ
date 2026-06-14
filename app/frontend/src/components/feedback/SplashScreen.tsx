import { motion } from "framer-motion";

interface SplashScreenProps {
  currentMoment: number;
  label: string;
}

export default function SplashScreen({ currentMoment, label }: SplashScreenProps) {
  return (
    <motion.div
      key="splash"
      className="flex flex-col items-center justify-center py-20 sm:py-28"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.6, y: -40 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
    >
      <span className="font-display text-[140px] sm:text-[180px] font-bold text-pitch-text leading-none">
        {currentMoment + 1}
      </span>
      <p className="text-sm text-pitch-secondary mt-4">{label}</p>
    </motion.div>
  );
}
