import { useRef } from "react";
import { useScroll, useTransform,motion } from "framer-motion";
import Image from "next/image";


const ParallaxImage = ({ src, alt, className, speed = 0.1, priority = false }: { src: string, alt: string, className?: string, speed?: number, priority?: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `${speed * 100}%`]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="w-full h-full">
        <Image 
          src={src} 
          alt={alt} 
          width={800} 
          height={800}
          className="w-full h-full object-cover"
        />
      </motion.div>
    </div>
  );
};

export default ParallaxImage;
