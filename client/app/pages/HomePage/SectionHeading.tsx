import { motion } from "framer-motion";

const SectionHeading = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  return (
    <motion.h2 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-primary leading-[0.9] ${className}`}
    >
      {children}
    </motion.h2>
  );
};

export default SectionHeading;