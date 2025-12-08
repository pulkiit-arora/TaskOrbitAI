import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!visible || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const tooltipWidth = 240; // estimate max width
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
    const top = rect.top - 8; // place above
    setPos({ top, left });
  }, [visible]);

  useEffect(() => {
    const onScroll = () => setVisible(false);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  const tooltipNode = visible && pos ? ReactDOM.createPortal(
    <div style={{ position: 'fixed', left: pos.left, top: pos.top, transform: 'translateY(-100%)', zIndex: 9999 }}>
      <div className="whitespace-nowrap bg-black text-white text-xs px-3 py-1 rounded shadow-lg">{content}</div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <span
        ref={wrapperRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="inline-block"
      >
        {children}
      </span>
      {tooltipNode}
    </>
  );
};

export default Tooltip;
