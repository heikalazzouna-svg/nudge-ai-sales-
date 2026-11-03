import { motion } from "framer-motion";
import ParallaxImage from "./ParallaxImage";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Feature {
  id: string;
  title: string;
  icon: any;
  description: string;
  image: string;
}



const FeatureCard = ({ feature, index }: { feature: Feature, index: number }) => {
  const isEven = index % 2 === 0;
  
  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center py-24 sticky top-0 bg-background">
      <div className="w-full max-w-[100rem] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          className={`space-y-8 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
          initial={{ opacity: 0, x: isEven ? -50 : 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-20 h-20 border border-primary/20 flex items-center justify-center rounded-full bg-background">
            <feature.icon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-heading text-5xl md:text-6xl font-bold text-primary">{feature.title}</h3>
          <p className="font-paragraph text-xl text-primary/70 leading-relaxed max-w-xl">
            {feature.description}
          </p>
          <div className="pt-4">
            <Link 
              href={`/features#${feature.id}`}
              className="group inline-flex items-center gap-3 text-lg font-paragraph text-primary border-b border-primary/30 pb-1 hover:border-primary transition-colors"
            >
              Explore Capability
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        <div className={`relative ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm">
             <ParallaxImage 
               src={feature.image} 
               alt={feature.title} 
               className="w-full h-full"
               speed={0.15}
             />
             {/* Decorative overlay */}
             <div className="absolute inset-0 border border-primary/10 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;