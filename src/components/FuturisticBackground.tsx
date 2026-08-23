import React, { useEffect, useRef } from 'react';

export const FuturisticBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes
    const particleCount = 42;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      hue: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.3 - Math.random() * 0.5,
        size: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.4 + 0.15,
        hue: 180 + Math.random() * 45, // Cyan to blue
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.015;

      // 1. Draw Vertical Holographic Light Columns
      const columnCount = 7;
      for (let c = 0; c < columnCount; c++) {
        const cx = (width / (columnCount + 1)) * (c + 1);
        const colGrad = ctx.createLinearGradient(cx, 0, cx, height);
        const colAlpha = 0.025 + Math.sin(time * 0.5 + c) * 0.015;
        colGrad.addColorStop(0, `rgba(6, 182, 212, ${colAlpha * 1.5})`);
        colGrad.addColorStop(0.5, `rgba(59, 130, 246, ${colAlpha})`);
        colGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

        ctx.fillStyle = colGrad;
        ctx.fillRect(cx - 25, 0, 50, height);
      }

      // 2. Draw Floor Perspective Digital Grid
      const horizonY = height * 0.72;
      const gridGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      gridGrad.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
      gridGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.08)');
      gridGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.strokeStyle = gridGrad;
      ctx.lineWidth = 1;

      // Horizontal grid lines with perspective compression
      const lines = 10;
      for (let i = 1; i <= lines; i++) {
        const progress = Math.pow(i / lines, 2);
        const y = horizonY + (height - horizonY) * progress;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Perspective vanishing lines
      const vLines = 16;
      for (let i = -vLines / 2; i <= vLines / 2; i++) {
        const xBottom = width / 2 + (i * (width / vLines)) * 1.8;
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(xBottom, height);
        ctx.stroke();
      }

      // 3. Render Ambient Holographic Dust Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect close particles with subtle energy filaments
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 85) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - dist / 85) * 0.12})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#02050b]">
      {/* Sci-Fi Deep Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0c1e33] via-[#040c17] to-[#010408]" />

      {/* Cyber Ambient Atmosphere Glows */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[70%] h-[50%] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] bg-purple-900/12 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[45%] h-[45%] bg-blue-900/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Holographic Projection Particle & Grid Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />

      {/* Vignette Rim */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(1,4,8,0.7)_100%)] pointer-events-none" />
    </div>
  );
};
