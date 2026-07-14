"use client";

import { useState, useRef, useEffect } from "react";

export function ResizableSidebar({
  children,
  defaultWidth = 240,
  minWidth = 200,
  maxWidth = 400,
  position = "left",
  className = "",
}: {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: "left" | "right";
  className?: string;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !sidebarRef.current) return;
      
      if (position === "left") {
        const rect = sidebarRef.current.getBoundingClientRect();
        // Calculate new width relative to the sidebar's left edge
        let newWidth = e.clientX - rect.left;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        setWidth(newWidth);
      } else {
        const rect = sidebarRef.current.getBoundingClientRect();
        // For right sidebar, width increases as mouse moves left
        let newWidth = rect.right - e.clientX;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minWidth, maxWidth, position]);

  const startResizing = () => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <aside 
      ref={sidebarRef}
      style={{ width: `${width}px` }} 
      className={`relative shrink-0 flex flex-col ${className}`}
    >
      <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden">
        {children}
      </div>
      
      {/* Drag handle */}
      <div 
        className={`absolute top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-500/20 active:bg-brand-500/40 transition-colors z-50 ${position === "left" ? "-right-1" : "-left-1"}`}
        onMouseDown={startResizing}
      />
    </aside>
  );
}
