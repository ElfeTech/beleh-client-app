import React, { useState, useEffect, useRef } from 'react';
import type { ChatWorkflowResponse } from '../../types/api';
import { ChartRenderer } from './charts/ChartRenderer';
import './ChartModal.css';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: ChatWorkflowResponse;
  title?: string;
}

const ChartModal: React.FC<ChartModalProps> = ({ isOpen, onClose, response, title }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number>(0);

  const { visualization, execution } = response;
  const fullData = execution?.rows || [];
  const columnNames = execution?.columns?.map(col => col.name) || [];

  // Reset state when modal opens/closes
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      // Reset on close
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan when zoomed
      setIsDragging(true);
      setStartPos({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (lastTouchDistance.current > 0) {
        const delta = distance - lastTouchDistance.current;
        const scaleChange = delta * 0.01;
        setScale(prev => Math.max(1, Math.min(4, prev + scaleChange)));
      }

      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan when zoomed
      setPosition({
        x: e.touches[0].clientX - startPos.x,
        y: e.touches[0].clientY - startPos.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = 0;
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(4, prev + 0.5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(1, prev - 0.5));
    if (scale <= 1.5) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !visualization) return null;

  return (
    <div className="chart-modal-backdrop" onClick={handleBackdropClick}>
      <div className="chart-modal-container">
        <div className="chart-modal-header">
          <h2>{title || 'Chart Visualization'}</h2>
          <button className="chart-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="chart-modal-controls">
          <button onClick={handleZoomOut} disabled={scale <= 1} aria-label="Zoom out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth={2} />
              <path d="M21 21l-4.35-4.35" strokeWidth={2} strokeLinecap="round" />
              <path d="M8 11h6" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>

          <span className="zoom-level">{Math.round(scale * 100)}%</span>

          <button onClick={handleZoomIn} disabled={scale >= 4} aria-label="Zoom in">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8" strokeWidth={2} />
              <path d="M21 21l-4.35-4.35" strokeWidth={2} strokeLinecap="round" />
              <path d="M11 8v6M8 11h6" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>

          {scale > 1 && (
            <button onClick={handleReset} className="reset-btn" aria-label="Reset zoom">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          className="chart-modal-content"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="chart-modal-zoom-wrapper"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
            }}
          >
            <ChartRenderer
              data={fullData}
              visualization={visualization}
              columns={columnNames}
            />
          </div>
        </div>

        {scale > 1 && (
          <div className="chart-modal-hint">
            Pinch to zoom • Drag to pan
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartModal;
