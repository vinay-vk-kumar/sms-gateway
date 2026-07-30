import { Link } from 'react-router-dom';
import { ArrowLeft, Ghost } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[400px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="relative z-10 text-center flex flex-col items-center"
      >
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 relative"
        >
          <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 opacity-50" />
          <Ghost size={72} className="text-zinc-200 relative z-10" strokeWidth={1} />
        </motion.div>

        <h1 className="text-[120px] md:text-[180px] font-bold tracking-tighter leading-none bg-gradient-to-b from-white to-white/10 bg-clip-text text-transparent mb-6 select-none">
          404
        </h1>

        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-zinc-100 mb-4">
          Lost in the void.
        </h2>

        <p className="text-base md:text-lg text-zinc-400 max-w-md mx-auto mb-10 font-light leading-relaxed">
          The page you're looking for doesn't exist, has been moved, or is currently taking a coffee break.
        </p>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold text-sm hover:bg-black-200 transition-colors rounded-sm"
          >
            <ArrowLeft size={16} />
            Back to Safety
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
